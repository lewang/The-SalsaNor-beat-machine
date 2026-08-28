import { makeAutoObservable, observe } from 'mobx';
import { AudioBackend } from './audio-backend';
import { InstrumentPlayer } from './instrument-player';
import { createMachine } from './machine';
import { IInstrument, IMachine } from './machine-interfaces';

// Programs are indexed in half-beats, so one bar of salsa is eight of them. Rotating a
// clave-respecting program by a bar is what turns 2-3 around into 3-2.
const SAMPLES_PER_BAR = 8;

export interface IInstrumentSample {
  sampleName: string;
  velocity?: number;
}

export class BeatEngine {
  private nextSampleIndex = 0;
  private animationFrameRequest: number | null = null;
  private audioTimeDelta = 0;
  private machineDisposers: (() => void)[] = [];
  private readonly instrumentPlayers = new Map<IInstrument, InstrumentPlayer>();
  private mixerNotReadyLogged = false;

  interval: number | null = null;
  _machine: IMachine = createMachine();
  beat = 0;

  constructor(private mixer: AudioBackend) {
    makeAutoObservable(this);
  }

  async init() {
    await this.mixer.init();
    console.log('BeatEngine initialized - AudioBackend state:', {
      ready: this.mixer.ready,
      hasContext: !!this.mixer.context,
    });
  }

  get machine() {
    return this._machine;
  }

  set machine(value: IMachine) {
    if (value !== this._machine) {
      this._machine = value;
      this.machineDisposers.forEach((disposer) => disposer());
      this.machineDisposers = [];
      this.instrumentPlayers.forEach((player) => player.dispose());
      this.instrumentPlayers.clear();

      if (!this.machine) return;
      if (this.playing) {
        this.stop();
        this.play();
      }

      this.machineDisposers.push(
        observe(this.machine, 'bpm', ({ oldValue, newValue }) => {
          if (this.playing) {
            if (this.interval) clearTimeout(this.interval);

            const currentAudioTime = this.mixer.getCurrentTime();

            // 🚨 Sjekk for ugyldige verdier:
            if (oldValue == null || newValue == null || oldValue === 0 || newValue === 0) {
              console.warn('⚠️ Ugyldige verdier for BPM endring: oldValue =', oldValue, ', newValue =', newValue);
              return;
            }

            // 🚀 Ny kalkulering med sikker fallback:
            this.audioTimeDelta =
              (currentAudioTime + (this.audioTimeDelta || 0)) * (oldValue / newValue) - currentAudioTime;

            // Hvis audioTimeDelta fortsatt er NaN, setter vi den til 0
            if (isNaN(this.audioTimeDelta)) {
              console.warn('⚠️ audioTimeDelta ble NaN — setter den til 0.');
              this.audioTimeDelta = 0;
            }

            this.nextSampleIndex = Math.ceil(this.getBeatIndex() * 2);
            this.stopAllInstruments();
            this.scheduleBuffers();
          }
        }),

        observe(this.machine, 'keyNote', () => {
          this.rescheduleInstruments((instrument) => instrument.keyedInstrument);
        }),

        observe(this.machine, 'claveDirection', () => {
          this.rescheduleInstruments((instrument) => instrument.respectsClave);
        }),
      );
    }
  }

  play() {
    this.mixer.context?.resume();
    this.scheduleBuffers();
    this.beatTick();
  }

  stopAllInstruments = (hard = false) => {
    for (const instrument of Array.from(this.instrumentPlayers.values())) {
      instrument.reset(hard);
    }
  };

  stop() {
    if (this.interval) {
      clearTimeout(this.interval);
      this.interval = null;
    }
    if (this.animationFrameRequest) {
      cancelAnimationFrame(this.animationFrameRequest);
      this.animationFrameRequest = null;
    }
    this.stopAllInstruments(true);
    this.mixer.reset();
    this.audioTimeDelta = 0;
    this.nextSampleIndex = 0;
  }

  get playing() {
    return this.interval != null;
  }

  get beatTime() {
    const result = 60 / this.machine.bpm;
    return this.machine.flavor === 'Merengue' ? result / 2 : result;
  }

  getBeatIndex() {
    return (this.mixer.getCurrentTime() + this.audioTimeDelta) / this.beatTime;
  }

