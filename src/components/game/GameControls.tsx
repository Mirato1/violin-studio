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
  onPlayPause: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
  onVolumeChange: (vol: number) => void;
  onMuteToggle: () => void;
  onFingersToggle: () => void;
}

export default function GameControls({
  status,
  speed,
  volume,
  isMuted,
  showFingers,
  onPlayPause,
  onRestart,
  onSpeedChange,
  onVolumeChange,
  onMuteToggle,
  onFingersToggle,
}: GameControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Play / Pause */}
      <Button onClick={onPlayPause} variant="default" size="sm">
        {status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Play"}
      </Button>

      <Button onClick={onRestart} variant="outline" size="sm">
        Restart
      </Button>

      {/* Speed */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Speed:</span>
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

      {/* Volume */}
      <div className="flex items-center gap-2">
        <Toggle
          pressed={isMuted}
          onPressedChange={onMuteToggle}
          size="sm"
          aria-label="Toggle mute"
        >
          {isMuted ? "Muted" : "Audio"}
        </Toggle>
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

      {/* Fingers / Notes toggle */}
      <Toggle
        pressed={showFingers}
        onPressedChange={onFingersToggle}
        size="sm"
        aria-label="Toggle finger numbers vs note names"
      >
        {showFingers ? "Fingers" : "Notes"}
      </Toggle>
    </div>
  );
}
