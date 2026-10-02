const A4 = 440;
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function noteFreq(note) {
  const name = note.slice(0, -1);
  const octave = Number(note.slice(-1));
  const semitone = NOTE_NAMES.indexOf(name);
  if (semitone < 0 || !Number.isFinite(octave)) return NaN;
  const steps = semitone - 9 + (octave - 4) * 12;
  return A4 * 2 ** (steps / 12);
}

export function hzToNote(hz) {
  if (!hz || hz <= 0) return null;
  const steps = Math.round(12 * Math.log2(hz / A4));
  const index = ((steps % 12) + 12) % 12;
  const octave = 4 + Math.floor((steps + 9) / 12);
  return `${NOTE_NAMES[index]}${octave}`;
}

export function centsOff(hz, targetHz) {
  if (!hz || !targetHz || hz <= 0 || targetHz <= 0) return Infinity;
  return 1200 * Math.log2(hz / targetHz);
}

/** Fold a sung pitch into the octave nearest the target. */
export function wrapOctave(hz, targetHz) {
  if (!hz || !targetHz) return hz;
  let folded = hz;
  while (folded > 0 && folded < targetHz / Math.SQRT2) folded *= 2;
  while (folded > targetHz * Math.SQRT2) folded /= 2;
  return folded;
}

export function detectPitch(samples, sampleRate, minHz = 80, maxHz = 900) {
  const size = samples.length;
  if (size < 32) return null;
  let rms = 0;
  for (let i = 0; i < size; i += 1) rms += samples[i] * samples[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.012) return null;

  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(Math.floor(sampleRate / minHz), size - 2);
  let bestLag = -1;
  let bestCorr = 0;
  let norm = 0;
  for (let i = 0; i < size; i += 1) norm += samples[i] * samples[i];
  if (norm < 1e-6) return null;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let corr = 0;
    const n = size - lag;
    for (let i = 0; i < n; i += 1) corr += samples[i] * samples[i + lag];
    corr /= n;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  if (bestLag < 0 || bestCorr < 0.0008) return null;
  return sampleRate / bestLag;
}

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function scoreNote(pitches, targetHz, toleranceCents = 60) {
  const voiced = pitches.filter((hz) => hz > 0);
  if (voiced.length < 4) {
    return { ok: false, heardHz: null, heardNote: null, cents: null, reason: "quiet" };
  }
  const folded = voiced.map((hz) => wrapOctave(hz, targetHz));
  const heardHz = median(folded);
  const cents = Math.abs(centsOff(heardHz, targetHz));
  return {
    ok: cents <= toleranceCents,
    heardHz,
    heardNote: hzToNote(heardHz),
    cents,
    reason: cents <= toleranceCents ? "ok" : "off",
  };
}

export function scorePhrase(pitches, targetNotes, hitCents = 70) {
  const voiced = pitches.filter((hz) => hz > 0);
  if (voiced.length < 8) {
    return { ok: false, heardHz: null, heardNote: null, cents: null, reason: "quiet", hits: 0, need: 0 };
  }
  const unique = [...new Set(targetNotes)];
  let hits = 0;
  for (const note of unique) {
    const targetHz = noteFreq(note);
    const matched = voiced.some((hz) => Math.abs(centsOff(wrapOctave(hz, targetHz), targetHz)) <= hitCents);
    if (matched) hits += 1;
  }
  const targetHz = noteFreq(unique[0]);
  const heardHz = median(voiced.map((hz) => wrapOctave(hz, targetHz)));
  const need = Math.max(1, Math.ceil(unique.length * 0.6));
  return {
    ok: hits >= need,
    heardHz,
    heardNote: hzToNote(heardHz),
    cents: Math.abs(centsOff(heardHz, targetHz)),
    reason: hits >= need ? "ok" : "off",
    hits,
    need,
  };
}

export function formatHz(hz) {
  if (!hz || !Number.isFinite(hz)) return "—";
  return `${Math.round(hz)} Гц`;
}
