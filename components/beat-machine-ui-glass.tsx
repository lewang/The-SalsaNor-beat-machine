import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { observable } from 'mobx';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';

import { ClaveDirection, IMachine } from '../engine/machine-interfaces';
import { useBeatEngine } from '../hooks/use-beat-engine';
import { useWindowListener } from '../hooks/use-window-listener';
import { GlassContainer, GlassButton } from './ui';
import { BeatIndicator } from './beat-indicator';
import { InstrumentTile } from './instrument-tile';
import styles from './beat-machine-ui-glass.module.scss';
import { IDefaultMachines } from './beat-machine-ui';
import {
  applyMachineSnapshot,
  DEFAULT_DRILL_SETTINGS,
  IDrillRun,
  IDrillSettings,
  IMachineSnapshot,
  INSTRUCTOR_ID,
  ITap,
  snapshotMachine,
  TapSource,
  summarizeTaps,
} from '../engine/drill';
import { calibrationFor } from '../engine/calibration';
import { identifyMix, MIX_LABELS, mixFor, nextMixChoice } from '../engine/machine-mix';
import {
  IStoredCalibration,
  loadCalibration,
  loadDrillHistory,
  loadDrillSettings,
  loadInstrumentMixes,
  saveCalibration,
  saveDrillHistory,
  saveDrillSettings,
  saveInstrumentMixes,
} from '../engine/practice-storage';
import { DrillSetup } from './drill/drill-setup';
import { DrillScreen } from './drill/drill-screen';
import { DrillSummary } from './drill/drill-summary';
import { CalibrateScreen } from './drill/calibrate-screen';

export interface IBeatMachineUIGlassProps {
  machines: IDefaultMachines;
}

export const INSTRUCTOR_LANGUAGES = [
  { value: '', label: 'English' },
  { value: 'italian', label: 'Italiano' },
  { value: 'spanish', label: 'Espanol' },
  { value: 'french', label: 'Francais' },
  { value: 'russian', label: 'Russkiy' },
  { value: 'german', label: 'Deutsch' },
];

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const BPM_PRESETS = [80, 120, 160, 180, 200];
const BPM_MIN = 60;
const BPM_MAX = 250;

/** Enabling has to restore the gain as well as the flag, the same as a tile's own toggle does. */
function applyMixIds(machine: IMachine, ids: string[] | undefined) {
  if (!ids) {
    return;
  }
  for (const instrument of machine.instruments) {
    const on = ids.includes(instrument.id);
    instrument.volume = on ? instrument.unmutedVolume : 0;
    instrument.enabled = on;
  }
}

