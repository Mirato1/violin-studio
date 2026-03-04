"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { GameNote } from "@/types/game";
import { TWINKLE_TWINKLE } from "@/data/twinkleTwinkle";
import { parseMidi } from "@/lib/midi/parser";
import { mapMidiToViolin, type MappedSong } from "@/lib/midi/mapper";
import { drawBackground, drawNote, drawOverlay, drawProgressBar } from "@/lib/game/renderer";
import { updateNotes } from "@/lib/game/noteTrack";
import { CANVAS_WIDTH, CANVAS_HEIGHT, PROGRESS_BAR_HEIGHT } from "@/lib/game/constants";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useNotation } from "@/contexts/NotationContext";
import GameControls from "./GameControls";
import SongSelector from "./SongSelector";

function deepCloneNotes(notes: GameNote[]): GameNote[] {
  return notes.map((n) => ({ ...n }));
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const currentTimeRef = useRef(0);

  const [status, setStatus] = useState<"idle" | "playing" | "paused">("idle");
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showFingers, setShowFingers] = useState(true);
  const [currentSong, setCurrentSong] = useState<MappedSong | null>(null);
  const [selectedSongId, setSelectedSongId] = useState("twinkle");
  const [error, setError] = useState<string | null>(null);
  const { notation } = useNotation();

  const notesRef = useRef<GameNote[]>([]);
  const songRef = useRef<MappedSong | null>(null);
  const speedRef = useRef(speed);
  const showFingersRef = useRef(showFingers);
  const statusRef = useRef(status);
  const notationRef = useRef(notation);

  const audio = useAudioEngine();

  // Keep refs in sync
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { showFingersRef.current = showFingers; }, [showFingers]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { notationRef.current = notation; }, [notation]);

  // Render loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (statusRef.current === "playing") {
      currentTimeRef.current = audio.getTransportSeconds(speedRef.current);
    }

    const song = songRef.current;
    const notes = notesRef.current;

    const activeNote = updateNotes(notes, currentTimeRef.current, speedRef.current);

    drawBackground(ctx, notationRef.current);
    for (const note of notes) {
      drawNote(ctx, note, showFingersRef.current, notationRef.current);
    }
    drawOverlay(ctx, activeNote, notationRef.current);
    drawProgressBar(ctx, currentTimeRef.current, song?.durationSec ?? 0);

    // Auto-stop at end
    if (
      statusRef.current === "playing" &&
      song &&
      currentTimeRef.current >= song.durationSec + 1
    ) {
      audio.stop();
      setStatus("idle");
      currentTimeRef.current = 0;
    }

    animRef.current = requestAnimationFrame(renderFrame);
  }, [audio]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, [renderFrame]);

  // Load song
  const loadSong = useCallback(
    (song: MappedSong) => {
      audio.stop();
      setStatus("idle");
      currentTimeRef.current = 0;

      const notes = deepCloneNotes(song.notes);
      notesRef.current = notes;
      songRef.current = song;
      setCurrentSong(song);
    },
    [audio]
  );

  // Load demo on mount (only once)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    loadSong(TWINKLE_TWINKLE);
  }, [loadSong]);

  // Play / Pause
  const handlePlayPause = useCallback(async () => {
    if (status === "playing") {
      audio.pause();
      setStatus("paused");
    } else {
      await audio.init();
      if (status === "idle") {
        if (songRef.current) {
          notesRef.current = deepCloneNotes(songRef.current.notes);
          audio.schedule(notesRef.current, speedRef.current);
          currentTimeRef.current = 0;
          audio.seekTo(0, speedRef.current);
        }
      }
      audio.play();
      setStatus("playing");
    }
  }, [status, audio]);

  // Restart
  const handleRestart = useCallback(() => {
    audio.stop();
    currentTimeRef.current = 0;
    if (songRef.current) {
      notesRef.current = deepCloneNotes(songRef.current.notes);
    }
    setStatus("idle");
  }, [audio]);

  // Speed change
  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed);
      if (songRef.current && statusRef.current !== "idle") {
        audio.schedule(notesRef.current, newSpeed);
        audio.seekTo(currentTimeRef.current, newSpeed);
        if (statusRef.current === "playing") {
          audio.play();
        }
      }
    },
    [audio]
  );

  // Volume
  useEffect(() => { audio.setVolume(volume); }, [volume, audio]);
  useEffect(() => { audio.setMuted(isMuted); }, [isMuted, audio]);

  // Canvas click for progress bar
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !songRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (y >= CANVAS_HEIGHT - PROGRESS_BAR_HEIGHT) {
        const progress = Math.max(0, Math.min(1, (x - 10) / (CANVAS_WIDTH - 20)));
        const seekTime = progress * songRef.current.durationSec;
        currentTimeRef.current = seekTime;
        audio.seekTo(seekTime, speedRef.current);
      }
    },
    [audio]
  );

  // MIDI file upload — returns the DB _id if saved successfully
  const handleFileUpload = useCallback(
    async (file: File): Promise<string | undefined> => {
      setError(null);
      try {
        const buffer = await file.arrayBuffer();
        const midi = parseMidi(buffer);
        const name = file.name.replace(/\.(mid|midi)$/i, "");
        const song = mapMidiToViolin(midi, name);

        if (song.notes.length === 0) {
          setError("No playable violin notes found in this MIDI file.");
          return;
        }

        loadSong(song);

        // Save to DB and get the new _id
        try {
          const res = await fetch("/api/songs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: song.title,
              bpm: song.bpm,
              ticksPerBeat: song.ticksPerBeat,
              durationSec: song.durationSec,
              notes: song.notes.map((n) => ({
                midiNumber: n.midiNumber,
                noteName: n.noteName,
                string: n.string,
                finger: n.finger,
                lane: n.lane,
                startTimeSec: n.startTimeSec,
                durationSec: n.durationSec,
                staffPosition: n.staffPosition,
                accidental: n.accidental,
                position: n.position,
              })),
              isBuiltIn: false,
            }),
          });
          if (res.ok) {
            const saved = await res.json();
            const newId = saved._id as string;
            setSelectedSongId(newId);
            return newId;
          }
        } catch {
          // DB save is best-effort
        }
      } catch (err) {
        console.error("MIDI parse error:", err);
        setError(`Failed to parse MIDI file: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    },
    [loadSong]
  );

  // Load saved song
  const handleLoadSavedSong = useCallback(
    async (songId: string) => {
      setError(null);
      setSelectedSongId(songId);
      if (songId === "twinkle") {
        loadSong(TWINKLE_TWINKLE);
        return;
      }
      try {
        const res = await fetch(`/api/songs/${songId}`);
        if (!res.ok) {
          setError(`Failed to load song (status ${res.status})`);
          return;
        }
        const data = await res.json();
        const song: MappedSong = {
          title: data.title,
          bpm: data.bpm,
          ticksPerBeat: data.ticksPerBeat,
          durationSec: data.durationSec,
          notes: data.notes.map((n: Record<string, unknown>, i: number) => ({
            id: `db-${i}`,
            midiNumber: n.midiNumber,
            noteName: n.noteName,
            string: n.string,
            finger: n.finger,
            lane: n.lane,
            startTimeSec: n.startTimeSec,
            durationSec: n.durationSec,
            y: 0,
            tailHeight: 0,
            state: "upcoming" as const,
            staffPosition: n.staffPosition,
            accidental: n.accidental,
            position: n.position,
          })),
        };
        loadSong(song);
      } catch (err) {
        console.error("Song load error:", err);
        setError(`Failed to load song: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    },
    [loadSong]
  );

  return (
    <div className="flex flex-col gap-4">
      <SongSelector
        onFileUpload={handleFileUpload}
        onSelectSong={handleLoadSavedSong}
        selectedSongId={selectedSongId}
      />

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        className="w-full max-w-4xl cursor-pointer rounded-lg border border-border"
      />

      <GameControls
        status={status}
        speed={speed}
        volume={volume}
        isMuted={isMuted}
        showFingers={showFingers}
        onPlayPause={handlePlayPause}
        onRestart={handleRestart}
        onSpeedChange={handleSpeedChange}
        onVolumeChange={setVolume}
        onMuteToggle={() => setIsMuted((m) => !m)}
        onFingersToggle={() => setShowFingers((f) => !f)}
      />
    </div>
  );
}
