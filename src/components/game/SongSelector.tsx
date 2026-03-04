"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import type { TrackInfo } from "@/lib/midi/mapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Music2, Trash2, Upload } from "lucide-react";
import { listLocalSongs, type LocalSongMeta } from "@/lib/localSongs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface SavedSong {
  _id: string;
  title: string;
  durationSec: number;
  isBuiltIn: boolean;
}

interface SongSelectorProps {
  onFileUpload: (file: File) => Promise<string | undefined>;
  onSelectSong: (songId: string) => void;
  onDeleteSong: (songId: string) => Promise<void>;
  onTrackChange: (trackIndex: number) => void;
  selectedSongId: string;
  availableTracks: TrackInfo[];
  selectedTrackIndex: number | null;
}

export default function SongSelector({
  onFileUpload,
  onSelectSong,
  onDeleteSong,
  onTrackChange,
  selectedSongId,
  availableTracks,
  selectedTrackIndex,
}: SongSelectorProps) {
  const [songs, setSongs] = useState<SavedSong[]>([]);
  const [localSongs, setLocalSongs] = useState<LocalSongMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshSongs = useCallback(() => {
    setLocalSongs(listLocalSongs());
    fetch("/api/songs")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) ? setSongs(data) : setSongs([]))
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

  const handleDeleteConfirm = async () => {
    setConfirmOpen(false);
    setDeleting(true);
    try {
      await onDeleteSong(selectedSongId);
      refreshSongs();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Music2 className="size-4" />
          <span className="text-xs font-medium">Song</span>
        </div>

        <Select value={selectedSongId} onValueChange={onSelectSong}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select a song" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="twinkle">Twinkle Twinkle Little Star</SelectItem>
            {songs.map((s) => (
              <SelectItem key={s._id} value={s._id}>
                {s.title}
              </SelectItem>
            ))}
            {localSongs.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title} (local)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedSongId !== "twinkle" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
              >
                <Trash2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Delete song</TooltipContent>
          </Tooltip>
        )}

        {availableTracks.length > 1 && selectedTrackIndex !== null && (
          <>
            <div className="h-6 border-l border-border" />
            <Select
              value={String(selectedTrackIndex)}
              onValueChange={(v) => onTrackChange(Number(v))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select track" />
              </SelectTrigger>
              <SelectContent>
                {availableTracks.map((t) => (
                  <SelectItem key={t.index} value={String(t.index)}>
                    {t.name} ({t.noteCount}){t.isBestGuess ? " \u2605" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        <div className="h-6 border-l border-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="size-4" />
              <span className="ml-1.5">{uploading ? "Uploading..." : "Upload"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Upload a MIDI file</TooltipContent>
        </Tooltip>

        <input
          ref={fileInputRef}
          type="file"
          accept=".mid,.midi"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete song</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this song? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
