export interface ViolinScale {
  id: string;
  name: string;
  key: string;
  noteIds: string[]; // ordered IDs from VIOLIN_NOTES
}

export const VIOLIN_SCALES: ViolinScale[] = [
  {
    id: "g-major",
    name: "G Major",
    key: "G",
    noteIds: ["G3", "A3", "B3", "C4", "D4", "E4", "F#4", "G4"],
  },
  {
    id: "d-major",
    name: "D Major",
    key: "D",
    noteIds: ["D4", "E4", "F#4", "G4", "A4", "B4", "C#5", "D5"],
  },
  {
    id: "a-major",
    name: "A Major",
    key: "A",
    noteIds: ["A4", "B4", "C#5", "D5", "E5-E", "F#5", "G#5", "A5"],
  },
  {
    id: "c-major",
    name: "C Major",
    key: "C",
    noteIds: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
  },
  {
    id: "f-major",
    name: "F Major",
    key: "F",
    noteIds: ["F4", "G4", "A4", "Bb4", "C5", "D5", "E5"],
  },
];
