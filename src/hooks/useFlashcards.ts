"use client";

import { useState, useEffect, useCallback } from "react";
import type { ViolinNote } from "@/types/violin";
import type { QualityGrade, FlashcardProgress, SM2State } from "@/types/flashcard";
import { VIOLIN_NOTES } from "@/data/violinNotes";
import { calculateSM2, initialSM2State } from "@/lib/sm2";

interface ProgressMap {
  [noteId: string]: FlashcardProgress;
}

export function useFlashcards() {
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [currentNote, setCurrentNote] = useState<ViolinNote | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch progress from API
  useEffect(() => {
    fetch("/api/flashcards")
      .then((r) => r.json())
      .then((data: Array<Record<string, unknown>>) => {
        const map: ProgressMap = {};
        for (const item of data) {
          const noteId = item.noteId as string;
          map[noteId] = {
            noteId,
            sm2: {
              repetitions: item.repetitions as number,
              easeFactor: item.easeFactor as number,
              interval: item.interval as number,
              nextReviewDate: new Date(item.nextReviewDate as string),
              lastReviewDate: item.lastReviewDate
                ? new Date(item.lastReviewDate as string)
                : null,
            },
            totalReviews: item.totalReviews as number,
            correctReviews: item.correctReviews as number,
          };
        }
        setProgressMap(map);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Select next card
  const selectNext = useCallback(() => {
    const now = new Date();

    // Priority 1: Cards due for review
    const dueNotes = VIOLIN_NOTES.filter((n) => {
      const p = progressMap[n.id];
      return p && p.sm2.nextReviewDate <= now;
    }).sort((a, b) => {
      const pa = progressMap[a.id];
      const pb = progressMap[b.id];
      const dateA = pa?.sm2.lastReviewDate?.getTime() ?? 0;
      const dateB = pb?.sm2.lastReviewDate?.getTime() ?? 0;
      return dateA - dateB; // oldest first
    });

    if (dueNotes.length > 0) {
      setCurrentNote(dueNotes[0]);
      return;
    }

    // Priority 2: New cards (no progress yet)
    const newNotes = VIOLIN_NOTES.filter((n) => !progressMap[n.id]);
    if (newNotes.length > 0) {
      setCurrentNote(newNotes[0]);
      return;
    }

    // Priority 3: Card with closest review date
    const allWithProgress = VIOLIN_NOTES.filter((n) => progressMap[n.id])
      .sort((a, b) => {
        const pa = progressMap[a.id]!;
        const pb = progressMap[b.id]!;
        return pa.sm2.nextReviewDate.getTime() - pb.sm2.nextReviewDate.getTime();
      });

    setCurrentNote(allWithProgress[0] ?? VIOLIN_NOTES[0]);
  }, [progressMap]);

  // Select first card when loaded
  useEffect(() => {
    if (!loading) {
      selectNext();
    }
  }, [loading, selectNext]);

  // Grade current card
  const grade = useCallback(
    (quality: QualityGrade) => {
      if (!currentNote) return;

      const prev = progressMap[currentNote.id];
      const prevSM2: SM2State = prev?.sm2 ?? initialSM2State();
      const newSM2 = calculateSM2(prevSM2, quality);

      const isCorrect = quality >= 3;
      const totalReviews = (prev?.totalReviews ?? 0) + 1;
      const correctReviews = (prev?.correctReviews ?? 0) + (isCorrect ? 1 : 0);

      const newProgress: FlashcardProgress = {
        noteId: currentNote.id,
        sm2: newSM2,
        totalReviews,
        correctReviews,
      };

      setProgressMap((m) => ({ ...m, [currentNote.id]: newProgress }));

      // Sync to API (best-effort)
      fetch("/api/flashcards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: currentNote.id,
          repetitions: newSM2.repetitions,
          easeFactor: newSM2.easeFactor,
          interval: newSM2.interval,
          nextReviewDate: newSM2.nextReviewDate,
          lastReviewDate: newSM2.lastReviewDate,
          totalReviews,
          correctReviews,
        }),
      }).catch(() => {});

      // Select next card after a short delay
      setTimeout(() => selectNext(), 100);
    },
    [currentNote, progressMap, selectNext]
  );

  // Compute stats
  const totalNotes = VIOLIN_NOTES.length;
  const mastered = Object.values(progressMap).filter(
    (p) => p.sm2.repetitions >= 3
  ).length;
  const due = Object.values(progressMap).filter(
    (p) => p.sm2.nextReviewDate <= new Date()
  ).length + VIOLIN_NOTES.filter((n) => !progressMap[n.id]).length;
  const totalReviews = Object.values(progressMap).reduce(
    (s, p) => s + p.totalReviews,
    0
  );
  const totalCorrect = Object.values(progressMap).reduce(
    (s, p) => s + p.correctReviews,
    0
  );
  const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

  return {
    currentNote,
    loading,
    grade,
    stats: { total: totalNotes, mastered, due, accuracy },
  };
}
