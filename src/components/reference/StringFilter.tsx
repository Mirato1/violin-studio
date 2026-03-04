"use client";

import type { ViolinString } from "@/types/violin";
import { VIOLIN_STRINGS, STRING_COLORS } from "@/types/violin";
import { cn } from "@/lib/utils";

interface StringFilterProps {
  selected: ViolinString | "all";
  onSelect: (s: ViolinString | "all") => void;
}

export default function StringFilter({ selected, onSelect }: StringFilterProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onSelect("all")}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          selected === "all"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-accent"
        )}
      >
        All
      </button>
      {VIOLIN_STRINGS.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            selected === s
              ? "text-white"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          )}
          style={selected === s ? { backgroundColor: STRING_COLORS[s].fill } : undefined}
        >
          {s} String
        </button>
      ))}
    </div>
  );
}
