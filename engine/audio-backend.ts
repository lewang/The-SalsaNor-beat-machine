import { InstrumentPlayer } from './instrument-player';

interface BankDescriptor {
  [sampleName: string]: number[];
}

/**
 * Context time currently being heard, paired with the performance clock. getOutputTimestamp reports the frame
 * leaving the device rather than the one being written, so a tap converted through this pairing has the output
 * latency already taken out of it.
 */
function outputSync(context: AudioContext): { ctx: number; perf: number } {
  const now = context.currentTime;
  const perf = performance.now();
  let latency = typeof context.outputLatency === 'number' ? context.outputLatency : 0;
  try {
    const stamp = context.getOutputTimestamp ? context.getOutputTimestamp() : null;
    if (stamp && stamp.contextTime != null) {
      // Whichever reports more delay is the one to believe: a browser that answers getOutputTimestamp with
      // the write position rather than the play position would otherwise hide the whole output latency, and
      // every tap would read that much late.
      latency = Math.max(latency, now - stamp.contextTime);
    }
  } catch (e) {
    /* not implemented everywhere; outputLatency alone still describes the same delay */
  }
  return { ctx: now - Math.max(0, latency), perf };
}

/** Where a performance-clock instant falls on the audio clock. */
export function contextTimeAt(context: AudioContext, perfMs: number): number {
  const sync = outputSync(context);
  return sync.ctx + (perfMs - sync.perf) / 1000;
}

export class AudioBackend {
  public ready: boolean;
  private buffer?: AudioBuffer;
  private bankDescriptor?: BankDescriptor;
  private zeroTime: number | null = null;
  private _context?: AudioContext;
  private audioFormat: string;

  constructor(private baseUrl: string = process.env.NEXT_PUBLIC_BASE_PATH ?? '') {
    this.ready = false;
    const hasWebM = typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/webm;codecs="vorbis"');
    const audioPath = hasWebM ? 'assets/audio/main.webm' : 'assets/audio/main.mp3';
    this.audioFormat = baseUrl ? `${baseUrl}/${audioPath}` : `/${audioPath}`;
    console.log('AudioBackend created - will load audio after init()');
  }

  /**
   * Initialiserer AudioContext og setter zeroTime umiddelbart.
   * Starter deretter lasting av audio filer.
   */
  async init(context = typeof AudioContext !== 'undefined' ? new AudioContext() : undefined) {
    this._context = context;
    if (this._context) {
      this.zeroTime = this._context.currentTime;
      console.log('🎵 AudioBackend initialized — zeroTime set to:', this.zeroTime);

      // Load audio files after context is initialized
      try {
        await Promise.all([
          this.loadBank(this.audioFormat),
          this.loadBankDescriptor('assets/audio/main.json')
        ]);
        console.log('✅ Audio files loaded successfully');
      } catch (error) {
        console.error('❌ Error loading audio files:', error);
        console.error('Please ensure the following files exist in public/assets/audio/:');
        console.error('  - main.webm (or main.mp3)');
        console.error('  - main.json');
        console.error('Download them from: https://www.salsabeatmachine.org/assets/audio/');
      }
    }
  }

  get context() {
    return this._context;
  }

  private async loadBank(url: string) {
    try {
      console.log('Loading audio bank from:', url);
      const req = await fetch(url);
      if (!req.ok) {
        throw new Error(`Failed to fetch ${url}: ${req.status} ${req.statusText}`);
      }
      const response = await req.arrayBuffer();
      if (!this.context) {
        throw new Error('AudioContext not initialized - cannot decode audio');
      }
      this.buffer = await new Promise((resolve, reject) => {
        this.context?.decodeAudioData(response, resolve, reject);
      });
      this.ready = true;
      console.log('✅ Audio bank loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load audio bank:', error);
      throw error;
    }
  }

  private async loadBankDescriptor(url: string) {
    try {
      // Normalize URL construction
      let fullUrl: string;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Absolute URL, use as-is
        fullUrl = url;
      } else if (this.baseUrl) {
        // BaseUrl set, construct full URL
        const normalizedBase = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
        const normalizedPath = url.startsWith('/') ? url.slice(1) : url;
        fullUrl = `${normalizedBase}/${normalizedPath}`;
      } else {
        // No baseUrl, ensure leading slash for absolute path
        fullUrl = url.startsWith('/') ? url : `/${url}`;
      }

      console.log('Loading bank descriptor from:', fullUrl);
      const req = await fetch(fullUrl);
      if (!req.ok) {
        throw new Error(`Failed to fetch ${fullUrl}: ${req.status} ${req.statusText}`);
      }
      this.bankDescriptor = await req.json();
      console.log('✅ Bank descriptor loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load bank descriptor:', error);
      throw error;
    }
  }

  play(sampleName: string, player: InstrumentPlayer, when: number, velocity?: number) {
    const bufferSource = this.context!.createBufferSource();
    bufferSource.connect(player.createNoteDestination(velocity));
    bufferSource.buffer = this.buffer!;
    const sampleInfo = this.bankDescriptor![sampleName];

    // Setter zeroTime hvis det fortsatt er null (som en fallback)
    if (this.zeroTime === null) {
      this.zeroTime = this.context!.currentTime;
      console.log('⚠️ Warning: zeroTime was null — setting it now to:', this.zeroTime);
    }

    const startTime = this.zeroTime + when;
    bufferSource.start(startTime, sampleInfo[1] / 44100.0, sampleInfo[2] / 44100.0);
    player.registerSample(bufferSource, startTime);
  }

  reset() {
    this.zeroTime = null;
  }

  getCurrentTime(): number {
    if (this.zeroTime == null) {
      console.warn('⏱️ Warning: zeroTime is null, returning 0 for current time.');
      return 0;
    }
    return this.context!.currentTime - this.zeroTime;
  }

  /** Machine time at a performance-clock instant, on the same zeroTime-relative clock getCurrentTime reports. */
  getTimeAt(perfMs: number): number | null {
    const context = this.context;
    if (!context || this.zeroTime == null) {
      return null;
    }
    return contextTimeAt(context, perfMs) - this.zeroTime;
  }
}
