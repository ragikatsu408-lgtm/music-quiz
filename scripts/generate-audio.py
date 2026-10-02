#!/usr/bin/env python3
"""Generate short public-domain melody snippets as WAV files (no third-party deps)."""

from __future__ import annotations

import math
import os
import struct
import wave

SR = 22050
A4 = 440.0

NOTE_STEPS = {
    "C": -9,
    "C#": -8,
    "Db": -8,
    "D": -7,
    "D#": -6,
    "Eb": -6,
    "E": -5,
    "F": -4,
    "F#": -3,
    "Gb": -3,
    "G": -2,
    "G#": -1,
    "Ab": -1,
    "A": 0,
    "A#": 1,
    "Bb": 1,
    "B": 2,
}


def freq(note: str) -> float:
    name, octave = note[:-1], int(note[-1])
    steps = NOTE_STEPS[name] + (octave - 4) * 12
    return A4 * (2 ** (steps / 12))


def envelope(i: int, n: int) -> float:
    attack = min(0.04 * SR, n * 0.12)
    release = min(0.12 * SR, n * 0.28)
    if i < attack:
        return i / attack
    if i > n - release:
        return max(0.0, (n - i) / release)
    return 1.0


def tone(f: float, duration: float, volume: float = 0.32) -> list[int]:
    n = max(1, int(SR * duration))
    samples: list[int] = []
    for i in range(n):
        t = i / SR
        env = envelope(i, n)
        wave_val = (
            math.sin(2 * math.pi * f * t)
            + 0.28 * math.sin(4 * math.pi * f * t)
            + 0.08 * math.sin(6 * math.pi * f * t)
        )
        samples.append(int(max(-1.0, min(1.0, env * volume * wave_val)) * 32767))
    return samples


def rest(duration: float) -> list[int]:
    return [0] * max(1, int(SR * duration))


def render(notes: list[tuple[str | None, float]]) -> bytes:
    samples: list[int] = []
    samples.extend(rest(0.08))
    for name, dur in notes:
        if name is None:
            samples.extend(rest(dur))
        else:
            samples.extend(tone(freq(name), dur))
    samples.extend(rest(0.18))
    return b"".join(struct.pack("<h", s) for s in samples)


def write_wav(path: str, pcm: bytes) -> None:
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm)


# Well-known public-domain / folk melodies, simplified for recognition.
MELODIES: dict[str, list[tuple[str | None, float]]] = {
    "ode-to-joy": [
        ("E4", 0.32),
        ("E4", 0.32),
        ("F4", 0.32),
        ("G4", 0.32),
        ("G4", 0.32),
        ("F4", 0.32),
        ("E4", 0.32),
        ("D4", 0.32),
        ("C4", 0.32),
        ("C4", 0.32),
        ("D4", 0.32),
        ("E4", 0.32),
        ("E4", 0.48),
        ("D4", 0.16),
        ("D4", 0.5),
    ],
    "fur-elise": [
        ("E5", 0.18),
        ("D#5", 0.18),
        ("E5", 0.18),
        ("D#5", 0.18),
        ("E5", 0.18),
        ("B4", 0.18),
        ("D5", 0.18),
        ("C5", 0.18),
        ("A4", 0.55),
    ],
    "turkish-march": [
        ("B4", 0.16),
        ("A4", 0.16),
        ("G#4", 0.16),
        ("A4", 0.16),
        ("C5", 0.32),
        (None, 0.08),
        ("D5", 0.16),
        ("C5", 0.16),
        ("B4", 0.16),
        ("C5", 0.16),
        ("E5", 0.4),
    ],
    "mountain-king": [
        ("A3", 0.16),
        ("B3", 0.16),
        ("C4", 0.16),
        ("D4", 0.16),
        ("E4", 0.16),
        ("C4", 0.16),
        ("E4", 0.32),
        ("D#4", 0.16),
        ("B3", 0.16),
        ("D#4", 0.32),
        ("E4", 0.16),
        ("C4", 0.16),
        ("E4", 0.4),
    ],
    "sugar-plum": [
        ("E5", 0.14),
        (None, 0.06),
        ("D#5", 0.14),
        (None, 0.06),
        ("E5", 0.14),
        (None, 0.06),
        ("D#5", 0.14),
        (None, 0.06),
        ("E5", 0.14),
        ("B4", 0.18),
        ("D5", 0.18),
        ("C5", 0.18),
        ("A4", 0.45),
    ],
    "kalinka": [
        ("A4", 0.18),
        ("A4", 0.18),
        ("C5", 0.28),
        ("B4", 0.14),
        ("A4", 0.18),
        ("G4", 0.28),
        ("A4", 0.18),
        ("A4", 0.18),
        ("C5", 0.28),
        ("B4", 0.14),
        ("A4", 0.18),
        ("G4", 0.4),
    ],
    "yolochka": [
        ("C4", 0.28),
        ("A4", 0.28),
        ("A4", 0.28),
        ("G4", 0.28),
        ("A4", 0.28),
        ("G4", 0.28),
        ("F4", 0.28),
        ("E4", 0.28),
        ("D4", 0.28),
        ("C4", 0.5),
    ],
    "toccata": [
        ("A4", 0.55),
        ("G4", 0.18),
        ("A4", 0.18),
        ("C5", 0.18),
        ("B4", 0.18),
        ("G#4", 0.18),
        ("A4", 0.7),
    ],
}


def main() -> None:
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
    os.makedirs(out_dir, exist_ok=True)
    for name, notes in MELODIES.items():
        path = os.path.abspath(os.path.join(out_dir, f"{name}.wav"))
        write_wav(path, render(notes))
        print(f"wrote {path}")

    sing_dir = os.path.join(out_dir, "sing")
    os.makedirs(sing_dir, exist_ok=True)
    for name, notes in SING_TRACKS.items():
        path = os.path.abspath(os.path.join(sing_dir, f"{name}.wav"))
        write_wav(path, render(notes))
        print(f"wrote {path}")


# Reference tones and short public-domain opera motifs for the singing mode.
SING_TRACKS: dict[str, list[tuple[str | None, float]]] = {
    "c4": [("C4", 1.5)],
    "e4": [("E4", 1.5)],
    "a4": [("A4", 1.5)],
    "figaro": [
        ("C5", 0.22),
        ("C5", 0.22),
        ("C5", 0.22),
        ("C5", 0.4),
        ("G4", 0.28),
        ("E4", 0.28),
        ("C4", 0.5),
    ],
    "habanera": [
        ("D4", 0.36),
        ("D4", 0.18),
        ("D4", 0.18),
        ("C#4", 0.36),
        ("D4", 0.36),
        ("F4", 0.5),
    ],
    "donna": [
        ("B4", 0.28),
        ("A4", 0.18),
        ("G#4", 0.18),
        ("A4", 0.28),
        ("C5", 0.4),
        ("B4", 0.22),
        ("A4", 0.45),
    ],
}


if __name__ == "__main__":
    main()
