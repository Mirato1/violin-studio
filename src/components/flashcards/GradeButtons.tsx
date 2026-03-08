"use client";

import { Button } from "@/components/ui/button";
import type { QualityGrade } from "@/types/flashcard";

interface GradeButtonsProps {
  onGrade: (grade: QualityGrade) => void;
}

const GRADES: { grade: QualityGrade; label: string; key: string; variant: "destructive" | "outline" | "secondary" | "default" }[] = [
  { grade: 1, label: "Again", key: "1", variant: "destructive" },
  { grade: 2, label: "Hard", key: "2", variant: "outline" },
  { grade: 3, label: "Good", key: "3", variant: "secondary" },
  { grade: 5, label: "Easy", key: "4", variant: "default" },
];

export default function GradeButtons({ onGrade }: GradeButtonsProps) {
  return (
    <div className="flex gap-2">
      {GRADES.map((g) => (
        <Button
          key={g.grade}
          variant={g.variant}
          size={g.grade === 5 ? "default" : "sm"}
          onClick={() => onGrade(g.grade)}
          className="relative"
        >
          {g.label}
          <span className="ml-1 rounded bg-background/20 px-1 text-[10px] font-mono opacity-50">
            {g.key}
          </span>
        </Button>
      ))}
    </div>
  );
}
