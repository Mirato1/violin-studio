"use client";

import type { ViolinNote } from "@/types/violin";
import { STRING_COLORS } from "@/types/violin";
import { Card } from "@/components/ui/card";
import MiniStaff from "./MiniStaff";

interface NoteCardProps {
  note: ViolinNote;
}

export default function NoteCard({ note }: NoteCardProps) {
  const color = STRING_COLORS[note.string];

  return (
    <Card className="flex flex-col items-center gap-2 p-4">
      <MiniStaff note={note} />
      <div className="text-center">
        <div className="text-lg font-bold">{note.displayName}{note.name.slice(-1)}</div>
        <div
          className="text-sm font-medium"
          style={{ color: color.fill }}
        >
          {note.string} string
        </div>
        <div className="text-sm text-muted-foreground">
          {note.finger === 0 ? "Open" : `Finger ${note.finger}`}
        </div>
      </div>
    </Card>
  );
}
