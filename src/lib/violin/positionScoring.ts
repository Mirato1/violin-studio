import type { ViolinString } from "@/types/violin";
import type { GameNote } from "@/types/game";
import { OPEN_MIDI, deriveNoteOnString } from "@/data/violinNotes";

// ── Constants ────────────────────────────────────────────────────────────────

export const ALL_STRINGS: ViolinString[] = ["G", "D", "A", "E"];
export const POSITION_BASE: Record<number, number> = { 1: 2, 2: 4, 3: 5, 4: 7 };
export const STRING_IDX: Record<string, number> = { G: 0, D: 1, A: 2, E: 3 };
export const STRING_TO_LANE: Record<string, number> = { G: 0, D: 1, A: 2, E: 3 };

/** Finger deltas from position base semitone */
export const FINGER_DELTAS = [
  { finger: 1, delta: -1 }, { finger: 1, delta: 0 },
  { finger: 2, delta: 1 },  { finger: 2, delta: 2 },
  { finger: 3, delta: 3 },
  { finger: 4, delta: 4 },  { finger: 4, delta: 5 },
];

// ── Types ────────────────────────────────────────────────────────────────────

export interface Candidate {
  string: ViolinString;
  finger: number;
  position: number;
  staffPosition: number;
  accidental?: "sharp" | "flat";
  name: string;
  displayName: string;
}

// ── Core functions ───────────────────────────────────────────────────────────

/**
 * Find ALL possible (string, position, finger) combinations for a MIDI number.
 * Returns candidates across strings and positions 1–4.
 */
export function findAllCandidates(midi: number): Candidate[] {
  const candidates: Candidate[] = [];
  for (const s of ALL_STRINGS) {
    const open = OPEN_MIDI[s];
    const semiAbove = midi - open;
    if (semiAbove < 0 || semiAbove > 12) continue; // out of range for this string

    for (const pos of [1, 3, 4] as const) {
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

/**
 * Score a candidate based on musical context (position continuity, string proximity).
 * Higher score = better choice.
 */
export function scoreCandidate(
  c: Candidate,
  lastString: string | undefined,
  lastPosition: number,
): number {
  let score = 0;

  // Preference for staying in the same position (moderate — shifts are normal in violin)
  if (c.position === lastPosition) score += 30;
  // Penalty for each position step of shift (low — position changes are routine)
  else score -= Math.abs(c.position - lastPosition) * 8;

  // String continuity is crucial — changing strings changes timbre
  if (lastString) {
    const dist = Math.abs(STRING_IDX[c.string] - STRING_IDX[lastString]);
    if (dist === 0) score += 40; // same string — strongly preferred
    else if (dist === 1) score += 5; // adjacent
    else score -= dist * 5; // far string crossing
  }

  // Small bonus for lower positions (easier for beginners)
  score -= c.position * 2;

  // Prefer open strings — most resonant and easiest to play
  if (c.finger === 0) score += 20;

  // Penalize finger 4 — encourages position shifts for comfort
  if (c.finger === 4) score -= 35;

  return score;
}

/**
 * Find the best (most comfortable) finger for a MIDI note in a given position.
 * Checks ALL strings and returns the lowest finger number found.
 * Returns 0-3 for comfortable fingers, 4 for pinky, or -1 if not reachable.
 */
export function bestFingerInPosition(midi: number, position: number): number {
  let best = -1;
  for (const s of ALL_STRINGS) {
    const open = OPEN_MIDI[s];
    const semi = midi - open;
    if (semi < 0 || semi > 12) continue;
    if (semi === 0) return 0; // open string — always the best
    const base = POSITION_BASE[position];
    for (const fd of FINGER_DELTAS) {
      if (base + fd.delta === semi && (best === -1 || fd.finger < best)) {
        best = fd.finger;
      }
    }
  }
  return best;
}

/**
 * Analyze the first N notes to determine the best starting position.
 * Picks the position where the most notes can be played with comfortable fingers.
 */
export function chooseStartingPosition(midis: number[]): number {
  let bestPos = 1, bestScore = -Infinity;
  for (const pos of [1, 3, 4] as const) {
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
export function lookAheadBonus(position: number, upcomingMidis: number[]): number {
  let bonus = 0;
  for (const midi of upcomingMidis) {
    const f = bestFingerInPosition(midi, position);
    if (f === -1) bonus -= 20;
    else if (f === 0) bonus += 30;
    else if (f <= 3) bonus += 25;
    else bonus -= 15; // finger 4 — actively penalized
  }
  return bonus;
}

/**
 * Pick the best candidate for a MIDI note given musical context and upcoming notes.
 */
export function pickBestCandidate(
  midi: number,
  lastString: string | undefined,
  lastPosition: number,
  upcomingMidis: number[],
): Candidate | undefined {
  const candidates = findAllCandidates(midi);
  if (candidates.length === 0) return undefined;

  let best: Candidate | undefined;
  let bestScore = -Infinity;
  for (const c of candidates) {
    let s = scoreCandidate(c, lastString, lastPosition);
    if (upcomingMidis.length > 0) {
      s += lookAheadBonus(c.position, upcomingMidis);
    }
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
}

/**
 * Sliding-window majority vote: for each note, look at the surrounding window
 * and reassign to the majority position if this note is in the minority.
 * This eliminates rapid alternation (3rd-1st-3rd-1st → all 3rd).
 */
export function smoothPositions(notes: GameNote[]): void {
  if (notes.length < 3) return;

  const HALF_WINDOW = 8; // look 8 notes before + 8 after = 17-note window

  for (let pass = 0; pass < 2; pass++) {
    let changed = false;

    for (let i = 0; i < notes.length; i++) {
      const myPos = notes[i].position ?? 1;

      // Count positions in the surrounding window
      const counts: Record<number, number> = {};
      const wStart = Math.max(0, i - HALF_WINDOW);
      const wEnd = Math.min(notes.length - 1, i + HALF_WINDOW);

      for (let j = wStart; j <= wEnd; j++) {
        const p = notes[j].position ?? 1;
        counts[p] = (counts[p] ?? 0) + 1;
      }

      // Find majority position
      let majorityPos = myPos;
      let majorityCount = 0;
      for (const posStr of Object.keys(counts)) {
        const pos = Number(posStr);
        if (counts[pos] > majorityCount) {
          majorityCount = counts[pos];
          majorityPos = pos;
        }
      }

      // Skip if already in the majority, or majority is not convincing (>50%)
      const windowSize = wEnd - wStart + 1;
      if (majorityPos === myPos || majorityCount <= windowSize / 2) continue;

      // Try to reassign this note to the majority position
      const candidates = findAllCandidates(notes[i].midiNumber);
      const inTarget = candidates.filter((c) => c.position === majorityPos);
      if (inTarget.length === 0) continue;

      // Only reassign if we can stay on the same string — never change strings
      const noteStr = notes[i].string;
      const sameStr = inTarget.find((c) => c.string === noteStr);
      if (!sameStr) continue; // skip: no candidate on same string in target position
      const best = sameStr;

      notes[i].string = best.string;
      notes[i].finger = best.finger;
      notes[i].lane = STRING_TO_LANE[best.string];
      notes[i].noteName = best.name;
      notes[i].staffPosition = best.staffPosition;
      notes[i].accidental = best.accidental;
      notes[i].position = best.position === 1 ? undefined : best.position;
      changed = true;
    }

    if (!changed) break;
  }
}
