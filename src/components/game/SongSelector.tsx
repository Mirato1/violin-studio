"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
  selectedSongId: string;
}

export default function SongSelector({
  onFileUpload,
  onSelectSong,
  selectedSongId,
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
    <div className="flex items-center gap-3">
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
