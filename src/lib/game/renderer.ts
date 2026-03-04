import type { GameNote } from "@/types/game";
import { STRING_COLORS, type ViolinString } from "@/types/violin";
import { type NotationMode, toNotation, toNotationFull, stringToNotation } from "@/lib/notation";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HIT_LINE_Y,
  OVERLAY_HEIGHT,
  NOTE_RADIUS,
  LANE_COUNT,
  LANE_WIDTH,
} from "./constants";

const STRINGS_ORDER: ViolinString[] = ["G", "D", "A", "E"];

export function drawBackground(ctx: CanvasRenderingContext2D, notation: NotationMode = "abc") {
  // Dark background
  ctx.fillStyle = "#120e08";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Lane backgrounds with subtle gradient
  for (let i = 0; i < LANE_COUNT; i++) {
    const s = STRINGS_ORDER[i];
    const color = STRING_COLORS[s];
    const laneX = i * LANE_WIDTH;
    const laneTop = OVERLAY_HEIGHT;
    const laneBottom = CANVAS_HEIGHT;

    const grad = ctx.createLinearGradient(laneX, laneTop, laneX, laneBottom);
    grad.addColorStop(0, color.bg);
    grad.addColorStop(0.7, color.bg);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(laneX, laneTop, LANE_WIDTH, laneBottom - laneTop);
  }

  // Lane dividers
  ctx.strokeStyle = "rgba(210,180,120,0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < LANE_COUNT; i++) {
    ctx.beginPath();
    ctx.moveTo(i * LANE_WIDTH, OVERLAY_HEIGHT);
    ctx.lineTo(i * LANE_WIDTH, CANVAS_HEIGHT);
    ctx.stroke();
  }

  // Lane labels at top of play area
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < LANE_COUNT; i++) {
    const s = STRINGS_ORDER[i];
    ctx.fillStyle = STRING_COLORS[s].faded;
    ctx.fillText(stringToNotation(s, notation), i * LANE_WIDTH + LANE_WIDTH / 2, OVERLAY_HEIGHT + 15);
  }

  // Hit line with glow
  ctx.save();
  ctx.shadowColor = "rgba(210,180,120,0.5)";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "rgba(210,180,120,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HIT_LINE_Y);
  ctx.lineTo(CANVAS_WIDTH, HIT_LINE_Y);
  ctx.stroke();
  ctx.restore();

  // Target circles at hit line
  for (let i = 0; i < LANE_COUNT; i++) {
    const cx = i * LANE_WIDTH + LANE_WIDTH / 2;
    const s = STRINGS_ORDER[i];
    const color = STRING_COLORS[s];

    // Outer ring
    ctx.strokeStyle = color.faded;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, HIT_LINE_Y, NOTE_RADIUS + 5, 0, Math.PI * 2);
    ctx.stroke();

    // Inner subtle fill
    ctx.fillStyle = `${color.bg}`;
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
  const x = note.lane * LANE_WIDTH + LANE_WIDTH / 2;
  const y = note.y;
  const s = note.string;
  const color = STRING_COLORS[s];

  // Skip if completely off screen
  // Tail extends upward from y (to y - tailHeight), circle extends down to y + NOTE_RADIUS
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
    const tailWidth = NOTE_RADIUS * 1.2;
    const tailTop = y - note.tailHeight;

    // Gradient tail: opaque near note, transparent at top
    const tailGrad = ctx.createLinearGradient(x, tailTop, x, y);
    tailGrad.addColorStop(0, "rgba(0,0,0,0)");
    tailGrad.addColorStop(0.3, fillColor);
    tailGrad.addColorStop(1, fillColor);

    ctx.fillStyle = tailGrad;
    ctx.globalAlpha = alpha * 0.4;
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
    // Text shadow for legibility
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = showFingers ? String(note.finger) : toNotation(note.noteName.replace(/\d/, ""), notation);
    ctx.fillText(label, x + 0.5, y + 0.5);
    ctx.fillStyle = "#f5e6c8";
    ctx.fillText(label, x, y);
  } else {
    ctx.fillStyle = "rgba(230,215,180,0.4)";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = showFingers ? String(note.finger) : toNotation(note.noteName.replace(/\d/, ""), notation);
    ctx.fillText(label, x, y);
  }

  ctx.restore();
}

