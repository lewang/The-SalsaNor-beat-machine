import classnames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BeatEngine } from '../../engine/beat-engine';
import { ICalibrationValue } from '../../engine/calibration';
import {
  calibrationHint,
  CLOSE_BEATS,
  gradeTap,
  IDrillSettings,
  INSTRUCTOR_ID,
  ITap,
  programCycleBeats,
  programTargets,
  IVoiceCycle,
  summarizeTaps,
  TapSource,
  voiceAlternates,
  voiceSoundsAt,
} from '../../engine/drill';
import { IMachine } from '../../engine/machine-interfaces';
import { useTapInput } from '../../hooks/use-tap-input';
import { GlassButton, GlassContainer } from '../ui';
import { TapPad } from './tap-pad';
import { TapPlot } from './tap-plot';
import styles from './drill.module.css';

interface IDrillScreenProps {
  engine: BeatEngine;
  machine: IMachine;
  settings: IDrillSettings;
  calibration: Partial<Record<TapSource, ICalibrationValue | null>>;
  onFinish: (taps: ITap[], elapsedMs: number) => void;
}

const clock = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
};

const signed = (ms: number) => (ms < 0 ? '−' : '+') + Math.round(Math.abs(ms));

/** A dry click on your own tap, for hearing your flam against the beat. Off unless asked for: it also masks it. */
function playClick(context: AudioContext | undefined) {
  if (!context) {
    return;
  }
  const at = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.frequency.value = 1600;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.18, at + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(at);
  osc.stop(at + 0.04);
}

/** Reads the engine's beat every frame, so it lives apart from the screen that only changes when you tap. */
const VoiceLeg = observer(({ engine, voice }: { engine: BeatEngine; voice: IVoiceCycle }) => {
  if (!voiceAlternates(voice)) {
    return null;
  }
  const calling = engine.playing && voiceSoundsAt(voice, Math.max(0, Math.floor(engine.beat * 2)));
  return (
    <span className={classnames(styles.voiceLeg, calling ? styles.calling : styles.silent)}>
      {calling ? 'calling' : 'silent'}
    </span>
  );
});

VoiceLeg.displayName = 'VoiceLeg';

