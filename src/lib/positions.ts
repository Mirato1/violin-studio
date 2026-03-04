import type { ViolinString } from "@/types/violin";

export type PositionNumber = 1 | 2 | 3 | 4;

export interface PositionNote {
  finger: number;
  variant: "low" | "high" | "single";
  displayName: string;
  fullName: string; // e.g. "C#5"
  octave: number;
  staffPosition: number;
  accidental?: "sharp" | "flat";
  midiNumber: number;
  string: ViolinString;
}

const OPEN_MIDI: Record<ViolinString, number> = { G: 55, D: 62, A: 69, E: 76 };

/**
 * Semitone offset of "high finger 1" from the open string for each position.
 * Pos 1: whole step (2), Pos 2: major 3rd (4), Pos 3: perfect 4th (5), Pos 4: perfect 5th (7)
 */
const POSITION_BASE: Record<PositionNumber, number> = { 1: 2, 2: 4, 3: 5, 4: 7 };

/** Finger pattern: deltas from the position base semitone */
const FINGER_DELTAS: { finger: number; variant: "low" | "high" | "single"; delta: number }[] = [
  { finger: 1, variant: "low", delta: -1 },
  { finger: 1, variant: "high", delta: 0 },
  { finger: 2, variant: "low", delta: 1 },
  { finger: 2, variant: "high", delta: 2 },
  { finger: 3, variant: "single", delta: 3 },
  { finger: 4, variant: "low", delta: 4 },
  { finger: 4, variant: "high", delta: 5 },
];

/**
 * Chromatic note info indexed by pitch class (0–11).
 * display: standard enharmonic spelling for violin
 * diatonic: diatonic step within octave (C=0, D=1, E=2, F=3, G=4, A=5, B=6)
 */
const CHROMATIC: {
  display: string;
  diatonic: number;
  accidental?: "sharp" | "flat";
}[] = [
  { display: "C", diatonic: 0 },
  { display: "C#", diatonic: 0, accidental: "sharp" },
  { display: "D", diatonic: 1 },
  { display: "Eb", diatonic: 2, accidental: "flat" },
  { display: "E", diatonic: 2 },
  { display: "F", diatonic: 3 },
  { display: "F#", diatonic: 3, accidental: "sharp" },
  { display: "G", diatonic: 4 },
  { display: "G#", diatonic: 4, accidental: "sharp" },
  { display: "A", diatonic: 5 },
  { display: "Bb", diatonic: 6, accidental: "flat" },
  { display: "B", diatonic: 6 },
];

function midiToNoteInfo(midi: number) {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const info = CHROMATIC[pitchClass];
  // staffPosition: diatonic offset from C4 (C4=0, D4=1, ...)
  const staffPosition = (octave - 4) * 7 + info.diatonic;
  return {
    displayName: info.display,
    fullName: `${info.display}${octave}`,
    octave,
    staffPosition,
    accidental: info.accidental,
  };
}

/** Generate all fingered notes for a given string and position */
export function getPositionNotes(
  string: ViolinString,
  position: PositionNumber,
): PositionNote[] {
  const openMidi = OPEN_MIDI[string];
  const base = POSITION_BASE[position];

  return FINGER_DELTAS.map(({ finger, variant, delta }) => {
    const midi = openMidi + base + delta;
    const info = midiToNoteInfo(midi);
    return {
      finger,
      variant,
      ...info,
      midiNumber: midi,
      string,
    };
  });
}

/** Position descriptions for beginners */
export const POSITION_INFO: Record<PositionNumber, { label: string; description: string; shift: string }> = {
  1: {
    label: "1st Position",
    description: "Hand near the nut. Most beginner pieces use this position.",
    shift: "Starting position — no shift needed",
  },
  2: {
    label: "2nd Position",
    description: "Hand shifts up one whole step from 1st position.",
    shift: "Finger 1 moves to where finger 2 was in 1st position",
  },
  3: {
    label: "3rd Position",
    description: "Hand shifts up to a perfect 4th above the open string.",
    shift: "Finger 1 moves to where finger 3 was in 1st position",
  },
  4: {
    label: "4th Position",
    description: "Hand shifts up to a perfect 5th above the open string.",
    shift: "Finger 1 moves to where finger 4 was in 1st position",
  },
};

/** Get the "high finger 1" note name for a string at a position (e.g. "A" for G string 1st pos) */
export function getFinger1Note(string: ViolinString, position: PositionNumber): string {
  const midi = OPEN_MIDI[string] + POSITION_BASE[position];
  return midiToNoteInfo(midi).displayName;
}

/** Get the open string note info */
export function getOpenStringNote(string: ViolinString): PositionNote {
  const midi = OPEN_MIDI[string];
  const info = midiToNoteInfo(midi);
  return {
    finger: 0,
    variant: "single",
    ...info,
    midiNumber: midi,
    string,
  };
}
