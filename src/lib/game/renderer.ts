import type { GameNote } from "@/types/game";
import { STRING_COLORS, type ViolinString } from "@/types/violin";
import { type NotationMode, toNotation, toNotationFull, stringToNotation } from "@/lib/notation";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HIT_LINE_Y,
  LEFT_PANEL_WIDTH,
  NOTE_RADIUS,
  LANE_COUNT,
  LANE_WIDTH,
} from "./constants";

const STRINGS_ORDER: ViolinString[] = ["G", "D", "A", "E"];

export function drawBackground(ctx: CanvasRenderingContext2D, notation: NotationMode = "abc") {
  // Full dark background
  ctx.fillStyle = "#120e08";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Left panel background (slightly different shade)
  ctx.fillStyle = "rgba(12, 10, 6, 0.95)";
  ctx.fillRect(0, 0, LEFT_PANEL_WIDTH, CANVAS_HEIGHT);

  // Lane backgrounds with subtle gradient
  for (let i = 0; i < LANE_COUNT; i++) {
    const s = STRINGS_ORDER[i];
    const color = STRING_COLORS[s];
    const laneX = LEFT_PANEL_WIDTH + i * LANE_WIDTH;

    const grad = ctx.createLinearGradient(laneX, 0, laneX, CANVAS_HEIGHT);
    grad.addColorStop(0, color.bg);
    grad.addColorStop(0.7, color.bg);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(laneX, 0, LANE_WIDTH, CANVAS_HEIGHT);
  }

  // Lane dividers
  ctx.strokeStyle = "rgba(210,180,120,0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = LEFT_PANEL_WIDTH + i * LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }

  // Separator between left panel and lanes
  const sepGrad = ctx.createLinearGradient(LEFT_PANEL_WIDTH, 0, LEFT_PANEL_WIDTH, CANVAS_HEIGHT);
  sepGrad.addColorStop(0, "rgba(210,180,120,0)");
  sepGrad.addColorStop(0.15, "rgba(210,180,120,0.15)");
  sepGrad.addColorStop(0.85, "rgba(210,180,120,0.15)");
  sepGrad.addColorStop(1, "rgba(210,180,120,0)");
  ctx.strokeStyle = sepGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(LEFT_PANEL_WIDTH, 0);
  ctx.lineTo(LEFT_PANEL_WIDTH, CANVAS_HEIGHT);
  ctx.stroke();

  // Lane labels at top of play area
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < LANE_COUNT; i++) {
    const s = STRINGS_ORDER[i];
    ctx.fillStyle = STRING_COLORS[s].faded;
    ctx.fillText(stringToNotation(s, notation), LEFT_PANEL_WIDTH + i * LANE_WIDTH + LANE_WIDTH / 2, 18);
  }

  // Hit line with glow (only across lanes)
  ctx.save();
  ctx.shadowColor = "rgba(210,180,120,0.5)";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "rgba(210,180,120,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LEFT_PANEL_WIDTH, HIT_LINE_Y);
  ctx.lineTo(CANVAS_WIDTH, HIT_LINE_Y);
  ctx.stroke();
  ctx.restore();

  // Target circles at hit line
  for (let i = 0; i < LANE_COUNT; i++) {
    const cx = LEFT_PANEL_WIDTH + i * LANE_WIDTH + LANE_WIDTH / 2;
    const s = STRINGS_ORDER[i];
    const color = STRING_COLORS[s];

    // Outer ring
    ctx.strokeStyle = color.faded;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, HIT_LINE_Y, NOTE_RADIUS + 5, 0, Math.PI * 2);
    ctx.stroke();

    // Inner subtle fill
    ctx.fillStyle = color.bg;
    ctx.beginPath();
    ctx.arc(cx, HIT_LINE_Y, NOTE_RADIUS + 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawNote(
  ctx: CanvasRenderingContext2D,
  note: GameNote,
  showFingers: boolean,
  notation: NotationMode = "abc"
) {
  const x = LEFT_PANEL_WIDTH + note.lane * LANE_WIDTH + LANE_WIDTH / 2;
  const y = note.y;
  const s = note.string;
  const color = STRING_COLORS[s];

  // Skip if completely off screen
  if (y + NOTE_RADIUS < 0 || y - note.tailHeight > CANVAS_HEIGHT + NOTE_RADIUS) return;

  ctx.save();

  // Determine alpha and colors based on state
  let fillColor: string;
  let alpha = 1;
  if (note.state === "active") {
    fillColor = color.glow;
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = 25;
  } else if (note.state === "passed") {
    fillColor = color.faded;
    alpha = 0.35;
  } else {
    fillColor = color.fill;
    ctx.shadowColor = color.fill;
    ctx.shadowBlur = 8;
  }

  ctx.globalAlpha = alpha;

  // Draw tail (duration trail) - extends upward from the note
  if (note.tailHeight > 0) {
    const tailWidth = NOTE_RADIUS * 0.9;
    const tailTop = y - note.tailHeight;

    const tailGrad = ctx.createLinearGradient(x, tailTop, x, y);
    tailGrad.addColorStop(0, "rgba(0,0,0,0)");
    tailGrad.addColorStop(0.3, fillColor);
    tailGrad.addColorStop(1, fillColor);

    ctx.fillStyle = tailGrad;
    ctx.globalAlpha = alpha * 0.3;
    ctx.beginPath();
    ctx.roundRect(
      x - tailWidth / 2,
      tailTop,
      tailWidth,
      note.tailHeight,
      tailWidth / 2
    );
    ctx.fill();
    ctx.globalAlpha = alpha;
  }

  // Draw note circle with radial gradient
  const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, NOTE_RADIUS);
  grad.addColorStop(0, note.state === "active" ? "#f5e6c8" : color.glow);
  grad.addColorStop(0.4, fillColor);
  grad.addColorStop(1, note.state === "passed" ? color.faded : color.fill);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = note.state === "active" ? "rgba(230,215,180,0.6)" : note.state === "upcoming" ? "rgba(230,215,180,0.3)" : "rgba(230,215,180,0.15)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // Draw text (finger number or note name)
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  if (note.state !== "passed") {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = showFingers ? String(note.finger) : toNotation(note.noteName.replace(/\d/, ""), notation);
    ctx.fillText(label, x + 0.5, y + 0.5);
    ctx.fillStyle = "#f5e6c8";
    ctx.fillText(label, x, y);
  } else {
    ctx.fillStyle = "rgba(230,215,180,0.4)";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = showFingers ? String(note.finger) : toNotation(note.noteName.replace(/\d/, ""), notation);
    ctx.fillText(label, x, y);
  }

  // Position badge for non-1st position notes
  if (note.state !== "passed" && (note.position ?? 1) > 1) {
    const bx = x + NOTE_RADIUS * 0.65;
    const by = y - NOTE_RADIUS * 0.65;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(230,215,180,0.9)";
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1208";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(note.position), bx, by);
  }

  ctx.restore();
}

