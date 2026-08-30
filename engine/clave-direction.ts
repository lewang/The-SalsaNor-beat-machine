import { ClaveDirection, IInstrument, IMachine, IProgram } from './machine-interfaces';

const SAMPLES_PER_BAR = 8;

export type PatternClave =
  | { kind: 'rotates' }
  | { kind: 'neutral' }
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
    return { kind: 'written', direction: program.clave };
  }
  return { kind: 'unlabelled' };
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
