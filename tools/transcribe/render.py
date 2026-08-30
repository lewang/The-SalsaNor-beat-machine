"""Play a program out of the sample bank, so a transcription can be heard beside its source.

Mirrors engine/beat-engine.ts instrumentSamples(): pitch names a sample as '<id>-<pitch+pitchOffset>',
pianoTonic adds the octave above, playBothHands the octave below, velocity is a gain, and a note at index
i sounds at i * (beatTime / 2).

    uv run --with soundfile --with numpy python render.py Piano "Montuno i-i-vii-vii" --bpm 120 -o out.wav
"""
import argparse
import json
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
import soundfile as sf

NS_I = 'http://www.salsabeatmachine.org/xns/instruments'
NS_B = 'http://www.salsabeatmachine.org/xns/bm'
SR = 44100
ASSETS = Path(__file__).resolve().parents[2] / 'public' / 'assets'


def bank():
    """The sprite as decoded audio; ffmpeg is only needed the first time."""
    wav = ASSETS / 'audio' / 'main.bank.wav'
    if not wav.exists():
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ASSETS / 'audio' / 'main.webm'),
                        '-ac', '1', '-ar', str(SR), str(wav), '-y'], check=True)
    audio, _ = sf.read(str(wav))
    return audio, json.load(open(ASSETS / 'audio' / 'main.json'))


def find(machine, instrument_title, program_title):
    root = ET.parse(ASSETS / 'machines' / machine).getroot()
    for inst in root.find(f'{{{NS_B}}}instrumentList'):
        if inst.get('title') != instrument_title:
            continue
        programs = list(inst.find(f'{{{NS_I}}}programs'))
        for p in programs:
            if p.get('title') == program_title:
                return inst, p
        raise SystemExit('programs: ' + '; '.join(q.get('title') for q in programs))
    raise SystemExit(f'no instrument {instrument_title!r}')


def field(inst, name, default='0'):
    return inst.findtext(f'{{{NS_I}}}{name}') or default


def render(inst, program, bpm, cycles, key_note=0):
    audio, sprite = bank()
    ident = inst.tag.split('}')[-1].lower()
    pitch_offset = int(field(inst, 'pitchOffset'))
    left = int(field(inst, 'leftHandPitchOffset'))
    both = field(inst, 'playBothHands', 'false') == 'true'
    keyed = field(inst, 'keyedInstrument', 'false') == 'true'

    plan = []
    for note in program:
        index = int(note.get('index'))
        pitch = int(note.get('pitch')) + (key_note if keyed else 0)
        velocity = float(note.get('velocity') or 1.0)
        hand = note.get('hand')
        if hand != 'left':
            plan.append((index, f'{ident}-{pitch + pitch_offset}', velocity))
            if note.get('pianoTonic'):
                plan.append((index, f'{ident}-{pitch + pitch_offset + 12}', velocity))
        if both and hand != 'right':
            plan.append((index, f'{ident}-{pitch + left}', velocity))

    length = int(program.get('length'))
    step = 60.0 / bpm / 2
    buf = np.zeros(int((length * cycles * step + 3) * SR))
    for cycle in range(cycles):
        for index, sample, velocity in plan:
            info = sprite.get(sample)
            if info is None:
                print(f'  !! missing sample {sample}')
                continue
            chunk = audio[int(info[1]):int(info[1]) + int(info[2])] * velocity
            at = int((cycle * length + index) * step * SR)
            buf[at:at + len(chunk)] += chunk
    return buf / (np.max(np.abs(buf)) or 1) * 0.89


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('instrument')
    ap.add_argument('program')
    ap.add_argument('--machine', default='salsa.xml')
    ap.add_argument('--bpm', type=float, default=120.0)
    ap.add_argument('--cycles', type=int, default=6)
    ap.add_argument('--key', type=int, default=0)
    ap.add_argument('-o', '--out', default='render.wav')
    args = ap.parse_args()

    inst, program = find(args.machine, args.instrument, args.program)
    sf.write(args.out, render(inst, program, args.bpm, args.cycles, args.key), SR)
    idx = sorted({int(n.get('index')) for n in program})
    length = int(program.get('length'))
    grid = ' | '.join(''.join('X' if c in idx else '.' for c in range(b * 8, b * 8 + 8))
                      for b in range(length // 8))
    print(f'{args.program}  length={length}  {args.bpm:g} BPM -> {args.out}')
    print(f'  {grid}')


if __name__ == '__main__':
    main()
