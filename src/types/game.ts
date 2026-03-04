import type { ViolinString, FingerNumber } from "./violin";

export interface GameNote {
  id: string;
  midiNumber: number;
  noteName: string;
  string: ViolinString;
  finger: FingerNumber;
  lane: number; // 0=G, 1=D, 2=A, 3=E
  startTimeSec: number;
  durationSec: number;
  y: number;
  tailHeight: number;
  state: "upcoming" | "active" | "passed";
}

export interface GameState {
  status: "idle" | "playing" | "paused";
  currentTimeSec: number;
  speed: number;
  volume: number;
  isMuted: boolean;
  showFingers: boolean;
  notes: GameNote[];
  songDurationSec: number;
}

export const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25] as const;
