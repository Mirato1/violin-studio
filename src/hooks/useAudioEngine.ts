"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import * as Tone from "tone";
import type { GameNote } from "@/types/game";
import {
  createViolinSynth,
  disposeViolinSynth,
  type ViolinSynthEngine,
} from "@/lib/audio/violinSynth";
import { scheduleNotes } from "@/lib/audio/audioScheduler";

export function useAudioEngine() {
  const engineRef = useRef<ViolinSynthEngine | null>(null);
  const initializedRef = useRef(false);

  const init = useCallback(async () => {
    if (initializedRef.current) return;
    await Tone.start();
    engineRef.current = await createViolinSynth();
    initializedRef.current = true;
  }, []);

  const schedule = useCallback((notes: GameNote[], speed: number) => {
    if (!engineRef.current) return;
    scheduleNotes(engineRef.current.synth, notes, speed);
  }, []);

  const play = useCallback(() => {
    Tone.getTransport().start();
  }, []);

  const pause = useCallback(() => {
    Tone.getTransport().pause();
  }, []);

  const stop = useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
  }, []);

  const seekTo = useCallback((timeSec: number, speed: number) => {
    Tone.getTransport().seconds = timeSec / speed;
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (!engineRef.current) return;
    // vol: 0-1, convert to dB (-Infinity to 0)
    engineRef.current.volume.volume.value = vol === 0 ? -Infinity : Tone.gainToDb(vol);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    if (!engineRef.current) return;
    engineRef.current.volume.mute = muted;
  }, []);

  const getTransportSeconds = useCallback((speed: number) => {
    return Tone.getTransport().seconds * speed;
  }, []);

  useEffect(() => {
    return () => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      if (engineRef.current) {
        disposeViolinSynth(engineRef.current);
        engineRef.current = null;
      }
    };
  }, []);

  // IMPORTANT: useMemo so the returned object is referentially stable.
  // Without this, every render creates a new object, which cascades into
  // useCallback/useEffect deps and causes re-runs (e.g. reloading Twinkle).
  return useMemo(
    () => ({
      init,
      schedule,
      play,
      pause,
      stop,
      seekTo,
      setVolume,
      setMuted,
      getTransportSeconds,
    }),
    [init, schedule, play, pause, stop, seekTo, setVolume, setMuted, getTransportSeconds]
  );
}
