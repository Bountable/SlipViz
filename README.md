# AudioViz

A browser-based real-time audio visualizer built with p5.js and the p5.sound
addon. It captures live system audio (via a virtual loopback device such as
BlackHole), runs FFT/amplitude analysis and sub-bass kick detection, and renders
a finance-terminal-styled visual: band-split waveforms, a running P/L equity
curve, world clocks, scrolling news marquees, and beat-triggered overlays.

## Requirements

- A modern browser (Chrome or Firefox recommended) with Web Audio support.
- A virtual audio loopback device to expose system output as an input:
  - macOS: [BlackHole](https://github.com/ExistentialAudio/BlackHole)
  - Windows: VB-CABLE, or equivalent
- Python 3 (or any static file server) to serve the files over HTTP.
- Optional: `traktor_nowplaying` (or any process that writes the current track
  to `nowplaying.txt`) for the now-playing readout.

The page must be served over `http://` (or `https://`). Audio input via
`getUserMedia` does not work from `file://` URLs.

## Audio routing

The visualizer reads from an audio *input* device. To feed it system audio:

1. Install BlackHole (or another loopback device).
2. To both hear audio and capture it, create an aggregate/multi-output device
   that includes BlackHole plus your normal output, and set it as the system
   output. On macOS this is done in Audio MIDI Setup ("Multi-Output Device").
3. Set system output to that multi-output device so audio is duplicated to
   BlackHole.

The sketch auto-selects the first input device whose label matches `blackhole`
(case-insensitive). If none is found it falls back to the default input.

## Running

Serve the directory and open the page:

```
cd AudioViz
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in the browser.

Click anywhere on the page to start. The click is required: browsers block the
AudioContext until a user gesture, so audio analysis only begins after the first
interaction. Grant microphone/input permission when prompted (required to
enumerate and read input devices, including BlackHole).

### Optional: now-playing integration

`run.sh` starts a `traktor_nowplaying` process that writes the current track to
`nowplaying.txt`, plus the static server:

```
./run.sh
```

The sketch polls `nowplaying.txt` every 2 seconds and displays its contents. If
the file is absent the now-playing field stays at its placeholder; nothing else
is affected.

## Files

- `index.html` — loads p5.js 1.9.4 + p5.sound from a CDN and the sketch.
- `vis.js` — the entire sketch: audio setup, analysis, and all rendering.
- `nowplaying.txt` — current track text, written by an external process.
- `officer-down-star.png` — image asset used by one of the overlays.
- `run.sh` — convenience script: starts the now-playing writer and the server.

## How it works

- `p5.AudioIn` provides the input stream; `p5.FFT` (1024 bins) and
  `p5.Amplitude` produce the spectrum, waveform, and level.
- `p5.PeakDetect` is configured on the 20-40 Hz band for sub-bass kick
  detection; detected kicks drive the background pulse, screenshake, overlays,
  and the simulated P/L events.
- The three waveforms are derived from a single time-domain buffer: a one-pole
  low-pass yields the bass line, and the residual (`sample - lowpass`) yields the
  treble line; the unfiltered buffer is the main line.
- Rendering is layered per frame: a green-on-kick background, an equity curve,
  the waveforms, beat-triggered overlays, then anchored UI (HUD table, clocks,
  marquees, vignette).

## Configuration

Most tunables are constants near the top of `vis.js`:

- `MULT` — scales the displayed metric values and waveform height.
- `BG_DECAY` — how fast the kick flash fades (0-1; higher is slower).
- `COLORS` — central color table; every element references it.
- `CLOCKS` — array of `{ tz, label }` for the world clocks (IANA timezones).
- `peakDetect = new p5.PeakDetect(20, 40, 0.5, 0.02)` — kick detection band,
  threshold, and minimum interval.
- `EQUITY_MAX`, `MONEY_LIFE`, `STAMP_LIFE` — overlay durations/history length.

## Notes

- The canvas is sized to the browser window and follows resizes.
- BlackHole captures the system mix, so any other audio (notifications, other
  tabs) will also be visualized.

<img width="1911" height="1000" alt="image" src="https://github.com/user-attachments/assets/de750816-3b0a-4b86-b8e0-5dde295dd79d" />

<img width="932" height="808" alt="image" src="https://github.com/user-attachments/assets/95955932-c988-4dec-a4f8-883abfd12472" />

