import { useCallback, useEffect, useRef, useState } from 'react';
import { contextTimeAt } from '../../engine/audio-backend';
import { BeatEngine } from '../../engine/beat-engine';
import {
  CALIBRATION_HISTORY_MAX,
  CALIBRATION_TAPS,
  CALIBRATION_WARMUP,
  ICalibrationValue,
  runStats,
} from '../../engine/calibration';
import { TapClass, TapSource } from '../../engine/drill';
import { IStoredCalibration } from '../../engine/practice-storage';
import { useTapInput } from '../../hooks/use-tap-input';
import { GlassButton, GlassContainer } from '../ui';
import { TapPad } from './tap-pad';
import styles from './drill.module.css';

const LOOKAHEAD = 0.2;
const TICK_MS = 25;
const KEEP = 400;

const SOURCES: TapSource[] = ['key', 'pad'];
const sourceName = (src: TapSource) => (src === 'key' ? 'keyboard' : 'trackpad');
const signed = (ms: number) => (ms < 0 ? '−' : '+') + Math.round(Math.abs(ms)) + ' ms';

interface ICalibrateScreenProps {
  engine: BeatEngine;
  stored: IStoredCalibration;
  calibration: Partial<Record<TapSource, ICalibrationValue | null>>;
  onChange: (stored: IStoredCalibration) => void;
  onBack: () => void;
}

/** Every click identical: an accented 1 would invite you to tap the accent rather than the pulse. */
function click(context: AudioContext, at: number) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.frequency.value = 1100;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.32, at + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(at);
  osc.stop(at + 0.055);
}

const flashClass = (ms: number): TapClass => (Math.abs(ms) <= 25 ? 'on' : Math.abs(ms) <= 60 ? 'close' : 'stray');

