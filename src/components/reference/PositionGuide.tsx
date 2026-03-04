"use client";

import { VIOLIN_STRINGS, STRING_COLORS } from "@/types/violin";
import { useNotation } from "@/contexts/NotationContext";
import { toNotation, stringToNotation } from "@/lib/notation";
import {
  type PositionNumber,
  POSITION_INFO,
  getFinger1Note,
} from "@/lib/positions";

interface PositionGuideProps {
  position: PositionNumber;
}

function HandDiagram() {
  return (
    <svg viewBox="0 0 100 120" className="h-28 w-auto" aria-label="Hand finger diagram">
      {/* Fingers */}
      <rect x="8" y="18" width="14" height="40" rx="7" className="fill-muted-foreground/20" />
      <rect x="27" y="8" width="14" height="48" rx="7" className="fill-muted-foreground/20" />
      <rect x="46" y="12" width="14" height="44" rx="7" className="fill-muted-foreground/20" />
      <rect x="65" y="22" width="14" height="36" rx="7" className="fill-muted-foreground/20" />

      {/* Palm */}
      <rect x="4" y="52" width="78" height="38" rx="12" className="fill-muted-foreground/15" />

      {/* Thumb (behind neck - shown as outline on left) */}
      <ellipse cx="0" cy="68" rx="10" ry="14" className="fill-muted-foreground/10 stroke-muted-foreground/20" strokeWidth="1" />
      <text x="0" y="72" textAnchor="middle" className="fill-muted-foreground/50" fontSize="7" fontWeight="500">
        P
      </text>

      {/* Finger numbers */}
      <circle cx="15" cy="34" r="8" className="fill-primary/80" />
      <text x="15" y="38" textAnchor="middle" className="fill-primary-foreground" fontSize="10" fontWeight="bold">
        1
      </text>

      <circle cx="34" cy="28" r="8" className="fill-primary/80" />
      <text x="34" y="32" textAnchor="middle" className="fill-primary-foreground" fontSize="10" fontWeight="bold">
        2
      </text>

      <circle cx="53" cy="30" r="8" className="fill-primary/80" />
      <text x="53" y="34" textAnchor="middle" className="fill-primary-foreground" fontSize="10" fontWeight="bold">
        3
      </text>

      <circle cx="72" cy="36" r="8" className="fill-primary/80" />
      <text x="72" y="40" textAnchor="middle" className="fill-primary-foreground" fontSize="10" fontWeight="bold">
        4
      </text>

      {/* Labels */}
      <text x="15" y="102" textAnchor="middle" className="fill-muted-foreground" fontSize="6">
        Index
      </text>
      <text x="34" y="102" textAnchor="middle" className="fill-muted-foreground" fontSize="6">
        Middle
      </text>
      <text x="53" y="102" textAnchor="middle" className="fill-muted-foreground" fontSize="6">
        Ring
      </text>
      <text x="72" y="102" textAnchor="middle" className="fill-muted-foreground" fontSize="6">
        Pinky
      </text>

      {/* Wrist line */}
      <line x1="10" y1="92" x2="76" y2="92" className="stroke-muted-foreground/15" strokeWidth="1" />
    </svg>
  );
}

export default function PositionGuide({ position }: PositionGuideProps) {
  const info = POSITION_INFO[position];
  const { notation } = useNotation();

  return (
    <div className="flex flex-wrap items-start gap-5 rounded-lg border border-gold/15 bg-card/50 px-5 py-4">
      {/* Hand diagram */}
      <div className="shrink-0">
        <HandDiagram />
      </div>

      {/* Position info */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground">{info.label}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{info.description}</p>
          <p className="mt-1 text-xs italic text-muted-foreground/70">{info.shift}</p>
        </div>

        {/* Where finger 1 goes on each string */}
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            Finger 1 plays:
          </div>
          <div className="flex flex-wrap gap-2">
            {VIOLIN_STRINGS.map((s) => {
              const noteName = getFinger1Note(s, position);
              const color = STRING_COLORS[s];
              return (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium"
                  style={{ borderColor: `${color.fill}40`, color: color.fill }}
                >
                  <span className="opacity-60">{stringToNotation(s, notation)}:</span>
                  <span className="font-bold">{toNotation(noteName, notation)}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
