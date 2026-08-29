import { GlassButton, GlassContainer } from '../ui';
import { ICalibrationValue } from '../../engine/calibration';
import {
  IDrillSettings,
  INSTRUCTOR_ID,
  REGIME_LABELS,
  SESSION_SECONDS,
  sessionLengthLabel,
  TapSource,
  VoiceRegime,
} from '../../engine/drill';
import { IMachine } from '../../engine/machine-interfaces';
import styles from './drill.module.css';

interface IDrillSetupProps {
  machine: IMachine;
  settings: IDrillSettings;
  calibration: Partial<Record<TapSource, ICalibrationValue | null>>;
  onChange: (settings: IDrillSettings) => void;
  onStart: () => void;
  onCalibrate: () => void;
  onBack: () => void;
}

export const DrillSetup = ({
  machine,
  settings,
  calibration,
  onChange,
  onStart,
  onCalibrate,
  onBack,
}: IDrillSetupProps) => {
  const instructor = machine.instruments.find((instrument) => instrument.id === INSTRUCTOR_ID);
  const measured = (['key', 'pad'] as TapSource[]).filter((src) => calibration[src]);

  if (!instructor) {
    return (
      <GlassContainer className={styles.panel}>
        <p className={styles.note}>This machine has no instructor, so there is no called pattern to drill against.</p>
        <GlassButton variant="ghost" onClick={onBack}>
          Back to the machine
        </GlassButton>
      </GlassContainer>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h2 className={styles.title}>Tap-along drill</h2>
        <GlassButton variant="ghost" onClick={onBack}>
          Back to the machine
        </GlassButton>
      </div>
      <p className={styles.lede}>
        Tap the pattern, on the keyboard or the trackpad, and each tap is graded against the machine&rsquo;s own
        clock. The pattern is yours to pick and is independent of the instructor, which stays whatever you set it to
        on the machine screen — switch it off there and you tap against the music alone. Everything is chosen here:
        once the session starts the instruments are locked, so the machine you tuned is the machine you practise
        against.
      </p>

      <GlassContainer className={styles.panel}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Tap pattern</span>
          <div className={styles.choices}>
            {instructor.programs.map((program, index) => (
              <button
                key={program.title}
                type="button"
                className={styles.choice}
                aria-pressed={settings.programIndex === index}
                onClick={() => onChange({ ...settings, programIndex: index })}
              >
                <span className={styles.mono}>{program.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Instructor</span>
          <div className={styles.choices}>
            {REGIME_LABELS.map((regime) => (
              <button
                key={regime.value}
                type="button"
                className={styles.choice}
                aria-pressed={settings.regime === regime.value}
                onClick={() => onChange({ ...settings, regime: regime.value as VoiceRegime })}
              >
                <span>{regime.label}</span>
                <small>{regime.detail}</small>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Length</span>
          <div className={styles.choices}>
            {SESSION_SECONDS.map((seconds) => (
              <button
                key={String(seconds)}
                type="button"
                className={styles.choice}
                aria-pressed={settings.seconds === seconds}
                onClick={() => onChange({ ...settings, seconds })}
              >
                <span>{sessionLengthLabel(seconds)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <GlassButton variant="primary" onClick={onStart}>
            Start drilling
          </GlassButton>
          <span className={styles.note}>
            {measured.length === 2 ? (
              <>
                Keyboard and trackpad both measured — <b className={styles.mono}>
                  {Math.round(calibration.key!.offsetMs)} ms
                </b>{' '}
                and <b className={styles.mono}>{Math.round(calibration.pad!.offsetMs)} ms</b> come off your taps.{' '}
              </>
            ) : measured.length === 1 ? (
              <span className={styles.warn}>
                Only the {measured[0] === 'key' ? 'keyboard' : 'trackpad'} is measured; the other input will be graded
                uncorrected.{' '}
              </span>
            ) : (
              <span className={styles.warn}>
                Nothing is measured yet, so your input delay is counted as part of your error.{' '}
              </span>
            )}
            <button type="button" className={styles.linkButton} onClick={onCalibrate}>
              Calibrate
            </button>
          </span>
        </div>
      </GlassContainer>
    </div>
  );
};