/* ─── Left Panel: Note info + Vertical Fingerboard ─── */

const OPEN_MIDI: Record<string, number> = { G: 55, D: 62, A: 69, E: 76 };
const MAX_SEMITONES = 14;
const POS_NAMES: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th" };

/** Draw a vertical fingerboard diagram inside the left panel */
function drawVerticalFingerboard(ctx: CanvasRenderingContext2D, note: GameNote, notation: NotationMode) {
  const fbLeft = 30;
  const fbTop = 140;
  const fbWidth = 180;
  const fbHeight = 510;
  const fbRight = fbLeft + fbWidth;
  const fbBottom = fbTop + fbHeight;
  const nutHeight = 6;
  const playableTop = fbTop + nutHeight + 10;
  const playableBottom = fbBottom - 10;
  const playableHeight = playableBottom - playableTop;

  // String X positions (G=left to E=right)
  const stringPad = 24;
  const stringSpacing = (fbWidth - 2 * stringPad) / 3;
  const stringXs = STRINGS_ORDER.map((_, i) => fbLeft + stringPad + i * stringSpacing);

  ctx.save();

  // Fingerboard background
  ctx.fillStyle = "rgba(50, 38, 18, 0.6)";
  ctx.beginPath();
  ctx.roundRect(fbLeft, fbTop, fbWidth, fbHeight, 8);
  ctx.fill();

  // Nut (horizontal bar at top)
  ctx.fillStyle = "rgba(200, 185, 150, 0.5)";
  ctx.beginPath();
  ctx.roundRect(fbLeft + 6, fbTop + 2, fbWidth - 12, nutHeight, 2);
  ctx.fill();

  // Position zone backgrounds (subtle horizontal bands)
  const zones = [
    { startSemi: 0, endSemi: 4.5 },   // 1st position
    { startSemi: 4.5, endSemi: 8.5 },  // 3rd position
    { startSemi: 8.5, endSemi: 12.5 }, // 5th position
  ];
  for (let i = 0; i < zones.length; i++) {
    if (i % 2 !== 0) continue;
    const y1 = playableTop + (zones[i].startSemi / MAX_SEMITONES) * playableHeight;
    const y2 = playableTop + (zones[i].endSemi / MAX_SEMITONES) * playableHeight;
    ctx.fillStyle = "rgba(230, 215, 180, 0.03)";
    ctx.fillRect(fbLeft + 4, y1, fbWidth - 8, y2 - y1);
  }

  // Semitone markers (horizontal lines)
  ctx.strokeStyle = "rgba(200, 185, 150, 0.06)";
  ctx.lineWidth = 1;
  for (let s = 1; s <= MAX_SEMITONES; s++) {
    const y = playableTop + (s / MAX_SEMITONES) * playableHeight;
    ctx.beginPath();
    ctx.moveTo(fbLeft + 8, y);
    ctx.lineTo(fbRight - 8, y);
    ctx.stroke();
  }

  // Strings (vertical lines with varying thickness)
  for (let i = 0; i < 4; i++) {
    const sx = stringXs[i];
    const s = STRINGS_ORDER[i];
    const color = STRING_COLORS[s];
    const thickness = [3, 2.5, 1.8, 1.2][i];

    ctx.strokeStyle = color.faded;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(sx, fbTop + nutHeight + 2);
    ctx.lineTo(sx, fbBottom - 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // String labels (above nut)
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  for (let i = 0; i < 4; i++) {
    const s = STRINGS_ORDER[i];
    ctx.fillStyle = STRING_COLORS[s].faded;
    ctx.fillText(stringToNotation(s, notation), stringXs[i], fbTop - 8);
  }

  // Finger placement
  const semiAbove = Math.max(0, note.midiNumber - OPEN_MIDI[note.string]);
  const strIdx = STRINGS_ORDER.indexOf(note.string as ViolinString);

  if (strIdx >= 0) {
    const dotX = stringXs[strIdx];
    const color = STRING_COLORS[note.string as ViolinString];

    if (semiAbove === 0) {
      // Open string — highlight at nut
      ctx.fillStyle = color.fill;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(dotX, fbTop + nutHeight / 2 + 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#f5e6c8";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("O", dotX, fbTop + nutHeight / 2 + 2);
    } else {
      const clampedSemi = Math.min(semiAbove, MAX_SEMITONES);
      const dotY = playableTop + (clampedSemi / MAX_SEMITONES) * playableHeight;

      // Glow
      ctx.shadowColor = color.glow;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color.fill;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      // Border
      ctx.strokeStyle = "rgba(230,215,180,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Finger number
      ctx.fillStyle = "#f5e6c8";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(note.finger), dotX, dotY);
    }
  }

  // Position label below fingerboard
  const pos = note.position ?? 1;
  const posLabel = POS_NAMES[pos] ?? `${pos}th`;
  ctx.fillStyle = pos > 1 ? "rgba(230,215,180,0.6)" : "rgba(230,215,180,0.3)";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${posLabel} pos`, fbLeft + fbWidth / 2, fbBottom + 8);

  ctx.restore();
}

export function drawLeftPanel(
  ctx: CanvasRenderingContext2D,
  activeNote: GameNote | null,
  hintNote: GameNote | null,
  notation: NotationMode = "abc"
) {
  const displayNote = activeNote ?? hintNote;

  if (displayNote) {
    const isHint = activeNote === null;
    const color = STRING_COLORS[displayNote.string];
    const cx = LEFT_PANEL_WIDTH / 2;

    ctx.save();
    if (isHint) ctx.globalAlpha = 0.45;

    // Note name (large, centered)
    ctx.fillStyle = color.fill;
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(toNotationFull(displayNote.noteName, notation), cx, 35);

    // String + Finger
    const fingerText = displayNote.finger === 0 ? "Open" : `Finger ${displayNote.finger}`;
    ctx.font = "14px sans-serif";
    ctx.fillStyle = color.fill;
    ctx.fillText(
      `${stringToNotation(displayNote.string, notation)} String`,
      cx, 65
    );
    ctx.fillStyle = "rgba(230,215,180,0.7)";
    ctx.fillText(`\u00B7  ${fingerText}`, cx, 82);

    // Position
    const pos = displayNote.position ?? 1;
    const posLabel = POS_NAMES[pos] ?? `${pos}th`;
    ctx.fillStyle = pos > 1 ? "rgba(230,215,180,0.6)" : "rgba(230,215,180,0.35)";
    ctx.font = "12px sans-serif";
    ctx.fillText(`${posLabel} pos`, cx, 99);

    // Vertical fingerboard
    drawVerticalFingerboard(ctx, displayNote, notation);

    ctx.restore();
  } else {
    // Empty state
    ctx.fillStyle = "rgba(230,215,180,0.3)";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Press Play", LEFT_PANEL_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
    ctx.fillText("to start", LEFT_PANEL_WIDTH / 2, CANVAS_HEIGHT / 2 + 12);
  }
}
