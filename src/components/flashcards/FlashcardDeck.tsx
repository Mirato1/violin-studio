"use client";

import { useFlashcards } from "@/hooks/useFlashcards";
import FlashcardCard from "./FlashcardCard";
import FlashcardStats from "./FlashcardStats";

export default function FlashcardDeck() {
  const { currentNote, loading, grade, stats } = useFlashcards();

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
        Loading flashcards...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <FlashcardStats
        total={stats.total}
        mastered={stats.mastered}
        due={stats.due}
        accuracy={stats.accuracy}
      />

      {currentNote ? (
        <FlashcardCard note={currentNote} onGrade={grade} />
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
          No cards available
        </div>
      )}
    </div>
  );
}
