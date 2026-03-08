import type { MidiFile } from "./types";
import type { GameNote } from "@/types/game";
import type { ViolinString } from "@/types/violin";
import { findNoteByMidi, VIOLIN_NOTES, OPEN_MIDI } from "@/data/violinNotes";
import {
  pickBestCandidate,
  chooseStartingPosition,
  smoothPositions,
  STRING_TO_LANE,
  type Candidate,
} from "@/lib/violin/positionScoring";

const MIN_MIDI = Math.min(...VIOLIN_NOTES.map((n) => n.midiNumber)); // 55 (G3)
const MAX_MIDI = Math.max(...VIOLIN_NOTES.map((n) => n.midiNumber)); // 93 (A6)

/** Transpose a MIDI note into playable violin range (±1 octave max).
 *  Returns null if the note is too far outside range (non-violin instrument). */
function clampToRange(midi: number): number | null {
  if (midi >= MIN_MIDI && midi <= MAX_MIDI) return midi;
  if (midi >= MIN_MIDI - 12 && midi < MIN_MIDI) return midi + 12;
  if (midi > MAX_MIDI && midi <= MAX_MIDI + 12) return midi - 12;
  return null;
}

export interface TrackInfo {
  index: number;
  name: string;
  noteCount: number;
  inRangePercent: number;
  isBestGuess: boolean;
}

/** Analyze all tracks and return info for each one that has notes. */
export function getTrackInfo(midi: MidiFile): TrackInfo[] {
  if (midi.format === 0 || midi.tracks.length <= 1) {
    const noteCount = midi.tracks[0]?.events.filter(
      (e) => e.type === "noteOn" && e.velocity > 0
    ).length ?? 0;
    if (noteCount === 0) return [];
    return [{ index: 0, name: "Track 1", noteCount, inRangePercent: 100, isBestGuess: true }];
  }

  const analyzed = midi.tracks.map((track, idx) => {
    let trackName = "";
    let noteCount = 0;
    let inRangeCount = 0;

    for (const event of track.events) {
      if (event.type === "meta" && event.metaType === 0x03) {
        trackName = String.fromCharCode(...event.data);
      }
      if (event.type === "noteOn" && event.velocity > 0) {
        noteCount++;
        if (event.note >= MIN_MIDI && event.note <= MAX_MIDI) inRangeCount++;
      }
    }

    const rangeRatio = noteCount > 0 ? inRangeCount / noteCount : 0;
    const nameBonus = /violin|solo|vln|violine|violino/i.test(trackName) ? 1000 : 0;
    const score = inRangeCount * rangeRatio + nameBonus;
    const inRangePercent = noteCount > 0 ? Math.round((inRangeCount / noteCount) * 100) : 0;

    return { idx, trackName: trackName || `Track ${idx + 1}`, noteCount, inRangePercent, score };
  });

  const withNotes = analyzed.filter((t) => t.noteCount > 0);
  if (withNotes.length === 0) return [];

  const sorted = [...withNotes].sort((a, b) => b.score - a.score);
  const bestIdx = sorted[0].idx;

  return withNotes.map((t) => ({
    index: t.idx,
    name: t.trackName,
    noteCount: t.noteCount,
    inRangePercent: t.inRangePercent,
    isBestGuess: t.idx === bestIdx,
  }));
}

