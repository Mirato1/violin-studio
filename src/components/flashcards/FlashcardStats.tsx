"use client";

import { Card } from "@/components/ui/card";

interface FlashcardStatsProps {
  total: number;
  mastered: number;
  due: number;
  accuracy: number;
}

export default function FlashcardStats({
  total,
  mastered,
  due,
  accuracy,
}: FlashcardStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <Card className="p-3 text-center">
        <div className="text-2xl font-bold">{total}</div>
        <div className="text-xs text-muted-foreground">Total</div>
      </Card>
      <Card className="p-3 text-center">
        <div className="text-2xl font-bold text-green-500">{mastered}</div>
        <div className="text-xs text-muted-foreground">Mastered</div>
      </Card>
      <Card className="p-3 text-center">
        <div className="text-2xl font-bold text-amber-500">{due}</div>
        <div className="text-xs text-muted-foreground">Due</div>
      </Card>
      <Card className="p-3 text-center">
        <div className="text-2xl font-bold">{accuracy}%</div>
        <div className="text-xs text-muted-foreground">Accuracy</div>
      </Card>
    </div>
  );
}
