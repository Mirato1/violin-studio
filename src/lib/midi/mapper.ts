import type { MidiFile } from "./types";
import type { GameNote } from "@/types/game";
import type { ViolinString } from "@/types/violin";
import { findNoteByMidi, VIOLIN_NOTES, OPEN_MIDI, deriveNoteOnString } from "@/data/violinNotes";

const STRING_TO_LANE: Record<string, number> = { G: 0, D: 1, A: 2, E: 3 };
const ALL_STRINGS: ViolinString[] = ["G", "D", "A", "E"];
const POSITION_BASE: Record<number, number> = { 1: 2, 2: 4, 3: 5, 4: 7 };

/** Finger deltas from position base semitone */
const FINGER_DELTAS = [
  { finger: 1, delta: -1 }, { finger: 1, delta: 0 },
  { finger: 2, delta: 1 },  { finger: 2, delta: 2 },
  { finger: 3, delta: 3 },
  { finger: 4, delta: 4 },  { finger: 4, delta: 5 },
];

interface Candidate {
  string: ViolinString;
  finger: number;
  position: number;
  staffPosition: number;
  accidental?: "sharp" | "flat";
  name: string;
  displayName: string;
}

/**
 * Find ALL possible (string, position, finger) combinations for a MIDI number.
 * Returns candidates across strings and positions 1–4.
 */
function findAllCandidates(midi: number): Candidate[] {
  const candidates: Candidate[] = [];
  for (const s of ALL_STRINGS) {
    const open = OPEN_MIDI[s];
    const semiAbove = midi - open;
    if (semiAbove < 0 || semiAbove > 12) continue; // out of range for this string

    for (const pos of [1, 2, 3, 4] as const) {
      const base = POSITION_BASE[pos];
      for (const fd of FINGER_DELTAS) {
        if (base + fd.delta === semiAbove) {
          const derived = deriveNoteOnString(midi, s);
          candidates.push({
            string: s,
            finger: fd.finger,
            position: pos,
            staffPosition: derived.staffPosition,
            accidental: derived.accidental,
            name: derived.name,
            displayName: derived.displayName,
          });
        }
      }
      // Also check open string (finger 0)
      if (semiAbove === 0) {
        const derived = deriveNoteOnString(midi, s);
        candidates.push({
          string: s,
          finger: 0,
          position: 1,
          staffPosition: derived.staffPosition,
          accidental: derived.accidental,
          name: derived.name,
          displayName: derived.displayName,
        });
      }
    }
  }
  // Deduplicate (same string+finger+position)
  const seen = new Set<string>();
  return candidates.filter((c) => {
    const key = `${c.string}-${c.finger}-${c.position}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const STRING_IDX: Record<string, number> = { G: 0, D: 1, A: 2, E: 3 };

/**
 * Score a candidate based on musical context (position continuity, string proximity).
 * Higher score = better choice.
 */
function scoreCandidate(
  c: Candidate,
  lastString: string | undefined,
  lastPosition: number,
): number {
  let score = 0;

  // Strong preference for staying in the same position (avoid shifts)
  if (c.position === lastPosition) score += 100;
  // Small penalty for each position step of shift
  else score -= Math.abs(c.position - lastPosition) * 20;

  // Prefer same or adjacent string
  if (lastString) {
    const dist = Math.abs(STRING_IDX[c.string] - STRING_IDX[lastString]);
    if (dist === 0) score += 15; // same string
    else if (dist === 1) score += 5; // adjacent
    else score -= dist * 5; // far string crossing
  }

  // Small bonus for lower positions (easier for beginners)
  score -= c.position * 2;

  // Prefer open strings when they match (easiest)
  if (c.finger === 0) score += 10;

  // Penalize finger 4 — it's awkward and usually means a position shift is better
  if (c.finger === 4) score -= 25;

  return score;
}

/**
 * Find the best (most comfortable) finger for a MIDI note in a given position.
 * Returns 0-3 for comfortable fingers, 4 for pinky, or -1 if not reachable.
 */
function bestFingerInPosition(midi: number, position: number): number {
  for (const s of ALL_STRINGS) {
    const open = OPEN_MIDI[s];
    const semi = midi - open;
    if (semi < 0 || semi > 12) continue;
    if (semi === 0) return 0; // open string
    const base = POSITION_BASE[position];
    // First pass: prefer fingers 1-3
    for (const fd of FINGER_DELTAS) {
      if (base + fd.delta === semi && fd.finger < 4) return fd.finger;
    }
    // Second pass: accept finger 4
    for (const fd of FINGER_DELTAS) {
      if (base + fd.delta === semi) return fd.finger;
    }
  }
  return -1;
}

/**
 * Analyze the first N notes to determine the best starting position.
 * Picks the position where the most notes can be played with comfortable fingers.
 */
function chooseStartingPosition(midis: number[]): number {
  let bestPos = 1, bestScore = -Infinity;
  for (const pos of [1, 2, 3, 4] as const) {
    let score = 0;
    for (const midi of midis) {
      const f = bestFingerInPosition(midi, pos);
      if (f === -1) score -= 15;
      else if (f === 0) score += 30;
      else if (f <= 3) score += 25;
      else score += 5; // finger 4
    }
    score -= pos * 2; // slight lower-position preference
    if (score > bestScore) { bestScore = score; bestPos = pos; }
  }
  return bestPos;
}

/**
 * Score upcoming notes by finger quality in a given position.
 * Comfortable fingers (0-3) score much higher than finger 4.
 */
function lookAheadBonus(position: number, upcomingMidis: number[]): number {
  let bonus = 0;
  for (const midi of upcomingMidis) {
    const f = bestFingerInPosition(midi, position);
    if (f === -1) bonus -= 15;
    else if (f === 0) bonus += 30;
    else if (f <= 3) bonus += 25;
    else bonus += 5; // finger 4
  }
  return bonus;
}

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

  // Map to GameNote with violin assignments using position-aware scoring + look-ahead
  let lastString: string | undefined;
  let lastPosition = firstMidis.length > 0 ? chooseStartingPosition(firstMidis) : 1;
  const notes: GameNote[] = [];

  for (let i = 0; i < rawNotes.length; i++) {
    const clamped = clampedMidis[i];
    if (clamped === null) continue;
    const raw = rawNotes[i];

    // Gather the next few MIDI notes for look-ahead scoring
    const LOOK_AHEAD = 5;
    const upcomingMidis: number[] = [];
    for (let j = i + 1; j < rawNotes.length && upcomingMidis.length < LOOK_AHEAD; j++) {
      const m = clampedMidis[j];
      if (m !== null) upcomingMidis.push(m);
    }

    // Find all possible fingerings and pick the best one
    const candidates = findAllCandidates(clamped);
    let best: Candidate | undefined;

    if (candidates.length > 0) {
      let bestScore = -Infinity;
      for (const c of candidates) {
        let s = scoreCandidate(c, lastString, lastPosition);
        // Add look-ahead bonus: prefer positions that work for upcoming notes too
        if (upcomingMidis.length > 0) {
          s += lookAheadBonus(c.position, upcomingMidis);
        }
        if (s > bestScore) { bestScore = s; best = c; }
      }
    }

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

  const bpm = Math.round(60_000_000 / tempoMap[0].microsecondsPerBeat);
  const durationSec = notes.length > 0
    ? notes[notes.length - 1].startTimeSec + notes[notes.length - 1].durationSec
    : 0;

  return { title, bpm, ticksPerBeat, durationSec, notes };
}