export const CalibrateScreen = ({ engine, stored, calibration, onChange, onBack }: ICalibrateScreenProps) => {
  const [bpm, setBpm] = useState(120);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<TapSource | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const [counted, setCounted] = useState(0);
  const [status, setStatus] = useState('');
  const [draft, setDraft] = useState<Partial<Record<TapSource, string>>>({});

  const offsets = useRef<number[]>([]);
  const seen = useRef(0);
  const resettle = useRef(0);
  const lastClick = useRef(-1);
  const scheduled = useRef<{ t: number; i: number }[]>([]);
  const nextTime = useRef(0);
  const nextBeat = useRef(0);
  const source = useRef<TapSource | null>(null);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  // Nothing else should be sounding while the click is being measured.
  useEffect(() => {
    engine.stop();
  }, [engine]);

  useEffect(() => {
    if (!running) {
      return;
    }
    const context = engine.audioContext;
    if (!context) {
      return;
    }
    const timer = window.setInterval(() => {
      while (nextTime.current < context.currentTime + LOOKAHEAD) {
        click(context, nextTime.current);
        scheduled.current.push({ t: nextTime.current, i: nextBeat.current });
        nextBeat.current++;
        nextTime.current += 60 / bpmRef.current;
      }
      if (scheduled.current.length > KEEP) {
        scheduled.current = scheduled.current.slice(-KEEP);
      }
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [running, engine]);

  const stop = useCallback(() => {
    setRunning(false);
    source.current = null;
    setMode(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stop();
        setStatus('Run cancelled.');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stop]);

  /**
   * Nearest click, extrapolating past the queue: only a fifth of a second is scheduled, but half a beat is
   * 500 ms at 60 BPM, so an early tap would otherwise find only the previous click and read as hugely late.
   */
  const nearest = (at: number) => {
    let best: { ms: number; i: number } | null = null;
    const consider = (t: number, i: number) => {
      const ms = (at - t) * 1000;
      if (!best || Math.abs(ms) < Math.abs(best.ms)) {
        best = { ms, i };
      }
    };
    scheduled.current.forEach((entry) => consider(entry.t, entry.i));
    const step = 60 / bpmRef.current;
    for (let k = 0; k < 9; k++) {
      consider(nextTime.current + k * step, nextBeat.current + k);
    }
    return best as { ms: number; i: number } | null;
  };

  const finishRun = () => {
    const src = source.current;
    if (!src) {
      return;
    }
    const stats = runStats(offsets.current);
    const record = {
      src,
      offsetMs: stats.offsetMs,
      spreadMs: stats.spreadMs,
      n: offsets.current.length,
      bpm: bpmRef.current,
      at: Date.now(),
    };
    onChange({ ...stored, history: [record, ...stored.history].slice(0, CALIBRATION_HISTORY_MAX) });
    setStatus(
      'Measured the ' +
        sourceName(src) +
        ' over ' +
        record.n +
        ' taps at ' +
        record.bpm +
        ' BPM: ' +
        signed(record.offsetMs) +
        ', spread ±' +
        Math.round(record.spreadMs) +
        ' ms. The stored constant is the median across runs.',
    );
    stop();
  };

  const handleTap = useCallback(
    (perfMs: number, src: TapSource) => {
      const context = engine.audioContext;
      if (!context) {
        return;
      }
      if (!source.current) {
        // The tap that enters a run chooses the input being measured; there are no clicks for it to be
        // measured against yet, so it is a gesture and not a data point.
        context.resume();
        source.current = src;
        setMode(src);
        offsets.current = [];
        seen.current = 0;
        resettle.current = 0;
        lastClick.current = -1;
        scheduled.current = [];
        nextBeat.current = 0;
        nextTime.current = context.currentTime + 0.25;
        setCounted(0);
        setLast(null);
        setStatus('');
        setRunning(true);
        return;
      }
      if (src !== source.current) {
        setStatus('This run is measuring the ' + sourceName(source.current) + ' — finish it, or press Escape.');
        return;
      }
      const hit = nearest(contextTimeAt(context, perfMs));
      if (!hit || Math.abs(hit.ms) > (60 / bpmRef.current) * 1000) {
        return;
      }
      // A gap breaks entrainment, so the taps just after one are catching up rather than keeping time.
      if (lastClick.current >= 0 && hit.i - lastClick.current > 2) {
        resettle.current = 2;
      }
      lastClick.current = hit.i;
      seen.current++;
      if (seen.current <= CALIBRATION_WARMUP) {
        /* opening settle */
      } else if (resettle.current > 0) {
        resettle.current--;
      } else {
        offsets.current.push(hit.ms);
      }
      setLast(hit.ms);
      setCounted(offsets.current.length);
      if (offsets.current.length >= CALIBRATION_TAPS) {
        finishRun();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, stored],
  );

  useTapInput(true, handleTap);

  const setManual = (src: TapSource) => {
    const raw = draft[src];
    const value = raw === undefined || raw === '' ? NaN : Number(raw);
    const manual = { ...stored.manual };
    if (Number.isFinite(value)) {
      manual[src] = value;
    } else {
      delete manual[src];
    }
    onChange({ ...stored, manual });
    setDraft({ ...draft, [src]: '' });
  };

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h2 className={styles.title}>Calibrate your tap timing</h2>
        <GlassButton variant="ghost" onClick={onBack}>
          Back
        </GlassButton>
      </div>
      <p className={styles.lede}>
        Tap along with the click. The constant this measures is your <b>synchronisation offset</b> for that input:
        how far from the click you habitually land, plus whatever your keyboard, trackpad and browser add on the way
        here. The drill subtracts it, so what it grades is your timing rather than your hardware.
      </p>

      <TapPad cls={last === null ? null : flashClass(last)} onTap={handleTap}>
        {running ? (
          <>
            <div className={styles.reading + ' ' + styles.mono}>{last === null ? '—' : signed(last)}</div>
            <div className={styles.readingWord}>
              measuring the {mode ? sourceName(mode) : ''} — {counted} of {CALIBRATION_TAPS}
            </div>
            <div className={styles.calledCount}>Escape to cancel</div>
          </>
        ) : (
          <div className={styles.padHint}>
            Start tapping to begin a run. <b>Space</b>, <b>M</b> or <b>T</b> measures the keyboard; clicking in here
            measures the trackpad. The first {CALIBRATION_WARMUP} taps settle you in and are discarded, then{' '}
            {CALIBRATION_TAPS} are counted.
          </div>
        )}
      </TapPad>

      {status && <p className={styles.note}>{status}</p>}

      <GlassContainer className={styles.panel}>
        <span className={styles.fieldLabel}>Stored constants</span>
        <table className={styles.history}>
          <thead>
            <tr>
              <th>input</th>
              <th>offset</th>
              <th>spread</th>
              <th>runs</th>
              <th>set by hand</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {SOURCES.map((src) => {
              const value = calibration[src];
              return (
                <tr key={src}>
                  <td>{sourceName(src)}</td>
                  <td className="num">{value ? signed(value.offsetMs) : '—'}</td>
                  <td className="num">{value ? '±' + Math.round(value.spreadMs) + ' ms' : '—'}</td>
                  <td className="num">{value ? value.runs : 0}</td>
                  <td>
                    <input
                      className={styles.numberInput}
                      type="number"
                      step="1"
                      placeholder={value && value.manual ? String(Math.round(value.offsetMs)) : 'ms'}
                      value={draft[src] ?? ''}
                      onChange={(event) => setDraft({ ...draft, [src]: event.target.value })}
                    />
                  </td>
                  <td>
                    <button type="button" className={styles.linkButton} onClick={() => setManual(src)}>
                      {draft[src] ? 'Set' : 'Clear'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className={styles.note}>
          The stored constant is the <b>median across runs</b> of that input, not the last one: a single run is not
          stable enough to trust, and a median is robust to a bad one. A value typed in above overrides it until you
          clear it.
        </p>
        <div className={styles.actions}>
          <label className={styles.fieldLabel}>
            Click tempo{' '}
            <input
              className={styles.numberInput}
              type="number"
              min={40}
              max={200}
              step={5}
              value={bpm}
              disabled={running}
              onChange={(event) => setBpm(Math.max(40, Math.min(200, Number(event.target.value) || 120)))}
            />
          </label>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => onChange({ history: [], manual: {} })}
          >
            Forget every measurement
          </button>
        </div>
      </GlassContainer>

      {stored.history.length > 0 && (
        <GlassContainer className={styles.panel}>
          <span className={styles.fieldLabel}>Runs</span>
          <table className={styles.history}>
            <thead>
              <tr>
                <th>input</th>
                <th>offset</th>
                <th>spread</th>
                <th>bpm</th>
                <th>taps</th>
                <th>when</th>
              </tr>
            </thead>
            <tbody>
              {stored.history.map((run) => (
                <tr key={run.at}>
                  <td>{sourceName(run.src)}</td>
                  <td className="num">{signed(run.offsetMs)}</td>
                  <td className="num">±{Math.round(run.spreadMs)} ms</td>
                  <td className="num">{run.bpm}</td>
                  <td className="num">{run.n}</td>
                  <td>{new Date(run.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassContainer>
      )}
    </div>
  );
};
