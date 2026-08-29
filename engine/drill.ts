import { ClaveDirection, IMachine, IProgram } from './machine-interfaces';

export const INSTRUCTOR_ID = 'instructor';

// Programs are indexed in half-beats, and the instructor's pitches are the spoken number minus one.
const SAMPLES_PER_BEAT = 2;

/** Inside an eighth of a beat is on it; inside half a beat was aimed at it; beyond that is a stray. */
export const ON_BEATS = 1 / 8;
export const CLOSE_BEATS = 1 / 2;

/** A bar is four beats, so the eight-count the instructor calls spans two of them, as the clave does. */
export const BAR_BEATS = 4;
const SAMPLES_PER_BAR = BAR_BEATS * SAMPLES_PER_BEAT;

/** How long the instructor calls, and then holds off, before repeating. */
export interface IVoiceCycle {
  /** null calls throughout. */
  onBars: number | null;
  /** null never holds off. */
  offBars: number | null;
}
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
  /** Median over every tap, strays included: a constant input delay shows here and nowhere else. */
  rawMedianMs: number | null;
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

/**
 * The window does not widen for a sparse pattern. Tapping the 1 and the 5 is not a licence to be loose about
 * where they are: the standard is the same eighth of a beat whatever the pattern, and a constant delay is
 * taken off by calibration rather than forgiven by a bigger target.
 */
export function classifyTap(errBeats: number): TapClass {
  const size = Math.abs(errBeats);
  return size <= ON_BEATS ? 'on' : size <= CLOSE_BEATS ? 'close' : 'stray';
}

/**
 * Whether the count is called at a given half-beat. Derived from the index rather than from a timer because
 * notes are scheduled up to ten seconds ahead: a flag flipped in wall-clock time would smear each switch
 * across seconds of already-queued audio, and would drift out of phase with the eight-count besides.
 */
export function voiceSoundsAt(cycle: IVoiceCycle, sampleIndex: number): boolean {
  if (cycle.onBars === null || cycle.offBars === null) {
    return true;
  }
  const on = cycle.onBars * SAMPLES_PER_BAR;
  const period = on + cycle.offBars * SAMPLES_PER_BAR;
  if (period <= 0) {
    return true;
  }
  return (((sampleIndex % period) + period) % period) < on;
}

export function voiceAlternates(cycle: IVoiceCycle): boolean {
  return cycle.onBars !== null && cycle.offBars !== null;
}

export function describeVoice(cycle: IVoiceCycle): string {
  return voiceAlternates(cycle) ? cycle.onBars + ' on / ' + cycle.offBars + ' off' : 'always';
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
  const rawMedianMs = taps.length ? median(taps.map((tap) => tap.errMs)) : null;
  if (!taps.length || !aimed.length) {
    return {
      n: taps.length,
      onCount,
      aimed: aimed.length,
      strays: taps.length - aimed.length,
      onPercent: taps.length ? (onCount / taps.length) * 100 : null,
      meanMs: null,
      sdMs: null,
      rawMedianMs,
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
    rawMedianMs,
  };
}

/**
 * A tap habit large enough to be a delay rather than a mistake. Reported so that a session of strays says what
 * is wrong with it instead of only that it went badly.
 */
export function calibrationHint(summary: ISummary): string | null {
  if (summary.n < 6 || summary.rawMedianMs === null || Math.abs(summary.rawMedianMs) < 60) {
    return null;
  }
  const size = Math.round(Math.abs(summary.rawMedianMs));
  const side = summary.rawMedianMs > 0 ? 'behind' : 'ahead of';
  return (
    'Your taps sit about ' +
    size +
    ' ms ' +
    side +
    ' the beat, tap after tap. That is the size of an input delay rather than of a mistake — run the calibration ' +
    'and it comes off every tap automatically.'
  );
}

export interface IInstrumentSnapshot {
  id: string;
  title: string;
  programTitle: string;
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
      title: instrument.title,
      programTitle: instrument.programs[instrument.activeProgram]?.title ?? '',
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

/** What was actually sounding, for reading a past run back. Entries stored before this predate the titles. */
export function describeMachine(snapshot: IMachineSnapshot): string[] {
  return snapshot.instruments
    .filter((instrument) => instrument.enabled)
    .map((instrument) => {
      const name = instrument.title || instrument.id;
      return instrument.programTitle ? name + ' · ' + instrument.programTitle : name;
    });
}

export interface IDrillSettings {
  /** Which pattern to tap. Its own setting: the instructor is left playing whatever the machine screen says. */
  programIndex: number;
  voice: IVoiceCycle;
  /** null runs until stopped by hand. */
  seconds: number | null;
}

export interface IDrillRun {
  at: number;
  elapsedMs: number;
  patternTitle: string;
  settings: IDrillSettings;
  summary: ISummary;
  machine: IMachineSnapshot;
}

export const SESSION_SECONDS: (number | null)[] = [30, 60, 180, 300, 600, null];

export function sessionLengthLabel(seconds: number | null): string {
  if (seconds === null) {
    return 'Forever';
  }
  return seconds < 60 ? seconds + ' sec' : seconds / 60 + ' min';
}

/**
 * The drill can only take the instructor's voice away for a stretch. One switched off on the machine screen
 * stays off whatever is chosen here, and its own program is never touched.
 */
export const VOICE_ON_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'always' },
  { value: 2, label: '2-bar' },
  { value: 4, label: '4-bar' },
];

export const VOICE_OFF_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'never' },
  { value: 2, label: '2-bar' },
  { value: 4, label: '4-bar' },
];
