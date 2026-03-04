"use client";

import { useRef, useEffect } from "react";
import type { ViolinString } from "@/types/violin";
import { STRING_COLORS } from "@/types/violin";
import { VIOLIN_NOTES } from "@/data/violinNotes";
import { useNotation } from "@/contexts/NotationContext";
import { stringToNotation, toNotation } from "@/lib/notation";

interface FingerboardProps {
  selectedString: ViolinString | "all";
}

export default function Fingerboard({ selectedString }: FingerboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { notation } = useNotation();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const isSolfege = notation === "solfege";
    const nutX = isSolfege ? 100 : 80;
    const w = isSolfege ? 640 : 600;
    const h = 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const strings: ViolinString[] = ["G", "D", "A", "E"];
    const stringY: Record<ViolinString, number> = { G: 30, D: 60, A: 90, E: 120 };
    const boardWidth = w - nutX - 40;
    const fingerSpacing = boardWidth / 5; // 5 slots: open + 4 fingers

    // Draw fingerboard background
    ctx.fillStyle = "rgba(60, 40, 20, 0.4)";
    ctx.beginPath();
    ctx.roundRect(nutX - 5, 15, boardWidth + 10, 120, 6);
    ctx.fill();

    // Draw nut
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(nutX - 2, 15, 4, 120);

    // Draw strings
    for (const s of strings) {
      const y = stringY[s];
      const color = STRING_COLORS[s];
      const isActive = selectedString === "all" || selectedString === s;

      ctx.strokeStyle = isActive ? color.fill : "rgba(255,255,255,0.15)";
      ctx.lineWidth = s === "G" ? 3 : s === "D" ? 2.5 : s === "A" ? 2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(nutX, y);
      ctx.lineTo(nutX + boardWidth, y);
      ctx.stroke();

      // String label
      ctx.fillStyle = isActive ? color.fill : "rgba(255,255,255,0.3)";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(stringToNotation(s, notation), nutX - 15, y);
    }

    // Draw finger positions
    const notes = VIOLIN_NOTES.filter(
      (n) => selectedString === "all" || n.string === selectedString
    );

    for (const note of notes) {
      const y = stringY[note.string];
      const x = nutX + note.finger * fingerSpacing + fingerSpacing / 2;
      const color = STRING_COLORS[note.string];

      if (note.finger === 0) {
        // Open string: small circle at nut
        ctx.strokeStyle = color.fill;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(nutX - 8, y, 4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Finger dot
        ctx.fillStyle = color.fill;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Finger number
        ctx.fillStyle = "#000";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(note.finger), x, y);

        // Note name below
        ctx.fillStyle = color.faded;
        ctx.font = isSolfege ? "9px sans-serif" : "10px sans-serif";
        ctx.fillText(toNotation(note.displayName, notation), x, y + 18);
      }
    }
  }, [selectedString, notation]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: notation === "solfege" ? 640 : 600, height: 160 }}
      className="mx-auto block rounded-lg border p-2"
    />
  );
}
