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
  ECHO_ZONE,
} from "./constants";

const STRINGS_ORDER: ViolinString[] = ["G", "D", "A", "E"];

/** Open-string MIDI numbers for detecting low/high finger variants */
const OPEN_STRING_MIDI: Record<string, number> = { G: 55, D: 62, A: 69, E: 76 };
const POS_BASE: Record<number, number> = { 1: 2, 2: 4, 3: 5, 4: 7 };

/**
 * Detect if a note is a "low" finger variant (half step below normal position).
 * For fingers 1,2,4 there are two placements: "low" and "high".
 * Low variants are: finger1 at base-1, finger2 at base+1, finger4 at base+4.
 */
function isLowFingerVariant(note: GameNote): boolean {
  if (note.finger === 0 || note.finger === 3) return false;
  const open = OPEN_STRING_MIDI[note.string];
  if (open == null) return false;
  const semiAbove = note.midiNumber - open;
  const pos = note.position ?? 1;
  const base = POS_BASE[pos] ?? 2;
  // Low deltas from base for each finger
  if (note.finger === 1) return semiAbove === base - 1;
  if (note.finger === 2) return semiAbove === base + 1;
  if (note.finger === 4) return semiAbove === base + 4;
  return false;
}

const POSITION_COLORS: Record<number, string> = {
  1: "rgba(220,180,60,1)",
  2: "rgba(100,220,220,1)",
  3: "rgba(255,160,60,1)",
  4: "rgba(180,120,255,1)",
  5: "rgba(255,80,80,1)",
  6: "rgba(255,100,200,1)",
  7: "rgba(160,220,60,1)",
};

export function drawBackground(ctx: CanvasRenderingContext2D, notation: NotationMode = "abc") {
  // Full dark background
  ctx.fillStyle = "#120e08";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Left panel background (slightly different shade)
  ctx.fillStyle = "rgba(12, 10, 6, 0.95)";
  ctx.fillRect(0, 0, LEFT_PANEL_WIDTH, CANVAS_HEIGHT);

  // Lane backgrounds with subtle gradient
  ctx.globalAlpha = 0.8;
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
  ctx.globalAlpha = 1;

  // Lane dividers — more visible
  ctx.strokeStyle = "rgba(210,180,120,0.18)";
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
  ctx.shadowColor = "rgba(210,180,120,0.6)";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "rgba(210,180,120,0.55)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(LEFT_PANEL_WIDTH, HIT_LINE_Y);
  ctx.lineTo(CANVAS_WIDTH, HIT_LINE_Y);
  ctx.stroke();
  ctx.restore();

}

