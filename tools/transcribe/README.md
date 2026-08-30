# Reading a montuno off a recording

Turns audio of a solo piano pattern into a `<bm:Program>` for `public/assets/machines/salsa.xml`.

Built to answer a specific question — what does another implementation actually play in 3-2 — but it
works on any recording of a single piano loop at a known tempo.

## Why two methods

Neither half is sufficient, and they fail in complementary ways.

**Timing** is spectral flux folded onto the loop. A real attack recurs every cycle; a stray does not. This
has been exact on every take tried, including phone recordings of another app through a speaker.

**Notes** come from a learned piano transcription model. It finds the right pitches and then *drops
octaves* — it will hear a C4 and miss the C3 doubling it. It does not invent wrong chords, which the
hand-rolled spectral method that preceded it did.

**The repair** is this library's own voicing. Every montuno here is either a root with the octave above
and the left hand an octave below, or a third-and-fifth dyad likewise doubled. Snapping the model's output
to the nearer shape restores exactly what it omits.

Measured on a take whose answer was known from the XML:

| | exact note-sets |
|---|---|
| hand-rolled spectral matching | 6/9 |
| learned model alone | 5/9 |
| **model + voicing snap** | **9/9** |

## Recording

**Piano alone.** Adding the clave makes it worse, not better: its transients dominate the flux and mask
the piano's, dropping a nine-attack read to seven. Fix the tempo and say what it was. Thirty seconds is
plenty. A phone screen-recording is fine — the validation above was one.

Slot numbering is relative. Piano alone cannot say where count 1 is, so compare patterns to each other
rather than trusting the absolute index.

## Use

```sh
uv run --with piano_transcription_inference --with torch --with librosa \
       --with audioread --with soundfile --with numpy \
       python transcribe.py TAKE.wav --bpm 120 --slots 32 --title "Montuno i-i-vii-vii"
```

Notes on stderr, the program on stdout, ready to paste. `--slots` is the pattern length in half-beats:
if a 16-slot read shows every slot voting for two different chords, it is a 32.

The model is ~164 MB and downloads on first use. It runs on CPU, about a minute per thirty seconds of
audio. `--events FILE.json` reuses a previous run's output so scoring can be iterated for free.

## Checking the result

Paste the program into `salsa.xml`, then play it back beside the source:

```sh
uv run --with soundfile --with numpy python render.py Piano "Montuno i-i-vii-vii" -o mine.wav
```

Better still, run `transcribe.py` over that render and compare the two readings slot by slot — that is how
the `i-i-vii-vii` entry was confirmed, at eighteen attacks out of eighteen.
