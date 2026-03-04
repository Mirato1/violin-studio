import type { MidiFile } from "./types";
import type { GameNote } from "@/types/game";
import { findNoteByMidi, VIOLIN_NOTES } from "@/data/violinNotes";

const STRING_TO_LANE: Record<string, number> = { G: 0, D: 1, A: 2, E: 3 };

const MIN_MIDI = Math.min(...VIOLIN_NOTES.map((n) => n.midiNumber)); // 55 (G3)
const MAX_MIDI = Math.max(...VIOLIN_NOTES.map((n) => n.midiNumber)); // 83 (B5)

/** Transpose a MIDI note into violin first-position range by octave shifts */
function clampToRange(midi: number): number {
  let m = midi;
  while (m < MIN_MIDI) m += 12;
  while (m > MAX_MIDI) m -= 12;
  return m;
}

interface TempoEntry {
  tick: number;
  microsecondsPerBeat: number;
}

/** Build a tempo map from meta events across all tracks */
function buildTempoMap(midi: MidiFile): TempoEntry[] {
  const tempoMap: TempoEntry[] = [{ tick: 0, microsecondsPerBeat: 500000 }]; // default 120 BPM

  for (const track of midi.tracks) {
    let tick = 0;
    for (const event of track.events) {
      tick += event.deltaTime;
      if (event.type === "meta" && event.metaType === 0x51 && event.data.length >= 3) {
        const uspb = (event.data[0] << 16) | (event.data[1] << 8) | event.data[2];
        tempoMap.push({ tick, microsecondsPerBeat: uspb });
      }
    }
  }

  tempoMap.sort((a, b) => a.tick - b.tick);
  return tempoMap;
}

/** Convert a tick position to seconds using the tempo map */
function tickToSec(tick: number, tempoMap: TempoEntry[], ticksPerBeat: number): number {
  let seconds = 0;
  let lastTick = 0;
  let uspb = tempoMap[0].microsecondsPerBeat;

  for (const entry of tempoMap) {
    if (entry.tick > tick) break;
    seconds += ((entry.tick - lastTick) / ticksPerBeat) * (uspb / 1_000_000);
    lastTick = entry.tick;
    uspb = entry.microsecondsPerBeat;
  }

  seconds += ((tick - lastTick) / ticksPerBeat) * (uspb / 1_000_000);
  return seconds;
}

export interface MappedSong {
  title: string;
  bpm: number;
  ticksPerBeat: number;
  durationSec: number;
  notes: GameNote[];
}

/** Map a parsed MIDI file to game notes with violin string/finger assignments */
export function mapMidiToViolin(midi: MidiFile, title: string = "Untitled"): MappedSong {
  const tempoMap = buildTempoMap(midi);
  const { ticksPerBeat } = midi;

  // Collect all note on/off pairs across all tracks
  interface PendingNote {
    midi: number;
    channel: number;
    tickStart: number;
    velocity: number;
  }

  const rawNotes: { midi: number; tickStart: number; tickEnd: number }[] = [];

  for (const track of midi.tracks) {
    let tick = 0;
    const trackPending: Map<string, PendingNote> = new Map();
    for (const event of track.events) {
      tick += event.deltaTime;
      if (event.type === "noteOn") {
        const key = `${event.channel}-${event.note}`;
        trackPending.set(key, {
          midi: event.note,
          channel: event.channel,
          tickStart: tick,
          velocity: event.velocity,
        });
      } else if (event.type === "noteOff") {
        const key = `${event.channel}-${event.note}`;
        const p = trackPending.get(key);
        if (p) {
          rawNotes.push({ midi: p.midi, tickStart: p.tickStart, tickEnd: tick });
          trackPending.delete(key);
        }
      }
    }
    // Flush any notes that never got a noteOff (use last tick as end)
    for (const p of trackPending.values()) {
      rawNotes.push({ midi: p.midi, tickStart: p.tickStart, tickEnd: tick });
    }
  }

  // Sort by start time
  rawNotes.sort((a, b) => a.tickStart - b.tickStart);

  // Map to GameNote with violin assignments
  let lastString: string | undefined;
  const notes: GameNote[] = [];

  for (let i = 0; i < rawNotes.length; i++) {
    const raw = rawNotes[i];
    const clamped = clampToRange(raw.midi);
    const vNote = findNoteByMidi(clamped, lastString);

    if (!vNote) continue; // skip unmappable notes

    const startTimeSec = tickToSec(raw.tickStart, tempoMap, ticksPerBeat);
    const endTimeSec = tickToSec(raw.tickEnd, tempoMap, ticksPerBeat);

    notes.push({
      id: `note-${i}`,
      midiNumber: clamped,
      noteName: vNote.name,
      string: vNote.string,
      finger: vNote.finger,
      lane: STRING_TO_LANE[vNote.string],
      startTimeSec,
      durationSec: Math.max(0.05, endTimeSec - startTimeSec),
      y: 0,
      tailHeight: 0,
      state: "upcoming",
    });

    lastString = vNote.string;
  }

  const bpm = Math.round(60_000_000 / tempoMap[0].microsecondsPerBeat);
  const durationSec = notes.length > 0
    ? notes[notes.length - 1].startTimeSec + notes[notes.length - 1].durationSec
    : 0;

  return { title, bpm, ticksPerBeat, durationSec, notes };
}
