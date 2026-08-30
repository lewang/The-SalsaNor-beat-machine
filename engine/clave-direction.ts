import { ClaveDirection, IInstrument, IMachine, IProgram } from './machine-interfaces';

const SAMPLES_PER_BAR = 8;

export type PatternClave =
  | { kind: 'rotates' }
  | { kind: 'neutral' }
  | { kind: 'derived'; direction: ClaveDirection }
  | { kind: 'written'; direction: ClaveDirection }
  | { kind: 'unlabelled' };

/*
 * Whether the pattern survives the engine's one-bar rotation unchanged. A tumbao repeats every bar, so
 * turning the clave around moves nothing you can hear; a two-bar figure like a cáscara or a montuno does
 * not, and only those can carry a direction.
 */
export function isBarPeriodic(program: IProgram): boolean {
  const attacks = program.notes.map((note) => note.index);
  return attacks.every((index) => attacks.indexOf((index + SAMPLES_PER_BAR) % program.length) >= 0);
}

/*
 * Percussion needs no label: rotating a percussion cell by a bar *is* its other direction, which is what
 * respectsClave already does. A pitched part cannot be rotated that way — the harmony would travel with the
 * rhythm and land in a different chord from the bass — so the direction it was written in has to be stated.
 */
export function classifyProgram(instrument: IInstrument, program: IProgram): PatternClave {
  if (instrument.respectsClave) {
    return { kind: 'rotates' };
  }
  if (isBarPeriodic(program)) {
    return { kind: 'neutral' };
  }
  if (program.clave) {
    // A guajeo carries its other direction with it, so it is never crossed — it just swaps sides.
    return { kind: program.claveSwap ? 'derived' : 'written', direction: program.clave };
  }
  return { kind: 'unlabelled' };
}

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
 * has moved away from it: dropping it would silently change what you are hearing, and the crossed marker
 * is there to explain why it looks out of place.
 */
export function visibleProgramIndices(instrument: IInstrument, direction: ClaveDirection): number[] {
  const visible = instrument.programs
    .map((program, index) => (programVisibleIn(program, direction) ? index : -1))
    .filter((index) => index >= 0);
  return visible.includes(instrument.activeProgram)
    ? visible
    : [...visible, instrument.activeProgram].sort((a, b) => a - b);
}

export function activeProgramOf(instrument: IInstrument): IProgram | undefined {
  return instrument.programs[instrument.activeProgram];
}

/* Crossed — cruzado: the part is written to one direction while the machine turns the clave the other way. */
export function isCrossed(machine: IMachine, instrument: IInstrument): boolean {
  const program = activeProgramOf(instrument);
  if (!program) {
    return false;
  }
  const classified = classifyProgram(instrument, program);
  return classified.kind === 'written' && classified.direction !== machine.claveDirection;
}

export function crossedParts(machine: IMachine): IInstrument[] {
  return machine.instruments.filter((instrument) => instrument.enabled && isCrossed(machine, instrument));
}
