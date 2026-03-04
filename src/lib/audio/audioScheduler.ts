import * as Tone from "tone";
import type { GameNote } from "@/types/game";

/**
 * Schedule all notes on Tone.Transport for synced audio playback.
 * Call this once when a song is loaded or speed changes.
 */
export function scheduleNotes(
  synth: Tone.PolySynth,
  notes: GameNote[],
  speed: number,
  leadInSec = 0
) {
  Tone.getTransport().cancel();

  for (const note of notes) {
    const time = (note.startTimeSec + leadInSec) / speed;
    const duration = Math.max(0.05, note.durationSec / speed);
    const frequency = Tone.Frequency(note.midiNumber, "midi").toFrequency();

    Tone.getTransport().schedule((t) => {
      synth.triggerAttackRelease(frequency, duration, t);
    }, time);
  }
}
