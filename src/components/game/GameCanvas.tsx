"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { GameNote } from "@/types/game";
import { TWINKLE_TWINKLE } from "@/data/twinkleTwinkle";
import { findNoteByMidi } from "@/data/violinNotes";
import { parseMidi } from "@/lib/midi/parser";
import type { MidiFile } from "@/lib/midi/types";
import { mapMidiToViolin, getTrackInfo, type MappedSong, type TrackInfo } from "@/lib/midi/mapper";
import { drawBackground, drawNote, drawLeftPanel, drawEdgeFades } from "@/lib/game/renderer";
import { saveLocalSong, loadLocalSong, deleteLocalSong } from "@/lib/localSongs";
import { updateNotes } from "@/lib/game/noteTrack";
import { CANVAS_WIDTH, CANVAS_HEIGHT, NOTE_RADIUS } from "@/lib/game/constants";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useNotation } from "@/contexts/NotationContext";
import GameControls from "./GameControls";
import SongSelector from "./SongSelector";
import ScoreView from "./ScoreView";
import ProgressBar from "./ProgressBar";

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
  const [availableTracks, setAvailableTracks] = useState<TrackInfo[]>([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"play" | "score">("play");
  const [error, setError] = useState<string | null>(null);
  const { notation } = useNotation();

  const notesRef = useRef<GameNote[]>([]);
  const songRef = useRef<MappedSong | null>(null);
  const parsedMidiRef = useRef<MidiFile | null>(null);
  const midiTitleRef = useRef("");
  const speedRef = useRef(speed);
  const showFingersRef = useRef(showFingers);
  const statusRef = useRef(status);
  const notationRef = useRef(notation);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const viewModeRef = useRef(viewMode);

  const audio = useAudioEngine();

  // Keep refs in sync
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { showFingersRef.current = showFingers; }, [showFingers]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { notationRef.current = notation; }, [notation]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);

  // Render loop
  const renderFrame = useCallback(() => {
    if (statusRef.current === "playing") {
      currentTimeRef.current = audio.getTransportSeconds(speedRef.current);
    }

    const song = songRef.current;

    // Only draw canvas when in play mode
    if (viewModeRef.current === "play") {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const notes = notesRef.current;
          const activeNote = updateNotes(notes, currentTimeRef.current, speedRef.current);
          const hintNote = notes.find(n => n.state === "upcoming") ?? null;

          // Clip each note's tail so it doesn't visually merge into the next note in the same lane
          for (let i = 0; i < notes.length; i++) {
            if (notes[i].tailHeight <= 0) continue;
            for (let j = i + 1; j < notes.length; j++) {
              if (notes[j].lane === notes[i].lane) {
                const maxTail = notes[i].y - notes[j].y - NOTE_RADIUS;
                notes[i].tailHeight = Math.min(notes[i].tailHeight, Math.max(0, maxTail));
                break;
              }
            }
          }

          drawBackground(ctx, notationRef.current);
          for (const note of notes) {
            drawNote(ctx, note, showFingersRef.current, notationRef.current);
          }
          drawEdgeFades(ctx);
          drawLeftPanel(ctx, activeNote, hintNote, notationRef.current);
        }
      }
    }

    // Auto-stop at end (runs in both modes)
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
      // Apply current volume/mute after init (effect may have fired before engine existed)
      audio.setVolume(volumeRef.current);
      audio.setMuted(isMutedRef.current);
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

  // Global spacebar → play/pause (ignores when focused on inputs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      e.preventDefault();
      handlePlayPause();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePlayPause]);

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

  // Seek from progress bar
  const handleSeek = useCallback(
    (time: number) => {
      currentTimeRef.current = time;
      audio.seekTo(time, speedRef.current);
    },
    [audio]
  );

  // MIDI file upload — saves all tracks with notes, returns the best-track _id
  const handleFileUpload = useCallback(
    async (file: File): Promise<string | undefined> => {
      setError(null);
      try {
        const buffer = await file.arrayBuffer();
        const midi = parseMidi(buffer);
        const name = file.name.replace(/\.(mid|midi)$/i, "");

        parsedMidiRef.current = midi;
        midiTitleRef.current = name;
        const tracks = getTrackInfo(midi);
        setAvailableTracks(tracks);
        const bestTrack = tracks.find((t) => t.isBestGuess);
        const bestIdx = bestTrack ? bestTrack.index : 0;
        setSelectedTrackIndex(bestIdx);

        // Filter tracks that have playable notes
        const tracksWithNotes = tracks.filter((t) => mapMidiToViolin(midi, name, t.index).notes.length > 0);

        if (tracksWithNotes.length === 0) {
          setError("No playable violin notes found in this MIDI file.");
          return;
        }

        // Load the best track immediately for playback
        const bestSong = mapMidiToViolin(midi, name, bestIdx);
        loadSong(bestSong);

        // Save each track as a separate song entry
        const noteFields = (s: typeof bestSong) =>
          s.notes.map((n) => ({
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
          }));

        const saveOne = async (trackIdx: number, trackName: string): Promise<string | undefined> => {
          const s = mapMidiToViolin(midi, name, trackIdx);
          if (s.notes.length === 0) return undefined;
          const title = tracksWithNotes.length > 1
            ? `${name} — ${trackName}`
            : name;
          try {
            const res = await fetch("/api/songs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title, bpm: s.bpm, ticksPerBeat: s.ticksPerBeat,
                durationSec: s.durationSec, notes: noteFields(s), isBuiltIn: false,
              }),
            });
            if (res.ok) return (await res.json())._id as string;
          } catch { /* DB unavailable */ }
          return saveLocalSong({ ...s, title });
        };

        const ids = await Promise.all(
          tracksWithNotes.map((t) => saveOne(t.index, t.name || `Track ${t.index + 1}`))
        );

        const bestTrackInList = tracksWithNotes.findIndex((t) => t.index === bestIdx);
        const bestId = ids[bestTrackInList >= 0 ? bestTrackInList : 0];
        if (bestId) setSelectedSongId(bestId);
        return bestId;
      } catch (err) {
        console.error("MIDI parse error:", err);
        setError(`Failed to parse MIDI file: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    },
    [loadSong]
  );

  // Delete song
  const handleDeleteSong = useCallback(
    async (songId: string) => {
      if (songId.startsWith("local-")) {
        deleteLocalSong(songId);
      } else {
        try {
          await fetch(`/api/songs/${songId}`, { method: "DELETE" });
        } catch {
          // best-effort
        }
      }
      if (selectedSongId === songId) {
        setSelectedSongId("twinkle");
        loadSong(TWINKLE_TWINKLE);
        setAvailableTracks([]);
        setSelectedTrackIndex(null);
        parsedMidiRef.current = null;
      }
    },
    [selectedSongId, loadSong]
  );

  // Track change (re-map same MIDI with different track)
  const handleTrackChange = useCallback(
    (trackIndex: number) => {
      if (!parsedMidiRef.current) return;
      setSelectedTrackIndex(trackIndex);
      const song = mapMidiToViolin(parsedMidiRef.current, midiTitleRef.current, trackIndex);
      if (song.notes.length === 0) {
        setError("No playable violin notes in this track.");
        return;
      }
      setError(null);
      loadSong(song);
    },
    [loadSong]
  );

  // Load saved song
  const handleLoadSavedSong = useCallback(
    async (songId: string) => {
      setError(null);
      setSelectedSongId(songId);
      // Clear track selector for non-MIDI songs
      setAvailableTracks([]);
      setSelectedTrackIndex(null);
      parsedMidiRef.current = null;
      if (songId === "twinkle") {
        loadSong(TWINKLE_TWINKLE);
        return;
      }
      if (songId.startsWith("local-")) {
        const localSong = loadLocalSong(songId);
        if (localSong) {
          loadSong(localSong);
        } else {
          setError("Local song not found.");
        }
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
          notes: data.notes.map((n: Record<string, unknown>, i: number) => {
            const STRING_TO_LANE: Record<string, number> = { G: 0, D: 1, A: 2, E: 3 };
            // Old DB records lack position — fully re-derive from violinNotes
            const needsRecovery = n.position == null || n.staffPosition == null;
            const vNote = needsRecovery
              ? findNoteByMidi(Number(n.midiNumber))
              : undefined;
            return {
              id: `db-${i}`,
              midiNumber: n.midiNumber,
              noteName: vNote?.name ?? n.noteName,
              string: vNote?.string ?? n.string,
              finger: vNote?.finger ?? n.finger,
              lane: vNote ? STRING_TO_LANE[vNote.string] : (n.lane as number),
              startTimeSec: n.startTimeSec,
              durationSec: n.durationSec,
              y: 0,
              tailHeight: 0,
              state: "upcoming" as const,
              staffPosition: vNote?.staffPosition ?? (n.staffPosition as number) ?? 0,
              accidental: vNote?.accidental ?? (n.accidental as "sharp" | "flat" | undefined),
              position: vNote?.position ?? (n.position != null ? Number(n.position) : undefined),
            };
          }),
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
    <div className="flex flex-col overflow-hidden p-2 gap-2" style={{ height: "calc(100vh - 58px)" }}>
      {error && (
        <div className="shrink-0 px-4 py-1 text-sm text-destructive bg-destructive/10 border-b border-destructive/30">
          {error}
        </div>
      )}

      {/* Canvas / score area */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {viewMode === "play" ? (
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block"
            style={{ height: "100%", width: "auto", maxWidth: "100%" }}
          />
        ) : (
          currentSong && (
            <ScoreView
              song={currentSong}
              getCurrentTime={() => currentTimeRef.current}
              status={status}
            />
          )
        )}
      </div>

      {/* Unified bottom bar: controls | progress | song selector */}
      <div className="shrink-0 flex items-center gap-3 border-t border-border bg-card/50 px-3 py-2">
        <GameControls
          status={status}
          speed={speed}
          volume={volume}
          isMuted={isMuted}
          showFingers={showFingers}
          viewMode={viewMode}
          onPlayPause={handlePlayPause}
          onRestart={handleRestart}
          onSpeedChange={handleSpeedChange}
          onVolumeChange={setVolume}
          onMuteToggle={() => setIsMuted((m) => !m)}
          onFingersToggle={() => setShowFingers((f) => !f)}
          onViewModeToggle={() => setViewMode((m) => m === "play" ? "score" : "play")}
        />
        <div className="h-5 border-l border-border" />
        <ProgressBar
          getCurrentTime={() => currentTimeRef.current}
          totalDuration={songRef.current?.durationSec ?? 0}
          onSeek={handleSeek}
          status={status}
        />
        <div className="h-5 border-l border-border" />
        <SongSelector
          onFileUpload={handleFileUpload}
          onSelectSong={handleLoadSavedSong}
          onDeleteSong={handleDeleteSong}
          onTrackChange={handleTrackChange}
          selectedSongId={selectedSongId}
          availableTracks={availableTracks}
          selectedTrackIndex={selectedTrackIndex}
        />
      </div>
    </div>
  );
}
