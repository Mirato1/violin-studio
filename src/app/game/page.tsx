"use client";

import GameCanvas from "@/components/game/GameCanvas";

export default function GamePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="gold-text text-2xl font-bold tracking-tight">Play Along</h1>
        <div className="gold-divider mt-1.5 w-20" />
      </div>
      <GameCanvas />
    </div>
  );
}