const POS_LINE_LABELS: Record<number, string> = { 1: "1st", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th" };

/** Draw dashed horizontal lines where position changes occur between notes.
 *  Only tracks position changes among E string notes so that G/D/A notes
 *  (always 1st position) don't cause repeated labels.
 *  Also draws a persistent "current position" badge near the hit line.
 */
export function drawPositionLines(
  ctx: CanvasRenderingContext2D,
  notes: GameNote[],
) {
  const FADE_TOP = 60;
  const FADE_FULL = HIT_LINE_Y - 120;

  // Find the initial E string position
  let prevEPos = 1;
  for (const n of notes) {
    if (n.string === "E") { prevEPos = n.position ?? 1; break; }
  }

  // Determine current position (nearest E string note at or below hit line)
  let currentPos = prevEPos;
  for (const n of notes) {
    if (n.string !== "E") continue;
    if (n.y <= HIT_LINE_Y + 40) { currentPos = n.position ?? 1; break; }
  }

  // Draw position change lines — only when E string position actually changes
  for (let i = 1; i < notes.length; i++) {
    const note = notes[i];
    if (note.string !== "E") continue; // skip non-E notes entirely

    const pos = note.position ?? 1;
    if (pos === prevEPos) { prevEPos = pos; continue; }

    // E string position changed — draw indicator at this note's y
    const y = note.y;
    prevEPos = pos;

    // Only draw if visible in play zone
    if (y < 10 || y > HIT_LINE_Y + 10) continue;

    // Fade opacity like notes do
    const alpha = y <= FADE_TOP ? 0.2
      : y >= FADE_FULL ? 0.6
      : 0.2 + 0.4 * ((y - FADE_TOP) / (FADE_FULL - FADE_TOP));

    const color = POSITION_COLORS[pos] ?? "rgba(200,200,200,0.85)";

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(LEFT_PANEL_WIDTH, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label badge on the right edge
    const label = POS_LINE_LABELS[pos] ?? `${pos}th`;
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const labelW = ctx.measureText(label).width;
    const pillW = labelW + 14;
    const pillH = 22;
    const pillX = CANVAS_WIDTH - pillW - 8;
    const pillY = y - pillH / 2;
    ctx.fillStyle = "rgba(15,10,5,0.75)";
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 4);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(label, CANVAS_WIDTH - 15, y);
    ctx.restore();
  }

  // Persistent current-position badge (always visible near the hit line, right side)
  if (currentPos > 1) {
    const color = POSITION_COLORS[currentPos] ?? "rgba(200,200,200,0.85)";
    const label = POS_LINE_LABELS[currentPos] ?? `${currentPos}th`;
    const badgeY = HIT_LINE_Y + 28;

    ctx.save();
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const labelW = ctx.measureText(label + " pos").width;
    const pillW = labelW + 16;
    const pillH = 24;
    const pillX = CANVAS_WIDTH - pillW - 8;
    const pillY = badgeY - pillH / 2;

    ctx.fillStyle = "rgba(15,10,5,0.85)";
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 5);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 5);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillText(label + " pos", CANVAS_WIDTH - 16, badgeY);
    ctx.restore();
  }
}

