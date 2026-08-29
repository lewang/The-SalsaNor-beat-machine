import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { observable } from 'mobx';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';

import { ClaveDirection } from '../engine/machine-interfaces';
import { useBeatEngine } from '../hooks/use-beat-engine';
import { useWindowListener } from '../hooks/use-window-listener';
import { GlassContainer, GlassButton, GlassSlider } from './ui';
import { BeatIndicator } from './beat-indicator';
import { InstrumentTile } from './instrument-tile';
import styles from './beat-machine-ui-glass.module.scss';
import { IDefaultMachines } from './beat-machine-ui';
import {
  applyMachineSnapshot,
  IDrillRun,
  IDrillSettings,
  IMachineSnapshot,
  INSTRUCTOR_ID,
  ITap,
  snapshotMachine,
  summarizeTaps,
} from '../engine/drill';
import { calibrationFor } from '../engine/calibration';
import {
  IStoredCalibration,
  loadCalibration,
  loadDrillHistory,
  saveCalibration,
  saveDrillHistory,
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

export const BeatMachineUIGlass = observer(({ machines }: IBeatMachineUIGlassProps) => {
  const { salsa, merengue } = machines;
  const engine = useBeatEngine();
  const [machine, setMachine] = useState(observable(salsa));
  const [instructorLanguage, setInstructorLanguage] = useState<string>('');
  const [screen, setScreen] = useState<'machine' | 'setup' | 'drill' | 'summary' | 'calibrate'>('machine');
  const [settings, setSettings] = useState<IDrillSettings>({ programIndex: 1, regime: 'on', seconds: 300 });
  const [calibrationStore, setCalibrationStore] = useState<IStoredCalibration>({ history: [], manual: {} });
  const [drillHistory, setDrillHistory] = useState<IDrillRun[]>([]);
  const [lastRun, setLastRun] = useState<IDrillRun | null>(null);
  const [tunedAs, setTunedAs] = useState<IMachineSnapshot | null>(null);

  // Both stores are per-browser, so they can only be read once there is a browser to read them from.
  useEffect(() => {
    setCalibrationStore(loadCalibration());
    setDrillHistory(loadDrillHistory());
  }, []);

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

  const openDrill = () => setScreen('setup');

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
    setSettings(run.settings);
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
      instructor.language = instructorLanguage || undefined;
      localStorage.setItem('beat-machine-instructor-lang', instructorLanguage);
    }
  }, [instructorLanguage, machine]);

  useEffect(() => {
    if (engine && machine) {
      engine.machine = machine;
    }
  }, [engine, machine]);

  const hasClave = machine.instruments.some((instrument) => instrument.respectsClave);
  const beatCount = machine.flavor === 'Merengue' ? 4 : 8;
  const beatDivider = machine.flavor === 'Merengue' ? 2 : 1;
  const beatIndex = engine?.playing ? Math.round(0.5 + ((engine.beat / beatDivider) % beatCount)) : 0;

  useWindowListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (screen !== 'machine') {
        return;
      }
      switch (event.key) {
        case '+':
        case '=':
          machine.bpm = Math.min(250, machine.bpm + 5);
          break;
        case '-':
          machine.bpm = Math.max(80, machine.bpm - 5);
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

  const handlePlayPause = () => {
    if (engine?.playing) {
      engine?.stop();
    } else {
      engine?.play();
    }
  };

  const handleStop = () => {
    engine?.stop();
  };

  if (screen !== 'machine' && engine) {
    return (
      <div className={styles.container}>
        {screen === 'setup' && (
          <DrillSetup
            machine={machine}
            settings={settings}
            calibration={calibration}
            onChange={setSettings}
            onStart={startDrill}
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
            leftIcon={engine?.playing ? <PauseIcon /> : <PlayArrowIcon />}
            onClick={handlePlayPause}
          >
            {engine?.playing ? 'Pause' : 'Play'}
          </GlassButton>
          <GlassButton variant="ghost" leftIcon={<StopIcon />} onClick={handleStop}>
            Stop
          </GlassButton>
          <GlassButton variant="ghost" onClick={openDrill} disabled={!engine}>
            Drill
          </GlassButton>
          
          <div className={styles.bpmControl}>
            <span className={styles.bpmLabel}>BPM:</span>
            <span className={styles.bpmValue}>{machine.bpm}</span>
            <GlassSlider
              value={machine.bpm}
              min={80}
              max={200}
              step={5}
              onChange={(value) => (machine.bpm = value)}
              className={styles.bpmSlider}
            />
          </div>

          <div className={styles.settingSelects}>
            <label className={styles.setting}>
              <span className={styles.settingLabel}>Style</span>
              <select
                className={styles.settingDropdown}
                value={machine.flavor}
                onChange={(e) => setMachine(observable(e.target.value === 'Merengue' ? merengue : salsa))}
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
