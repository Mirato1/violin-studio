export type ViolinString = "G" | "D" | "A" | "E";

export type FingerNumber = 0 | 1 | 2 | 3 | 4;

export interface ViolinNote {
  id: string;
  name: string; // e.g. "A4", "F#5"
  displayName: string; // e.g. "A", "F#"
  midiNumber: number;
  string: ViolinString;
  finger: FingerNumber;
  /** Semitone offset from bottom staff line (E4=0). Used for staff rendering. */
  staffPosition: number;
  accidental?: "sharp" | "flat";
}

export const STRING_COLORS: Record<
  ViolinString,
  { fill: string; glow: string; faded: string; bg: string }
> = {
  G: { fill: "#22c55e", glow: "#4ade80", faded: "#16653a", bg: "#052e16" },
  D: { fill: "#3b82f6", glow: "#60a5fa", faded: "#1e3a6e", bg: "#0c1a3d" },
  A: { fill: "#f59e0b", glow: "#fbbf24", faded: "#7c5006", bg: "#2d1f05" },
  E: { fill: "#ef4444", glow: "#f87171", faded: "#7f1d1d", bg: "#2d0a0a" },
};

export const VIOLIN_STRINGS: ViolinString[] = ["G", "D", "A", "E"];
