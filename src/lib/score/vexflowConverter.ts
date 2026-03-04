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

/** Build ScoreMeasures from GameNotes */
function buildMeasures(
  notes: GameNote[],
  bpm: number,
  beatsPerMeasure: number
): ScoreMeasure[] {
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
    const acc = note.accidental === "sharp" ? "#" : note.accidental === "flat" ? "b" : "";

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

  // Split events into measures by time
  const measures: ScoreMeasure[] = [];
  let currentNotes: ScoreNote[] = [];
  let currentMeasureIdx = 0;

  for (const event of events) {
    const measureIdx = Math.max(0, Math.floor(event.startTimeSec / measureDuration));

    // Fill empty measures if needed
    while (measures.length < measureIdx) {
      if (currentNotes.length > 0) {
        measures.push({ notes: currentNotes, startTimeSec: currentMeasureIdx * measureDuration });
        currentNotes = [];
      } else {
        // Empty measure with a whole rest
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
      currentMeasureIdx = measures.length;
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
  return {
    measures: buildMeasures(notes, bpm, beatsPerMeasure),
    timeSignature: `${beatsPerMeasure}/4`,
    bpm,
  };
}