/** Draw mini staff notation for the active note */
function drawStaffNotation(ctx: CanvasRenderingContext2D, note: GameNote) {
  const staffLeft = 15;
  const staffRight = 260;
  const lineSpacing = 10;
  const staffTop = 30;
  const staffLines = [0, 1, 2, 3, 4].map((i) => staffTop + i * lineSpacing);

  // Staff lines
  ctx.strokeStyle = "rgba(230,215,180,0.3)";
  ctx.lineWidth = 1;
  for (const ly of staffLines) {
    ctx.beginPath();
    ctx.moveTo(staffLeft, ly);
    ctx.lineTo(staffRight, ly);
    ctx.stroke();
  }

  // Treble clef glyph
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "38px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\u{1D11E}", staffLeft + 25, staffTop + lineSpacing * 2 + 1);

  // Note position on staff
  const staffPosition = note.staffPosition ?? 0;
  // staffPosition mapping: C4=0 is one ledger line below the staff
  // Line 1 (bottom) = E4 = staffPosition 2
  // noteY = staffTop + (4 * lineSpacing) - ((staffPosition - 2) * lineSpacing / 2)
  //       = bottom line - (staffPosition - 2) * half a line spacing
  const noteY = staffTop + 4 * lineSpacing - ((staffPosition - 2) * lineSpacing) / 2;
  const noteX = (staffLeft + staffRight) / 2 + 20;
  const noteRx = 8;
  const noteRy = 5.5;

  // Ledger lines below staff (staffPosition < 2, i.e. below E4)
  ctx.strokeStyle = "rgba(230,215,180,0.3)";
  ctx.lineWidth = 1;
  if (staffPosition < 2) {
    for (let pos = 0; pos >= staffPosition; pos -= 2) {
      const ly = staffTop + 4 * lineSpacing - ((pos - 2) * lineSpacing) / 2;
      ctx.beginPath();
      ctx.moveTo(noteX - 14, ly);
      ctx.lineTo(noteX + 14, ly);
      ctx.stroke();
    }
  }
  // Ledger lines above staff (staffPosition > 10, i.e. above F5)
  if (staffPosition > 10) {
    for (let pos = 12; pos <= staffPosition; pos += 2) {
      const ly = staffTop + 4 * lineSpacing - ((pos - 2) * lineSpacing) / 2;
      ctx.beginPath();
      ctx.moveTo(noteX - 14, ly);
      ctx.lineTo(noteX + 14, ly);
      ctx.stroke();
    }
  }

  // Accidental
  if (note.accidental === "sharp") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 16px serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("#", noteX - noteRx - 4, noteY);
  } else if (note.accidental === "flat") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 16px serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("b", noteX - noteRx - 4, noteY);
  }

  // Note head (colored ellipse)
  const color = STRING_COLORS[note.string];
  ctx.fillStyle = color.fill;
  ctx.beginPath();
  ctx.ellipse(noteX, noteY, noteRx, noteRy, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Stem
  ctx.strokeStyle = color.fill;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (staffPosition >= 6) {
    // Stem down
    ctx.moveTo(noteX - noteRx + 1, noteY);
    ctx.lineTo(noteX - noteRx + 1, noteY + 30);
  } else {
    // Stem up
    ctx.moveTo(noteX + noteRx - 1, noteY);
    ctx.lineTo(noteX + noteRx - 1, noteY - 30);
  }
  ctx.stroke();
}

const OPEN_MIDI: Record<string, number> = { G: 55, D: 62, A: 69, E: 76 };
const MAX_SEMITONES = 14; // covers up to ~7th position

