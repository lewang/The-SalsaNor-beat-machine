import { useEffect, useState } from 'react';
import classnames from 'classnames';
import {
  adoptableOffsets,
  calibrationHint,
  describeMachine,
  describeVoice,
  IDrillRun,
  sessionLengthLabel,
  TapSource,
} from '../../engine/drill';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import { ICalibrationValue } from '../../engine/calibration';
import { GlassButton, GlassContainer } from '../ui';
import styles from './drill.module.css';

interface IDrillSummaryProps {
  run: IDrillRun;
  history: IDrillRun[];
  onAgain: () => void;
  onRestore: (run: IDrillRun) => void;
  onRemove: (run: IDrillRun) => void;
  onAdoptCalibration: (src: TapSource, offsetMs: number) => void;
  calibration: Partial<Record<TapSource, ICalibrationValue | null>>;
  onBack: () => void;
}

const signed = (ms: number) => (ms < 0 ? '−' : '+') + Math.round(Math.abs(ms));
const when = (at: number) => {
  const date = new Date(at);
  return (
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className={styles.summaryCell}>
    <span className={styles.summaryValue}>{value}</span>
    <span className={styles.summaryLabel}>{label}</span>
  </div>
);

const sourceName = (src: TapSource) => (src === 'key' ? 'keyboard' : 'trackpad');

export const DrillSummary = ({
  run,
  history,
  onAgain,
  onRestore,
  onRemove,
  onAdoptCalibration,
  calibration,
  onBack,
}: IDrillSummaryProps) => {
  const [expanded, setExpanded] = useState<number | null>(run.at);
  const [showLegend, setShowLegend] = useState(false);

  // A finished session opens itself; whatever was open from browsing earlier ones gives way to it.
  useEffect(() => setExpanded(run.at), [run.at]);

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          Sessions{' '}
          <button
            type="button"
            className={styles.info}
            aria-label="What the numbers mean"
            aria-expanded={showLegend}
            title="What the numbers mean"
            onClick={() => setShowLegend(!showLegend)}
          >
            <InfoOutlinedIcon />
          </button>
        </h2>
        <div className={styles.actions}>
          <GlassButton variant="primary" onClick={onAgain}>
            Again
          </GlassButton>
          <GlassButton variant="ghost" onClick={onBack}>
            Back to the machine
          </GlassButton>
        </div>
      </div>

      {showLegend && (
        <GlassContainer className={styles.panel}>
          <p className={styles.note}>
            <b>On it</b> is taps inside an eighth of a beat; <b>drift</b> is the bias to correct on the next run, a
            positive number meaning you are habitually behind the beat. <b>Spread</b> is how consistent you were
            around your own bias, and is the one that shrinks with practice. <b>Raw</b> is the median over every
            tap, strays included, so a constant input delay shows there even when nothing scored. Called beats you
            let pass are not counted.
          </p>
        </GlassContainer>
      )}

      <GlassContainer className={styles.panel}>
        <div className={styles.sessions}>
          {history.map((entry) => {
            const open = expanded === entry.at;
            const hint = calibrationHint(entry.summary);
            const rig = describeMachine(entry.machine);
            return (
              <div key={entry.at} className={classnames(styles.session, entry.at === run.at && styles.current)}>
                <div className={styles.sessionRow}>
                  <button
                    type="button"
                    className={styles.sessionHead}
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? null : entry.at)}
                  >
                    <span className={styles.chevron}>{open ? '▾' : '▸'}</span>
                    <span className={styles.sessionWhen}>{when(entry.at)}</span>
                    <span className={classnames(styles.mono, styles.sessionPattern)}>{entry.patternTitle}</span>
                    <span className={styles.sessionSpec}>
                      {sessionLengthLabel(entry.settings.seconds)} · voice {describeVoice(entry.settings.voice)} ·{' '}
                      {entry.machine.bpm} BPM
                    </span>
                    <span className={styles.sessionRig}>
                      {rig.length ? rig.length + (rig.length === 1 ? ' instrument' : ' instruments') : 'nothing playing'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.rowIcon}
                    aria-label="Restore this machine"
                    title="Restore this machine"
                    onClick={() => onRestore(entry)}
                  >
                    <SettingsBackupRestoreIcon />
                  </button>
                  <button
                    type="button"
                    className={styles.rowIcon}
                    aria-label="Remove this session"
                    title="Remove this session"
                    onClick={() => onRemove(entry)}
                  >
                    <CloseIcon />
                  </button>
                </div>

                {open && (
                  <div className={styles.sessionBody}>
                    <div className={styles.summaryGrid}>
                      <Stat
                        value={entry.summary.onPercent === null ? '—' : Math.round(entry.summary.onPercent) + '%'}
                        label="on it"
                      />
                      <Stat
                        value={entry.summary.meanMs === null ? '—' : signed(entry.summary.meanMs)}
                        label="drift (ms)"
                      />
                      <Stat
                        value={entry.summary.sdMs === null ? '—' : '±' + Math.round(entry.summary.sdMs)}
                        label="spread (ms)"
                      />
                      <Stat value={String(entry.summary.n)} label="taps" />
                      <Stat value={String(entry.summary.strays)} label="strays" />
                      <Stat
                        value={entry.summary.rawMedianMs === null ? '—' : signed(entry.summary.rawMedianMs)}
                        label="raw (ms)"
                      />
                    </div>
                    {hint && (
                      <div className={styles.hint}>
                        <p className={classnames(styles.note, styles.warn)}>{hint}</p>
                        <div className={styles.actions}>
                          {adoptableOffsets(entry.summary).map((offset) => {
                            const current = calibration[offset.src];
                            const already =
                              current && Math.abs(current.offsetMs - offset.medianMs) < 1 && current.manual;
                            return (
                              <button
                                key={offset.src}
                                type="button"
                                className={styles.linkButton}
                                disabled={Boolean(already)}
                                onClick={() => onAdoptCalibration(offset.src, offset.medianMs)}
                              >
                                {already
                                  ? sourceName(offset.src) + ' constant is ' + signed(offset.medianMs) + ' ms'
                                  : 'Use ' + signed(offset.medianMs) + ' ms as the ' + sourceName(offset.src) +
                                    ' constant (' + offset.n + ' taps)'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className={styles.rigList}>
                      {rig.length ? (
                        rig.map((instrument) => (
                          <div key={instrument.name} className={styles.rigLine}>
                            <span className={styles.rigName}>{instrument.name}</span>
                            <span className={styles.rigProgram}>{instrument.program || '—'}</span>
                          </div>
                        ))
                      ) : (
                        <div className={styles.rigLine}>nothing playing</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassContainer>
    </div>
  );
};
