"use client";

import { useState } from "react";
import type { ViolinString } from "@/types/violin";
import { VIOLIN_STRINGS } from "@/types/violin";
import { VIOLIN_NOTES } from "@/data/violinNotes";
import StringFilter from "@/components/reference/StringFilter";
import NoteCard from "@/components/reference/NoteCard";
import Fingerboard from "@/components/reference/Fingerboard";

export default function ReferencePage() {
  const [selectedString, setSelectedString] = useState<ViolinString | "all">("all");

  const filteredNotes =
    selectedString === "all"
      ? VIOLIN_NOTES
      : VIOLIN_NOTES.filter((n) => n.string === selectedString);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="gold-text text-3xl font-bold tracking-tight">Reference</h1>
        <div className="gold-divider mt-2 w-24" />
        <p className="mt-2 text-muted-foreground">
          All first-position notes organized by string — staff notation, names, and finger numbers.
        </p>
      </div>

      <StringFilter
        selected={selectedString}
        onSelect={setSelectedString}
      />

      <Fingerboard selectedString={selectedString} />

      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filteredNotes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}
