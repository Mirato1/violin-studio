import type { MappedSong } from "@/lib/midi/mapper";

const LS_INDEX_KEY = "localSongs_index";
const LS_SONG_PREFIX = "localSong_";

export interface LocalSongMeta {
  id: string;
  title: string;
  durationSec: number;
  savedAt: number;
  trackCount?: number;
}

function getIndex(): LocalSongMeta[] {
  try {
    return JSON.parse(localStorage.getItem(LS_INDEX_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function setIndex(index: LocalSongMeta[]) {
  localStorage.setItem(LS_INDEX_KEY, JSON.stringify(index));
}

export function saveLocalSong(song: MappedSong): string {
  const id = `local-${Date.now()}`;
  const meta: LocalSongMeta = {
    id,
    title: song.title,
    durationSec: song.durationSec,
    savedAt: Date.now(),
    trackCount: song.tracks?.length,
  };
  localStorage.setItem(LS_SONG_PREFIX + id, JSON.stringify(song));
  setIndex([...getIndex(), meta]);
  return id;
}

export function loadLocalSong(id: string): MappedSong | null {
  try {
    const raw = localStorage.getItem(LS_SONG_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as MappedSong;
  } catch {
    return null;
  }
}

export function deleteLocalSong(id: string) {
  localStorage.removeItem(LS_SONG_PREFIX + id);
  setIndex(getIndex().filter((s) => s.id !== id));
}

export function listLocalSongs(): LocalSongMeta[] {
  return getIndex();
}
