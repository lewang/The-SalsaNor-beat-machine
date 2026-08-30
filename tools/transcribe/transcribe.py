"""Read a montuno off a recording and print it as a <bm:Program> ready for salsa.xml.

Two halves, because neither works alone.

*When* comes from spectral flux folded onto the loop: a real attack recurs every cycle and a stray does
not, and the grid's phase is fitted to the attacks rather than assumed. This has been exact on every take
tried, including phone recordings of another app.

*What* comes from a learned piano model, which finds the right notes but drops octaves — it will hear a
C4 and miss the C3 doubling it. Every montuno in this library voices a root with the octave above and the
left hand an octave below, or a third-and-fifth dyad likewise doubled, so the note set is snapped to the
nearer of those two shapes. The prior repairs exactly the error the model makes; measured on a take whose
answer was known, flux+model+snap scored 9/9 where the model alone scored 5/9.

Usage:
    uv run --with piano_transcription_inference --with torch --with librosa \
           --with audioread --with soundfile --with numpy \
           python transcribe.py TAKE.wav --bpm 120 --slots 32 --title "Montuno i-i-vii-vii"

The recording should be piano alone. Adding the clave costs accuracy rather than helping: its transients
dominate the flux and mask the piano's, which drops a nine-attack read to seven.
"""
import argparse
import collections
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 44100
HOP = 256
WIN = 2048
BAR = 8
PITCH_OFFSET = 60          # matches <pitchOffset> on the Piano instrument
NAMES = 'C C# D D# E F F# G G# A A# B'.split()


def note_name(midi):
    return f'{NAMES[midi % 12]}{midi // 12 - 1}'


# ---------------------------------------------------------------- when

def load_mono(path):
    signal, rate = sf.read(str(path))
    if signal.ndim > 1:
        signal = signal.mean(axis=1)
    if rate != SR:
        wav = Path(tempfile.mkdtemp()) / 'resampled.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR),
                        str(wav), '-y'], check=True)
        signal, _ = sf.read(str(wav))
    return signal


