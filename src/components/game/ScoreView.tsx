"use client";

import { useRef, useEffect, useCallback } from "react";
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot } from "vexflow";
import type { MappedSong } from "@/lib/midi/mapper";
import { convertToScore, type ScoreData, type ScoreNote } from "@/lib/score/vexflowConverter";

interface ScoreViewProps {
  song: MappedSong;
  getCurrentTime: () => number;
  status: "idle" | "playing" | "paused";
}

const STAVE_WIDTH = 220;
const MEASURES_PER_LINE = 4;
const LINE_HEIGHT = 100;
const LEFT_MARGIN = 10;
const TOP_MARGIN = 40;
const FIRST_STAVE_EXTRA = 50; // extra width for clef + time sig

export default function ScoreView({ song, getCurrentTime, status }: ScoreViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const noteElementsRef = useRef<Map<number, SVGElement>>(new Map());
  const prevHighlightRef = useRef<SVGElement | null>(null);
  const scoreDataRef = useRef<ScoreData | null>(null);
  const rafRef = useRef<number>(0);

  // Render score when song changes
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container || song.notes.length === 0) return;

    // Clear previous render
    container.innerHTML = "";
    noteElementsRef.current.clear();
    prevHighlightRef.current = null;

    const scoreData = convertToScore(song.notes, song.bpm);
    scoreDataRef.current = scoreData;

    const totalMeasures = scoreData.measures.length;
    const totalLines = Math.ceil(totalMeasures / MEASURES_PER_LINE);
    const svgWidth = LEFT_MARGIN + FIRST_STAVE_EXTRA + MEASURES_PER_LINE * STAVE_WIDTH + 20;
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
      const x = LEFT_MARGIN + (isFirstInLine ? 0 : FIRST_STAVE_EXTRA) + posInLine * STAVE_WIDTH;
      const y = TOP_MARGIN + lineIndex * LINE_HEIGHT;

      const stave = new Stave(x, y, STAVE_WIDTH + extraW);
      if (isFirstInLine) {
        stave.addClef("treble");
        if (m === 0) {
          stave.addTimeSignature(scoreData.timeSignature);
        }
      }
      stave.setContext(context).draw();

      if (measure.notes.length === 0) continue;

      const vexNotes: StaveNote[] = [];

      for (const sn of measure.notes) {
        const duration = sn.type === "rest" ? sn.vexDuration + "r" : sn.vexDuration;

        let staveNote: StaveNote;
        try {
          staveNote = new StaveNote({
            keys: sn.keys,
            duration,
            autoStem: true,
          });
        } catch {
          // Skip notes VexFlow can't render
          continue;
        }

        if (sn.type === "note") {
          for (let idx = 0; idx < sn.accidentals.length; idx++) {
            const acc = sn.accidentals[idx];
            if (acc) {
              staveNote.addModifier(new Accidental(acc), idx);
            }
          }
        }

        if (sn.dotted) {
          try {
            Dot.buildAndAttach([staveNote]);
          } catch {
            // Skip dot if it fails
          }
        }

        vexNotes.push(staveNote);

        // Store reference for highlighting
        if (sn.sourceNoteIndex >= 0) {
          // We'll capture the SVG element after drawing
          const noteIdx = sn.sourceNoteIndex;
          // Use a microtask to capture after draw
          queueMicrotask(() => {
            const elem = staveNote.getSVGElement();
            if (elem) {
              noteElementsRef.current.set(noteIdx, elem);
            }
          });
        }
      }

      if (vexNotes.length === 0) continue;

      try {
        const voice = new Voice({ numBeats: 4, beatValue: 4 }).setStrict(false);
        voice.addTickables(vexNotes);
        new Formatter().joinVoices([voice]).format([voice], STAVE_WIDTH + extraW - 40);
        voice.draw(context, stave);
      } catch {
        // If voice/formatter fails, draw notes individually
        for (const note of vexNotes) {
          try {
            note.setContext(context).setStave(stave).draw();
          } catch {
            // Skip individual notes that fail
          }
        }
      }
    }
  }, [song]);

  // Highlight active note during playback
  const updateHighlight = useCallback(
    (currentTimeSec: number) => {
      const notes = song.notes;

      // Find active note
      let activeIndex = -1;
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        if (currentTimeSec >= n.startTimeSec && currentTimeSec < n.startTimeSec + n.durationSec) {
          activeIndex = i;
          break;
        }
      }

      // Remove previous highlight
      if (prevHighlightRef.current) {
        prevHighlightRef.current.classList.remove("vf-active-note");
      }

      if (activeIndex >= 0) {
        const elem = noteElementsRef.current.get(activeIndex);
        if (elem) {
          elem.classList.add("vf-active-note");
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

  // Animation frame loop for highlighting
  useEffect(() => {
    if (status !== "playing") return;

    const tick = () => {
      updateHighlight(getCurrentTime());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, getCurrentTime, updateHighlight]);

  // Update highlight when paused/idle too (for seek)
  useEffect(() => {
    if (status === "playing") return;
    updateHighlight(getCurrentTime());
  }, [status, getCurrentTime, updateHighlight]);

  return (
    <div
      ref={containerRef}
      className="score-container w-full max-w-4xl overflow-x-auto overflow-y-auto rounded-lg border border-border bg-[#faf6f0]"
      style={{ maxHeight: "500px" }}
    >
      <div ref={svgContainerRef} />
    </div>
  );
}
