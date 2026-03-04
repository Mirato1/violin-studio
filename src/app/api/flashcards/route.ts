import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import FlashcardProgress from "@/models/FlashcardProgress";

export async function GET() {
  await dbConnect();
  const progress = await FlashcardProgress.find({
    userId: "default-user",
  }).lean();
  return NextResponse.json(progress);
}

export async function PUT(req: Request) {
  await dbConnect();
  const body = await req.json();
  const { noteId, ...update } = body;

  const result = await FlashcardProgress.findOneAndUpdate(
    { noteId, userId: "default-user" },
    { $set: update },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json(result);
}
