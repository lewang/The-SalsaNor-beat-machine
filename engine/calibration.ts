import { median, TapSource } from './drill';

/** Taps counted in a run, after the opening ones are discarded as settling. */
export const CALIBRATION_TAPS = 24;
export const CALIBRATION_WARMUP = 4;
export const CALIBRATION_HISTORY_MAX = 12;

export interface ICalibrationRun {
  src: TapSource;
  offsetMs: number;
  spreadMs: number;
  n: number;
  bpm: number;
  at: number;
}

export interface ICalibrationValue {
  offsetMs: number;
  spreadMs: number;
  runs: number;
  manual: boolean;
}

/** A run's own constant is the median of its taps; the mean would follow one late tap out of the room. */
export function runStats(offsets: number[]): { offsetMs: number; spreadMs: number } {
  const mean = offsets.reduce((sum, x) => sum + x, 0) / (offsets.length || 1);
  const variance = offsets.reduce((sum, x) => sum + (x - mean) * (x - mean), 0) / (offsets.length || 1);
  return { offsetMs: median(offsets), spreadMs: Math.sqrt(variance) };
}

/**
 * The stored constant is the median across runs of that input, not the latest one. A single run is not stable
 * enough to trust -- the counting site's own measurements moved tens of milliseconds between two runs a minute
 * apart -- and a median across runs is robust to a bad one. A hand-set value wins over both.
 */
export function calibrationFor(
  history: ICalibrationRun[],
  manual: Partial<Record<TapSource, number>>,
  src: TapSource,
): ICalibrationValue | null {
  const runs = history.filter((run) => run.src === src);
  const byHand = manual[src];
  if (typeof byHand === 'number') {
    return {
      offsetMs: byHand,
      spreadMs: runs.length ? median(runs.map((run) => run.spreadMs)) : 0,
      runs: runs.length,
      manual: true,
    };
  }
  if (!runs.length) {
    return null;
  }
  return {
    offsetMs: median(runs.map((run) => run.offsetMs)),
    spreadMs: median(runs.map((run) => run.spreadMs)),
    runs: runs.length,
    manual: false,
  };
}
