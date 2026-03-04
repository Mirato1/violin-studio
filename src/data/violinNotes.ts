import type { ViolinNote, ViolinString } from "@/types/violin";

/**
 * Violin notes from first position through fifth position.
 * staffPosition: diatonic step offset from C4.
 *   C4=0, D4=1, E4=2, F4=3, G4=4, A4=5, B4=6, C5=7, D5=8, E5=9, F5=10, G5=11, A5=12, B5=13
 *   C6=14, D6=15, E6=16, F6=17, G6=18, A6=19
 * This maps to vertical placement on treble clef.
 */
export const VIOLIN_NOTES: ViolinNote[] = [
  // === G String (1st position) ===
  { id: "G3", name: "G3", displayName: "G", midiNumber: 55, string: "G", finger: 0, staffPosition: -3 },
  { id: "Ab3", name: "Ab3", displayName: "Ab", midiNumber: 56, string: "G", finger: 1, staffPosition: -2, accidental: "flat" },
  { id: "A3", name: "A3", displayName: "A", midiNumber: 57, string: "G", finger: 1, staffPosition: -2 },
  { id: "Bb3", name: "Bb3", displayName: "Bb", midiNumber: 58, string: "G", finger: 2, staffPosition: -1, accidental: "flat" },
  { id: "B3", name: "B3", displayName: "B", midiNumber: 59, string: "G", finger: 2, staffPosition: -1 },
  { id: "C4", name: "C4", displayName: "C", midiNumber: 60, string: "G", finger: 3, staffPosition: 0 },
  { id: "C#4", name: "C#4", displayName: "C#", midiNumber: 61, string: "G", finger: 4, staffPosition: 0, accidental: "sharp" },
  // === D String (1st position) ===
  { id: "D4", name: "D4", displayName: "D", midiNumber: 62, string: "D", finger: 0, staffPosition: 1 },
  { id: "Eb4", name: "Eb4", displayName: "Eb", midiNumber: 63, string: "D", finger: 1, staffPosition: 2, accidental: "flat" },
  { id: "E4", name: "E4", displayName: "E", midiNumber: 64, string: "D", finger: 1, staffPosition: 2 },
  { id: "F4", name: "F4", displayName: "F", midiNumber: 65, string: "D", finger: 2, staffPosition: 3 },
  { id: "F#4", name: "F#4", displayName: "F#", midiNumber: 66, string: "D", finger: 2, staffPosition: 3, accidental: "sharp" },
  { id: "G4", name: "G4", displayName: "G", midiNumber: 67, string: "D", finger: 3, staffPosition: 4 },
  { id: "G#4", name: "G#4", displayName: "G#", midiNumber: 68, string: "D", finger: 4, staffPosition: 4, accidental: "sharp" },
  // === A String (1st position) ===
  { id: "A4", name: "A4", displayName: "A", midiNumber: 69, string: "A", finger: 0, staffPosition: 5 },
  { id: "Bb4", name: "Bb4", displayName: "Bb", midiNumber: 70, string: "A", finger: 1, staffPosition: 6, accidental: "flat" },
  { id: "B4", name: "B4", displayName: "B", midiNumber: 71, string: "A", finger: 1, staffPosition: 6 },
  { id: "C5", name: "C5", displayName: "C", midiNumber: 72, string: "A", finger: 2, staffPosition: 7 },
  { id: "C#5", name: "C#5", displayName: "C#", midiNumber: 73, string: "A", finger: 2, staffPosition: 7, accidental: "sharp" },
  { id: "D5", name: "D5", displayName: "D", midiNumber: 74, string: "A", finger: 3, staffPosition: 8 },
  { id: "Eb5", name: "Eb5", displayName: "Eb", midiNumber: 75, string: "A", finger: 4, staffPosition: 9, accidental: "flat" },
  { id: "E5", name: "E5", displayName: "E", midiNumber: 76, string: "A", finger: 4, staffPosition: 9 },
  // === A String (3rd position) ===
  { id: "F5-A", name: "F5", displayName: "F", midiNumber: 77, string: "A", finger: 1, staffPosition: 10, position: 3 },
  { id: "F#5-A", name: "F#5", displayName: "F#", midiNumber: 78, string: "A", finger: 2, staffPosition: 10, accidental: "sharp", position: 3 },
  { id: "G5-A", name: "G5", displayName: "G", midiNumber: 79, string: "A", finger: 3, staffPosition: 11, position: 3 },
  { id: "G#5-A", name: "G#5", displayName: "G#", midiNumber: 80, string: "A", finger: 3, staffPosition: 11, accidental: "sharp", position: 3 },
  // === E String (1st position) ===
  { id: "E5-E", name: "E5", displayName: "E", midiNumber: 76, string: "E", finger: 0, staffPosition: 9 },
  { id: "F5", name: "F5", displayName: "F", midiNumber: 77, string: "E", finger: 1, staffPosition: 10 },
  { id: "F#5", name: "F#5", displayName: "F#", midiNumber: 78, string: "E", finger: 1, staffPosition: 10, accidental: "sharp" },
  { id: "G5", name: "G5", displayName: "G", midiNumber: 79, string: "E", finger: 2, staffPosition: 11 },
  { id: "G#5", name: "G#5", displayName: "G#", midiNumber: 80, string: "E", finger: 2, staffPosition: 11, accidental: "sharp" },
  { id: "A5", name: "A5", displayName: "A", midiNumber: 81, string: "E", finger: 3, staffPosition: 12 },
  { id: "Bb5", name: "Bb5", displayName: "Bb", midiNumber: 82, string: "E", finger: 4, staffPosition: 13, accidental: "flat" },
  { id: "B5", name: "B5", displayName: "B", midiNumber: 83, string: "E", finger: 4, staffPosition: 13 },
  // === E String (3rd position) ===
  { id: "C6", name: "C6", displayName: "C", midiNumber: 84, string: "E", finger: 1, staffPosition: 14, position: 3 },
  { id: "C#6", name: "C#6", displayName: "C#", midiNumber: 85, string: "E", finger: 2, staffPosition: 14, accidental: "sharp", position: 3 },
  { id: "D6", name: "D6", displayName: "D", midiNumber: 86, string: "E", finger: 3, staffPosition: 15, position: 3 },
  { id: "Eb6", name: "Eb6", displayName: "Eb", midiNumber: 87, string: "E", finger: 3, staffPosition: 15, accidental: "flat", position: 3 },
  { id: "E6", name: "E6", displayName: "E", midiNumber: 88, string: "E", finger: 4, staffPosition: 16, position: 3 },
  // === E String (5th position) ===
  { id: "F6", name: "F6", displayName: "F", midiNumber: 89, string: "E", finger: 1, staffPosition: 17, position: 5 },
  { id: "F#6", name: "F#6", displayName: "F#", midiNumber: 90, string: "E", finger: 2, staffPosition: 17, accidental: "sharp", position: 5 },
  { id: "G6", name: "G6", displayName: "G", midiNumber: 91, string: "E", finger: 3, staffPosition: 18, position: 5 },
  { id: "Ab6", name: "Ab6", displayName: "Ab", midiNumber: 92, string: "E", finger: 3, staffPosition: 18, accidental: "flat", position: 5 },
  { id: "A6", name: "A6", displayName: "A", midiNumber: 93, string: "E", finger: 4, staffPosition: 19, position: 5 },
];