export const BeatMachineUIGlass = observer(({ machines }: IBeatMachineUIGlassProps) => {
  const { salsa, merengue } = machines;
  const engine = useBeatEngine();
  const [machine, setMachine] = useState(observable(salsa));
  const [instructorLanguage, setInstructorLanguage] = useState<string>('');
  const [screen, setScreen] = useState<'machine' | 'setup' | 'drill' | 'summary' | 'calibrate'>('machine');
  const [settings, setSettings] = useState<IDrillSettings>(DEFAULT_DRILL_SETTINGS);
  const [calibrationStore, setCalibrationStore] = useState<IStoredCalibration>({ history: [], manual: {} });
  const [drillHistory, setDrillHistory] = useState<IDrillRun[]>([]);
  const [lastRun, setLastRun] = useState<IDrillRun | null>(null);
  const [tunedAs, setTunedAs] = useState<IMachineSnapshot | null>(null);
  const [savedMixes, setSavedMixes] = useState<Record<string, string[]>>({});
  const [customBpm, setCustomBpm] = useState(false);
  const [bpmText, setBpmText] = useState('');
  const allInstruments = useRef<HTMLInputElement>(null);

  // Both stores are per-browser, so they can only be read once there is a browser to read them from.
  useEffect(() => {
    setCalibrationStore(loadCalibration());
    setDrillHistory(loadDrillHistory());
    setSettings(loadDrillSettings());
    const mixes = loadInstrumentMixes();
    setSavedMixes(mixes);
    applyMixIds(machine, mixes[machine.flavor]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // What you drilled last time is what the screen opens on, so a routine does not have to be rebuilt daily.
  const changeSettings = (next: IDrillSettings) => {
    setSettings(next);
    saveDrillSettings(next);
  };

  const calibration = useMemo(
    () => ({
      key: calibrationFor(calibrationStore.history, calibrationStore.manual, 'key'),
      pad: calibrationFor(calibrationStore.history, calibrationStore.manual, 'pad'),
    }),
    [calibrationStore],
  );

  const rememberCalibration = (next: IStoredCalibration) => {
    setCalibrationStore(next);
    saveCalibration(next);
  };

  /**
   * A delay the drill measured, adopted as that input's constant. Kept as a hand-set value rather than filed as
   * a run: it was measured against the music rather than the calibration screen's bare click, so it should not
   * be averaged in with those, and it stays visible there as an override you can clear.
   */
  const adoptCalibration = (src: TapSource, offsetMs: number) => {
    rememberCalibration({
      ...calibrationStore,
      manual: { ...calibrationStore.manual, [src]: Math.round(offsetMs) },
    });
  };

  // The machine falls silent on the way into the drill: the session starts the transport itself, from the top
  // of an eight-count, and nothing should be running underneath while the settings are chosen.
  const openDrill = () => {
    engine?.stop();
    setScreen('setup');
  };

  // Muting has to zero the gain as well as clear the flag, the same as a tile's own toggle: notes are already
  // scheduled seconds ahead and are on their way to the speakers regardless.
  const cycleInstruments = () => {
    const enabled = machine.instruments.map((instrument) => instrument.enabled);
    mixFor(nextMixChoice(enabled, lastMix, defaultMix), enabled, lastMix, defaultMix).forEach((on, index) => {
      const instrument = machine.instruments[index];
      instrument.volume = on ? instrument.unmutedVolume : 0;
      instrument.enabled = on;
    });
  };

  const startDrill = () => {
    setTunedAs(snapshotMachine(machine));
    setScreen('drill');
  };

  // The run is filed against the machine as it stood when the session started.
  const finishDrill = (taps: ITap[], elapsedMs: number) => {
    const instructor = machine.instruments.find((instrument) => instrument.id === INSTRUCTOR_ID);
    const run: IDrillRun = {
      at: Date.now(),
      elapsedMs,
      patternTitle: instructor?.programs[settings.programIndex]?.title ?? '',
      settings,
      summary: summarizeTaps(taps),
      machine: tunedAs ?? snapshotMachine(machine),
    };
    const history = [run, ...drillHistory];
    setDrillHistory(history);
    saveDrillHistory(history);
    setLastRun(run);
    setScreen('summary');
  };

  const forgetRun = (run: IDrillRun) => {
    const history = drillHistory.filter((entry) => entry.at !== run.at);
    setDrillHistory(history);
    saveDrillHistory(history);
  };

  const restoreRun = (run: IDrillRun) => {
    const sameFlavor = machine.flavor === run.machine.flavor;
    const target = sameFlavor ? machine : observable(run.machine.flavor === 'Merengue' ? merengue : salsa);
    applyMachineSnapshot(target, run.machine);
    if (!sameFlavor) {
      setMachine(target);
    }
    changeSettings(run.settings);
    setScreen('setup');
  };

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('beat-machine-instructor-lang');
    if (savedLanguage) {
      setInstructorLanguage(savedLanguage);
    }
  }, []);

  // Apply language to instructor when it changes
  useEffect(() => {
    const instructor = machine.instruments.find(i => i.id === 'instructor');
    if (instructor) {
      instructor.language = instructorLanguage;
      localStorage.setItem('beat-machine-instructor-lang', instructorLanguage);
    }
  }, [instructorLanguage, machine]);

  useEffect(() => {
    if (engine && machine) {
      engine.machine = machine;
    }
  }, [engine, machine]);

  // Typed freely and settled on the way out: clamping each keystroke makes the field impossible to type in.
  const showCustomBpm = customBpm || !BPM_PRESETS.includes(machine.bpm);
  const commitBpm = () => {
    const typed = Number(bpmText);
    const next =
      Number.isFinite(typed) && bpmText.trim() !== ''
        ? Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(typed)))
        : machine.bpm;
    machine.bpm = next;
    setBpmText(String(next));
  };

  const hasClave = machine.instruments.some((instrument) => instrument.respectsClave);
  const defaultMix = (machine.flavor === 'Merengue' ? merengue : salsa).instruments.map(
    (instrument) => instrument.enabled,
  );
  // Held by id, so the set comes back on the machine it was made for and is simply absent on the other.
  const savedIds = savedMixes[machine.flavor];
  const lastMix = savedIds ? machine.instruments.map((instrument) => savedIds.includes(instrument.id)) : null;
  const enabledNow = machine.instruments.map((instrument) => instrument.enabled);
  const playingCount = enabledNow.filter(Boolean).length;
  const mixChoice = identifyMix(enabledNow, lastMix, defaultMix);

  // A set that is none of the four is one you made yourself: remembered as soon as it exists, rather than
  // when you happen to click away from it, so reloading does not lose it.
  const mixSignature = enabledNow.join(',');
  useEffect(() => {
    if (identifyMix(enabledNow, lastMix, defaultMix) !== null) {
      return;
    }
    const next = {
      ...savedMixes,
      [machine.flavor]: machine.instruments.filter((instrument) => instrument.enabled).map((i) => i.id),
    };
    setSavedMixes(next);
    saveInstrumentMixes(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixSignature, machine.flavor]);

  // Indeterminate is a property rather than an attribute, so React cannot set it from JSX.
  useEffect(() => {
    if (allInstruments.current) {
      allInstruments.current.indeterminate = playingCount > 0 && playingCount < enabledNow.length;
    }
  }, [playingCount, enabledNow.length, screen]);
  const beatCount = machine.flavor === 'Merengue' ? 4 : 8;
  const beatDivider = machine.flavor === 'Merengue' ? 2 : 1;
  const beatIndex = engine?.playing ? Math.round(0.5 + ((engine.beat / beatDivider) % beatCount)) : 0;

  useWindowListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (screen !== 'machine') {
        return;
      }
      // A digit typed into the tempo box is part of a number, not a request to mute the third instrument.
      const target = event.target;
      if (target instanceof Element && target.closest('input, select, textarea, [contenteditable]')) {
        return;
      }
      switch (event.key) {
        case '+':
        case '=':
          machine.bpm = Math.min(BPM_MAX, machine.bpm + 5);
          break;
        case '-':
          machine.bpm = Math.max(BPM_MIN, machine.bpm - 5);
          break;
        case 'k':
          machine.keyNote = (machine.keyNote + 7) % 12;
          break;
        case 'K':
          machine.keyNote = (machine.keyNote + 5) % 12;
          break;
      }
      if (event.key >= '0' && event.key <= '9') {
        const index = (parseInt(event.key, 10) + 10 - 1) % 10;
        const instrument = machine.instruments[index];
        if (instrument) {
          if (event.altKey) {
            instrument.activeProgram = (instrument.activeProgram + 1) % instrument.programs.length;
          } else {
            instrument.enabled = !instrument.enabled;
          }
        }
      }
    },
    [machine, screen],
  );

  // The engine has no pause: stopping resets the grid so a restart begins on a 1. One button, two states.
  const togglePlay = () => {
    if (engine?.playing) {
      engine.stop();
    } else {
      engine?.play();
    }
  };

  if (screen !== 'machine' && engine) {
    return (
      <div className={styles.container}>
        {screen === 'setup' && (
          <DrillSetup
            machine={machine}
            settings={settings}
            calibration={calibration}
            onChange={changeSettings}
            onStart={startDrill}
            onDefaults={() => changeSettings(DEFAULT_DRILL_SETTINGS)}
            onCalibrate={() => setScreen('calibrate')}
            onBack={() => setScreen('machine')}
          />
        )}
        {screen === 'drill' && (
          <DrillScreen
            engine={engine}
            machine={machine}
            settings={settings}
            calibration={calibration}
            onFinish={finishDrill}
          />
        )}
        {screen === 'summary' && lastRun && (
          <DrillSummary
            run={lastRun}
            history={drillHistory}
            onAgain={() => setScreen('drill')}
            onRestore={restoreRun}
            onRemove={forgetRun}
            onAdoptCalibration={adoptCalibration}
            calibration={calibration}
            onBack={() => setScreen('machine')}
          />
        )}
        {screen === 'calibrate' && (
          <CalibrateScreen
            engine={engine}
            stored={calibrationStore}
            calibration={calibration}
            onChange={rememberCalibration}
            onBack={() => setScreen('setup')}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Control Bar */}
      <GlassContainer className={styles.controlBar}>
        <div className={styles.controls}>
          <GlassButton
            variant="primary"
            leftIcon={engine?.playing ? <StopIcon /> : <PlayArrowIcon />}
            aria-label={engine?.playing ? 'Stop' : 'Play'}
            onClick={togglePlay}
          >
            {engine?.playing ? 'Stop' : 'Play'}
          </GlassButton>
          <GlassButton variant="ghost" onClick={openDrill} disabled={!engine}>
            Drill
          </GlassButton>
          
          <div className={styles.settingSelects}>
            <label className={styles.setting}>
              <span className={styles.settingLabel}>BPM</span>
              <select
                className={styles.settingDropdown}
                value={showCustomBpm ? 'custom' : String(machine.bpm)}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setBpmText(String(machine.bpm));
                    setCustomBpm(true);
                  } else {
                    machine.bpm = parseInt(e.target.value, 10);
                    setCustomBpm(false);
                  }
                }}
              >
                {BPM_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
                <option value="custom">custom</option>
              </select>
            </label>

            {showCustomBpm && (
              <label className={styles.setting}>
                <span className={styles.settingLabel}>&nbsp;</span>
                <input
                  className={styles.bpmInput}
                  type="number"
                  inputMode="numeric"
                  min={BPM_MIN}
                  max={BPM_MAX}
                  aria-label="Beats per minute"
                  value={bpmText}
                  onChange={(e) => setBpmText(e.target.value)}
                  onBlur={commitBpm}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                />
              </label>
            )}

            <label className={styles.setting}>
              <span className={styles.settingLabel}>Style</span>
              <select
                className={styles.settingDropdown}
                value={machine.flavor}
                onChange={(e) => {
                  const next = observable(e.target.value === 'Merengue' ? merengue : salsa);
                  applyMixIds(next, savedMixes[next.flavor]);
                  setMachine(next);
                }}
              >
                <option value="Salsa">Salsa</option>
                <option value="Merengue">Merengue</option>
              </select>
            </label>

            <label className={styles.setting}>
              <span className={styles.settingLabel}>Key</span>
              <select
                className={styles.settingDropdown}
                value={machine.keyNote}
                onChange={(e) => (machine.keyNote = parseInt(e.target.value, 10))}
              >
                {KEY_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            {hasClave && (
              <label className={styles.setting}>
                <span className={styles.settingLabel}>Clave</span>
                <select
                  className={styles.settingDropdown}
                  value={machine.claveDirection}
                  onChange={(e) => (machine.claveDirection = e.target.value as ClaveDirection)}
                >
                  <option value="2-3">2-3</option>
                  <option value="3-2">3-2</option>
                </select>
              </label>
            )}

            <label className={`${styles.setting} ${styles.mixSetting}`}>
              <span className={styles.settingLabel}>
                {mixChoice ? MIX_LABELS[mixChoice] : MIX_LABELS.last} {playingCount}/{enabledNow.length}
              </span>
              <input
                ref={allInstruments}
                type="checkbox"
                className={styles.settingCheckbox}
                aria-label={'Instrument set: ' + (mixChoice ? MIX_LABELS[mixChoice] : MIX_LABELS.last)}
                checked={playingCount === enabledNow.length}
                onChange={cycleInstruments}
              />
            </label>
          </div>
        </div>
      </GlassContainer>

      {/* Beat Indicator */}
      <GlassContainer className={styles.beatIndicator}>
        <BeatIndicator currentBeat={beatIndex} max={beatCount} />
      </GlassContainer>

      {/* Instrument Grid */}
      <div className={styles.instrumentGrid}>
        {machine.instruments.map((instrument) => (
          <GlassContainer key={instrument.id} className={styles.instrumentCard}>
            <InstrumentTile
              instrument={instrument}
              languages={instrument.id === 'instructor' ? INSTRUCTOR_LANGUAGES : undefined}
              language={instructorLanguage}
              onLanguageChange={setInstructorLanguage}
            />
          </GlassContainer>
        ))}
      </div>
    </div>
  );
});
