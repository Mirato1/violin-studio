import type { GameNote } from "@/types/game";

/**
 * Twinkle Twinkle Little Star - pre-parsed for first position violin.
 * Key of A major (common beginner arrangement), played on A and E strings.
 * BPM: 100, each beat = 0.6s
 */

const BPM = 100;
const BEAT = 60 / BPM; // 0.6s per beat

interface DemoNote {
  name: string;
  midi: number;
  string: "G" | "D" | "A" | "E";
  finger: 0 | 1 | 2 | 3 | 4;
  lane: number;
  beat: number;
  duration: number; // in beats
}

const melody: DemoNote[] = [
  // Twinkle Twinkle Little Star
  { name: "A4", midi: 69, string: "A", finger: 0, lane: 2, beat: 0, duration: 1 },
  { name: "A4", midi: 69, string: "A", finger: 0, lane: 2, beat: 1, duration: 1 },
  { name: "E5", midi: 76, string: "E", finger: 0, lane: 3, beat: 2, duration: 1 },
  { name: "E5", midi: 76, string: "E", finger: 0, lane: 3, beat: 3, duration: 1 },
  { name: "F#5", midi: 78, string: "E", finger: 1, lane: 3, beat: 4, duration: 1 },
  { name: "F#5", midi: 78, string: "E", finger: 1, lane: 3, beat: 5, duration: 1 },
  { name: "E5", midi: 76, string: "E", finger: 0, lane: 3, beat: 6, duration: 2 },

  // How I wonder what you are
  { name: "D5", midi: 74, string: "A", finger: 3, lane: 2, beat: 8, duration: 1 },
  { name: "D5", midi: 74, string: "A", finger: 3, lane: 2, beat: 9, duration: 1 },
  { name: "C#5", midi: 73, string: "A", finger: 2, lane: 2, beat: 10, duration: 1 },
  { name: "C#5", midi: 73, string: "A", finger: 2, lane: 2, beat: 11, duration: 1 },
  { name: "B4", midi: 71, string: "A", finger: 1, lane: 2, beat: 12, duration: 1 },
  { name: "B4", midi: 71, string: "A", finger: 1, lane: 2, beat: 13, duration: 1 },
  { name: "A4", midi: 69, string: "A", finger: 0, lane: 2, beat: 14, duration: 2 },

  // Up above the world so high
  { name: "E5", midi: 76, string: "E", finger: 0, lane: 3, beat: 16, duration: 1 },
  { name: "E5", midi: 76, string: "E", finger: 0, lane: 3, beat: 17, duration: 1 },
  { name: "D5", midi: 74, string: "A", finger: 3, lane: 2, beat: 18, duration: 1 },
  { name: "D5", midi: 74, string: "A", finger: 3, lane: 2, beat: 19, duration: 1 },
  { name: "C#5", midi: 73, string: "A", finger: 2, lane: 2, beat: 20, duration: 1 },
  { name: "C#5", midi: 73, string: "A", finger: 2, lane: 2, beat: 21, duration: 1 },
  { name: "B4", midi: 71, string: "A", finger: 1, lane: 2, beat: 22, duration: 2 },

  // Like a diamond in the sky
  { name: "E5", midi: 76, string: "E", finger: 0, lane: 3, beat: 24, duration: 1 },
  { name: "E5", midi: 76, string: "E", finger: 0, lane: 3, beat: 25, duration: 1 },
  { name: "D5", midi: 74, string: "A", finger: 3, lane: 2, beat: 26, duration: 1 },
  { name: "D5", midi: 74, string: "A", finger: 3, lane: 2, beat: 27, duration: 1 },
  { name: "C#5", midi: 73, string: "A", finger: 2, lane: 2, beat: 28, duration: 1 },
  { name: "C#5", midi: 73, string: "A", finger: 2, lane: 2, beat: 29, duration: 1 },
  { name: "B4", midi: 71, string: "A", finger: 1, lane: 2, beat: 30, duration: 2 },

  // Twinkle Twinkle Little Star (repeat)
  { name: "A4", midi: 69, string: "A", finger: 0, lane: 2, beat: 32, duration: 1 },
  { name: "A4", midi: 69, string: "A", finger: 0, lane: 2, beat: 33, duration: 1 },
  { name: "E5", midi: 76, string: "E", finger: 0, lane: 3, beat: 34, duration: 1 },
  { name: "E5", midi: 76, string: "E", finger: 0, lane: 3, beat: 35, duration: 1 },
  { name: "F#5", midi: 78, string: "E", finger: 1, lane: 3, beat: 36, duration: 1 },
  { name: "F#5", midi: 78, string: "E", finger: 1, lane: 3, beat: 37, duration: 1 },
  { name: "E5", midi: 76, string: "E", finger: 0, lane: 3, beat: 38, duration: 2 },

  // How I wonder what you are (final)
  { name: "D5", midi: 74, string: "A", finger: 3, lane: 2, beat: 40, duration: 1 },
  { name: "D5", midi: 74, string: "A", finger: 3, lane: 2, beat: 41, duration: 1 },
  { name: "C#5", midi: 73, string: "A", finger: 2, lane: 2, beat: 42, duration: 1 },
  { name: "C#5", midi: 73, string: "A", finger: 2, lane: 2, beat: 43, duration: 1 },
  { name: "B4", midi: 71, string: "A", finger: 1, lane: 2, beat: 44, duration: 1 },
  { name: "B4", midi: 71, string: "A", finger: 1, lane: 2, beat: 45, duration: 1 },
  { name: "A4", midi: 69, string: "A", finger: 0, lane: 2, beat: 46, duration: 2 },
];

export const TWINKLE_TWINKLE: {
  title: string;
  bpm: number;
  ticksPerBeat: number;
  durationSec: number;
  notes: GameNote[];
} = {
  title: "Twinkle Twinkle Little Star",
  bpm: BPM,
  ticksPerBeat: 480,
  durationSec: 48 * BEAT,
  notes: melody.map((n, i) => ({
    id: `twinkle-${i}`,
    midiNumber: n.midi,
    noteName: n.name,
    string: n.string,
    finger: n.finger,
    lane: n.lane,
    startTimeSec: n.beat * BEAT,
    durationSec: n.duration * BEAT,
    y: 0,
    tailHeight: 0,
    state: "upcoming" as const,
  })),
};
