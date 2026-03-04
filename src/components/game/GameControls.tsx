"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { SPEED_OPTIONS } from "@/types/game";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Hand,
} from "lucide-react";

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
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Playback */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onPlayPause} variant="default" size="icon-sm">
                {status === "playing" ? <Pause className="size-4" /> : <Play className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Play"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onRestart} variant="ghost" size="icon-sm">
                <RotateCcw className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Restart</TooltipContent>
          </Tooltip>
        </div>

        <div className="h-6 border-l border-border" />

        {/* Speed */}
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-muted-foreground">Speed</span>
          {SPEED_OPTIONS.map((s) => (
            <Button
              key={s}
              variant={speed === s ? "default" : "ghost"}
              size="xs"
              onClick={() => onSpeedChange(s)}
            >
              {s}x
            </Button>
          ))}
        </div>

        <div className="h-6 border-l border-border" />

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onMuteToggle} variant="ghost" size="icon-sm">
                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{isMuted ? "Unmute" : "Mute"}</TooltipContent>
          </Tooltip>
          <Slider
            value={[volume]}
            onValueChange={([v]) => onVolumeChange(v)}
            min={0}
            max={1}
            step={0.05}
            className="w-20"
            disabled={isMuted}
          />
        </div>

        <div className="h-6 border-l border-border" />

        {/* Display toggles */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onFingersToggle}
                variant={showFingers ? "default" : "ghost"}
                size="icon-sm"
              >
                <Hand className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {showFingers ? "Fingers on (click for note names)" : "Note names on (click for fingers)"}
            </TooltipContent>
          </Tooltip>

        </div>
      </div>
    </TooltipProvider>
  );
}
