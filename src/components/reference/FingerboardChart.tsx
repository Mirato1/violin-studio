"use client";

import { useMemo } from "react";
import type { ViolinString } from "@/types/violin";
import { VIOLIN_STRINGS, STRING_COLORS } from "@/types/violin";
import { useNotation } from "@/contexts/NotationContext";
import { type NotationMode, toNotation, stringToNotation } from "@/lib/notation";
import {
  type PositionNumber,
  type PositionNote,
  getPositionNotes,
  getOpenStringNote,
} from "@/lib/positions";

interface FingerboardChartProps {
  selectedString: ViolinString | "all";
  selectedPosition: PositionNumber;
  highlightedMidiNumbers?: Set<number>;
}

const STRING_WIDTHS: Record<ViolinString, number> = { G: 3, D: 2.5, A: 2, E: 1.5 };

/** Finger groups for fingered notes (no open string) */
const FINGER_GROUPS: { finger: number; variants: ("low" | "high" | "single")[] }[] = [
  { finger: 1, variants: ["low", "high"] },
  { finger: 2, variants: ["low", "high"] },
  { finger: 3, variants: ["single"] },
  { finger: 4, variants: ["low", "high"] },
];

function NoteBadge({
  note,
  isOpen,
  dimmed,
  notation,
}: {
  note: PositionNote;
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
        {note.octave}
      </span>
    </span>
  );
}

export default function FingerboardChart({
  selectedString,
  selectedPosition,
  highlightedMidiNumbers,
}: FingerboardChartProps) {
  const { notation } = useNotation();

  /** For each string, compute the notes for the selected position */
  const positionData = useMemo(() => {
    const data: Record<ViolinString, { open: PositionNote; notes: PositionNote[] }> = {} as never;
    for (const s of VIOLIN_STRINGS) {
      data[s] = {
        open: getOpenStringNote(s),
        notes: getPositionNotes(s, selectedPosition),
      };
    }
    return data;
  }, [selectedPosition]);

  /** Find a note by finger + variant for a given string */
  function findNote(s: ViolinString, finger: number, variant: string): PositionNote | undefined {
    return positionData[s].notes.find(
      (n) => n.finger === finger && n.variant === variant
    );
  }

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
          {/* Open string row (only for 1st position) */}
          {selectedPosition === 1 && (
            <div className="mb-4">
              <div className="flex items-stretch">
                <div className="relative flex w-14 shrink-0 items-center justify-center">
                  <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-muted/50 text-sm font-bold text-muted-foreground">
                    0
                  </span>
                </div>
                <div className="flex-1">
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
                  >
                    {VIOLIN_STRINGS.map((s) => {
                      const note = positionData[s].open;
                      const isStringActive = selectedString === "all" || selectedString === s;
                      const isScaleNote = !highlightedMidiNumbers || highlightedMidiNumbers.has(note.midiNumber);
                      const dimmed = !isStringActive || !isScaleNote;

                      return (
                        <div key={s} className="flex h-9 items-center justify-center">
                          <NoteBadge note={note} isOpen dimmed={dimmed} notation={notation} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 h-px bg-gradient-to-r from-transparent via-amber-100/10 to-transparent" />
                </div>
              </div>
            </div>
          )}

          {/* Finger groups */}
          {FINGER_GROUPS.map((group, gi) => (
            <div key={group.finger} className={gi > 0 ? "mt-4" : ""}>
              <div className="flex items-stretch">
                {/* Finger label + bracket */}
                <div className="relative flex w-14 shrink-0 items-center justify-center">
                  <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-muted/50 text-sm font-bold text-muted-foreground">
                    {group.finger}
                  </span>
                  {group.variants.length > 1 && (
                    <div
                      className="absolute w-px bg-muted-foreground/20"
                      style={{ right: 10, top: 4, bottom: 4 }}
                    />
                  )}
                </div>

                {/* Note rows */}
                <div className="flex-1">
                  {group.variants.map((variant, ri) => (
                    <div
                      key={variant}
                      className="grid"
                      style={{
                        gridTemplateColumns: "repeat(4, 1fr)",
                        marginTop: ri > 0 ? 4 : 0,
                      }}
                    >
                      {VIOLIN_STRINGS.map((s) => {
                        const note = findNote(s, group.finger, variant);
                        if (!note) {
                          return <div key={s} className="flex h-9 items-center justify-center" />;
                        }

                        const isStringActive = selectedString === "all" || selectedString === s;
                        const isScaleNote = !highlightedMidiNumbers || highlightedMidiNumbers.has(note.midiNumber);
                        const dimmed = !isStringActive || !isScaleNote;

                        return (
                          <div key={s} className="flex h-9 items-center justify-center">
                            <NoteBadge
                              note={note}
                              isOpen={false}
                              dimmed={dimmed}
                              notation={notation}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Guide line between finger groups */}
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
