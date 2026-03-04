"use client";

import type { ViolinNote, ViolinString } from "@/types/violin";
import { VIOLIN_STRINGS, STRING_COLORS } from "@/types/violin";
import { VIOLIN_NOTES } from "@/data/violinNotes";
import { useNotation } from "@/contexts/NotationContext";
import { type NotationMode, toNotation, stringToNotation } from "@/lib/notation";

interface FingerboardChartProps {
  selectedString: ViolinString | "all";
  highlightedNoteIds?: Set<string>;
}

const OPEN_MIDI: Record<ViolinString, number> = { G: 55, D: 62, A: 69, E: 76 };
const STRING_WIDTHS: Record<ViolinString, number> = { G: 3, D: 2.5, A: 2, E: 1.5 };

/** Finger groups: each finger covers 1-2 semitone positions */
const FINGER_GROUPS: { finger: number; offsets: number[] }[] = [
  { finger: 0, offsets: [0] },
  { finger: 1, offsets: [1, 2] },
  { finger: 2, offsets: [3, 4] },
  { finger: 3, offsets: [5] },
  { finger: 4, offsets: [6, 7] },
];

/** Build lookup: string → semitone offset → note (first position only) */
function buildSemitoneMap() {
  const map: Record<ViolinString, Record<number, ViolinNote>> = { G: {}, D: {}, A: {}, E: {} };
  for (const note of VIOLIN_NOTES) {
    if (note.position && note.position !== 1) continue;
    const offset = note.midiNumber - OPEN_MIDI[note.string];
    if (offset >= 0 && offset <= 7) {
      map[note.string][offset] = note;
    }
  }
  return map;
}

const SEMITONE_MAP = buildSemitoneMap();

function NoteBadge({
  note,
  isOpen,
  dimmed,
  notation,
}: {
  note: ViolinNote;
  isOpen: boolean;
  dimmed: boolean;
  notation: NotationMode;
}) {
  const color = STRING_COLORS[note.string];
  return (
    <span
      className="inline-flex h-8 min-w-[3.25rem] items-center justify-center rounded-full px-2 text-xs font-bold transition-opacity"
      style={{
        backgroundColor: isOpen ? "transparent" : color.fill,
        color: isOpen ? color.fill : "#000",
        border: isOpen ? `2px solid ${color.fill}` : "none",
        opacity: dimmed ? 0.12 : 1,
      }}
    >
      {toNotation(note.displayName, notation)}
      <span className="ml-0.5 text-[10px] font-normal opacity-60">
        {note.name.slice(-1)}
      </span>
    </span>
  );
}

export default function FingerboardChart({ selectedString, highlightedNoteIds }: FingerboardChartProps) {
  const { notation } = useNotation();

  return (
    <div className="overflow-x-auto rounded-lg border border-gold/20">
      {/* String headers */}
      <div
        className="grid items-end gap-0 border-b border-amber-200/15 bg-card py-3"
        style={{ gridTemplateColumns: "3.5rem repeat(4, 1fr)" }}
      >
        <div />
        {VIOLIN_STRINGS.map((s) => (
          <div key={s} className="text-center">
            <span className="text-sm font-bold" style={{ color: STRING_COLORS[s].fill }}>
              {stringToNotation(s, notation)}
            </span>
          </div>
        ))}
      </div>

      {/* Nut */}
      <div className="relative h-1.5">
        <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-r from-amber-100/5 via-amber-100/30 to-amber-100/5" />
      </div>

      {/* Fingerboard body */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[hsl(30,30%,10%)] to-[hsl(30,20%,7%)] py-3">
        {/* Vertical string lines (behind content) */}
        <div
          className="pointer-events-none absolute inset-0 grid"
          style={{ gridTemplateColumns: "3.5rem repeat(4, 1fr)" }}
        >
          <div />
          {VIOLIN_STRINGS.map((s) => (
            <div key={s} className="flex justify-center">
              <div
                className="h-full rounded-full"
                style={{
                  width: STRING_WIDTHS[s],
                  backgroundColor: STRING_COLORS[s].fill,
                  opacity: 0.12,
                }}
              />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10">
          {FINGER_GROUPS.map((group, gi) => (
            <div key={group.finger} className={gi > 0 ? "mt-4" : ""}>
              <div className="flex items-stretch">
                {/* Finger label + bracket */}
                <div className="relative flex w-14 shrink-0 items-center justify-center">
                  <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-muted/50 text-sm font-bold text-muted-foreground">
                    {group.finger}
                  </span>
                  {group.offsets.length > 1 && (
                    <div
                      className="absolute w-px bg-muted-foreground/20"
                      style={{
                        right: 10,
                        top: 4,
                        bottom: 4,
                      }}
                    />
                  )}
                </div>

                {/* Note rows */}
                <div className="flex-1">
                  {group.offsets.map((offset, ri) => (
                    <div
                      key={offset}
                      className="grid"
                      style={{
                        gridTemplateColumns: "repeat(4, 1fr)",
                        marginTop: ri > 0 ? 4 : 0,
                      }}
                    >
                      {VIOLIN_STRINGS.map((s) => {
                        const note = SEMITONE_MAP[s][offset];
                        if (!note) {
                          return <div key={s} className="flex h-9 items-center justify-center" />;
                        }

                        const isStringActive = selectedString === "all" || selectedString === s;
                        const isScaleNote = !highlightedNoteIds || highlightedNoteIds.has(note.id);
                        const dimmed = !isStringActive || !isScaleNote;
                        const isOpen = offset === 0;

                        return (
                          <div key={s} className="flex h-9 items-center justify-center">
                            <NoteBadge
                              note={note}
                              isOpen={isOpen}
                              dimmed={dimmed}
                              notation={notation}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Subtle guide line after finger group (except last) */}
                  {gi < FINGER_GROUPS.length - 1 && (
                    <div className="mt-3 h-px bg-gradient-to-r from-transparent via-amber-100/10 to-transparent" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
