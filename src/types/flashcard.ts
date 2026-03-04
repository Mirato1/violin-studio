export interface SM2State {
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReviewDate: Date;
  lastReviewDate: Date | null;
}

export interface FlashcardProgress {
  noteId: string;
  sm2: SM2State;
  totalReviews: number;
  correctReviews: number;
}

export type QualityGrade = 0 | 1 | 2 | 3 | 4 | 5;
