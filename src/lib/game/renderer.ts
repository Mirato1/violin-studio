import type { GameNote } from "@/types/game";
import { STRING_COLORS, type ViolinString } from "@/types/violin";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HIT_LINE_Y,
  OVERLAY_HEIGHT,
  PROGRESS_BAR_HEIGHT,
  NOTE_RADIUS,
  LANE_COUNT,
  LANE_WIDTH,
} from "./constants";

const STRINGS_ORDER: ViolinString[] = ["G", "D", "A", "E"];

export function drawBackground(ctx: CanvasRenderingContext2D) {
  // Dark background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Lane backgrounds
  for (let i = 0; i < LANE_COUNT; i++) {
    const s = STRINGS_ORDER[i];
    const color = STRING_COLORS[s];
    ctx.fillStyle = color.bg;
    ctx.fillRect(i * LANE_WIDTH, OVERLAY_HEIGHT, LANE_WIDTH, CANVAS_HEIGHT - OVERLAY_HEIGHT - PROGRESS_BAR_HEIGHT);
  }

  // Lane dividers
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < LANE_COUNT; i++) {
    ctx.beginPath();
    ctx.moveTo(i * LANE_WIDTH, OVERLAY_HEIGHT);
    ctx.lineTo(i * LANE_WIDTH, CANVAS_HEIGHT - PROGRESS_BAR_HEIGHT);
    ctx.stroke();
  }

  // Lane labels at top of play area
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < LANE_COUNT; i++) {
    const s = STRINGS_ORDER[i];
    ctx.fillStyle = STRING_COLORS[s].faded;
    ctx.fillText(s, i * LANE_WIDTH + LANE_WIDTH / 2, OVERLAY_HEIGHT + 15);
  }

  // Hit line with glow
  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.5)";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HIT_LINE_Y);
  ctx.lineTo(CANVAS_WIDTH, HIT_LINE_Y);
  ctx.stroke();
  ctx.restore();
}

export function drawNote(
  ctx: CanvasRenderingContext2D,
  note: GameNote,
  showFingers: boolean
) {
  const x = note.lane * LANE_WIDTH + LANE_WIDTH / 2;
  const y = note.y;
  const s = note.string;
  const color = STRING_COLORS[s];

  // Skip if completely off screen
  if (y + note.tailHeight < -NOTE_RADIUS || y > CANVAS_HEIGHT + NOTE_RADIUS) return;

  ctx.save();

  // Determine alpha and colors based on state
  let fillColor: string;
  let alpha = 1;
  if (note.state === "active") {
    fillColor = color.glow;
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = 20;
  } else if (note.state === "passed") {
    fillColor = color.faded;
    alpha = 0.4;
  } else {
    fillColor = color.fill;
  }

  ctx.globalAlpha = alpha;

  // Draw tail (duration trail) - extends upward from the note
  if (note.tailHeight > 0) {
    ctx.fillStyle = fillColor;
    ctx.globalAlpha = alpha * 0.4;
    const tailWidth = NOTE_RADIUS * 1.2;
    ctx.beginPath();
    ctx.roundRect(
      x - tailWidth / 2,
      y - note.tailHeight,
      tailWidth,
      note.tailHeight,
      tailWidth / 2
    );
    ctx.fill();
    ctx.globalAlpha = alpha;
  }

  // Draw note circle
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Draw text (finger number or note name)
  ctx.shadowBlur = 0;
  ctx.fillStyle = note.state === "passed" ? "rgba(255,255,255,0.5)" : "#000";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = showFingers ? String(note.finger) : note.noteName.replace(/\d/, "");
  ctx.fillText(label, x, y);

  ctx.restore();
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  activeNote: GameNote | null
) {
  // Semi-transparent overlay bar
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, OVERLAY_HEIGHT);

  // Bottom border
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, OVERLAY_HEIGHT);
  ctx.lineTo(CANVAS_WIDTH, OVERLAY_HEIGHT);
  ctx.stroke();

  if (activeNote) {
    const color = STRING_COLORS[activeNote.string];

    ctx.font = "bold 16px sans-serif";
    ctx.textBaseline = "middle";
    const y = OVERLAY_HEIGHT / 2;

    // Note name
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(`Note: ${activeNote.noteName}`, CANVAS_WIDTH / 4, y);

    // String
    ctx.fillStyle = color.fill;
    ctx.fillText(`String: ${activeNote.string}`, CANVAS_WIDTH / 2, y);

    // Finger
    ctx.fillStyle = "#fff";
    ctx.fillText(
      `Finger: ${activeNote.finger === 0 ? "Open" : activeNote.finger}`,
      (CANVAS_WIDTH * 3) / 4,
      y
    );
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Press Play to start", CANVAS_WIDTH / 2, OVERLAY_HEIGHT / 2);
  }
}

export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  currentTime: number,
  totalDuration: number
) {
  const barY = CANVAS_HEIGHT - PROGRESS_BAR_HEIGHT;
  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

  // Background
  ctx.fillStyle = "rgba(30,30,30,0.9)";
  ctx.fillRect(0, barY, CANVAS_WIDTH, PROGRESS_BAR_HEIGHT);

  // Top border
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, barY);
  ctx.lineTo(CANVAS_WIDTH, barY);
  ctx.stroke();

  // Filled portion
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(10, barY + 10, CANVAS_WIDTH - 20, 10);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(10, barY + 10, (CANVAS_WIDTH - 20) * Math.min(1, progress), 10);

  // Playhead
  const headX = 10 + (CANVAS_WIDTH - 20) * Math.min(1, progress);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(headX, barY + 15, 5, 0, Math.PI * 2);
  ctx.fill();

  // Time display
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const min = Math.floor(currentTime / 60);
  const sec = Math.floor(currentTime % 60);
  const tMin = Math.floor(totalDuration / 60);
  const tSec = Math.floor(totalDuration % 60);
  ctx.fillText(
    `${min}:${sec.toString().padStart(2, "0")} / ${tMin}:${tSec.toString().padStart(2, "0")}`,
    CANVAS_WIDTH - 15,
    barY + 15
  );
}
