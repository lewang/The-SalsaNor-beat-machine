import { useEffect, useState } from 'react';
import classnames from 'classnames';
import {
  calibrationHint,
  describeMachine,
  describeVoice,
  IDrillRun,
  sessionLengthLabel,
} from '../../engine/drill';
import { GlassButton, GlassContainer } from '../ui';
import styles from './drill.module.css';

interface IDrillSummaryProps {
  run: IDrillRun;
  history: IDrillRun[];
  onAgain: () => void;
  onRestore: (run: IDrillRun) => void;
  onRemove: (run: IDrillRun) => void;
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

export const DrillSummary = ({ run, history, onAgain, onRestore, onRemove, onBack }: IDrillSummaryProps) => {
  const [expanded, setExpanded] = useState<number | null>(run.at);

  // A finished session opens itself; whatever was open from browsing earlier ones gives way to it.
  useEffect(() => setExpanded(run.at), [run.at]);

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h2 className={styles.title}>Sessions</h2>
        <div className={styles.actions}>
          <GlassButton variant="primary" onClick={onAgain}>
            Again
          </GlassButton>
          <GlassButton variant="ghost" onClick={onBack}>
            Back to the machine
          </GlassButton>
        </div>
      </div>

      <GlassContainer className={styles.panel}>
        <div className={styles.sessions}>
          {history.map((entry) => {
            const open = expanded === entry.at;
            const hint = calibrationHint(entry.summary);
            const rig = describeMachine(entry.machine);
            return (
              <div key={entry.at} className={classnames(styles.session, entry.at === run.at && styles.current)}>
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
                  <span className={styles.sessionRig}>{rig.join(', ') || 'nothing playing'}</span>
                </button>

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
                    {hint && <p className={classnames(styles.note, styles.warn)}>{hint}</p>}
                    <p className={styles.note}>
                      Drift is the bias to correct on the next run — a positive number means you are habitually
                      behind the beat. Spread is how consistent you were around your own bias, and is the one that
                      shrinks with practice. Raw is the median over every tap, strays included, so a constant input
                      delay shows there even when nothing scored. Called beats you let pass are not counted.
                    </p>
                    <div className={styles.actions}>
                      <button type="button" className={styles.linkButton} onClick={() => onRestore(entry)}>
                        Restore this machine
                      </button>
                      <button type="button" className={styles.linkButton} onClick={() => onRemove(entry)}>
                        Remove
                      </button>
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
