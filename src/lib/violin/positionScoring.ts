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

    const positions = s === "E" ? ([1, 3, 4] as const) : ([1] as const);
    for (const pos of positions) {
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
 * Score a candidate based on position hierarchy and finger comfort.
 * Higher score = better choice.
 *
 * Philosophy: for a beginner app, 1st position is ALWAYS preferred unless
 * the note literally can't be played there. Position hierarchy is the
 * dominant factor; string/position continuity are just tiebreakers.
 */
export function scoreCandidate(
  c: Candidate,
  lastString: string | undefined,
  lastPosition: number,
): number {
  let score = 0;

  // ── DOMINANT: Prefer lower positions (1st > 3rd > 4th > higher) ──
  if (c.position === 1) score += 40;
  else if (c.position === 3) score += 20;
  else if (c.position === 4) score += 10;
  // position 5+ → 0

  // ── Finger comfort ──
  if (c.finger === 0) score += 25;       // open string — always best
  else if (c.finger <= 2) score += 10;   // comfortable
  else if (c.finger === 3) score += 5;   // fine
  else score -= 20;                       // finger 4 — mild penalty (1st pos with f4 is standard)

  // ── String continuity (tiebreaker) ──
  if (lastString) {
    const dist = Math.abs(STRING_IDX[c.string] - STRING_IDX[lastString]);
    if (dist === 0) score += 8;          // same string
    else if (dist === 1) score += 2;     // adjacent
    else score -= dist * 2;              // far crossing
  }

  // ── Position continuity (strong — prevents oscillation between positions) ──
  if (c.position === lastPosition) score += 20;

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
export function chooseStartingPosition(_midis: number[]): number {
  // For now, always start in 1st position.
  // Higher positions are only used on the E string (determined per-note).
  return 1;
}

/**
 * String-aware look-ahead: score upcoming notes specifically on the
 * candidate's string and position. Unlike the old lookAheadBonus which
 * checked ALL strings (causing wrong-string assignments), this only
 * evaluates whether upcoming notes are reachable in the given position
 * on the given string.
 */
export function stringAwareLookAhead(
  str: ViolinString,
  position: number,
  upcomingMidis: number[],
): number {
  const open = OPEN_MIDI[str];
  const base = POSITION_BASE[position];
  let bonus = 0;

  for (const midi of upcomingMidis) {
    const semi = midi - open;

    // Open string is always comfortable regardless of position
    if (semi === 0) { bonus += 15; continue; }
    // Out of range for this string — stop, a string change is forced
    if (semi < 0 || semi > 12) { bonus -= 10; break; }

    // Check if any finger delta matches in this position
    let bestFinger = -1;
    for (const fd of FINGER_DELTAS) {
      if (base + fd.delta === semi) { bestFinger = fd.finger; break; }
    }

    if (bestFinger === -1) { bonus -= 15; break; } // unreachable — stop, position change forced
    else if (bestFinger <= 3) bonus += 15;   // comfortable
    else bonus -= 5;                          // finger 4
  }

  return bonus;
}

/**
 * Pick the best candidate for a MIDI note given musical context and upcoming notes.
 * Uses string-aware look-ahead to anticipate position shifts (e.g., shift to 3rd
 * position early when C6 is coming, rather than using finger 4 in 1st position).
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
      s += stringAwareLookAhead(c.string, c.position, upcomingMidis);
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
      // Only smooth E string notes — other strings are always 1st position
      if (notes[i].string !== "E") continue;

      const myPos = notes[i].position ?? 1;

      // Count positions in the surrounding window (only E string notes)
      const counts: Record<number, number> = {};
      const wStart = Math.max(0, i - HALF_WINDOW);
      const wEnd = Math.min(notes.length - 1, i + HALF_WINDOW);

      let windowSize = 0;
      for (let j = wStart; j <= wEnd; j++) {
        if (notes[j].string !== "E") continue;
        const p = notes[j].position ?? 1;
        counts[p] = (counts[p] ?? 0) + 1;
        windowSize++;
      }

      if (windowSize < 2) continue;

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
