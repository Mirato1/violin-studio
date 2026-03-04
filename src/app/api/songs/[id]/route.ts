import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Song from "@/models/Song";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const song = await Song.findById(id).lean();
    if (!song) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(song);
  } catch {
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    await Song.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}
