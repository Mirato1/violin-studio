"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface ProgressBarProps {
  getCurrentTime: () => number;
  totalDuration: number;
  onSeek: (time: number) => void;
  status: "idle" | "playing" | "paused";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ProgressBar({ getCurrentTime, totalDuration, onSeek, status }: ProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const draggingRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);

  // Animation loop to update progress display
  useEffect(() => {
    const tick = () => {
      if (!draggingRef.current) {
        const t = Math.max(0, getCurrentTime());
        setDisplayTime(t);
        setProgress(totalDuration > 0 ? Math.min(1, t / totalDuration) : 0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getCurrentTime, totalDuration]);

  const calcTimeFromEvent = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || totalDuration <= 0) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * totalDuration;
    },
    [totalDuration]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const time = calcTimeFromEvent(e.clientX);
      onSeek(time);
    },
    [calcTimeFromEvent, onSeek]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      draggingRef.current = true;
      const time = calcTimeFromEvent(e.clientX);
      setDisplayTime(time);
      setProgress(totalDuration > 0 ? time / totalDuration : 0);

      const handleMove = (ev: MouseEvent) => {
        const t = calcTimeFromEvent(ev.clientX);
        setDisplayTime(t);
        setProgress(totalDuration > 0 ? t / totalDuration : 0);
      };

      const handleUp = (ev: MouseEvent) => {
        draggingRef.current = false;
        const t = calcTimeFromEvent(ev.clientX);
        onSeek(t);
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [calcTimeFromEvent, onSeek, totalDuration]
  );

  const pct = `${(progress * 100).toFixed(2)}%`;

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <span className="w-10 text-right font-mono text-xs text-muted-foreground">
        {formatTime(displayTime)}
      </span>

      <div
        ref={trackRef}
        className="relative flex-1 cursor-pointer py-2"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      >
        {/* Track background */}
        <div className="h-1.5 rounded-full bg-muted" />

        {/* Filled portion */}
        <div
          className="absolute top-2 left-0 h-1.5 rounded-full"
          style={{
            width: pct,
            background: "linear-gradient(90deg, oklch(0.50 0.10 80), oklch(0.78 0.16 85))",
          }}
        />

        {/* Playhead */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-3.5 rounded-full"
          style={{
            left: pct,
            background: "oklch(0.78 0.16 85)",
            boxShadow: "0 0 8px oklch(0.78 0.16 85 / 0.5), 0 0 2px oklch(0.78 0.16 85 / 0.3)",
          }}
        />
      </div>

      <span className="w-10 font-mono text-xs text-muted-foreground">
        {formatTime(totalDuration)}
      </span>
    </div>
  );
}
