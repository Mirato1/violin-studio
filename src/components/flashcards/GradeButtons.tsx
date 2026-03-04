"use client";

import { Button } from "@/components/ui/button";
import type { QualityGrade } from "@/types/flashcard";

interface GradeButtonsProps {
  onGrade: (grade: QualityGrade) => void;
}

const GRADES: { grade: QualityGrade; label: string; variant: "destructive" | "outline" | "secondary" | "default" }[] = [
  { grade: 1, label: "Again", variant: "destructive" },
  { grade: 2, label: "Hard", variant: "outline" },
  { grade: 3, label: "Good", variant: "secondary" },
  { grade: 5, label: "Easy", variant: "default" },
];

export default function GradeButtons({ onGrade }: GradeButtonsProps) {
  return (
    <div className="flex gap-2">
      {GRADES.map((g) => (
        <Button
          key={g.grade}
          variant={g.variant}
          size="sm"
          onClick={() => onGrade(g.grade)}
        >
          {g.label}
        </Button>
      ))}
    </div>
  );
}