export function drawNote(
  ctx: CanvasRenderingContext2D,
  note: GameNote,
  showFingers: boolean,
  notation: NotationMode = "abc",
  scale: number = 1
) {
  const x = LEFT_PANEL_WIDTH + note.lane * LANE_WIDTH + LANE_WIDTH / 2;
  const y = note.y;
  const s = note.string;
  const color = STRING_COLORS[s];

  // Skip if completely off screen
  if (y + NOTE_RADIUS < 0 || y - note.tailHeight > CANVAS_HEIGHT + NOTE_RADIUS) return;

  // Opacity fade: distant notes are faint, become fully opaque near the hit line
  let noteAlpha = 1.0;
  if (note.state === "upcoming") {
    const FADE_TOP = 60;
    const FADE_FULL = HIT_LINE_Y - 120;
    noteAlpha = y <= FADE_TOP ? 0.35
              : y >= FADE_FULL ? 1.0
              : 0.35 + 0.65 * ((y - FADE_TOP) / (FADE_FULL - FADE_TOP));
  }
  const r = NOTE_RADIUS * scale;
  const fontSize = Math.max(16, Math.round(30 * scale));

  ctx.save();
  ctx.globalAlpha = noteAlpha;

  // Determine alpha and colors based on state
  let fillColor: string;
  let alpha = 1;
  if (note.state === "active") {
    fillColor = color.glow;
  } else if (note.state === "passed") {
    fillColor = color.faded;
    alpha = 0.65;
  } else {
    fillColor = color.fill;
  }

  ctx.globalAlpha = noteAlpha * alpha;

  // Draw tail (duration trail) - extends upward from the note
  if (note.tailHeight > 0) {
    const tailWidth = r * 0.9;
    const tailTop = y - note.tailHeight;

    const tailGrad = ctx.createLinearGradient(x, tailTop, x, y);
    tailGrad.addColorStop(0, "rgba(0,0,0,0)");
    tailGrad.addColorStop(0.3, fillColor);
    tailGrad.addColorStop(1, fillColor);

    ctx.fillStyle = tailGrad;
    ctx.globalAlpha = noteAlpha * alpha * 0.3;
    ctx.beginPath();
    ctx.roundRect(
      x - tailWidth / 2,
      tailTop,
      tailWidth,
      note.tailHeight,
      tailWidth / 2
    );
    ctx.fill();
    ctx.globalAlpha = noteAlpha * alpha;
  }

  // Draw note circle with radial gradient
  if (note.state === "active") {
    ctx.save();
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = 18 * scale;
  }
  const grad = ctx.createRadialGradient(x - 4 * scale, y - 4 * scale, 3 * scale, x, y, r);
  grad.addColorStop(0, note.state === "active" ? "#f5e6c8" : color.glow);
  grad.addColorStop(0.35, fillColor);
  grad.addColorStop(1, note.state === "passed" ? color.faded : color.fill);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (note.state === "active") {
    ctx.restore();
    ctx.globalAlpha = noteAlpha * alpha;
  }

  // Border
  ctx.strokeStyle = note.state === "active" ? "rgba(230,215,180,0.7)" : note.state === "upcoming" ? "rgba(230,215,180,0.3)" : "rgba(230,215,180,0.15)";
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  // Draw text (finger number or note name)
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  // Determine label: show "L2" for low finger variants, "2" for high/single
  let label: string;
  if (showFingers) {
    const isLow = isLowFingerVariant(note);
    label = isLow ? `L${note.finger}` : String(note.finger);
  } else {
    label = toNotation(note.noteName.replace(/\d/, ""), notation);
  }

  // Use dark text for A string (amber) — cream on amber has poor contrast
  const isAmber = note.string === "A";
  const textColor = isAmber ? "#1a1000" : "#f5e6c8";
  const shadowColor = isAmber ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.5)";

  if (note.state !== "passed") {
    ctx.fillStyle = shadowColor;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + 0.5, y + 0.5);
    ctx.fillStyle = textColor;
    ctx.fillText(label, x, y);
  } else {
    ctx.fillStyle = isAmber ? "rgba(26,16,0,0.4)" : "rgba(230,215,180,0.4)";
    ctx.font = `bold ${Math.max(14, Math.round(24 * scale))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  }

  // Position ring + badge for non-1st position notes
  if (note.state !== "passed" && (note.position ?? 1) > 1 && scale > 0.6) {
    const pos = note.position!;
    const ringColor = POSITION_COLORS[pos] ?? "rgba(200,200,200,0.85)";
    const ringWidth = Math.max(2, 3 * scale);
    const ringR = r + ringWidth + 1;

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = ringWidth;
    ctx.beginPath();
    ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Number badge on the ring at top-right
    const badgeR = Math.round(14 * scale);
    const bx = x + ringR * 0.72;
    const by = y - ringR * 0.72;
    ctx.fillStyle = "rgba(15,10,5,0.9)";
    ctx.beginPath();
    ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ringColor;
    ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(pos), bx, by);
  }

  ctx.restore();
}

/* ─── Left Panel: Note info + Vertical Fingerboard ─── */

const OPEN_MIDI: Record<string, number> = { G: 55, D: 62, A: 69, E: 76 };
const MAX_SEMITONES = 14;
const POS_NAMES: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th" };

/** Draw a vertical fingerboard diagram inside the left panel */
function drawVerticalFingerboard(ctx: CanvasRenderingContext2D, notes: GameNote[], notation: NotationMode, hintNote?: GameNote | null) {
  const note = notes[0]; // primary note for position label
  const fbWidth = 220;
  const fbLeft = (LEFT_PANEL_WIDTH - fbWidth) / 2; // centered in panel
  const fbTop = 120;
  const fbHeight = 480;
  const fbRight = fbLeft + fbWidth;
  const fbBottom = fbTop + fbHeight;
  const nutHeight = 6;
  const playableTop = fbTop + nutHeight + 10;
  const playableBottom = fbBottom - 10;
  const playableHeight = playableBottom - playableTop;

  // String X positions (G=left to E=right)
  const stringPad = 26;
  const stringSpacing = (fbWidth - 2 * stringPad) / 3;
  const stringXs = STRINGS_ORDER.map((_, i) => fbLeft + stringPad + i * stringSpacing);

  ctx.save();

  // Fingerboard background
  ctx.fillStyle = "rgba(70, 52, 24, 0.85)";
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
  ctx.strokeStyle = "rgba(200, 185, 150, 0.22)";
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
    ctx.globalAlpha = 0.75;
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

  // Finger placement — draw all simultaneous chord notes
  for (const cn of notes) {
    const semiAbove = Math.max(0, cn.midiNumber - OPEN_MIDI[cn.string]);
    const strIdx = STRINGS_ORDER.indexOf(cn.string as ViolinString);
    if (strIdx < 0) continue;

    const dotX = stringXs[strIdx];
    const color = STRING_COLORS[cn.string as ViolinString];

    if (semiAbove === 0) {
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

      ctx.shadowColor = color.glow;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color.fill;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      ctx.strokeStyle = "rgba(230,215,180,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#f5e6c8";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(cn.finger), dotX, dotY);
    }
  }

  // Hint note (next note) — small faded dot on the fingerboard
  if (hintNote && hintNote !== note) {
    const hintStrIdx = STRINGS_ORDER.indexOf(hintNote.string as ViolinString);
    if (hintStrIdx >= 0) {
      const hintSemi = Math.max(0, hintNote.midiNumber - OPEN_MIDI[hintNote.string]);
      const hintColor = STRING_COLORS[hintNote.string as ViolinString];
      const hintX = stringXs[hintStrIdx];
      ctx.globalAlpha = 0.4;
      if (hintSemi === 0) {
        ctx.fillStyle = hintColor.fill;
        ctx.beginPath();
        ctx.arc(hintX, fbTop + nutHeight / 2 + 2, 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const hintY = playableTop + (Math.min(hintSemi, MAX_SEMITONES) / MAX_SEMITONES) * playableHeight;
        ctx.fillStyle = hintColor.fill;
        ctx.beginPath();
        ctx.arc(hintX, hintY, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
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
  notation: NotationMode = "abc",
  surroundingNotes?: GameNote[],
  showFingers = true,
  activePositions: number[] = [],
  chordNotes: GameNote[] = []
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
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(toNotationFull(displayNote.noteName, notation), cx, 40);

    // String + Finger — single compact line: "A STRING • FINGER 1"
    const fingerLabel = displayNote.finger === 0 ? "OPEN" : `FINGER ${displayNote.finger}`;
    const stringLabel = `${stringToNotation(displayNote.string, notation).toUpperCase()} STRING`;
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "rgba(230,215,180,0.65)";
    ctx.fillText(`${stringLabel}  \u2022  ${fingerLabel}`, cx, 74);

    // Position — color-coded to match ring colors
    const pos = displayNote.position ?? 1;
    const posLabel = POS_NAMES[pos] ?? `${pos}th`;
    ctx.fillStyle = pos > 1 ? (POSITION_COLORS[pos] ?? "rgba(200,200,200,0.9)") : "rgba(230,215,180,0.35)";
    ctx.font = pos > 1 ? "bold 13px sans-serif" : "12px sans-serif";
    ctx.fillText(`${posLabel} Position`, cx, 92);

    // Vertical fingerboard — show all chord notes, or just the display note
    const fbNotes = chordNotes.length > 0 ? chordNotes : [displayNote];
    drawVerticalFingerboard(ctx, fbNotes, notation, isHint ? null : hintNote);

    // Position legend
    _drawPositionLegend(ctx, activePositions);

    // Note sequence strip
    if (surroundingNotes && surroundingNotes.length > 0) {
      _drawNoteSequence(ctx, surroundingNotes, activeNote, notation, showFingers);
    }

    ctx.restore();
  } else {
    // Empty state
    ctx.fillStyle = "rgba(230,215,180,0.3)";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Press Play", LEFT_PANEL_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
    ctx.fillText("to start", LEFT_PANEL_WIDTH / 2, CANVAS_HEIGHT / 2 + 12);

    _drawPositionLegend(ctx, activePositions);

    if (surroundingNotes && surroundingNotes.length > 0) {
      _drawNoteSequence(ctx, surroundingNotes, null, notation, showFingers);
    }
  }
}

function _drawNoteSequence(
  ctx: CanvasRenderingContext2D,
  notes: GameNote[],
  activeNote: GameNote | null,
  notation: NotationMode,
  showFingers: boolean
) {
  if (notes.length === 0) return;
  const STRIP_Y = CANVAS_HEIGHT - 200; // above position legend header
  const n = notes.length;
  const activeIdx = activeNote ? notes.indexOf(activeNote) : -1;

  ctx.save();

  // Subtle separator
  ctx.strokeStyle = "rgba(230,215,180,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, STRIP_Y - 28);
  ctx.lineTo(LEFT_PANEL_WIDTH - 20, STRIP_Y - 28);
  ctx.stroke();

  for (let i = 0; i < n; i++) {
    const note = notes[i];
    const isActive = i === activeIdx;
    const isPast = activeIdx >= 0 && i < activeIdx;
    const distFromActive = Math.abs(i - activeIdx);

    const x = (i + 0.5) * (LEFT_PANEL_WIDTH / n);
    const r = isActive ? 26 : 18;

    let alpha: number;
    if (activeIdx < 0) {
      alpha = 0.4;
    } else if (isActive) {
      alpha = 1.0;
    } else if (isPast) {
      alpha = Math.max(0.15, 0.35 - distFromActive * 0.08);
    } else {
      alpha = Math.max(0.3, 1.0 - distFromActive * 0.2);
    }

    const color = STRING_COLORS[note.string];

    ctx.globalAlpha = alpha;
    ctx.fillStyle = isActive ? color.glow : color.fill;
    ctx.beginPath();
    ctx.arc(x, STRIP_Y, r, 0, Math.PI * 2);
    ctx.fill();

    if (isActive) {
      ctx.strokeStyle = "rgba(245,230,200,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, STRIP_Y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Label: finger number or note name depending on mode
    ctx.globalAlpha = alpha;
    ctx.fillStyle = isActive ? "rgba(0,0,0,0.7)" : "rgba(245,230,200,0.9)";
    const label = showFingers
      ? (note.finger === 0 ? "O" : String(note.finger))
      : toNotation(note.noteName.replace(/\d/, ""), notation);
    ctx.font = `bold ${isActive ? 18 : 14}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, STRIP_Y);

    // Position ring + badge for non-1st position notes (same colors as falling notes)
    const pos = note.position ?? 1;
    if (pos > 1) {
      const ringColor = POSITION_COLORS[pos] ?? "rgba(200,200,200,0.85)";
      const ringW = isActive ? 2.5 : 2;
      const ringR = r + ringW + 1;
      const badgeR = isActive ? 9 : 7;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = ringW;
      ctx.beginPath();
      ctx.arc(x, STRIP_Y, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // Position number badge at top-right
      const bx = x + ringR * 0.72;
      const by = STRIP_Y - ringR * 0.72;
      ctx.fillStyle = "rgba(15,10,5,0.9)";
      ctx.beginPath();
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ringColor;
      ctx.font = `bold ${isActive ? 11 : 9}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(pos), bx, by);
    }
  }

  // Slur arcs below the note circles
  {
    let slurStartIdx: number | null = null;
    for (let i = 0; i < n; i++) {
      const note = notes[i];
      if (note.slurEnd && slurStartIdx !== null) {
        const x1 = (slurStartIdx + 0.5) * (LEFT_PANEL_WIDTH / n);
        const x2 = (i + 0.5) * (LEFT_PANEL_WIDTH / n);
        const arcR1 = slurStartIdx === activeIdx ? 26 : 18;
        const arcR2 = i === activeIdx ? 26 : 18;
        const yBase = STRIP_Y + Math.max(arcR1, arcR2) + 4;
        const midX = (x1 + x2) / 2;
        const depth = Math.min(14, (x2 - x1) * 0.22 + 6);

        const alphaStart = slurStartIdx === activeIdx ? 1.0 : activeIdx < 0 ? 0.4 : slurStartIdx < activeIdx ? 0.2 : 0.5;
        const alphaEnd   = i === activeIdx ? 1.0 : activeIdx < 0 ? 0.4 : i < activeIdx ? 0.2 : 0.5;
        const a = Math.min(alphaStart, alphaEnd);

        ctx.globalAlpha = a * 0.8;
        ctx.strokeStyle = "rgba(230, 215, 180, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, yBase);
        ctx.quadraticCurveTo(midX, yBase + depth, x2, yBase);
        ctx.stroke();

        slurStartIdx = null;
      }
      if (note.slurStart) slurStartIdx = i;
    }
  }

  ctx.restore();
}

function _drawPositionLegend(ctx: CanvasRenderingContext2D, activePositions: number[]) {
  if (activePositions.length === 0) return;

  const POS_LABELS: Record<number, string> = { 1:"1st", 2:"2nd", 3:"3rd", 4:"4th", 5:"5th", 6:"6th", 7:"7th" };
  const sorted = [...activePositions].sort((a, b) => a - b);
  const ringR = 12;
  const rowH = 28;
  const useTwoCols = sorted.length > 3;
  const nRows = useTwoCols ? Math.ceil(sorted.length / 2) : sorted.length;
  const headerGap = 28;
  const totalH = nRows * rowH + headerGap;
  const startY = CANVAS_HEIGHT - totalH - 14;

  ctx.save();
  ctx.globalAlpha = 1;

  // Header
  ctx.fillStyle = "rgba(230,215,180,0.4)";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ACTIVE POSITIONS", LEFT_PANEL_WIDTH / 2, startY);

  const colX = useTwoCols ? [45, 200] : [LEFT_PANEL_WIDTH / 2 - 30];

  sorted.forEach((pos, idx) => {
    const col = useTwoCols ? (idx < nRows ? 0 : 1) : 0;
    const row = useTwoCols ? (idx < nRows ? idx : idx - nRows) : idx;
    const ringX = colX[col];
    const ly = startY + headerGap + row * rowH;
    const color = POSITION_COLORS[pos] ?? "rgba(200,200,200,0.85)";
    const label = POS_LABELS[pos] ?? `${pos}th`;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ringX, ly, ringR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(pos), ringX, ly);

    ctx.fillStyle = "rgba(230,215,180,0.75)";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, ringX + ringR + 6, ly);
  });

  ctx.restore();
}

/** Draw slur arcs in the main falling-notes area, on the right edge of each note group.
 *  Must be called AFTER drawEdgeFades so arcs render on top of the hit-line cover. */
export function drawSlurArcs(ctx: CanvasRenderingContext2D, notes: GameNote[]) {
  let slurStartNote: GameNote | null = null;

  for (const note of notes) {
    if (note.slurEnd && slurStartNote) {
      const rawStartX = LEFT_PANEL_WIDTH + slurStartNote.lane * LANE_WIDTH + LANE_WIDTH / 2;
      const rawStartY = slurStartNote.y;
      const endX = LEFT_PANEL_WIDTH + note.lane * LANE_WIDTH + LANE_WIDTH / 2;
      const endY = note.y;

      // Draw as long as the slurEnd note is still approaching (visible above hit line)
      if (endY + NOTE_RADIUS > 0 && endY < HIT_LINE_Y) {
        // Anchor the arc start to the hit line once the slurStart note has passed
        const startX = rawStartX;
        const startY = Math.min(rawStartY, HIT_LINE_Y);

        const ax = Math.max(startX, endX) + NOTE_RADIUS + 8;
        const midY = (startY + endY) / 2;
        const bulge = Math.min(28, Math.abs(startY - endY) * 0.18 + 12);

        const calcAlpha = (n: GameNote) => {
          if (n.state !== "upcoming") return 1.0;
          const FADE_TOP = 60, FADE_FULL = HIT_LINE_Y - 120;
          return n.y <= FADE_TOP ? 0.35 : n.y >= FADE_FULL ? 1.0
            : 0.35 + 0.65 * ((n.y - FADE_TOP) / (FADE_FULL - FADE_TOP));
        };
        // Opacity driven by the slurEnd note (slurStart may have already passed)
        const alpha = calcAlpha(note);

        ctx.save();
        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = "rgba(230, 215, 180, 0.9)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(startX + NOTE_RADIUS + 4, startY);
        ctx.bezierCurveTo(ax + bulge, midY, ax + bulge, midY, endX + NOTE_RADIUS + 4, endY);
        ctx.stroke();
        ctx.restore();
      }

      slurStartNote = null;
    }
    if (note.slurStart) slurStartNote = note;
  }
}

/** Draw horizontal connector lines between notes that start simultaneously (chords / double stops).
 *  Call BEFORE drawNote so the note circles overlap the line, showing only the gap between them. */
export function drawChordConnectors(ctx: CanvasRenderingContext2D, notes: GameNote[]) {
  const EPSILON = 0.025; // 25 ms tolerance for "simultaneous"
  const FADE_TOP = 60;
  const FADE_FULL = HIT_LINE_Y - 120;

  // Bucket visible non-passed notes by start time
  const buckets = new Map<number, GameNote[]>();
  for (const note of notes) {
    if (note.state === "passed") continue;
    if (note.y + NOTE_RADIUS < 0 || note.y > HIT_LINE_Y + NOTE_RADIUS) continue;
    let matched = false;
    for (const [key, bucket] of buckets) {
      if (Math.abs(key - note.startTimeSec) < EPSILON) {
        bucket.push(note);
        matched = true;
        break;
      }
    }
    if (!matched) buckets.set(note.startTimeSec, [note]);
  }

  for (const group of buckets.values()) {
    if (group.length < 2) continue;

    const sorted = [...group].sort((a, b) => a.lane - b.lane);
    const isActive = group.some((n) => n.state === "active");
    const refY = sorted[0].y;

    // Opacity mirrors the note fade logic but slightly stronger so the connector is visible
    let alpha: number;
    if (isActive) {
      alpha = 0.9;
    } else {
      alpha = refY <= FADE_TOP ? 0.25
            : refY >= FADE_FULL ? 0.75
            : 0.25 + 0.5 * ((refY - FADE_TOP) / (FADE_FULL - FADE_TOP));
    }

    const x1 = LEFT_PANEL_WIDTH + sorted[0].lane * LANE_WIDTH + LANE_WIDTH / 2;
    const x2 = LEFT_PANEL_WIDTH + sorted[sorted.length - 1].lane * LANE_WIDTH + LANE_WIDTH / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(210,180,120,1)";
    ctx.lineWidth = isActive ? 2.5 : 1.5;
    ctx.setLineDash(isActive ? [] : [5, 4]);
    if (isActive) {
      ctx.shadowColor = "rgba(210,180,120,0.6)";
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(x1, refY);
    ctx.lineTo(x2, refY);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawEdgeFades(ctx: CanvasRenderingContext2D) {
  const lanesX = LEFT_PANEL_WIDTH;
  const lanesW = CANVAS_WIDTH - LEFT_PANEL_WIDTH;
  const BG = "#120e08";

  // Top fade — hides notes entering from the top
  const topGrad = ctx.createLinearGradient(0, 0, 0, 70);
  topGrad.addColorStop(0, BG);
  topGrad.addColorStop(1, "rgba(18,14,8,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(lanesX, 0, lanesW, 70);

  // Echo zone — passed notes fade out gracefully below the hit line
  const echoGrad = ctx.createLinearGradient(0, HIT_LINE_Y, 0, HIT_LINE_Y + ECHO_ZONE);
  echoGrad.addColorStop(0, "rgba(18,14,8,0)");
  echoGrad.addColorStop(1, BG);
  ctx.fillStyle = echoGrad;
  ctx.fillRect(lanesX, HIT_LINE_Y + 1, lanesW, ECHO_ZONE);

  // Cover everything below the echo zone
  ctx.fillStyle = BG;
  ctx.fillRect(lanesX, HIT_LINE_Y + ECHO_ZONE, lanesW, CANVAS_HEIGHT - HIT_LINE_Y - ECHO_ZONE);

  // Redraw target rings on top of the cover so they're always visible
  for (let i = 0; i < LANE_COUNT; i++) {
    const cx = LEFT_PANEL_WIDTH + i * LANE_WIDTH + LANE_WIDTH / 2;
    const s = STRINGS_ORDER[i];
    const color = STRING_COLORS[s];
    ctx.strokeStyle = color.faded;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, HIT_LINE_Y, NOTE_RADIUS + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}
