import { TapSource } from './drill';
import { IDrillRun } from './drill';
import { CALIBRATION_HISTORY_MAX, ICalibrationRun } from './calibration';

const CALIBRATION_KEY = 'bm-tap-calibration';
const DRILL_HISTORY_KEY = 'bm-drill-history';
const DRILL_HISTORY_MAX = 100;

export interface IStoredCalibration {
  history: ICalibrationRun[];
  manual: Partial<Record<TapSource, number>>;
}

const EMPTY_CALIBRATION: IStoredCalibration = { history: [], manual: {} };

function read<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (e) {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* a full or disabled store costs the memory, not the session */
  }
}

export function loadCalibration(): IStoredCalibration {
  const stored = read<IStoredCalibration>(CALIBRATION_KEY, EMPTY_CALIBRATION);
  return { history: stored.history ?? [], manual: stored.manual ?? {} };
}

export function saveCalibration(stored: IStoredCalibration) {
  write(CALIBRATION_KEY, { history: stored.history.slice(0, CALIBRATION_HISTORY_MAX), manual: stored.manual });
}

export function clearCalibration() {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(CALIBRATION_KEY);
  } catch (e) {
    /* nothing to undo */
  }
}

/**
 * Session length moved from minutes to seconds once half a minute became an option, and the three named
 * regimes became an on/off cycle in bars. The old alternating regime was sixteen beats each way, which is
 * four bars; the two that did not alternate both become a voice that is never held back.
 */
export function loadDrillHistory(): IDrillRun[] {
  return read<IDrillRun[]>(DRILL_HISTORY_KEY, []).map((run) => {
    const legacy = run.settings as { minutes?: number | null; regime?: string };
    const settings = { ...run.settings };
    if (settings.seconds === undefined && legacy.minutes !== undefined) {
      settings.seconds = legacy.minutes === null ? null : legacy.minutes * 60;
    }
    if (settings.voice === undefined) {
      settings.voice =
        legacy.regime === 'alternating' ? { onBars: 4, offBars: 4 } : { onBars: null, offBars: null };
    }
    return { ...run, settings };
  });
}

export function saveDrillHistory(runs: IDrillRun[]) {
  write(DRILL_HISTORY_KEY, runs.slice(0, DRILL_HISTORY_MAX));
}