/** Open-string MIDI numbers for each violin string. */
export const OPEN_MIDI: Record<ViolinString, number> = { G: 55, D: 62, A: 69, E: 76 };

// ── Internal helpers for deriveNoteOnString ───────────────────────────────────

const CHROMATIC_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
// Diatonic step (0=C … 6=B) for each semitone in an octave
const DIATONIC_STEP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const SHARP_AT: (undefined | "sharp")[] = [
  undefined, "sharp", undefined, "sharp", undefined,
  undefined, "sharp", undefined, "sharp", undefined, "sharp", undefined,
];

function midiToNoteInfo(midi: number): {
  name: string; displayName: string; staffPosition: number; accidental?: "sharp" | "flat";
} {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const letter = CHROMATIC_SHARP[pc];
  return {
    name: letter + octave,
    displayName: letter,
    staffPosition: (octave - 4) * 7 + DIATONIC_STEP[pc],
    accidental: SHARP_AT[pc],
  };
}

/**
 * Derive a ViolinNote for any MIDI number on a specific string.
 * Used as a fallback when `VIOLIN_NOTES` has no entry for that string+MIDI combination.
 * Position and finger are estimated from semitone distance above the open string.
 */
export function deriveNoteOnString(midiNumber: number, str: ViolinString): ViolinNote {
  const semiAbove = Math.max(0, midiNumber - OPEN_MIDI[str]);

  // Position zones (every 7 semitones covers one position block)
  let position: number;
  if (semiAbove <= 7) position = 1;
  else if (semiAbove <= 14) position = 3;
  else if (semiAbove <= 21) position = 5;
  else position = 7;

  const posOffset = ([1, 3, 5, 7].indexOf(position)) * 7;
  const s = semiAbove - posOffset;
  // Map semitone-within-position → finger: 0→0, 1-2→1, 3-4→2, 5-6→3, 7+→4
  const finger = s <= 0 ? 0 : s <= 2 ? 1 : s <= 4 ? 2 : s <= 6 ? 3 : 4;

  const { name, displayName, staffPosition, accidental } = midiToNoteInfo(midiNumber);

  return {
    id: `derived-${str}-${midiNumber}`,
    name,
    displayName,
    midiNumber,
    string: str,
    finger,
    staffPosition,
    accidental,
    position: position === 1 ? undefined : position,
  };
}

