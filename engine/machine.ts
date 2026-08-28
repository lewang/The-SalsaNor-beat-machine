import { IMachine } from './machine-interfaces';

export function createMachine(): IMachine {
  return { bpm: 180, keyNote: 0, claveDirection: '2-3', instruments: [], flavor: 'Salsa' };
}
