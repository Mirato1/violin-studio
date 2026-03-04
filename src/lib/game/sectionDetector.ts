import type { GameNote } from "@/types/game";

export interface SongSection {
  name: string;
  startTimeSec: number;
  endTimeSec: number;
  noteCount: number;
}

const SECTION_NAMES = [
  "Intro",
  "Part A", "Part B", "Part C", "Part D",
  "Part E", "Part F", "Part G", "Part H",
];

/**
 * Detect song sections by finding silence gaps between notes.
 * Gaps larger than `gapThreshold` seconds mark a new section.
 */
export function detectSections(
  notes: GameNote[],
  totalDuration: number,
  gapThreshold = 1.5
): SongSection[] {
  if (notes.length === 0) return [];

  const sorted = [...notes].sort((a, b) => a.startTimeSec - b.startTimeSec);
  const boundaries: number[] = [sorted[0].startTimeSec];

  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].startTimeSec + sorted[i - 1].durationSec;
    const gap = sorted[i].startTimeSec - prevEnd;
    if (gap > gapThreshold) {
      boundaries.push(sorted[i].startTimeSec);
    }
  }

  return boundaries.map((start, i) => {
    const end = i + 1 < boundaries.length ? boundaries[i + 1] : totalDuration;
    const sectionNotes = sorted.filter(
      (n) => n.startTimeSec >= start && n.startTimeSec < end
    );
    return {
      name: SECTION_NAMES[i] ?? `Part ${i + 1}`,
      startTimeSec: start,
      endTimeSec: end,
      noteCount: sectionNotes.length,
    };
  });
}

/**
 * Return the next section that starts after `timeSec`.
 */
export function getNextSection(
  sections: SongSection[],
  timeSec: number
): SongSection | null {
  return sections.find((s) => s.startTimeSec > timeSec) ?? null;
}
