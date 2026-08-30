import { ClaveDirection, IInstrument, IMachine, IProgram } from './machine-interfaces';

const SAMPLES_PER_BAR = 8;

/*
 * The other direction of a standard guajeo. Only the rhythm swaps sides — the chord progression stays put,
 * which is what separates this from the rotation the percussion gets: rotating a montuno wholesale would
 * carry its harmony across with it and leave the piano in a different chord from the bass.
 *
 * So the two bars of each cell trade rhythms, and the ordered stream of notes is re-laid onto the result.
 * Root/dyad alternation, chord order and the number of attacks per chord all survive; what moves is which
 * side of the clave the busy bar and the sparse bar fall on.
 *
 * This derives a 3-2 guajeo; it does not reproduce anyone else's. Recordings of the native app show its
 * two directions are separately composed rather than transformed — its 3-2 i-iv has six attacks against
 * the eleven of its 2-3, so no rule connects them. The rhythm here is the documented one and matches what
 * its guajeos do; the harmony is this library's own reading of "the chord progression stays put".
 */
export function swapGuajeoSides(program: IProgram): IProgram {
  const cell = SAMPLES_PER_BAR * 2;
  const moved = (index: number) => {
    const base = Math.floor(index / cell) * cell;
    const within = index - base;
    return base + (within < SAMPLES_PER_BAR ? within + SAMPLES_PER_BAR : within - SAMPLES_PER_BAR);
  };

  const ordered = [...program.notes].sort((a, b) => a.index - b.index);
  const positions = Array.from(new Set(ordered.map((note) => moved(note.index)))).sort((a, b) => a - b);
  const sources = Array.from(new Set(ordered.map((note) => note.index))).sort((a, b) => a - b);

  const notes = ordered.map((note) => ({ ...note, index: positions[sources.indexOf(note.index)] }));
  return { ...program, notes, clave: program.clave === '3-2' ? '2-3' : '3-2' };
}

const swapCache = new WeakMap<IProgram, IProgram>();

/* The program as it should sound in this direction — swapped where the pattern supports it. */
export function programFor(program: IProgram, direction: ClaveDirection): IProgram {
  if (!program.claveSwap || !program.clave || program.clave === direction) {
    return program;
  }
  let swapped = swapCache.get(program);
  if (!swapped) {
    swapped = swapGuajeoSides(program);
    swapCache.set(program, swapped);
  }
  return swapped;
}

/*
 * Whether a pattern belongs in the list for this direction. A part with nothing to say about clave —
 * percussion, or a tumbao whose rhythm repeats each bar — belongs in both; a guajeo carries its other
 * direction with it, so it does too; anything else appears only under the direction it was written in.
 */
export function programVisibleIn(program: IProgram, direction: ClaveDirection): boolean {
  return !program.clave || Boolean(program.claveSwap) || program.clave === direction;
}

/*
 * The programs to offer, by index. The one already playing is always among them even when the direction
 * has moved away from it: dropping it would silently change what you are hearing, and the pattern's own
 * name beside a clave it was not written for says enough.
 */
export function visibleProgramIndices(instrument: IInstrument, direction: ClaveDirection): number[] {
  const visible = instrument.programs
    .map((program, index) => (programVisibleIn(program, direction) ? index : -1))
    .filter((index) => index >= 0);
  return visible.includes(instrument.activeProgram)
    ? visible
    : [...visible, instrument.activeProgram].sort((a, b) => a - b);
}
