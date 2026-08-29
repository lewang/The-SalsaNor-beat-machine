import classnames from 'classnames';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { GlassButton, GlassContainer } from '../ui';
import { ICalibrationValue } from '../../engine/calibration';
import {
  IDrillSettings,
  INSTRUCTOR_ID,
  SESSION_SECONDS,
  sessionLengthLabel,
  VOICE_OFF_OPTIONS,
  VOICE_ON_OPTIONS,
  TapSource,
} from '../../engine/drill';
import { IMachine } from '../../engine/machine-interfaces';
import styles from './drill.module.css';

interface IDrillSetupProps {
  machine: IMachine;
  settings: IDrillSettings;
  calibration: Partial<Record<TapSource, ICalibrationValue | null>>;
  onChange: (settings: IDrillSettings) => void;
  onStart: () => void;
  onDefaults: () => void;
  onCalibrate: () => void;
  onBack: () => void;
}

export const DrillSetup = ({
  machine,
  settings,
  calibration,
  onChange,
  onStart,
  onDefaults,
  onCalibrate,
  onBack,
}: IDrillSetupProps) => {
  const instructor = machine.instruments.find((instrument) => instrument.id === INSTRUCTOR_ID);
  const instructorOn = Boolean(instructor?.enabled);
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
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.rowIcon}
            aria-label="Restore the default settings"
            title="Restore the default settings"
            onClick={onDefaults}
          >
            <RestartAltIcon />
          </button>
          <GlassButton variant="ghost" onClick={onBack}>
            Back to the machine
          </GlassButton>
        </div>
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

        <div className={classnames(styles.field, !instructorOn && styles.fieldOff)}>
          <span className={styles.fieldLabel}>Instructor</span>
          <div className={styles.choices}>
            <label className={styles.pair}>
              <span className={styles.pairLabel}>on</span>
              <select
                className={styles.select}
                disabled={!instructorOn}
                value={String(settings.voice.onBars)}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    voice: { ...settings.voice, onBars: event.target.value === 'null' ? null : Number(event.target.value) },
                  })
                }
              >
                {VOICE_ON_OPTIONS.map((option) => (
                  <option key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.pair}>
              <span className={styles.pairLabel}>off</span>
              <select
                className={styles.select}
                disabled={!instructorOn}
                value={String(settings.voice.offBars)}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    voice: { ...settings.voice, offBars: event.target.value === 'null' ? null : Number(event.target.value) },
                  })
                }
              >
                {VOICE_OFF_OPTIONS.map((option) => (
                  <option key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <span className={styles.note}>
            {instructorOn
              ? 'How long the count is called for, and how long it then holds off, repeating. A bar is four beats, so the eight-count spans two of them.'
              : 'The instructor is switched off on the machine screen, so there is no voice to hold back. Turn it on there to use this.'}
          </span>
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
