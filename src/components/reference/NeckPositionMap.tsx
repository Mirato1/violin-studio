"use client";

import { VIOLIN_STRINGS, STRING_COLORS } from "@/types/violin";
import { useNotation } from "@/contexts/NotationContext";
import { toNotation, stringToNotation } from "@/lib/notation";
import {
  type PositionNumber,
  getPositionNotes,
} from "@/lib/positions";

interface NeckPositionMapProps {
  selectedPosition: PositionNumber;
}

/**
 * Proportional positions on a real violin neck (string length ~328mm).
 * Each position zone spans from where low finger 1 sits to where high finger 4 sits.
 * Values normalized to 0–1 range (0 = nut, 1 = ~halfway to bridge).
 */
const POSITIONS: {
  pos: PositionNumber;
  label: string;
  start: number;
  end: number;
}[] = [
  { pos: 1, label: "1st", start: 0.03, end: 0.28 },
  { pos: 2, label: "2nd", start: 0.12, end: 0.38 },
  { pos: 3, label: "3rd", start: 0.16, end: 0.42 },
  { pos: 4, label: "4th", start: 0.24, end: 0.50 },
];

/** Y positions for strings: E at top (38), G at bottom (92) — matches real violin viewed from above */
const STRING_Y: Record<string, number> = { E: 38, A: 56, D: 74, G: 92 };
const STRING_THICKNESS: Record<string, number> = { G: 2.2, D: 1.8, A: 1.4, E: 1.0 };

export default function NeckPositionMap({ selectedPosition }: NeckPositionMapProps) {
  const { notation } = useNotation();

  const svgW = 520;
  const svgH = 130;
  const nutX = 60;
  const neckEndX = 490;
  const neckLen = neckEndX - nutX;

  const selectedZone = POSITIONS.find((p) => p.pos === selectedPosition)!;
  const zoneX = nutX + selectedZone.start * neckLen;
  const zoneW = (selectedZone.end - selectedZone.start) * neckLen;

  return (
    <div className="overflow-x-auto rounded-lg border border-gold/20">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="h-auto w-full min-w-[480px]"
        aria-label="Violin neck position map"
      >
        <defs>
          <linearGradient id="neck-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(30,30%,12%)" />
            <stop offset="100%" stopColor="hsl(30,20%,8%)" />
          </linearGradient>
          <filter id="pos-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Fingerboard background */}
        <rect
          x={nutX - 2}
          y={26}
          width={neckLen + 4}
          height={78}
          rx={4}
          fill="url(#neck-wood)"
        />

        {/* Position zones */}
        {POSITIONS.map((p) => {
          const x = nutX + p.start * neckLen;
          const w = (p.end - p.start) * neckLen;
          const isSelected = p.pos === selectedPosition;

          return (
            <g key={p.pos}>
              <rect
                x={x}
                y={28}
                width={w}
                height={74}
                rx={3}
                fill={isSelected ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.02)"}
                stroke={isSelected ? "rgba(245,158,11,0.4)" : "rgba(245,158,11,0.08)"}
                strokeWidth={isSelected ? 1.5 : 0.5}
                filter={isSelected ? "url(#pos-glow)" : undefined}
              />
              <text
                x={x + w / 2}
                y={22}
                textAnchor="middle"
                fontSize={isSelected ? 10 : 8}
                fontWeight={isSelected ? "bold" : "normal"}
                fill={isSelected ? "rgba(245,158,11,0.9)" : "rgba(245,158,11,0.3)"}
              >
                {p.label}
              </text>
            </g>
          );
        })}

        {/* Nut */}
        <rect
          x={nutX - 3}
          y={27}
          width={4}
          height={76}
          rx={1}
          fill="rgba(245,222,179,0.35)"
        />

        {/* String labels + string lines */}
        {VIOLIN_STRINGS.map((s) => {
          const y = STRING_Y[s];
          return (
            <g key={s}>
              <text
                x={nutX - 12}
                y={y + 4}
                textAnchor="middle"
                fontSize={10}
                fontWeight="bold"
                fill={STRING_COLORS[s].fill}
              >
                {stringToNotation(s, notation)}
              </text>
              <line
                x1={nutX}
                y1={y}
                x2={neckEndX}
                y2={y}
                stroke={STRING_COLORS[s].fill}
                strokeWidth={STRING_THICKNESS[s]}
                opacity={0.2}
              />
            </g>
          );
        })}

        {/* "toward bridge" indicator */}
        <text
          x={neckEndX + 8}
          y={68}
          fontSize={7}
          fill="rgba(245,158,11,0.25)"
        >
          → bridge
        </text>

        {/* All 7 note dots per string for the SELECTED position */}
        {VIOLIN_STRINGS.map((s) => {
          const notes = getPositionNotes(s, selectedPosition);
          const y = STRING_Y[s];
          const color = STRING_COLORS[s];

          return notes.map((note, ni) => {
            // 7 notes spaced evenly across the zone (indices 0–6)
            const cx = zoneX + ((ni + 0.5) / 7) * zoneW;

            return (
              <g key={`${s}-${ni}`}>
                <circle
                  cx={cx}
                  cy={y}
                  r={7}
                  fill={color.fill}
                  opacity={0.85}
                />
                <text
                  x={cx}
                  y={y + 3}
                  textAnchor="middle"
                  fontSize={6}
                  fontWeight="bold"
                  fill="#000"
                >
                  {toNotation(note.displayName, notation)}
                </text>
              </g>
            );
          });
        })}

        {/* Finger numbers below the G string (bottom) */}
        {(() => {
          const gNotes = getPositionNotes("G", selectedPosition);
          const bottomY = STRING_Y["G"];
          return gNotes.map((note, ni) => {
            const cx = zoneX + ((ni + 0.5) / 7) * zoneW;
            return (
              <text
                key={`fn-${ni}`}
                x={cx}
                y={bottomY + 16}
                textAnchor="middle"
                fontSize={7}
                fontWeight="bold"
                fill="rgba(245,158,11,0.5)"
              >
                {note.finger}
              </text>
            );
          });
        })()}
      </svg>
    </div>
  );
}
