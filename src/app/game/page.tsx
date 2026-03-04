"use client";

import GameCanvas from "@/components/game/GameCanvas";

export default function GamePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="gold-text text-3xl font-bold tracking-tight">Play Along</h1>
        <div className="gold-divider mt-2 w-24" />
        <p className="mt-2 text-muted-foreground">
          Follow the falling notes and play along with your violin.
        </p>
      </div>
      <GameCanvas />
    </div>
  );
}