/** Draw a horizontal fingerboard diagram showing the finger placement */
function drawFingerboard(ctx: CanvasRenderingContext2D, note: GameNote, notation: NotationMode) {
  const fbLeft = 540;
  const fbTop = 12;
  const fbWidth = 330;
  const fbHeight = 76;
  const fbRight = fbLeft + fbWidth;
  const fbBottom = fbTop + fbHeight;
  const nutWidth = 4;
  const playableLeft = fbLeft + nutWidth + 8;
  const playableRight = fbRight - 8;
  const playableWidth = playableRight - playableLeft;

  // String Y positions (G=top to E=bottom)
  const stringPad = 12;
  const stringSpacing = (fbHeight - 2 * stringPad) / 3;
  const stringYs = STRINGS_ORDER.map((_, i) => fbTop + stringPad + i * stringSpacing);

  ctx.save();

  // Fingerboard background
  ctx.fillStyle = "rgba(50, 38, 18, 0.6)";
  ctx.beginPath();
  ctx.roundRect(fbLeft, fbTop, fbWidth, fbHeight, 5);
  ctx.fill();

  // Nut
  ctx.fillStyle = "rgba(200, 185, 150, 0.5)";
  ctx.beginPath();
  ctx.roundRect(fbLeft + 2, fbTop + 4, nutWidth, fbHeight - 8, 1);
  ctx.fill();

  // Semi-tone markers (subtle vertical lines)
  ctx.strokeStyle = "rgba(200, 185, 150, 0.06)";
  ctx.lineWidth = 1;
  for (let s = 1; s <= MAX_SEMITONES; s++) {
    const x = playableLeft + (s / MAX_SEMITONES) * playableWidth;
    ctx.beginPath();
    ctx.moveTo(x, fbTop + 6);
    ctx.lineTo(x, fbBottom - 6);
    ctx.stroke();
  }

  // Strings (horizontal lines with varying thickness)
  for (let i = 0; i < 4; i++) {
    const sy = stringYs[i];
    const s = STRINGS_ORDER[i];
    const color = STRING_COLORS[s];
    const thickness = [2.5, 2, 1.5, 1][i];

    ctx.strokeStyle = color.faded;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(fbLeft + nutWidth + 2, sy);
    ctx.lineTo(fbRight - 4, sy);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // String labels (left of nut)
  ctx.font = "bold 9px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 4; i++) {
    const s = STRINGS_ORDER[i];
    ctx.fillStyle = STRING_COLORS[s].faded;
    ctx.fillText(stringToNotation(s, notation), fbLeft - 5, stringYs[i]);
  }

  // Finger placement
  const semiAbove = Math.max(0, note.midiNumber - OPEN_MIDI[note.string]);
  const strIdx = STRINGS_ORDER.indexOf(note.string as ViolinString);

  if (strIdx >= 0) {
    const dotY = stringYs[strIdx];
    const color = STRING_COLORS[note.string as ViolinString];

    if (semiAbove === 0) {
      // Open string — highlight at nut
      ctx.fillStyle = color.fill;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(fbLeft + nutWidth / 2 + 2, dotY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#f5e6c8";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("O", fbLeft + nutWidth / 2 + 2, dotY);
    } else {
      const clampedSemi = Math.min(semiAbove, MAX_SEMITONES);
      const dotX = playableLeft + (clampedSemi / MAX_SEMITONES) * playableWidth;

      // Glow
      ctx.shadowColor = color.glow;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color.fill;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      // Border
      ctx.strokeStyle = "rgba(230,215,180,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
      ctx.stroke();

      // Finger number
      ctx.fillStyle = "#f5e6c8";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(note.finger), dotX, dotY);
    }
  }

  // Position label below fingerboard
  const pos = note.position ?? 1;
  const posNames: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th" };
  const posLabel = posNames[pos] ?? `${pos}th`;
  ctx.fillStyle = pos > 1 ? "rgba(230,215,180,0.6)" : "rgba(230,215,180,0.3)";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${posLabel} pos`, fbLeft + fbWidth / 2, fbBottom + 3);

  ctx.restore();
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  activeNote: GameNote | null,
  notation: NotationMode = "abc"
) {
  // Semi-transparent overlay bar
  const overlayGrad = ctx.createLinearGradient(0, 0, 0, OVERLAY_HEIGHT);
  overlayGrad.addColorStop(0, "rgba(18,14,8,0.95)");
  overlayGrad.addColorStop(1, "rgba(18,14,8,0.85)");
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, OVERLAY_HEIGHT);

  // Bottom border
  ctx.strokeStyle = "rgba(210,180,120,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, OVERLAY_HEIGHT);
  ctx.lineTo(CANVAS_WIDTH, OVERLAY_HEIGHT);
  ctx.stroke();

  if (activeNote) {
    // Left side: mini staff notation
    ctx.save();
    drawStaffNotation(ctx, activeNote);
    ctx.restore();

    // Vertical separator
    ctx.strokeStyle = "rgba(210,180,120,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(280, 10);
    ctx.lineTo(280, OVERLAY_HEIGHT - 10);
    ctx.stroke();

    // Right side: text info
    const color = STRING_COLORS[activeNote.string];
    const infoX = 290;

    // Note name (large)
    ctx.fillStyle = color.fill;
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(toNotationFull(activeNote.noteName, notation), infoX, 38);

    // Second row: String, Finger, Position
    ctx.font = "14px sans-serif";
    ctx.textBaseline = "middle";
    const row2Y = 72;

    // String badge
    ctx.fillStyle = color.fill;
    ctx.fillText(`${stringToNotation(activeNote.string, notation)} String`, infoX, row2Y);

    // Finger
    const fingerText = activeNote.finger === 0 ? "Open" : `Finger ${activeNote.finger}`;
    ctx.fillStyle = "rgba(230,215,180,0.7)";
    ctx.fillText(`\u00B7  ${fingerText}`, infoX + 85, row2Y);

    // Separator before fingerboard
    ctx.strokeStyle = "rgba(210,180,120,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(525, 10);
    ctx.lineTo(525, OVERLAY_HEIGHT - 10);
    ctx.stroke();

    // Fingerboard diagram
    ctx.save();
    drawFingerboard(ctx, activeNote, notation);
    ctx.restore();
  } else {
    // Empty state
    ctx.fillStyle = "rgba(230,215,180,0.3)";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Press Play to start", CANVAS_WIDTH / 2, OVERLAY_HEIGHT / 2);
  }
}

