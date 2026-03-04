import type { GameNote } from "@/types/game";

const DIATONIC_NOTES = ["c", "d", "e", "f", "g", "a", "b"];

export interface ScoreNote {
  type: "note" | "rest";
  keys: string[];
  vexDuration: string;
  dotted: boolean;
  accidentals: string[];
  sourceNoteIndex: number;
  startTimeSec: number;
}

export interface ScoreMeasure {
  notes: ScoreNote[];
  startTimeSec: number;
}

export interface ScoreData {
  measures: ScoreMeasure[];
  timeSignature: string;
  bpm: number;
  keySignature: string;
}

/** Convert staffPosition (diatonic offset from C4) to VexFlow key string */
function staffPositionToVexKey(sp: number): string {
  const octave = 4 + Math.floor(sp / 7);
  const noteIndex = ((sp % 7) + 7) % 7;
  return `${DIATONIC_NOTES[noteIndex]}/${octave}`;
}

interface QuantizedDuration {
  vexDuration: string;
  dotted: boolean;
  beats: number;
}

const DURATION_CANDIDATES: { beats: number; vexDuration: string; dotted: boolean }[] = [
  { beats: 4, vexDuration: "w", dotted: false },
  { beats: 3, vexDuration: "h", dotted: true },
  { beats: 2, vexDuration: "h", dotted: false },
  { beats: 1.5, vexDuration: "q", dotted: true },
  { beats: 1, vexDuration: "q", dotted: false },
  { beats: 0.75, vexDuration: "8", dotted: true },
  { beats: 0.5, vexDuration: "8", dotted: false },
  { beats: 0.25, vexDuration: "16", dotted: false },
];

/** Quantize a duration in seconds to the nearest standard note duration */
function quantizeDuration(durationSec: number, bpm: number): QuantizedDuration {
  const beatDuration = 60 / bpm;
  const beats = durationSec / beatDuration;

  let best = DURATION_CANDIDATES[DURATION_CANDIDATES.length - 1];
  let minDiff = Infinity;
  for (const c of DURATION_CANDIDATES) {
    const diff = Math.abs(beats - c.beats);
    if (diff < minDiff) {
      minDiff = diff;
      best = c;
    }
  }
  return best;
}

// ─── Key Signature Detection ───────────────────────────────────────────────

