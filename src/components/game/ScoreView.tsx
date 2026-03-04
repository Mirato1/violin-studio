"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot } from "vexflow";
import type { MappedSong } from "@/lib/midi/mapper";
import { convertToScore, type ScoreData } from "@/lib/score/vexflowConverter";
import type { GameNote } from "@/types/game";
import { drawLeftPanel } from "@/lib/game/renderer";
import { useNotation } from "@/contexts/NotationContext";

interface ScoreViewProps {
  song: MappedSong;
  getCurrentTime: () => number;
  status: "idle" | "playing" | "paused";
}

const MEASURES_PER_LINE = 4;
const LINE_HEIGHT = 120;
const LEFT_MARGIN = 10;
const TOP_MARGIN = 40;
const FIRST_STAVE_EXTRA = 80;

// Panel canvas dimensions (same virtual size as main game left panel)
const PANEL_CANVAS_W = 300;
const PANEL_CANVAS_H = 900;

const GOLD = "oklch(0.78 0.16 85)";

function applyHighlight(elem: SVGElement) {
  elem.querySelectorAll("path, rect, use").forEach((el) => {
    (el as SVGElement).style.fill = GOLD;
    (el as SVGElement).style.stroke = GOLD;
  });
}

function removeHighlight(elem: SVGElement) {
  elem.querySelectorAll("path, rect, use").forEach((el) => {
    (el as SVGElement).style.fill = "";
    (el as SVGElement).style.stroke = "";
  });
}