/** Select the best track for solo violin from a multi-track MIDI file. */
function selectBestTrack(midi: MidiFile): number {
  const tracks = getTrackInfo(midi);
  const best = tracks.find((t) => t.isBestGuess);
  return best ? best.index : 0;
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

export interface MappedSongTrack {
  index: number;
  name: string;
  noteCount: number;
  isBestGuess: boolean;
  notes: GameNote[];
}

export interface MappedSong {
  title: string;
  bpm: number;
  ticksPerBeat: number;
  durationSec: number;
  notes: GameNote[];
  tracks?: MappedSongTrack[];
}

/** Map a parsed MIDI file to game notes with violin string/finger assignments.
 *  Pass trackIndex to select a specific track, or omit to auto-select. */
export function mapMidiToViolin(midi: MidiFile, title: string = "Untitled", trackIndex?: number): MappedSong {
  const tempoMap = buildTempoMap(midi);
  const { ticksPerBeat } = midi;

  // Select track: explicit index or auto-detect best
  const bestTrackIdx = trackIndex ?? selectBestTrack(midi);

  interface PendingNote {
    midi: number;
    channel: number;
    tickStart: number;
    velocity: number;
  }

  const rawNotes: { midi: number; tickStart: number; tickEnd: number }[] = [];

  for (const track of [midi.tracks[bestTrackIdx]]) {
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

  // Pre-compute clamped MIDI values for look-ahead
  const clampedMidis: (number | null)[] = rawNotes.map((r) => clampToRange(r.midi));

  // Determine best starting position from first ~8 playable notes
  const firstMidis: number[] = [];
  for (let j = 0; j < clampedMidis.length && firstMidis.length < 8; j++) {
    if (clampedMidis[j] !== null) firstMidis.push(clampedMidis[j]!);
  }

  // Map to GameNote with violin assignments using position-aware scoring
  let lastString: string | undefined;
  let lastPosition = firstMidis.length > 0 ? chooseStartingPosition(firstMidis) : 1;
  const notes: GameNote[] = [];

  for (let i = 0; i < rawNotes.length; i++) {
    const clamped = clampedMidis[i];
    if (clamped === null) continue;
    const raw = rawNotes[i];

    // Gather upcoming MIDI notes for string-aware look-ahead
    const LOOK_AHEAD = 8;
    const upcomingMidis: number[] = [];
    for (let j = i + 1; j < rawNotes.length && upcomingMidis.length < LOOK_AHEAD; j++) {
      const m = clampedMidis[j];
      if (m !== null) upcomingMidis.push(m);
    }

    // Find best fingering using position hierarchy + string-aware look-ahead
    let best: Candidate | undefined = pickBestCandidate(clamped, lastString, lastPosition, upcomingMidis);

    // Fallback to original findNoteByMidi if no candidates
    if (!best) {
      const vNote = findNoteByMidi(clamped, lastString);
      if (!vNote) continue;
      best = {
        string: vNote.string as ViolinString,
        finger: typeof vNote.finger === 'number' ? vNote.finger : 0,
        position: vNote.position ?? 1,
        staffPosition: vNote.staffPosition,
        accidental: vNote.accidental,
        name: vNote.name,
        displayName: vNote.displayName,
      };
    }

    const startTimeSec = tickToSec(raw.tickStart, tempoMap, ticksPerBeat);
    const endTimeSec = tickToSec(raw.tickEnd, tempoMap, ticksPerBeat);

    notes.push({
      id: `note-${i}`,
      midiNumber: clamped,
      noteName: best.name,
      string: best.string,
      finger: best.finger,
      lane: STRING_TO_LANE[best.string],
      startTimeSec,
      durationSec: Math.max(0.05, endTimeSec - startTimeSec),
      y: 0,
      tailHeight: 0,
      state: "upcoming",
      staffPosition: best.staffPosition,
      accidental: best.accidental,
      position: best.position === 1 ? undefined : best.position,
    });

    lastString = best.string;
    lastPosition = best.position;
  }

  // Smooth out short position "blips" (e.g., 3rd-1st-3rd → 3rd-3rd-3rd)
  smoothPositions(notes);

  const bpm = Math.round(60_000_000 / tempoMap[0].microsecondsPerBeat);
  const durationSec = notes.length > 0
    ? notes[notes.length - 1].startTimeSec + notes[notes.length - 1].durationSec
    : 0;

  return { title, bpm, ticksPerBeat, durationSec, notes };
}
