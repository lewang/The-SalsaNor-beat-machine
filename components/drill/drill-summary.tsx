import { calibrationHint, describeMachine, IDrillRun, REGIME_LABELS, sessionLengthLabel } from '../../engine/drill';
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
const regimeLabel = (value: string) => REGIME_LABELS.find((regime) => regime.value === value)?.label ?? value;
const when = (at: number) => {
  const date = new Date(at);
  return (
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );
};

export const DrillSummary = ({ run, history, onAgain, onRestore, onRemove, onBack }: IDrillSummaryProps) => {
  const { summary } = run;
  const past = history.filter((entry) => entry.at !== run.at);
  const hint = calibrationHint(summary);

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          <span className={styles.mono}>{run.patternTitle}</span> — {regimeLabel(run.settings.regime)},{' '}
          {sessionLengthLabel(run.settings.seconds)}
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

      <GlassContainer className={styles.panel}>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCell}>
            <span className={styles.summaryValue}>
              {summary.onPercent === null ? '—' : Math.round(summary.onPercent) + '%'}
            </span>
            <span className={styles.summaryLabel}>on it</span>
          </div>
          <div className={styles.summaryCell}>
            <span className={styles.summaryValue}>{summary.meanMs === null ? '—' : signed(summary.meanMs)}</span>
            <span className={styles.summaryLabel}>drift (ms)</span>
          </div>
          <div className={styles.summaryCell}>
            <span className={styles.summaryValue}>
              {summary.sdMs === null ? '—' : '±' + Math.round(summary.sdMs)}
            </span>
            <span className={styles.summaryLabel}>spread (ms)</span>
          </div>
          <div className={styles.summaryCell}>
            <span className={styles.summaryValue}>{summary.n}</span>
            <span className={styles.summaryLabel}>taps</span>
          </div>
          <div className={styles.summaryCell}>
            <span className={styles.summaryValue}>{summary.strays}</span>
            <span className={styles.summaryLabel}>strays</span>
          </div>
          <div className={styles.summaryCell}>
            <span className={styles.summaryValue}>
              {summary.rawMedianMs === null ? '—' : signed(summary.rawMedianMs)}
            </span>
            <span className={styles.summaryLabel}>raw (ms)</span>
          </div>
        </div>
        {hint && <p className={styles.note + ' ' + styles.warn}>{hint}</p>}
        <p className={styles.note}>
          Drift is the bias to correct on the next run — a positive number means you are habitually behind the beat.
          Spread is how consistent you were around your own bias, and is the one that shrinks with practice. Only
          taps you actually made are counted: called beats you let pass are not scored.
        </p>
      </GlassContainer>

      {past.length > 0 && (
        <GlassContainer className={styles.panel}>
          <span className={styles.fieldLabel}>Earlier sessions</span>
          <table className={styles.history}>
            <thead>
              <tr>
                <th>when</th>
                <th>tap pattern</th>
                <th>length</th>
                <th>instructor</th>
                <th>taps</th>
                <th>on it</th>
                <th>drift</th>
                <th>spread</th>
                <th>machine</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {past.map((entry) => (
                <tr key={entry.at}>
                  <td>{when(entry.at)}</td>
                  <td className={styles.mono}>{entry.patternTitle}</td>
                  <td>{sessionLengthLabel(entry.settings.seconds)}</td>
                  <td>{regimeLabel(entry.settings.regime)}</td>
                  <td className="num">{entry.summary.n}</td>
                  <td className="num">
                    {entry.summary.onPercent === null ? '—' : Math.round(entry.summary.onPercent) + '%'}
                  </td>
                  <td className="num">{entry.summary.meanMs === null ? '—' : signed(entry.summary.meanMs)}</td>
                  <td className="num">
                    {entry.summary.sdMs === null ? '—' : '±' + Math.round(entry.summary.sdMs)}
                  </td>
                  <td>
                    <div className={styles.mono}>{entry.machine.bpm} BPM</div>
                    <div className={styles.rig}>{describeMachine(entry.machine).join(', ') || 'nothing playing'}</div>
                  </td>
                  <td className={styles.rowActions}>
                    <button type="button" className={styles.linkButton} onClick={() => onRestore(entry)}>
                      Restore
                    </button>
                    <button type="button" className={styles.linkButton} onClick={() => onRemove(entry)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.note}>
            Restoring puts the machine back the way it was for that run — tempo, key, clave, and every
            instrument&rsquo;s program, volume and mute — and preselects the same pattern, voice and length, so the
            next run is comparable with it.
          </p>
        </GlassContainer>
      )}
    </div>
  );
};