def spectra(signal):
    window = np.hanning(WIN)
    frames = 1 + (len(signal) - WIN) // HOP
    mag = np.empty((frames, WIN // 2 + 1))
    for i in range(frames):
        mag[i] = np.abs(np.fft.rfft(signal[i * HOP:i * HOP + WIN] * window))
    return mag


def flux_of(mag):
    """Rise in log magnitude — a struck note rather than one still ringing."""
    flux = np.maximum(0, np.diff(np.log1p(mag * 400), axis=0)).sum(axis=1)
    return flux / (flux.max() or 1)


def peaks_of(flux, rel=0.20):
    """Attacks are a small share of frames, so the scale comes from a high quantile rather than the
    maximum: one loud transient — a tap on the phone, the recording starting — would otherwise set the
    scale and push every real attack under the threshold."""
    floor = np.percentile(flux, 60)
    top = np.percentile(flux, 98)
    cut = floor + max(top - floor, 1e-6) * rel
    found = [i for i in range(2, len(flux) - 2)
             if flux[i] >= cut and flux[i] == max(flux[i - 2:i + 3])]
    if not found:
        return np.array([], dtype=int)
    # The attacks of a loop are of a piece; one an order of magnitude weaker is a decay or a room noise,
    # not a stroke. Judged against the peaks actually found rather than against the whole signal.
    strong = np.median([flux[i] for i in found]) * 0.4
    return np.array([i for i in found if flux[i] >= strong])


def fit_phase(times, step):
    """Circular mean of where the attacks sit inside a slot — the offset they all share."""
    angles = 2 * np.pi * (times % step) / step
    return (np.arctan2(np.sin(angles).mean(), np.cos(angles).mean()) / (2 * np.pi) * step) % step


def attacks(signal, bpm, slots):
    """Which slots are struck, and the measured time of every occurrence of each."""
    flux = flux_of(spectra(signal))
    frames = peaks_of(flux)
    if len(frames) < 4:
        sys.exit('too few attacks found — check the tempo and that the take is piano alone')
    times = frames * HOP / SR
    step = 60.0 / bpm / 2
    phase = fit_phase(times, step)
    index = np.round((times - phase) / step).astype(int)
    index -= index.min()
    cycles = int(index.max()) // slots + 1
    tally = collections.Counter(int(i) % slots for i in index)
    struck = {s for s, n in tally.items() if n >= max(2, cycles * 0.55)}
    occurrences = sorted((float(t), int(i) % slots) for t, i in zip(times, index) if int(i) % slots in struck)
    return occurrences, sorted(struck), cycles


# ---------------------------------------------------------------- what

def model_events(path):
    import librosa
    from piano_transcription_inference import PianoTranscription, sample_rate
    audio, _ = librosa.load(str(path), sr=sample_rate, mono=True)   # the package's own loader is stale
    out = PianoTranscription(device='cpu').transcribe(audio, None)
    return [{'onset': float(e['onset_time']), 'midi': int(e['midi_note'])} for e in out['est_note_events']]


def fit_lag(occurrences, onsets):
    """The constant offset between the flux clock and the model's, coarse then centred."""
    best, score = 0.0, -1
    for shift in np.linspace(-0.20, 0.20, 161):
        hit = sum(1 for o in onsets if min(abs(o + shift - t) for t, _ in occurrences) < 0.045)
        if hit > score:
            best, score = float(shift), hit
    for _ in range(3):
        residual = [min(((o + best - t) for t, _ in occurrences), key=abs) for o in onsets]
        near = [x for x in residual if abs(x) < 0.09]
        if not near:
            break
        best -= float(np.median(near))
    return best


def snap(notes):
    """Pull a note set onto the house voicing: a doubled root, or a doubled third-and-fifth dyad."""
    if not notes:
        return []
    best, score = None, -1.0
    for root in range(40, 90):
        shapes = [[root - 12, root, root + 12]]
        shapes += [[root + third - 12, root + 7 - 12, root + third, root + 7] for third in (3, 4)]
        for shape in shapes:
            s = len(set(shape) & set(notes)) - 0.34 * len(set(shape) ^ set(notes))
            if s > score:
                best, score = shape, s
    return sorted(best or [])


def read_notes(events, occurrences, cycles, tol=0.055):
    """Assign each model event to the nearest *measured* attack, not to a grid slot.

    Binning to the grid merges attacks a half-beat apart, which the 3-2 guajeo has two of.
    """
    shift = fit_lag(occurrences, [e['onset'] for e in events])
    votes = collections.defaultdict(collections.Counter)
    for e in events:
        t = e['onset'] + shift
        slot, gap = min(((s, abs(t - at)) for at, s in occurrences), key=lambda p: p[1])
        if gap < tol:
            votes[slot][e['midi']] += 1
    floor = max(2, cycles * 0.45)
    return {s: snap([m for m, n in c.items() if n >= floor]) for s, c in votes.items() if c}, shift


# ---------------------------------------------------------------- out

def to_program(rows, title, length, clave, swap):
    """Emit the XML. A doubled root becomes one pianoTonic note; a dyad becomes its two upper notes,
    since playBothHands supplies the octave below."""
    attrs = f'{"claveSwap=\"true\" " if swap else ""}clave="{clave}" title="{title}" length=\'{length}\''
    out = [f'\t\t\t\t<bm:Program {attrs}>']
    for slot in sorted(rows):
        midis = rows[slot]
        # playBothHands supplies the lower octave, so only the upper half of a shape is written. Which
        # notes those are follows from the shape, not from a pitch threshold: a dyad can straddle middle C.
        if len(midis) == 3 and midis[1] - midis[0] == 12 and midis[2] - midis[1] == 12:
            out.append(f"\t\t\t\t\t<bm:Note index='{slot}' pitch='{midis[1] - PITCH_OFFSET}' pianoTonic=\"true\" />")
        else:
            for m in midis[len(midis) // 2:]:
                out.append(f"\t\t\t\t\t<bm:Note index='{slot}' pitch='{m - PITCH_OFFSET}' />")
    out.append('\t\t\t\t</bm:Program>')
    return '\n'.join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('recording')
    ap.add_argument('--bpm', type=float, default=120.0)
    ap.add_argument('--slots', type=int, default=32, help='pattern length in half-beats (16 or 32)')
    ap.add_argument('--title', default='Montuno untitled')
    ap.add_argument('--clave', choices=('2-3', '3-2'), default='3-2')
    ap.add_argument('--no-swap', action='store_true', help='not a guajeo: do not derive the other direction')
    ap.add_argument('--events', help='cached model output, to skip re-running it')
    args = ap.parse_args()

    signal = load_mono(args.recording)
    occurrences, struck, cycles = attacks(signal, args.bpm, args.slots)
    grid = ' | '.join(''.join('X' if c in struck else '.' for c in range(b * 8, b * 8 + 8))
                      for b in range(args.slots // 8))
    print(f'# {len(struck)} attacks over ~{cycles} cycles', file=sys.stderr)
    print(f'# {grid}', file=sys.stderr)

    if args.events:
        events = json.load(open(args.events))['events']
    else:
        events = model_events(args.recording)
        json.dump({'events': events}, open(Path(args.recording).with_suffix('.events.json'), 'w'))
    rows, shift = read_notes(events, occurrences, cycles)
    print(f'# {len(events)} note events, clock offset {shift*1000:+.0f}ms', file=sys.stderr)
    for slot in sorted(rows):
        print(f'#   slot {slot:>2}  {[note_name(m) for m in rows[slot]]}', file=sys.stderr)
    print(to_program(rows, args.title, args.slots, args.clave, not args.no_swap))


if __name__ == '__main__':
    main()
