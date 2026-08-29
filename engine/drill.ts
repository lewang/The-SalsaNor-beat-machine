import { ClaveDirection, IMachine, IProgram } from './machine-interfaces';

export const INSTRUCTOR_ID = 'instructor';

// Programs are indexed in half-beats, and the instructor's pitches are the spoken number minus one.
const SAMPLES_PER_BEAT = 2;

/** Inside an eighth of a beat is on it; inside half a beat was aimed at it; beyond that is a stray. */
export const ON_BEATS = 1 / 8;
export const CLOSE_BEATS = 1 / 2;

/** How long the voice stays on, and then off, under the alternating regime. */
export const ALTERNATION_BEATS = 16;

export type VoiceRegime = 'on' | 'off' | 'alternating';
export type TapClass = 'on' | 'close' | 'stray';
export type TapSource = 'key' | 'pad';

export interface ITarget {
  beat: number;
  count: number;
}

export interface IHit {
  beat: number;
  count: number;
  errBeats: number;
}

export interface ITap {
  errBeats: number;
  errMs: number;
  cls: TapClass;
  count: number;
}

export interface ISummary {
  n: number;
  onCount: number;
  aimed: number;
  strays: number;
  onPercent: number | null;
  meanMs: number | null;
  sdMs: number | null;
}

/** The beats a program calls, in beats from the top of its cycle. */
export function programTargets(program: IProgram): ITarget[] {
  return program.notes
    .map((note) => ({ beat: note.index / SAMPLES_PER_BEAT, count: note.pitch + 1 }))
    .sort((a, b) => a.beat - b.beat);
}

export function programCycleBeats(program: IProgram): number {
  return program.length / SAMPLES_PER_BEAT;
}

/**
 * The called beat a tap was aimed at: the nearest one in either direction, with the cycle wrapped rather than
 * rounded, so a pattern whose targets straddle the loop point is still judged against the closer of the two.
 */
export function nearestTarget(targets: ITarget[], cycleBeats: number, beat: number): IHit | null {
  if (!targets.length || cycleBeats <= 0) {
    return null;
  }
  let best: IHit | null = null;
  for (const target of targets) {
    const at = target.beat + Math.round((beat - target.beat) / cycleBeats) * cycleBeats;
    const errBeats = beat - at;
    if (!best || Math.abs(errBeats) < Math.abs(best.errBeats)) {
      best = { beat: at, count: target.count, errBeats };
    }
  }
  return best;
}

export function classifyTap(errBeats: number): TapClass {
  const size = Math.abs(errBeats);
  return size <= ON_BEATS ? 'on' : size <= CLOSE_BEATS ? 'close' : 'stray';
}

/**
 * Whether the count is called at a given half-beat. Derived from the index rather than from a timer because
 * notes are scheduled up to ten seconds ahead: a flag flipped in wall-clock time would smear each switch
 * across seconds of already-queued audio, and would drift out of phase with the eight-count besides.
 */
export function voiceSoundsAt(regime: VoiceRegime, sampleIndex: number): boolean {
  if (regime === 'on') {
    return true;
  }
  if (regime === 'off') {
    return false;
  }
  const leg = Math.floor(sampleIndex / (ALTERNATION_BEATS * SAMPLES_PER_BEAT));
  return leg % 2 === 0;
}

export function gradeTap(targets: ITarget[], cycleBeats: number, beat: number, msPerBeat: number): ITap | null {
  const hit = nearestTarget(targets, cycleBeats, beat);
  if (!hit) {
    return null;
  }
  return {
    errBeats: hit.errBeats,
    errMs: hit.errBeats * msPerBeat,
    cls: classifyTap(hit.errBeats),
    count: hit.count,
  };
}

export const median = (xs: number[]): number => {
  if (!xs.length) {
    return 0;
  }
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Drift and spread describe the taps that were aimed at a beat. A stray is a different mistake, and averaging
 * it in would report a timing bias nobody has.
 */
export function summarizeTaps(taps: ITap[]): ISummary {
  const aimed = taps.filter((tap) => tap.cls !== 'stray');
  const onCount = taps.filter((tap) => tap.cls === 'on').length;
  if (!taps.length || !aimed.length) {
    return {
      n: taps.length,
      onCount,
      aimed: aimed.length,
      strays: taps.length - aimed.length,
      onPercent: taps.length ? (onCount / taps.length) * 100 : null,
      meanMs: null,
      sdMs: null,
    };
  }
  const mean = aimed.reduce((sum, tap) => sum + tap.errMs, 0) / aimed.length;
  const variance = aimed.reduce((sum, tap) => sum + (tap.errMs - mean) * (tap.errMs - mean), 0) / aimed.length;
  return {
    n: taps.length,
    onCount,
    aimed: aimed.length,
    strays: taps.length - aimed.length,
    onPercent: (onCount / taps.length) * 100,
    meanMs: mean,
    sdMs: aimed.length < 2 ? null : Math.sqrt(variance),
  };
}

export interface IInstrumentSnapshot {
  id: string;
  enabled: boolean;
  activeProgram: number;
  volume: number;
  unmutedVolume: number;
}

export interface IMachineSnapshot {
  flavor: IMachine['flavor'];
  bpm: number;
  keyNote: number;
  claveDirection: ClaveDirection;
  instruments: IInstrumentSnapshot[];
}

export function snapshotMachine(machine: IMachine): IMachineSnapshot {
  return {
    flavor: machine.flavor,
    bpm: machine.bpm,
    keyNote: machine.keyNote,
    claveDirection: machine.claveDirection,
    instruments: machine.instruments.map((instrument) => ({
      id: instrument.id,
      enabled: instrument.enabled,
      activeProgram: instrument.activeProgram,
      volume: instrument.volume,
      unmutedVolume: instrument.unmutedVolume,
    })),
  };
}

/** Instruments are matched by id, so a snapshot taken of the other flavor restores only what both share. */
export function applyMachineSnapshot(machine: IMachine, snapshot: IMachineSnapshot) {
  machine.bpm = snapshot.bpm;
  machine.keyNote = snapshot.keyNote;
  machine.claveDirection = snapshot.claveDirection;
  for (const saved of snapshot.instruments) {
    const instrument = machine.instruments.find((candidate) => candidate.id === saved.id);
    if (!instrument) {
      continue;
    }
    instrument.enabled = saved.enabled;
    instrument.activeProgram = Math.min(saved.activeProgram, instrument.programs.length - 1);
    instrument.volume = saved.volume;
    instrument.unmutedVolume = saved.unmutedVolume;
  }
}

export interface IDrillSettings {
  programIndex: number;
  regime: VoiceRegime;
  /** null runs until stopped by hand. */
  minutes: number | null;
}

export interface IDrillRun {
  at: number;
  elapsedMs: number;
  patternTitle: string;
  settings: IDrillSettings;
  summary: ISummary;
  machine: IMachineSnapshot;
}

export const SESSION_MINUTES: (number | null)[] = [1, 3, 5, 10, null];

export const REGIME_LABELS: { value: VoiceRegime; label: string; detail: string }[] = [
  { value: 'on', label: 'Voice on', detail: 'the count is called throughout' },
  { value: 'off', label: 'Voice off', detail: 'percussion only — you hold the pattern' },
  {
    value: 'alternating',
    label: 'Alternating',
    detail: ALTERNATION_BEATS + ' beats called, ' + ALTERNATION_BEATS + ' silent, repeating',
  },
];