export const DrillScreen = ({ engine, machine, settings, calibration, onFinish }: IDrillScreenProps) => {
  const [taps, setTaps] = useState<ITap[]>([]);
  const [last, setLast] = useState<ITap | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [clickOnTap, setClickOnTap] = useState(false);
  const collected = useRef<ITap[]>([]);
  const startedAt = useRef(0);
  const done = useRef(false);
  const finish = useRef(onFinish);
  finish.current = onFinish;

  // The instructor's program list is the catalogue of count patterns; which one is being tapped is read from
  // it without disturbing what that instrument is itself playing.
  const instructor = machine.instruments.find((candidate) => candidate.id === INSTRUCTOR_ID);
  const program = instructor?.programs[settings.programIndex];
  const targets = useMemo(() => (program ? programTargets(program) : []), [program]);
  const cycleBeats = program ? programCycleBeats(program) : 0;

  // The instructor is left alone: the regime can only take its voice away, never switch it on or change what
  // it is playing. The pattern being tapped is a setting of the drill, not of that instrument.
  useEffect(() => {
    engine.voiceCycle = settings.voice;
    engine.stop();
    engine.play();
    startedAt.current = performance.now();
    return () => {
      engine.stop();
      engine.voiceCycle = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const limit = settings.seconds === null ? null : settings.seconds * 1000;
    const timer = window.setInterval(() => {
      const since = performance.now() - startedAt.current;
      setElapsedMs(since);
      if (limit !== null && since >= limit && !done.current) {
        done.current = true;
        finish.current(collected.current, limit);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [settings.seconds]);

  const handleTap = useCallback(
    (perfMs: number, src: TapSource) => {
      if (done.current || !engine.playing || !targets.length) {
        return;
      }
      const beat = engine.beatAtPerformanceTime(perfMs);
      if (beat == null) {
        return;
      }
      const msPerBeat = engine.beatTime * 1000;
      const offsetMs = calibration[src]?.offsetMs ?? 0;
      const tap = gradeTap(targets, cycleBeats, beat - offsetMs / msPerBeat, msPerBeat);
      if (!tap) {
        return;
      }
      collected.current = [...collected.current, { ...tap, src }];
      setTaps(collected.current);
      setLast(tap);
      if (clickOnTap) {
        playClick(engine.audioContext);
      }
    },
    [engine, targets, cycleBeats, calibration, clickOnTap],
  );

  useTapInput(true, handleTap);

  const summary = summarizeTaps(taps);
  const msPerBeat = engine.beatTime * 1000;
  const remaining = settings.seconds === null ? null : settings.seconds * 1000 - elapsedMs;
  const needle = last ? 50 + Math.max(-1, Math.min(1, last.errBeats / CLOSE_BEATS)) * 50 : 50;
  const hint = calibrationHint(summary);

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          <span className={styles.mono}>{program?.title ?? '—'}</span> <VoiceLeg engine={engine} voice={settings.voice} />
        </h2>
        <div className={styles.actions}>
          <span className={styles.clock}>{remaining === null ? clock(elapsedMs) : clock(remaining)}</span>
          <button
            type="button"
            className={styles.choice}
            aria-pressed={clickOnTap}
            onClick={() => setClickOnTap(!clickOnTap)}
          >
            Click on tap
          </button>
          <GlassButton
            variant="ghost"
            onClick={() => {
              if (done.current) {
                return;
              }
              done.current = true;
              onFinish(collected.current, performance.now() - startedAt.current);
            }}
          >
            End session
          </GlassButton>
        </div>
      </div>

      <TapPad cls={last ? last.cls : null} onTap={handleTap}>
        {last ? (
          <>
            <div className={classnames(styles.reading, styles.mono)}>{signed(last.errMs)} ms</div>
            <div className={styles.readingWord}>
              {last.cls === 'on'
                ? 'on it'
                : (last.errMs < 0 ? 'early' : 'late') + (last.cls === 'stray' ? ', and not by a little' : '')}
            </div>
            <div className={styles.calledCount}>against the {last.count}</div>
          </>
        ) : (
          <div className={styles.padHint}>Tap anywhere in here, or press Space, M or T.</div>
        )}
        <div className={styles.gauge}>
          <div className={styles.gaugeBand} />
          <div className={styles.gaugeCentre} />
          {last && <div className={styles.needle} style={{ left: needle + '%' }} />}
        </div>
        <div className={styles.gaugeEnds}>
          <span>early −{Math.round(msPerBeat * CLOSE_BEATS)} ms</span>
          <span>±{Math.round(msPerBeat / 8)} ms</span>
          <span>late +{Math.round(msPerBeat * CLOSE_BEATS)} ms</span>
        </div>
      </TapPad>

      <GlassContainer className={styles.panel}>
        <TapPlot taps={taps} />
        <div className={styles.stats}>
          <span>
            <b>{summary.n}</b> taps
          </span>
          <span>
            <b>{summary.onPercent === null ? '—' : Math.round(summary.onPercent) + '%'}</b> on it
          </span>
          <span>
            drift <b>{summary.meanMs === null ? '—' : signed(summary.meanMs) + ' ms'}</b>
          </span>
          <span>
            spread <b>{summary.sdMs === null ? '—' : '±' + Math.round(summary.sdMs) + ' ms'}</b>
          </span>
          <span>
            strays <b>{summary.strays}</b>
          </span>
          <span>
            raw <b>{summary.rawMedianMs === null ? '—' : signed(summary.rawMedianMs) + ' ms'}</b>
          </span>
        </div>
        {hint && <p className={styles.note}>{hint}</p>}
      </GlassContainer>
    </div>
  );
};
