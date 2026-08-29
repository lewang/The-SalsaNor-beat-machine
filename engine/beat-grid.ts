import { IInstrument, IMachine } from './machine-interfaces';

/** Programs are indexed in half-beats; a bar is four beats, so eight of them. */
const SAMPLES_PER_BEAT = 2;
const SAMPLES_PER_BAR = 8;
const MAX_COLUMNS = 32;

export interface IGridCell {
  velocity: number;
  tones: number[];
}

export interface IGridRow {
  id: string;
  title: string;
  program: string;
  /** null where the instrument is silent. */
  cells: (IGridCell | null)[];
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

export const shownInstruments = (machine: IMachine) => machine.instruments.filter((i) => i.enabled);

/**
 * The shortest span in which every pattern on show comes out whole. A fixed two bars would cut the four-bar
 * montunos in half and claim that was the whole of them.
 */
export function gridColumns(machine: IMachine): number {
  const lengths = shownInstruments(machine).map((i) => i.programs[i.activeProgram]?.length ?? 16);
  if (!lengths.length) {
    return 16;
  }
  return Math.min(MAX_COLUMNS, lengths.reduce(lcm, 1));
}

/**
 * Which program index sounds at a given column. Mirrors the scheduler: a clave-respecting part is rotated by a
 * bar under 3-2, so the grid has to turn with it or it would show a pattern nobody is playing.
 */
function programIndexAt(instrument: IInstrument, machine: IMachine, column: number, length: number) {
  const rotated = instrument.respectsClave && machine.claveDirection === '3-2' ? column + SAMPLES_PER_BAR : column;
  return ((rotated % length) + length) % length;
}

export function buildGrid(machine: IMachine, columns: number): IGridRow[] {
  return shownInstruments(machine).map((instrument) => {
    const program = instrument.programs[instrument.activeProgram];
    const cells: (IGridCell | null)[] = [];
    for (let column = 0; column < columns; column++) {
      const at = programIndexAt(instrument, machine, column, program.length);
      const notes = program.notes.filter((note) => note.index === at);
      cells.push(
        notes.length
          ? {
              velocity: Math.max(...notes.map((note) => note.velocity ?? 1)),
              tones: Array.from(new Set(notes.map((note) => note.pitch))),
            }
          : null,
      );
    }
    return { id: instrument.id, title: instrument.title, program: program.title, cells };
  });
}

/** Count labels: eight to a cycle in salsa, four in merengue, with the off-beats between them. */
export function columnLabel(machine: IMachine, column: number): string {
  if (column % SAMPLES_PER_BEAT !== 0) {
    return '&';
  }
  const perCycle = machine.flavor === 'Merengue' ? 4 : 8;
  return String(((column / SAMPLES_PER_BEAT) % perCycle) + 1);
}

/** Where the playhead sits, as a column. Negative until the transport has actually started. */
export function playheadColumn(beat: number, columns: number): number {
  if (!Number.isFinite(beat) || beat < 0) {
    return -1;
  }
  return Math.floor(beat * SAMPLES_PER_BEAT) % columns;
}