/** Get all notes for a specific string */
export function getNotesByString(s: string) {
  return VIOLIN_NOTES.filter((n) => n.string === s);
}

/** Find the best violin note for a MIDI number, optionally preferring a string.
 *  Always prefers 1st position over higher positions (position shifts are harder
 *  than string crossings for beginners). Uses preferString only as a tiebreaker
 *  among same-position matches.
 *
 *  @param requireString  Hard constraint: only match notes on this string.
 *                        Falls back to `deriveNoteOnString` if no entry exists. */
export function findNoteByMidi(
  midiNumber: number,
  preferString?: string,
  requireString?: string,
): ViolinNote | undefined {
  if (requireString) {
    const stringMatches = VIOLIN_NOTES.filter(
      (n) => n.midiNumber === midiNumber && n.string === requireString,
    );
    if (stringMatches.length === 0) {
      return deriveNoteOnString(midiNumber, requireString as ViolinString);
    }
    if (stringMatches.length === 1) return stringMatches[0];
    // Prefer 1st position within the required string
    const firstPos = stringMatches.filter((n) => !n.position || n.position === 1);
    if (firstPos.length > 0) return firstPos.sort((a, b) => a.finger - b.finger)[0];
    return stringMatches[0];
  }

  const matches = VIOLIN_NOTES.filter((n) => n.midiNumber === midiNumber);
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];

  // Separate 1st position vs higher position entries
  const firstPos = matches.filter((n) => !n.position || n.position === 1);

  if (firstPos.length > 0) {
    // Among 1st-position matches, prefer the same string
    if (preferString) {
      const onPref = firstPos.find((n) => n.string === preferString);
      if (onPref) return onPref;
    }
    // Otherwise pick the lowest finger (open string > finger 4)
    return firstPos.sort((a, b) => a.finger - b.finger)[0];
  }

  // No 1st-position option — fall back to higher positions
  if (preferString) {
    const onPref = matches.find((n) => n.string === preferString);
    if (onPref) return onPref;
  }
  return matches[0];
}
