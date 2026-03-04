"use client";

import GameCanvas from "@/components/game/GameCanvas";

export default function GamePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="gold-text text-3xl font-bold tracking-tight">Guitar Hero Mode</h1>
        <div className="gold-divider mt-2 w-24" />
        <p className="mt-2 text-muted-foreground">
          Notes fall toward the hit line — play along with your violin.
        </p>
      </div>
      <GameCanvas />
    </div>
  );
}
