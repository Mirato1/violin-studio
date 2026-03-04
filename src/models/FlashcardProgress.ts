import mongoose, { Schema, type Document } from "mongoose";

export interface IFlashcardProgress extends Document {
  noteId: string;
  userId: string;
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReviewDate: Date;
  lastReviewDate: Date | null;
  totalReviews: number;
  correctReviews: number;
}

const FlashcardProgressSchema = new Schema({
  noteId: { type: String, required: true, index: true },
  userId: { type: String, default: "default-user", index: true },
  repetitions: { type: Number, default: 0 },
  easeFactor: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 },
  nextReviewDate: { type: Date, default: Date.now },
  lastReviewDate: { type: Date, default: null },
  totalReviews: { type: Number, default: 0 },
  correctReviews: { type: Number, default: 0 },
});

FlashcardProgressSchema.index({ noteId: 1, userId: 1 }, { unique: true });

export default mongoose.models.FlashcardProgress ||
  mongoose.model<IFlashcardProgress>(
    "FlashcardProgress",
    FlashcardProgressSchema
  );
