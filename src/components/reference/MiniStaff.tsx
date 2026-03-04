"use client";

import { useRef, useEffect } from "react";
import type { ViolinNote } from "@/types/violin";
import { STRING_COLORS } from "@/types/violin";

interface MiniStaffProps {
  note: ViolinNote;
  width?: number;
  height?: number;
}

/**
 * Renders a single note on a treble clef staff using Canvas 2D.
 *
 * Staff layout (staffPosition mapping):
 *   staffPosition 0  = C4 (ledger line below staff)
 *   staffPosition 2  = E4 (bottom line = line 1)
 *   staffPosition 4  = G4 (line 2)
 *   staffPosition 6  = B4 (line 3)
 *   staffPosition 8  = D5 (line 4)
 *   staffPosition 10 = F5 (line 5, top line)
 *
 * Each staffPosition unit = half a staff space.
 * Lines are at even positions: 2,4,6,8,10
 * Spaces are at odd positions: 3,5,7,9
 */
export default function MiniStaff({ note, width = 80, height = 90 }: MiniStaffProps) {
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

    // Staff parameters
    const lineSpacing = 10;
    const staffTop = 20; // y of top staff line (line 5, staffPosition 10)
    const staffLinePositions = [0, 1, 2, 3, 4].map((i) => staffTop + i * lineSpacing);
    // line 0 = top line (F5, pos 10), line 4 = bottom line (E4, pos 2)

    // Draw staff lines
    ctx.strokeStyle = "rgba(230,215,180,0.3)";
    ctx.lineWidth = 1;
    for (const ly of staffLinePositions) {
      ctx.beginPath();
      ctx.moveTo(10, ly);
      ctx.lineTo(width - 10, ly);
      ctx.stroke();
    }

    // Calculate note Y position
    // staffPosition 10 (F5) = staffTop, staffPosition 2 (E4) = staffTop + 4*lineSpacing
    // Each staffPosition unit = lineSpacing / 2 pixels downward from top
    const noteY = staffTop + ((10 - note.staffPosition) * lineSpacing) / 2;
    const noteX = width / 2 + 5;
    const noteRx = 6;
    const noteRy = 4.5;

    // Draw ledger lines if needed
    ctx.strokeStyle = "rgba(230,215,180,0.3)";
    ctx.lineWidth = 1;
    // Below staff (staffPosition < 2): ledger lines at pos 0, -2, etc.
    if (note.staffPosition < 2) {
      for (let pos = 0; pos >= note.staffPosition; pos -= 2) {
        const ly = staffTop + ((10 - pos) * lineSpacing) / 2;
        ctx.beginPath();
        ctx.moveTo(noteX - 12, ly);
        ctx.lineTo(noteX + 12, ly);
        ctx.stroke();
      }
    }
    // Above staff (staffPosition > 10): ledger lines at pos 12, 14, etc.
    if (note.staffPosition > 10) {
      for (let pos = 12; pos <= note.staffPosition; pos += 2) {
        const ly = staffTop + ((10 - pos) * lineSpacing) / 2;
        ctx.beginPath();
        ctx.moveTo(noteX - 12, ly);
        ctx.lineTo(noteX + 12, ly);
        ctx.stroke();
      }
    }

    // Draw accidental
    if (note.accidental === "sharp") {
      ctx.fillStyle = "rgba(230,215,180,0.8)";
      ctx.font = "bold 14px serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("#", noteX - noteRx - 3, noteY);
    } else if (note.accidental === "flat") {
      ctx.fillStyle = "rgba(230,215,180,0.8)";
      ctx.font = "bold 14px serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("b", noteX - noteRx - 3, noteY);
    }

    // Draw note head (filled ellipse)
    const color = STRING_COLORS[note.string];
    ctx.fillStyle = color.fill;
    ctx.beginPath();
    ctx.ellipse(noteX, noteY, noteRx, noteRy, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Draw stem
    ctx.strokeStyle = color.fill;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (note.staffPosition >= 6) {
      // Stem goes down (on the left)
      ctx.moveTo(noteX - noteRx + 1, noteY);
      ctx.lineTo(noteX - noteRx + 1, noteY + 28);
    } else {
      // Stem goes up (on the right)
      ctx.moveTo(noteX + noteRx - 1, noteY);
      ctx.lineTo(noteX + noteRx - 1, noteY - 28);
    }
    ctx.stroke();
  }, [note, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block"
    />
  );
}
