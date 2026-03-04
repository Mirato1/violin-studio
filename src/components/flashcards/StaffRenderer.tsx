"use client";

import { useRef, useEffect } from "react";
import type { ViolinNote } from "@/types/violin";
import { STRING_COLORS } from "@/types/violin";

interface StaffRendererProps {
  note: ViolinNote;
  width?: number;
  height?: number;
  showNote?: boolean; // false = blank staff (for guessing)
}

/**
 * Renders a note on a treble clef staff. Larger version for flashcards.
 * staffPosition mapping (same as MiniStaff):
 *   0 = C4 (ledger line below), 2 = E4 (line 1), 4 = G4, 6 = B4, 8 = D5, 10 = F5 (line 5)
 */
export default function StaffRenderer({
  note,
  width = 200,
  height = 180,
  showNote = true,
}: StaffRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const lineSpacing = 18;
    const staffTop = 40;
    const staffLinePositions = [0, 1, 2, 3, 4].map((i) => staffTop + i * lineSpacing);

    // Draw staff lines
    ctx.strokeStyle = "rgba(230,215,180,0.35)";
    ctx.lineWidth = 1.5;
    for (const ly of staffLinePositions) {
      ctx.beginPath();
      ctx.moveTo(30, ly);
      ctx.lineTo(width - 20, ly);
      ctx.stroke();
    }

    // Draw treble clef (simplified text glyph)
    ctx.fillStyle = "rgba(230,215,180,0.5)";
    ctx.font = "60px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u{1D11E}", 50, staffTop + lineSpacing * 2 + 2);

    if (!showNote) return;

    // Note position
    const noteY = staffTop + ((10 - note.staffPosition) * lineSpacing) / 2;
    const noteX = width / 2 + 15;
    const noteRx = 10;
    const noteRy = 7;

    // Ledger lines
    ctx.strokeStyle = "rgba(230,215,180,0.35)";
    ctx.lineWidth = 1.5;
    if (note.staffPosition < 2) {
      for (let pos = 0; pos >= note.staffPosition; pos -= 2) {
        const ly = staffTop + ((10 - pos) * lineSpacing) / 2;
        ctx.beginPath();
        ctx.moveTo(noteX - 18, ly);
        ctx.lineTo(noteX + 18, ly);
        ctx.stroke();
      }
    }
    if (note.staffPosition > 10) {
      for (let pos = 12; pos <= note.staffPosition; pos += 2) {
        const ly = staffTop + ((10 - pos) * lineSpacing) / 2;
        ctx.beginPath();
        ctx.moveTo(noteX - 18, ly);
        ctx.lineTo(noteX + 18, ly);
        ctx.stroke();
      }
    }

    // Accidental
    if (note.accidental === "sharp") {
      ctx.fillStyle = "rgba(230,215,180,0.85)";
      ctx.font = "bold 22px serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("#", noteX - noteRx - 5, noteY);
    } else if (note.accidental === "flat") {
      ctx.fillStyle = "rgba(230,215,180,0.85)";
      ctx.font = "bold 22px serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("b", noteX - noteRx - 5, noteY);
    }

    // Note head
    const color = STRING_COLORS[note.string];
    ctx.fillStyle = color.fill;
    ctx.beginPath();
    ctx.ellipse(noteX, noteY, noteRx, noteRy, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.strokeStyle = color.fill;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (note.staffPosition >= 6) {
      ctx.moveTo(noteX - noteRx + 1, noteY);
      ctx.lineTo(noteX - noteRx + 1, noteY + 45);
    } else {
      ctx.moveTo(noteX + noteRx - 1, noteY);
      ctx.lineTo(noteX + noteRx - 1, noteY - 45);
    }
    ctx.stroke();
  }, [note, width, height, showNote]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block"
    />
  );
}
