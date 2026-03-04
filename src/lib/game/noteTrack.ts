import type { GameNote } from "@/types/game";
import { HIT_LINE_Y, BASE_PIXELS_PER_SECOND } from "./constants";

/**
 * Update note positions and states for the current frame.
 * Notes fall from top to bottom. At startTimeSec, the note should be at the hit line.
 */
export function updateNotes(
  notes: GameNote[],
  currentTimeSec: number,
  speed: number
): GameNote | null {
  // Constant spacing: speed only affects scroll rate (via currentTimeSec advancing slower/faster)
  const pps = BASE_PIXELS_PER_SECOND;
  let activeNote: GameNote | null = null;

  for (const note of notes) {
    // Y position: at note's start time, note is at HIT_LINE_Y
    const timeOffset = note.startTimeSec - currentTimeSec;
    note.y = HIT_LINE_Y - timeOffset * pps;

    // Tail height from duration
    note.tailHeight = note.durationSec * pps;

    // Update state
    if (currentTimeSec < note.startTimeSec) {
      note.state = "upcoming";
    } else if (currentTimeSec < note.startTimeSec + note.durationSec) {
      note.state = "active";
      activeNote = note;
    } else {
      note.state = "passed";
    }
  }

  return activeNote;
}
