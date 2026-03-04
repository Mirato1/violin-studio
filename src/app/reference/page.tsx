"use client";

import { useState, useMemo } from "react";
import type { ViolinString } from "@/types/violin";
import { VIOLIN_NOTES } from "@/data/violinNotes";
import { VIOLIN_SCALES } from "@/data/scales";
import type { PositionNumber } from "@/lib/positions";
import StringFilter from "@/components/reference/StringFilter";
import NoteCard from "@/components/reference/NoteCard";
import FingerboardChart from "@/components/reference/FingerboardChart";
import NeckPositionMap from "@/components/reference/NeckPositionMap";
import MiniStaff from "@/components/reference/MiniStaff";
import { useNotation } from "@/contexts/NotationContext";
import { toNotation, stringToNotation } from "@/lib/notation";
import { STRING_COLORS } from "@/types/violin";
import { cn } from "@/lib/utils";

const POSITIONS: { value: PositionNumber; label: string }[] = [
  { value: 1, label: "1st" },
  { value: 2, label: "2nd" },
  { value: 3, label: "3rd" },
  { value: 4, label: "4th" },
];

export default function ReferencePage() {
  const [selectedString, setSelectedString] = useState<ViolinString | "all">("all");
  const [selectedPosition, setSelectedPosition] = useState<PositionNumber>(1);
  const [selectedScaleId, setSelectedScaleId] = useState<string | null>(null);
  const { notation } = useNotation();

  const selectedScale = VIOLIN_SCALES.find((s) => s.id === selectedScaleId) ?? null;

  /** Convert scale note IDs → MIDI numbers for position-independent matching */
  const highlightedMidiNumbers = useMemo(() => {
    if (!selectedScale) return undefined;
    const midis = new Set<number>();
    for (const id of selectedScale.noteIds) {
      const note = VIOLIN_NOTES.find((n) => n.id === id);
      if (note) midis.add(note.midiNumber);
    }
    return midis;
  }, [selectedScale]);

  const scaleNotes = useMemo(() => {
    if (!selectedScale) return [];
    return selectedScale.noteIds
      .map((id) => VIOLIN_NOTES.find((n) => n.id === id))
      .filter(Boolean) as typeof VIOLIN_NOTES;
  }, [selectedScale]);

  const filteredNotes =
    selectedString === "all"
      ? VIOLIN_NOTES
      : VIOLIN_NOTES.filter((n) => n.string === selectedString);

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="gold-text text-3xl font-bold tracking-tight">Reference</h1>
        <div className="gold-divider mt-2 w-24" />
        <p className="mt-2 text-muted-foreground">
          All notes organized by string, position, and finger number.
        </p>
      </div>

      <StringFilter selected={selectedString} onSelect={setSelectedString} />

      {/* Position selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Position:</span>
        <div className="flex gap-2">
          {POSITIONS.map((pos) => (
            <button
              key={pos.value}
              onClick={() => setSelectedPosition(pos.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-semibold transition-all",
                selectedPosition === pos.value
                  ? "border-gold/40 bg-primary text-primary-foreground gold-glow"
                  : "border-transparent bg-secondary text-secondary-foreground hover:border-gold/20 hover:bg-accent"
              )}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual neck position map for beginners */}
      <NeckPositionMap selectedPosition={selectedPosition} />

      <FingerboardChart
        selectedString={selectedString}
        selectedPosition={selectedPosition}
        highlightedMidiNumbers={highlightedMidiNumbers}
      />

      {/* Scales section */}
      <div>
        <h2 className="gold-text text-xl font-bold tracking-tight">Scales</h2>
        <div className="gold-divider mt-1 w-16" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedScaleId(null)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-semibold transition-all",
            !selectedScaleId
              ? "border-gold/40 bg-primary text-primary-foreground gold-glow"
              : "border-transparent bg-secondary text-secondary-foreground hover:border-gold/20 hover:bg-accent"
          )}
        >
          None
        </button>
        {VIOLIN_SCALES.map((scale) => (
          <button
            key={scale.id}
            onClick={() => setSelectedScaleId(scale.id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-semibold transition-all",
              selectedScaleId === scale.id
                ? "border-gold/40 bg-primary text-primary-foreground gold-glow"
                : "border-transparent bg-secondary text-secondary-foreground hover:border-gold/20 hover:bg-accent"
            )}
          >
            {toNotation(scale.key, notation)} {scale.name.split(" ").slice(1).join(" ")}
          </button>
        ))}
      </div>

      {selectedScale && scaleNotes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gold/20 bg-card p-4">
          <div className="flex items-end justify-center gap-4">
            {scaleNotes.map((note, i) => (
              <div key={note.id + i} className="flex flex-col items-center gap-1">
                <MiniStaff note={note} />
                <div
                  className="text-sm font-bold"
                  style={{ color: STRING_COLORS[note.string].fill }}
                >
                  {toNotation(note.displayName, notation)}
                  <span className="text-[10px] opacity-70">{note.name.slice(-1)}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {note.finger === 0
                    ? stringToNotation(note.string, notation)
                    : `${note.finger}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All notes grid */}
      <div>
        <h2 className="gold-text text-xl font-bold tracking-tight">Notes</h2>
        <div className="gold-divider mt-1 w-16" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filteredNotes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}
