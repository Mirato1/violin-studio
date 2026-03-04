import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Song from "@/models/Song";

export async function GET() {
  await dbConnect();
  const songs = await Song.find({}, { notes: 0 }).sort({ uploadedAt: -1 }).lean();
  return NextResponse.json(songs);
}

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const song = await Song.create(body);
  return NextResponse.json(song, { status: 201 });
}
