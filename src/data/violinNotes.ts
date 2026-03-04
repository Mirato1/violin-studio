import type { ViolinNote } from "@/types/violin";

/**
 * All first-position violin notes.
 * staffPosition: semitone offset from bottom staff line E4 (E4=0, F4=1, G4=3, A4=5, B4=7, etc.)
 * This maps to vertical placement on treble clef.
 */
export const VIOLIN_NOTES: ViolinNote[] = [
  // G String
  { id: "G3", name: "G3", displayName: "G", midiNumber: 55, string: "G", finger: 0, staffPosition: -3 },
  { id: "A3", name: "A3", displayName: "A", midiNumber: 57, string: "G", finger: 1, staffPosition: -2 },
  { id: "B3", name: "B3", displayName: "B", midiNumber: 59, string: "G", finger: 2, staffPosition: -1 },
  { id: "C4", name: "C4", displayName: "C", midiNumber: 60, string: "G", finger: 3, staffPosition: 0 },
  // D String
  { id: "D4", name: "D4", displayName: "D", midiNumber: 62, string: "D", finger: 0, staffPosition: 1 },
  { id: "E4", name: "E4", displayName: "E", midiNumber: 64, string: "D", finger: 1, staffPosition: 2 },
  { id: "F4", name: "F4", displayName: "F", midiNumber: 65, string: "D", finger: 2, staffPosition: 3 },
  { id: "F#4", name: "F#4", displayName: "F#", midiNumber: 66, string: "D", finger: 2, staffPosition: 3, accidental: "sharp" },
  { id: "G4", name: "G4", displayName: "G", midiNumber: 67, string: "D", finger: 3, staffPosition: 4 },
  // A String
  { id: "A4", name: "A4", displayName: "A", midiNumber: 69, string: "A", finger: 0, staffPosition: 5 },
  { id: "B4", name: "B4", displayName: "B", midiNumber: 71, string: "A", finger: 1, staffPosition: 6 },
  { id: "C5", name: "C5", displayName: "C", midiNumber: 72, string: "A", finger: 2, staffPosition: 7 },
  { id: "C#5", name: "C#5", displayName: "C#", midiNumber: 73, string: "A", finger: 2, staffPosition: 7, accidental: "sharp" },
  { id: "D5", name: "D5", displayName: "D", midiNumber: 74, string: "A", finger: 3, staffPosition: 8 },
  { id: "E5", name: "E5", displayName: "E", midiNumber: 76, string: "A", finger: 4, staffPosition: 9 },
  // E String
  { id: "E5-E", name: "E5", displayName: "E", midiNumber: 76, string: "E", finger: 0, staffPosition: 9 },
  { id: "F5", name: "F5", displayName: "F", midiNumber: 77, string: "E", finger: 1, staffPosition: 10 },
  { id: "F#5", name: "F#5", displayName: "F#", midiNumber: 78, string: "E", finger: 1, staffPosition: 10, accidental: "sharp" },
  { id: "G5", name: "G5", displayName: "G", midiNumber: 79, string: "E", finger: 2, staffPosition: 11 },
  { id: "A5", name: "A5", displayName: "A", midiNumber: 81, string: "E", finger: 3, staffPosition: 12 },
  { id: "B5", name: "B5", displayName: "B", midiNumber: 83, string: "E", finger: 4, staffPosition: 13 },
];

/** Get all notes for a specific string */
export function getNotesByString(s: string) {
  return VIOLIN_NOTES.filter((n) => n.string === s);
}

/** Find the best violin note for a MIDI number, optionally preferring a string */
export function findNoteByMidi(
  midiNumber: number,
  preferString?: string
): ViolinNote | undefined {
  const matches = VIOLIN_NOTES.filter((n) => n.midiNumber === midiNumber);
  if (matches.length === 0) return undefined;
  if (preferString) {
    const preferred = matches.find((n) => n.string === preferString);
    if (preferred) return preferred;
  }
  return matches[0];
}