const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"]; // circle of fifths sharps
const FLAT_ORDER  = ["B", "E", "A", "D", "G", "C", "F"]; // circle of fifths flats
const SHARP_KEYS  = ["C", "G", "D", "A", "E", "B", "F#", "C#"]; // 0-7 sharps
const FLAT_KEYS   = ["C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]; // 0-7 flats

// Which letters are sharped/flatted by each key signature
const KEY_SHARPS_MAP: Record<string, string[]> = {
  "C": [],
  "G": ["F"],
  "D": ["F", "C"],
  "A": ["F", "C", "G"],
  "E": ["F", "C", "G", "D"],
  "B": ["F", "C", "G", "D", "A"],
  "F#": ["F", "C", "G", "D", "A", "E"],
  "C#": ["F", "C", "G", "D", "A", "E", "B"],
};
const KEY_FLATS_MAP: Record<string, string[]> = {
  "C": [],
  "F": ["B"],
  "Bb": ["B", "E"],
  "Eb": ["B", "E", "A"],
  "Ab": ["B", "E", "A", "D"],
  "Db": ["B", "E", "A", "D", "G"],
  "Gb": ["B", "E", "A", "D", "G", "C"],
  "Cb": ["B", "E", "A", "D", "G", "C", "F"],
};

function detectKeySignature(notes: GameNote[]): string {
  const sharpCount: Record<string, number> = {};
  const flatCount:  Record<string, number> = {};

  for (const n of notes) {
    // Extract the letter from noteName (e.g. "F#5" → "F", "Bb4" → "B")
    const letter = n.noteName.replace(/[#b\d]/g, "").toUpperCase();
    if (n.accidental === "sharp") sharpCount[letter] = (sharpCount[letter] ?? 0) + 1;
    if (n.accidental === "flat")  flatCount[letter]  = (flatCount[letter]  ?? 0) + 1;
  }

  let bestKey = "C";
  let bestScore = -Infinity;

  // Score each sharp key
  for (let n = 0; n <= 7; n++) {
    const keySharps = SHARP_ORDER.slice(0, n);
    let score = 0;
    for (const s of keySharps) score += (sharpCount[s] ?? 0) * 2;
    for (const [l, c] of Object.entries(sharpCount)) {
      if (!keySharps.includes(l)) score -= c;
    }
    score -= Object.values(flatCount).reduce((a, b) => a + b, 0);
    if (score > bestScore) { bestScore = score; bestKey = SHARP_KEYS[n]; }
  }

  // Score each flat key (skip n=0, that's C which was handled above)
  for (let n = 1; n <= 7; n++) {
    const keyFlats = FLAT_ORDER.slice(0, n);
    let score = 0;
    for (const f of keyFlats) score += (flatCount[f] ?? 0) * 2;
    for (const [l, c] of Object.entries(flatCount)) {
      if (!keyFlats.includes(l)) score -= c;
    }
    score -= Object.values(sharpCount).reduce((a, b) => a + b, 0);
    if (score > bestScore) { bestScore = score; bestKey = FLAT_KEYS[n]; }
  }

  return bestKey;
}

/** Build ScoreMeasures from GameNotes, applying key signature accidental logic */
function buildMeasures(
  notes: GameNote[],
  bpm: number,
  beatsPerMeasure: number,
  keySig: string
): ScoreMeasure[] {
  const keySharps = KEY_SHARPS_MAP[keySig] ?? [];
  const keyFlats  = KEY_FLATS_MAP[keySig]  ?? [];

  const beatDuration = 60 / bpm;
  const measureDuration = beatsPerMeasure * beatDuration;
  const events: ScoreNote[] = [];
  let cursor = 0;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const gap = note.startTimeSec - cursor;

    // Insert rest if gap is significant (> 1/8 of a beat)
    if (gap > beatDuration * 0.125) {
      const restQ = quantizeDuration(gap, bpm);
      events.push({
        type: "rest",
        keys: ["b/4"],
        vexDuration: restQ.vexDuration,
        dotted: restQ.dotted,
        accidentals: [],
        sourceNoteIndex: -1,
        startTimeSec: cursor,
      });
      cursor += restQ.beats * beatDuration;
    }

    const sp = note.staffPosition ?? 0;
    const key = staffPositionToVexKey(sp);
    const q = quantizeDuration(note.durationSec, bpm);

    // The diatonic letter for this note (uppercase, e.g. "F")
    const letter = note.noteName.replace(/[#b\d]/g, "").toUpperCase();
    const noteAcc = note.accidental; // "sharp" | "flat" | undefined

    // Determine the accidental string needed in this context:
    // - If note is sharp and key has this letter sharp → no extra mark needed
    // - If note is sharp and key does NOT have it → "#" needed
    // - If note is natural but key has this letter sharped → "n" needed
    // - If note is flat and key has this letter flat → no extra mark needed
    // - If note is flat and key does NOT have it → "b" needed
    // - If note is natural but key has this letter flatted → "n" needed
    let acc = "";
    if (noteAcc === "sharp") {
      if (!keySharps.includes(letter)) acc = "#";
    } else if (noteAcc === "flat") {
      if (!keyFlats.includes(letter)) acc = "b";
    } else {
      // Natural note — need courtesy natural if key alters this letter
      if (keySharps.includes(letter) || keyFlats.includes(letter)) acc = "n";
    }

    events.push({
      type: "note",
      keys: [key],
      vexDuration: q.vexDuration,
      dotted: q.dotted,
      accidentals: [acc],
      sourceNoteIndex: i,
      startTimeSec: note.startTimeSec,
    });
    cursor = note.startTimeSec + q.beats * beatDuration;
  }

  // Split events into measures by time, tracking within-measure accidentals
  const measures: ScoreMeasure[] = [];
  let currentNotes: ScoreNote[] = [];
  let currentMeasureIdx = 0;
  // measureAcc: letter → last accidental emitted in this measure ("#"|"b"|"n"|"")
  let measureAcc: Record<string, string> = {};

  const flushMeasure = () => {
    if (currentNotes.length > 0) {
      measures.push({ notes: currentNotes, startTimeSec: currentMeasureIdx * measureDuration });
      currentNotes = [];
    } else {
      measures.push({
        notes: [{
          type: "rest",
          keys: ["b/4"],
          vexDuration: "w",
          dotted: false,
          accidentals: [],
          sourceNoteIndex: -1,
          startTimeSec: measures.length * measureDuration,
        }],
        startTimeSec: measures.length * measureDuration,
      });
    }
    measureAcc = {};
  };

  for (const event of events) {
    const measureIdx = Math.max(0, Math.floor(event.startTimeSec / measureDuration));

    // Fill empty measures if needed
    while (measures.length < measureIdx) {
      flushMeasure();
      currentMeasureIdx = measures.length;
    }

    if (measureIdx !== currentMeasureIdx && currentNotes.length > 0) {
      flushMeasure();
      currentMeasureIdx = measureIdx;
    }

    // Deduplicate within-measure accidentals
    if (event.type === "note" && event.accidentals[0]) {
      const letter = event.keys[0].split("/")[0].toUpperCase(); // e.g. "f/4" → "F"
      const needed = event.accidentals[0];
      if (measureAcc[letter] === needed) {
        // Already emitted this accidental for this letter in this measure
        event.accidentals[0] = "";
      } else {
        measureAcc[letter] = needed;
      }
    }

    currentNotes.push(event);
    currentMeasureIdx = measureIdx;
  }

  if (currentNotes.length > 0) {
    measures.push({ notes: currentNotes, startTimeSec: currentMeasureIdx * measureDuration });
  }

  return measures;
}

/** Convert GameNotes to VexFlow-ready ScoreData */
export function convertToScore(
  notes: GameNote[],
  bpm: number,
  beatsPerMeasure = 4
): ScoreData {
  const keySignature = detectKeySignature(notes);
  return {
    measures: buildMeasures(notes, bpm, beatsPerMeasure, keySignature),
    timeSignature: `${beatsPerMeasure}/4`,
    bpm,
    keySignature,
  };
}
