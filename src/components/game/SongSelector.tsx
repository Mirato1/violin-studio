"use client";

import { useState, useEffect, useRef } from "react";
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
  onFileUpload: (file: File) => void;
  onSelectSong: (songId: string) => void;
  currentSongTitle?: string;
}

export default function SongSelector({
  onFileUpload,
  onSelectSong,
  currentSongTitle,
}: SongSelectorProps) {
  const [songs, setSongs] = useState<SavedSong[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/songs")
      .then((r) => r.json())
      .then((data) => setSongs(data))
      .catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      // Refresh song list after upload
      setTimeout(() => {
        fetch("/api/songs")
          .then((r) => r.json())
          .then((data) => setSongs(data))
          .catch(() => {});
      }, 1000);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-3">
      <Select onValueChange={onSelectSong} defaultValue="twinkle">
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
      >
        Upload MIDI
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mid,.midi"
        className="hidden"
        onChange={handleFileChange}
      />

      {currentSongTitle && (
        <span className="text-sm text-muted-foreground">
          Now playing: {currentSongTitle}
        </span>
      )}
    </div>
  );
}
