import type { SM2State, QualityGrade } from "@/types/flashcard";

/**
 * SM-2 spaced repetition algorithm.
 * Pure function: takes previous state + quality grade, returns new state.
 *
 * Quality grades:
 *   0 - Complete blackout
 *   1 - Incorrect, but remembered upon seeing answer
 *   2 - Incorrect, but answer seemed easy to recall
 *   3 - Correct, but with serious difficulty
 *   4 - Correct, with some hesitation
 *   5 - Perfect response
 */
export function calculateSM2(
  prevState: SM2State,
  quality: QualityGrade
): SM2State {
  let { repetitions, easeFactor, interval } = prevState;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect: reset
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    repetitions,
    easeFactor,
    interval,
    nextReviewDate,
    lastReviewDate: new Date(),
  };
}

/** Create initial SM2 state for a new card */
export function initialSM2State(): SM2State {
  return {
    repetitions: 0,
    easeFactor: 2.5,
    interval: 0,
    nextReviewDate: new Date(),
    lastReviewDate: null,
  };
}
