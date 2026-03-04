"use client";

import { useState } from "react";
import type { ViolinNote } from "@/types/violin";
import type { QualityGrade } from "@/types/flashcard";
import { STRING_COLORS } from "@/types/violin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StaffRenderer from "./StaffRenderer";
import GradeButtons from "./GradeButtons";

interface FlashcardCardProps {
  note: ViolinNote;
  onGrade: (grade: QualityGrade) => void;
}

export default function FlashcardCard({ note, onGrade }: FlashcardCardProps) {
  const [revealed, setRevealed] = useState(false);
  const color = STRING_COLORS[note.string];

  const handleGrade = (grade: QualityGrade) => {
    setRevealed(false);
    onGrade(grade);
  };

  return (
    <Card className="flex flex-col items-center gap-4 p-6">
      <div className="text-sm text-muted-foreground">What note is this?</div>

      <StaffRenderer note={note} width={200} height={180} showNote={true} />

      {!revealed ? (
        <Button variant="outline" onClick={() => setRevealed(true)}>
          Show Answer
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <div className="text-3xl font-bold">{note.displayName}{note.name.slice(-1)}</div>
            <div className="text-sm font-medium" style={{ color: color.fill }}>
              {note.string} string
            </div>
            <div className="text-sm text-muted-foreground">
              {note.finger === 0 ? "Open string" : `Finger ${note.finger}`}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">How well did you know it?</div>
          <GradeButtons onGrade={handleGrade} />
        </div>
      )}
    </Card>
  );
}