export default function ScoreView({ song, getCurrentTime, status }: ScoreViewProps) {
  const { notation } = useNotation();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const panelCanvasRef = useRef<HTMLCanvasElement>(null);
  const noteElementsRef = useRef<Map<number, SVGElement>>(new Map());
  const prevHighlightRef = useRef<SVGElement | null>(null);
  const scoreDataRef = useRef<ScoreData | null>(null);
  const rafRef = useRef<number>(0);
  const prevActiveIdxRef = useRef(-1);
  const updateHighlightRef = useRef<(t: number) => void>(() => {});
  const [currentNote, setCurrentNote] = useState<GameNote | null>(null);

  // Render score when song changes
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container || song.notes.length === 0) return;

    container.innerHTML = "";
    noteElementsRef.current.clear();
    if (prevHighlightRef.current) {
      removeHighlight(prevHighlightRef.current);
      prevHighlightRef.current = null;
    }

    const scoreData = convertToScore(song.notes, song.bpm);
    scoreDataRef.current = scoreData;

    const totalMeasures = scoreData.measures.length;
    const totalLines = Math.ceil(totalMeasures / MEASURES_PER_LINE);

    const containerW = containerRef.current?.clientWidth ?? 960;
    const staveWidth = Math.max(
      160,
      Math.floor((containerW - LEFT_MARGIN - FIRST_STAVE_EXTRA - 20) / MEASURES_PER_LINE)
    );

    const svgWidth = LEFT_MARGIN + FIRST_STAVE_EXTRA + MEASURES_PER_LINE * staveWidth + 20;
    const svgHeight = TOP_MARGIN + totalLines * LINE_HEIGHT + 40;

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(svgWidth, svgHeight);
    const context = renderer.getContext();

    for (let m = 0; m < totalMeasures; m++) {
      const measure = scoreData.measures[m];
      const lineIndex = Math.floor(m / MEASURES_PER_LINE);
      const posInLine = m % MEASURES_PER_LINE;

      const isFirstInLine = posInLine === 0;
      const extraW = isFirstInLine ? FIRST_STAVE_EXTRA : 0;
      const x = LEFT_MARGIN + (isFirstInLine ? 0 : FIRST_STAVE_EXTRA) + posInLine * staveWidth;
      const y = TOP_MARGIN + lineIndex * LINE_HEIGHT;

      const stave = new Stave(x, y, staveWidth + extraW);
      if (isFirstInLine) {
        stave.addClef("treble");
        stave.addKeySignature(scoreData.keySignature);
        if (m === 0) stave.addTimeSignature(scoreData.timeSignature);
      }
      stave.setContext(context).draw();

      if (measure.notes.length === 0) continue;

      const vexNotes: StaveNote[] = [];

      for (const sn of measure.notes) {
        const duration = sn.type === "rest" ? sn.vexDuration + "r" : sn.vexDuration;
        let staveNote: StaveNote;
        try {
          staveNote = new StaveNote({ keys: sn.keys, duration, autoStem: true });
        } catch { continue; }

        if (sn.type === "note") {
          for (let idx = 0; idx < sn.accidentals.length; idx++) {
            const acc = sn.accidentals[idx];
            if (acc) staveNote.addModifier(new Accidental(acc), idx);
          }
        }

        if (sn.dotted) {
          try { Dot.buildAndAttach([staveNote]); } catch { /* skip */ }
        }

        if (sn.sourceNoteIndex >= 0) {
          staveNote.addClass(`score-note-${sn.sourceNoteIndex}`);
        }

        vexNotes.push(staveNote);
      }

      if (vexNotes.length === 0) continue;

      try {
        const voice = new Voice({ numBeats: 4, beatValue: 4 }).setStrict(false);
        voice.addTickables(vexNotes);
        new Formatter().joinVoices([voice]).format([voice], staveWidth + extraW - 40);
        voice.draw(context, stave);
      } catch {
        for (const note of vexNotes) {
          try { note.setContext(context).setStave(stave).draw(); } catch { /* skip */ }
        }
      }
    }

    // Capture SVG elements by tagged class, after draw
    requestAnimationFrame(() => {
      const svg = container.querySelector("svg");
      if (!svg) return;
      noteElementsRef.current.clear();
      svg.querySelectorAll("[class*='score-note-']").forEach((el) => {
        const cls = el.getAttribute("class") ?? "";
        const m2 = cls.match(/score-note-(\d+)/);
        if (m2) {
          const idx = parseInt(m2[1]);
          // Keep first (outermost) element per note index
          if (!noteElementsRef.current.has(idx)) {
            noteElementsRef.current.set(idx, el as SVGElement);
          }
        }
      });
      // Trigger highlight once elements are ready (fixes race condition)
      prevActiveIdxRef.current = -2;
      updateHighlightRef.current(getCurrentTime());
    });
  }, [song]);

  // Redraw left panel canvas when current note or notation changes
  useEffect(() => {
    const canvas = panelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, PANEL_CANVAS_W, PANEL_CANVAS_H);
    ctx.fillStyle = "#0c0a06";
    ctx.fillRect(0, 0, PANEL_CANVAS_W, PANEL_CANVAS_H);
    drawLeftPanel(ctx, currentNote, currentNote, notation);
  }, [currentNote, notation]);

  // Highlight active note and update note info
  const updateHighlight = useCallback(
    (currentTimeSec: number) => {
      const notes = song.notes;

      let activeIndex = -1;
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        if (currentTimeSec >= n.startTimeSec && currentTimeSec < n.startTimeSec + n.durationSec) {
          activeIndex = i;
          break;
        }
      }

      // Update note info only when note changes
      if (activeIndex !== prevActiveIdxRef.current) {
        prevActiveIdxRef.current = activeIndex;
        setCurrentNote(activeIndex >= 0 ? notes[activeIndex] : null);
      }

      // Remove previous highlight (direct style manipulation, no CSS classes)
      if (prevHighlightRef.current) {
        removeHighlight(prevHighlightRef.current);
        prevHighlightRef.current = null;
      }

      if (activeIndex >= 0) {
        const elem = noteElementsRef.current.get(activeIndex);
        if (elem) {
          applyHighlight(elem);
          prevHighlightRef.current = elem;

          // Auto-scroll to keep active note visible
          const containerEl = containerRef.current;
          if (containerEl) {
            const elemRect = elem.getBoundingClientRect();
            const containerRect = containerEl.getBoundingClientRect();
            const elemRelativeTop = elemRect.top - containerRect.top + containerEl.scrollTop;
            const targetScroll = elemRelativeTop - containerRect.height / 3;

            if (
              elemRelativeTop < containerEl.scrollTop + 50 ||
              elemRelativeTop > containerEl.scrollTop + containerRect.height - 50
            ) {
              containerEl.scrollTo({ top: targetScroll, behavior: "smooth" });
            }
          }
        }
      }
    },
    [song]
  );

  // Keep updateHighlightRef in sync so the RAF capture can call it
  useEffect(() => { updateHighlightRef.current = updateHighlight; }, [updateHighlight]);

  useEffect(() => {
    if (status !== "playing") return;
    const tick = () => {
      updateHighlight(getCurrentTime());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, getCurrentTime, updateHighlight]);

  useEffect(() => {
    if (status === "playing") return;
    updateHighlight(getCurrentTime());
  }, [status, getCurrentTime, updateHighlight]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel canvas — same rendering as main game panel */}
      <div className="shrink-0 bg-[#0c0a06] border-r border-[rgba(210,180,120,0.1)] overflow-hidden h-full">
        <canvas
          ref={panelCanvasRef}
          width={PANEL_CANVAS_W}
          height={PANEL_CANVAS_H}
          style={{ height: "100%", width: "auto", display: "block" }}
        />
      </div>

      {/* Score */}
      <div
        ref={containerRef}
        className="score-container flex-1 overflow-x-auto overflow-y-auto bg-[#faf6f0]"
      >
        <div ref={svgContainerRef} />
      </div>
    </div>
  );
}
