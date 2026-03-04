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
import { ListMusic, Trash2, Upload } from "lucide-react";
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
  currentSongTitle: string;
  onFileUpload: (file: File) => Promise<string | undefined>;
  onSelectSong: (songId: string) => void;
  onDeleteSong: (songId: string) => Promise<void>;
  onTrackChange: (trackIndex: number) => void;
  selectedSongId: string;
  availableTracks: TrackInfo[];
  selectedTrackIndex: number | null;
}

export default function SongSelector({
  currentSongTitle,
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
  const [changeSongOpen, setChangeSongOpen] = useState(false);
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

  const handleSongSelect = (songId: string) => {
    onSelectSong(songId);
    setChangeSongOpen(false);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-3">
        {/* NOW PLAYING */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mb-0.5">Now Playing</span>
          <span className="text-sm font-semibold truncate max-w-[200px]">{currentSongTitle || "—"}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => { refreshSongs(); setChangeSongOpen(true); }}
        >
          <ListMusic className="size-4 mr-1.5" />
          Change Song
        </Button>

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
          <TooltipContent side="top">Upload a MIDI or MusicXML file</TooltipContent>
        </Tooltip>

        <input
          ref={fileInputRef}
          type="file"
          accept=".mid,.midi,.musicxml,.mxl"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Change Song Dialog */}
      <Dialog open={changeSongOpen} onOpenChange={setChangeSongOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Song</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-1">
            <button
              onClick={() => handleSongSelect("twinkle")}
              className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors ${selectedSongId === "twinkle" ? "bg-accent font-semibold" : ""}`}
            >
              Twinkle Twinkle Little Star
            </button>
            {songs.map((s) => (
              <button
                key={s._id}
                onClick={() => handleSongSelect(s._id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors ${selectedSongId === s._id ? "bg-accent font-semibold" : ""}`}
              >
                {s.title}
              </button>
            ))}
            {localSongs.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSongSelect(s.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors ${selectedSongId === s.id ? "bg-accent font-semibold" : ""}`}
              >
                {s.title} <span className="text-muted-foreground text-xs">(local)</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
