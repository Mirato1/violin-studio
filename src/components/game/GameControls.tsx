"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { SPEED_OPTIONS } from "@/types/game";

interface GameControlsProps {
  status: "idle" | "playing" | "paused";
  speed: number;
  volume: number;
  isMuted: boolean;
  showFingers: boolean;
  viewMode: "play" | "score";
  onPlayPause: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
  onVolumeChange: (vol: number) => void;
  onMuteToggle: () => void;
  onFingersToggle: () => void;
  onViewModeToggle: () => void;
}

export default function GameControls({
  status,
  speed,
  volume,
  isMuted,
  showFingers,
  viewMode,
  onPlayPause,
  onRestart,
  onSpeedChange,
  onVolumeChange,
  onMuteToggle,
  onFingersToggle,
  onViewModeToggle,
}: GameControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-2.5">
      {/* Playback */}
      <div className="flex items-center gap-2">
        <Button onClick={onPlayPause} variant="default" size="sm">
          {status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Play"}
        </Button>
        <Button onClick={onRestart} variant="outline" size="sm">
          Restart
        </Button>
      </div>

      <div className="h-6 border-l border-border" />

      {/* Speed */}
      <div className="flex items-center gap-1">
        <span className="mr-1 text-xs text-muted-foreground">Speed:</span>
        {SPEED_OPTIONS.map((s) => (
          <Button
            key={s}
            variant={speed === s ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onSpeedChange(s)}
          >
            {s}x
          </Button>
        ))}
      </div>

      <div className="h-6 border-l border-border" />

      {/* Volume */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMuteToggle}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Toggle mute"
        >
          {isMuted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}
        </button>
        <Slider
          value={[volume]}
          onValueChange={([v]) => onVolumeChange(v)}
          min={0}
          max={1}
          step={0.05}
          className="w-24"
          disabled={isMuted}
        />
      </div>

      <div className="h-6 border-l border-border" />

      {/* Display toggle */}
      <Toggle
        pressed={showFingers}
        onPressedChange={onFingersToggle}
        size="sm"
        aria-label="Toggle finger numbers vs note names"
      >
        {showFingers ? "Fingers" : "Notes"}
      </Toggle>

      <div className="h-6 border-l border-border" />

      {/* View mode toggle */}
      <Toggle
        pressed={viewMode === "score"}
        onPressedChange={onViewModeToggle}
        size="sm"
        aria-label="Toggle between falling notes and sheet music"
      >
        {viewMode === "score" ? "Score" : "Play Along"}
      </Toggle>
    </div>
  );
}