  private getInstrumentPlayer(context: AudioContext, instrument: IInstrument) {
    const instrumentPlayer = this.instrumentPlayers.get(instrument);
    if (instrumentPlayer) {
      return instrumentPlayer;
    } else {
      const newPlayer = new InstrumentPlayer(context, instrument);
      this.machineDisposers.push(
        observe(instrument, 'activeProgram', () => this.rescheduleInstrument(instrument, newPlayer)),
      );
      this.instrumentPlayers.set(instrument, newPlayer);
      return newPlayer;
    }
  }

  private rescheduleInstruments(matches: (instrument: IInstrument) => boolean) {
    if (!this.playing) {
      return;
    }
    for (const instrument of this.machine.instruments) {
      const player = this.instrumentPlayers.get(instrument);
      if (player && matches(instrument)) {
        this.rescheduleInstrument(instrument, player);
      }
    }
  }

  rescheduleInstrument(instrument: IInstrument, player: InstrumentPlayer) {
    player.reset();
    const sampleTime = this.beatTime / 2;
    for (let sampleIndex = Math.ceil(this.getBeatIndex() * 2); sampleIndex < this.nextSampleIndex; sampleIndex++) {
      this.instrumentNotes(instrument, sampleIndex).forEach((note) => {
        this.mixer.play(note.sampleName, player, sampleIndex * sampleTime - this.audioTimeDelta, note.velocity);
      });
    }
  }

  private instrumentNotes(instrument: IInstrument, sampleIndex: number): IInstrumentSample[] {
    const result: IInstrumentSample[] = [];
    if (instrument.enabled) {
      const program = instrument.programs[instrument.activeProgram];
      if (instrument.respectsClave && this.machine.claveDirection === '3-2') {
        sampleIndex += SAMPLES_PER_BAR;
      }
      sampleIndex %= program.length;
      program.notes
        .filter((note) => note.index === sampleIndex)
        .forEach((note) => {
          let pitch = note.pitch;
          if (instrument.keyedInstrument) {
            pitch += this.machine.keyNote;
          }
          if (note.hand !== 'left') {
            const baseSampleName = instrument.id + '-' + (pitch + instrument.pitchOffset);
            const sampleName = (instrument.language && instrument.id === 'instructor')
              ? `${instrument.language}:${baseSampleName}`
              : baseSampleName;
            
            result.push({
              sampleName,
              velocity: note.velocity,
            });
            if (note.pianoTonic) {
              const tonicSampleName = instrument.id + '-' + (pitch + instrument.pitchOffset + 12);
              result.push({
                sampleName: (instrument.language && instrument.id === 'instructor')
                  ? `${instrument.language}:${tonicSampleName}`
                  : tonicSampleName,
                velocity: note.velocity,
              });
            }
          }
          if (instrument.playBothHands && note.hand !== 'right') {
            const leftHandSampleName = instrument.id + '-' + (pitch + instrument.leftHandPitchOffset);
            result.push({
              sampleName: (instrument.language && instrument.id === 'instructor')
                ? `${instrument.language}:${leftHandSampleName}`
                : leftHandSampleName,
              velocity: note.velocity,
            });
          }
        });
    }
    return result;
  }

  scheduleBuffers = () => {
    const context = this.mixer.context;
    if (context && this.mixer.ready) {
      this.mixerNotReadyLogged = false; // Reset the flag when mixer is ready
      const sampleTime = this.beatTime / 2;
      const currentBeat = this.getBeatIndex();
      while (this.nextSampleIndex - currentBeat * 2 < 64) {
        const sampleIndex = this.nextSampleIndex;
        this.machine.instruments.forEach((instrument) => {
          const instrumentPlayer = this.getInstrumentPlayer(context, instrument);
          this.instrumentNotes(instrument, sampleIndex).forEach((note) => {
            this.mixer.play(
              note.sampleName,
              instrumentPlayer,
              sampleIndex * sampleTime - this.audioTimeDelta,
              note.velocity,
            );
          });
        });
        this.nextSampleIndex++;
      }
    } else {
      if (!this.mixerNotReadyLogged) {
        console.log('Mixer not ready yet - context:', !!context, 'ready:', this.mixer.ready);
        this.mixerNotReadyLogged = true;
      }
    }
    this.interval = window.setTimeout(() => this.scheduleBuffers(), 1000);
  };

  beatTick() {
    this.beat = this.getBeatIndex();
    this.animationFrameRequest = requestAnimationFrame(() => this.beatTick());
  }
}
