"use client";

import type { ViolinNote, ViolinString } from "@/types/violin";
import { VIOLIN_STRINGS, STRING_COLORS } from "@/types/violin";
import { VIOLIN_NOTES } from "@/data/violinNotes";
import { useNotation } from "@/contexts/NotationContext";
import { toNotation, stringToNotation } from "@/lib/notation";

interface FingerboardChartProps {
  selectedString: ViolinString | "all";
  highlightedNoteIds?: Set<string>;
}

type RowKey = "open" | "1low" | "1high" | "2low" | "2high" | "3" | "4low" | "4high";

const ROW_DEFS: { key: RowKey; label: string; finger: number; index: number }[] = [
  { key: "open", label: "0", finger: 0, index: 0 },
  { key: "1low", label: "1↓", finger: 1, index: 0 },
  { key: "1high", label: "1↑", finger: 1, index: 1 },
  { key: "2low", label: "2↓", finger: 2, index: 0 },
  { key: "2high", label: "2↑", finger: 2, index: 1 },
  { key: "3", label: "3", finger: 3, index: 0 },
  { key: "4low", label: "4↓", finger: 4, index: 0 },
  { key: "4high", label: "4↑", finger: 4, index: 1 },
];

/** Build a lookup: string → finger → sorted notes (first position only) */
function buildGrid() {
  const grid: Record<ViolinString, Record<number, ViolinNote[]>> = {
    G: {}, D: {}, A: {}, E: {},
  };
  for (const note of VIOLIN_NOTES) {
    if (note.position && note.position !== 1) continue;
    const s = note.string;
    if (!grid[s][note.finger]) grid[s][note.finger] = [];
    grid[s][note.finger].push(note);
  }
  for (const s of VIOLIN_STRINGS) {
    for (const f of Object.keys(grid[s])) {
      grid[s][Number(f)].sort((a, b) => a.midiNumber - b.midiNumber);
    }
  }
  return grid;
}

const GRID = buildGrid();

export default function FingerboardChart({ selectedString, highlightedNoteIds }: FingerboardChartProps) {
  const { notation } = useNotation();

  return (
    <div className="overflow-x-auto rounded-lg border border-gold/20 bg-card p-4">
      <table className="mx-auto border-separate border-spacing-y-1">
        <thead>
          <tr>
            <th className="w-12 px-2 text-xs font-medium text-muted-foreground">Finger</th>
            {VIOLIN_STRINGS.map((s) => (
              <th key={s} className="px-4 pb-2 text-center">
                <span
                  className="text-sm font-bold"
                  style={{ color: STRING_COLORS[s].fill }}
                >
                  {stringToNotation(s, notation)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROW_DEFS.map((row) => (
            <tr key={row.key}>
              <td className="px-2 text-center text-xs font-semibold text-muted-foreground">
                {row.label}
              </td>
              {VIOLIN_STRINGS.map((s) => {
                const notes = GRID[s][row.finger];
                const note = notes?.[row.index];

                if (!note) {
                  return <td key={s} className="px-4 py-0.5" />;
                }

                const color = STRING_COLORS[s];
                const isStringActive = selectedString === "all" || selectedString === s;
                const isScaleNote = !highlightedNoteIds || highlightedNoteIds.has(note.id);
                const dimmed = !isStringActive || !isScaleNote;

                return (
                  <td key={s} className="px-4 py-0.5 text-center">
                    <span
                      className="inline-flex h-8 min-w-[3rem] items-center justify-center rounded-full px-2 text-xs font-bold transition-opacity"
                      style={{
                        backgroundColor: color.fill,
                        color: "#000",
                        opacity: dimmed ? 0.15 : 1,
                      }}
                    >
                      {toNotation(note.displayName, notation)}
                      <span className="ml-0.5 text-[10px] font-normal opacity-70">
                        {note.name.slice(-1)}
                      </span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
