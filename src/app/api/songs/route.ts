import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Song from "@/models/Song";

export async function GET() {
  try {
    await dbConnect();
    const songs = await Song.find({}, { notes: 0, 'tracks.notes': 0 }).sort({ uploadedAt: -1 }).lean();
    return NextResponse.json(songs);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const song = await Song.create(body);
    return NextResponse.json(song, { status: 201 });
  } catch {
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}
