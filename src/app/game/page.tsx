"use client";

import GameCanvas from "@/components/game/GameCanvas";

export default function GamePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Guitar Hero Mode</h1>
        <p className="text-muted-foreground">
          Notes fall toward the hit line — play along with your violin.
        </p>
      </div>
      <GameCanvas />
    </div>
  );
}
