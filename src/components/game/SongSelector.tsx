"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { TrackInfo } from "@/lib/midi/mapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SavedSong {
  _id: string;
  title: string;
  durationSec: number;
  isBuiltIn: boolean;
}

interface SongSelectorProps {
  onFileUpload: (file: File) => Promise<string | undefined>;
  onSelectSong: (songId: string) => void;
  onTrackChange: (trackIndex: number) => void;
  selectedSongId: string;
  availableTracks: TrackInfo[];
  selectedTrackIndex: number | null;
}

export default function SongSelector({
  onFileUpload,
  onSelectSong,
  onTrackChange,
  selectedSongId,
  availableTracks,
  selectedTrackIndex,
}: SongSelectorProps) {
  const [songs, setSongs] = useState<SavedSong[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshSongs = useCallback(() => {
    fetch("/api/songs")
      .then((r) => r.json())
      .then((data) => setSongs(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshSongs();
  }, [refreshSongs]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await onFileUpload(file);
      refreshSongs();
    } finally {
      setUploading(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedSongId} onValueChange={onSelectSong}>
        <SelectTrigger className="w-[260px]">
          <SelectValue placeholder="Select a song" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="twinkle">Twinkle Twinkle Little Star</SelectItem>
          {songs.map((s) => (
            <SelectItem key={s._id} value={s._id}>
              {s.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {availableTracks.length > 1 && selectedTrackIndex !== null && (
        <Select
          value={String(selectedTrackIndex)}
          onValueChange={(v) => onTrackChange(Number(v))}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select track" />
          </SelectTrigger>
          <SelectContent>
            {availableTracks.map((t) => (
              <SelectItem key={t.index} value={String(t.index)}>
                {t.name} ({t.noteCount} notes){t.isBestGuess ? " \u2605" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Upload MIDI"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mid,.midi"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
