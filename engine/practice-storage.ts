import { TapSource } from './drill';
import { IDrillRun } from './drill';
import { CALIBRATION_HISTORY_MAX, ICalibrationRun } from './calibration';

const CALIBRATION_KEY = 'bm-tap-calibration';
const DRILL_HISTORY_KEY = 'bm-drill-history';
const DRILL_HISTORY_MAX = 24;

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

export function loadDrillHistory(): IDrillRun[] {
  return read<IDrillRun[]>(DRILL_HISTORY_KEY, []);
}

export function saveDrillHistory(runs: IDrillRun[]) {
  write(DRILL_HISTORY_KEY, runs.slice(0, DRILL_HISTORY_MAX));
}
