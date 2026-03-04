import mongoose, { Schema, type Document } from "mongoose";

interface ISongNote {
  midiNumber: number;
  noteName: string;
  string: string;
  finger: number;
  lane: number;
  startTimeSec: number;
  durationSec: number;
  staffPosition?: number;
  accidental?: string;
  position?: number;
  slurStart?: boolean;
  slurEnd?: boolean;
}

export interface ISong extends Document {
  title: string;
  artist?: string;
  bpm: number;
  ticksPerBeat: number;
  durationSec: number;
  notes: ISongNote[];
  isBuiltIn: boolean;
  uploadedAt: Date;
}

const SongNoteSchema = new Schema(
  {
    midiNumber: { type: Number, required: true },
    noteName: { type: String, required: true },
    string: { type: String, enum: ["G", "D", "A", "E"], required: true },
    finger: { type: Number, min: 0, max: 4, required: true },
    lane: { type: Number, min: 0, max: 3, required: true },
    startTimeSec: { type: Number, required: true },
    durationSec: { type: Number, required: true },
    staffPosition: { type: Number },
    accidental: { type: String, enum: ["sharp", "flat"] },
    position: { type: Number },
    slurStart: { type: Boolean },
    slurEnd: { type: Boolean },
  },
  { _id: false }
);

const SongSchema = new Schema({
  title: { type: String, required: true },
  artist: { type: String },
  bpm: { type: Number, required: true },
  ticksPerBeat: { type: Number, required: true },
  durationSec: { type: Number, required: true },
  notes: { type: [SongNoteSchema], required: true },
  isBuiltIn: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Song ||
  mongoose.model<ISong>("Song", SongSchema);
