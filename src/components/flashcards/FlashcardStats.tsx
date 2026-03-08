"use client";

import { Card } from "@/components/ui/card";
import { Target, Trophy, Clock, Percent } from "lucide-react";

interface FlashcardStatsProps {
  total: number;
  mastered: number;
  due: number;
  accuracy: number;
}

const stats = [
  { key: "total", icon: Target, color: "" },
  { key: "mastered", icon: Trophy, color: "text-green-500" },
  { key: "due", icon: Clock, color: "text-amber-500" },
  { key: "accuracy", icon: Percent, color: "gold-text" },
] as const;

export default function FlashcardStats({
  total,
  mastered,
  due,
  accuracy,
}: FlashcardStatsProps) {
  const values = { total, mastered, due, accuracy };
  const labels = { total: "Total", mastered: "Mastered", due: "Due", accuracy: "Accuracy" };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.key} className="flex flex-row items-center gap-3 p-4">
          <s.icon size={18} strokeWidth={1.5} className="shrink-0 text-muted-foreground/50" />
          <div>
            <div className={`text-2xl font-bold ${s.color}`}>
              {values[s.key]}{s.key === "accuracy" ? "%" : ""}
            </div>
            <div className="text-xs font-semibold text-muted-foreground">{labels[s.key]}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
