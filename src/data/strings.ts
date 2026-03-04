import type { ViolinString } from "@/types/violin";

export interface StringInfo {
  name: ViolinString;
  label: string;
  openNote: string;
  openMidi: number;
  color: string;
}

export const STRING_INFO: StringInfo[] = [
  { name: "G", label: "G String", openNote: "G3", openMidi: 55, color: "#22c55e" },
  { name: "D", label: "D String", openNote: "D4", openMidi: 62, color: "#3b82f6" },
  { name: "A", label: "A String", openNote: "A4", openMidi: 69, color: "#f59e0b" },
  { name: "E", label: "E String", openNote: "E5", openMidi: 76, color: "#ef4444" },
];
