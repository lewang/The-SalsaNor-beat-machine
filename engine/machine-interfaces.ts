export interface INote {
  index: number;
  pitch: number;
  velocity?: number;
  pianoTonic?: boolean;
  hand?: 'right' | 'left';
}

export interface IProgram {
  title: string;
  length: number;
  notes: INote[];
  /* The direction this pattern was written in, for parts the engine cannot rotate. Absent where the
     pattern is direction-agnostic, and absent where nobody has judged it yet — see programDirection. */
  clave?: ClaveDirection;
  /* Set where the pattern is a standard guajeo, whose other direction is the measure swap rather than
     new material. Compositions and transcriptions do not get this — theirs has to be written. */
  claveSwap?: boolean;
}

export interface IInstrument {
  id: string;
  title: string;
  enabled: boolean;
  activeProgram: number;
  programs: IProgram[];
  respectsClave: boolean;
  pitchOffset: number;
  keyedInstrument: boolean;
  playBothHands: boolean;
  leftHandPitchOffset: number;
  volume: number;
  unmutedVolume: number;
  language?: string; // For language-aware instruments like 'instructor'
}

export type ClaveDirection = '2-3' | '3-2';

export interface IMachine {
  bpm: number;
  keyNote: number;
  claveDirection: ClaveDirection;
  instruments: IInstrument[];
  flavor: 'Salsa' | 'Merengue';
}
