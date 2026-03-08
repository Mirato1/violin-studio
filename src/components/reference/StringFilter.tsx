"use client";

import type { ViolinString } from "@/types/violin";
import { VIOLIN_STRINGS, STRING_COLORS } from "@/types/violin";
import { cn } from "@/lib/utils";
import { useNotation } from "@/contexts/NotationContext";
import { stringToNotation } from "@/lib/notation";

interface StringFilterProps {
  selected: ViolinString | "all";
  onSelect: (s: ViolinString | "all") => void;
}

export default function StringFilter({ selected, onSelect }: StringFilterProps) {
  const { notation } = useNotation();

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect("all")}
        className={cn(
          "rounded-md border px-3 py-1.5 text-sm font-semibold transition-all",
          selected === "all"
            ? "border-gold/40 bg-primary text-primary-foreground gold-glow"
            : "border-transparent bg-secondary text-secondary-foreground hover:border-gold/20 hover:bg-accent"
        )}
      >
        All
      </button>
      {VIOLIN_STRINGS.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-semibold transition-all",
            selected === s
              ? "border-current/30 text-white"
              : "border-transparent bg-secondary text-secondary-foreground hover:border-gold/20 hover:bg-accent"
          )}
          style={selected === s ? { backgroundColor: STRING_COLORS[s].fill } : undefined}
        >
          {stringToNotation(s, notation)} String
        </button>
      ))}
    </div>
  );
}
