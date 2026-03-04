import { findNoteByMidi } from "@/data/violinNotes";
import type { GameNote } from "@/types/game";
import type { MappedSong } from "@/lib/midi/mapper";

// ── Constants ─────────────────────────────────────────────────────────────────

const STRING_TO_LANE: Record<string, number> = { G: 0, D: 1, A: 2, E: 3 };

const STEP_TO_SEMITONE: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

const MIN_MIDI = 55; // G3
const MAX_MIDI = 93; // A6

// ── Part info (mirrors TrackInfo from midi/mapper.ts) ─────────────────────────

export interface PartInfo {
  index: number;
  name: string;
  noteCount: number;
  inRangePercent: number;
  isBestGuess: boolean;
}

// ── XML helpers ───────────────────────────────────────────────────────────────

function getText(el: Element, selector: string): string {
  return el.querySelector(selector)?.textContent?.trim() ?? "";
}

function getNumber(el: Element, selector: string): number {
  const t = getText(el, selector);
  return t ? Number(t) : 0;
}

// ── Pitch → MIDI conversion ───────────────────────────────────────────────────

function pitchToMidi(pitchEl: Element): number {
  const step = getText(pitchEl, "step");
  const alter = getNumber(pitchEl, "alter");
  const octave = getNumber(pitchEl, "octave");
  const base = (STEP_TO_SEMITONE[step] ?? 0) + (octave + 1) * 12;
  return base + Math.round(alter);
}

// ── Duration to seconds ───────────────────────────────────────────────────────

function durationToSec(ticks: number, divisions: number, bpm: number): number {
  return (ticks / divisions) * (60 / bpm);
}

// ── MXL decompression ─────────────────────────────────────────────────────────

export async function decompressMxlToXml(buffer: ArrayBuffer): Promise<string> {
  const { unzipSync } = await import("fflate");
  const files = unzipSync(new Uint8Array(buffer));

  const containerBytes = files["META-INF/container.xml"];
  if (!containerBytes) throw new Error("Invalid .mxl: missing META-INF/container.xml");

  const containerDoc = new DOMParser().parseFromString(
    new TextDecoder().decode(containerBytes),
    "application/xml"
  );
  const rootfilePath = containerDoc.querySelector("rootfile")?.getAttribute("full-path");
  if (!rootfilePath) throw new Error("Invalid .mxl: no rootfile in container.xml");

  const musicxmlBytes = files[rootfilePath];
  if (!musicxmlBytes) throw new Error(`Invalid .mxl: rootfile not found: ${rootfilePath}`);

  return new TextDecoder().decode(musicxmlBytes);
}

// ── Part analysis ─────────────────────────────────────────────────────────────

export function getMusicXmlPartInfo(xmlString: string): PartInfo[] {
  const doc = new DOMParser().parseFromString(xmlString, "application/xml");
  const parts = Array.from(doc.querySelectorAll("part"));
  if (parts.length === 0) return [];

  const scored = parts.map((partEl, idx) => {
    const id = partEl.getAttribute("id") ?? `P${idx + 1}`;
    const scorePart = doc.querySelector(`score-part[id="${id}"]`);
    const name =
      scorePart?.querySelector("part-name")?.textContent?.trim() ||
      scorePart?.querySelector("instrument-name")?.textContent?.trim() ||
      `Part ${idx + 1}`;

    let noteCount = 0;
    let inRangeCount = 0;
    for (const noteEl of partEl.querySelectorAll("note")) {
      if (noteEl.querySelector("rest")) continue;
      const pitchEl = noteEl.querySelector("pitch");
      if (!pitchEl) continue;
      noteCount++;
      const midi = pitchToMidi(pitchEl);
      if (midi >= MIN_MIDI && midi <= MAX_MIDI) inRangeCount++;
    }

    const rangeRatio = noteCount > 0 ? inRangeCount / noteCount : 0;
    const nameBonus = /violin|solo|vln|violine|violino/i.test(name) ? 1000 : 0;
    const score = inRangeCount * rangeRatio + nameBonus;
    const inRangePercent = noteCount > 0 ? Math.round((inRangeCount / noteCount) * 100) : 0;

    return { index: idx, name, noteCount, inRangePercent, score, isBestGuess: false };
  });

  const maxScore = Math.max(...scored.map((p) => p.score));
  return scored.map(({ score, ...p }) => ({ ...p, isBestGuess: score === maxScore }));
}

// ── Core part parsing ─────────────────────────────────────────────────────────

interface RawNote {
  midi: number;
  startTimeSec: number;
  durationSec: number;
  slurStart: boolean;
  slurEnd: boolean;
}

function parsePartNotes(partEl: Element): { notes: RawNote[]; bpm: number } {
  let forwardCursor = 0;
  let chordGroupStart = 0;
  let divisions = 1;
  let bpm = 120;
  const firstBpm = { value: 120, set: false };

  const rawNotes: RawNote[] = [];

  for (const measureEl of partEl.querySelectorAll("measure")) {
    for (const child of measureEl.children) {
      const tag = child.tagName;

      if (tag === "attributes") {
        const divEl = child.querySelector("divisions");
        if (divEl) divisions = Number(divEl.textContent) || divisions;
      }

      if (tag === "direction") {
        const soundEl = child.querySelector("sound");
        if (soundEl?.getAttribute("tempo")) {
          bpm = Number(soundEl.getAttribute("tempo")) || bpm;
          if (!firstBpm.set) { firstBpm.value = bpm; firstBpm.set = true; }
        }
        const perMinute = child.querySelector("per-minute");
        if (perMinute) {
          bpm = Number(perMinute.textContent) || bpm;
          if (!firstBpm.set) { firstBpm.value = bpm; firstBpm.set = true; }
        }
      }

      if (tag === "note") {
        // Skip grace notes — no score-time duration
        if (child.querySelector("grace")) continue;

        const isRest = !!child.querySelector("rest");
        const isChord = !!child.querySelector("chord");
        const durationTicks = getNumber(child, "duration");
        const durSec = durationToSec(durationTicks, divisions, bpm);

        let startTimeSec: number;
        if (isChord) {
          startTimeSec = chordGroupStart;
          forwardCursor = Math.max(forwardCursor, chordGroupStart + durSec);
        } else {
          chordGroupStart = forwardCursor;
          startTimeSec = forwardCursor;
          forwardCursor += durSec;
        }

        if (!isRest) {
          const pitchEl = child.querySelector("pitch");
          if (pitchEl) {
            const midi = pitchToMidi(pitchEl);

            let slurStart = false;
            let slurEnd = false;
            for (const slurEl of child.querySelectorAll("notations > slur")) {
              const type = slurEl.getAttribute("type");
              if (type === "start") slurStart = true;
              if (type === "stop") slurEnd = true;
            }

            rawNotes.push({
              midi,
              startTimeSec,
              durationSec: Math.max(0.05, durSec),
              slurStart,
              slurEnd,
            });
          }
        }
      }
    }
  }

  return { notes: rawNotes, bpm: firstBpm.set ? firstBpm.value : bpm };
}

// ── Main exported functions ───────────────────────────────────────────────────

export function parseMusicXmlToSong(
  xmlString: string,
  title: string,
  partIndex?: number
): MappedSong {
  const doc = new DOMParser().parseFromString(xmlString, "application/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("MusicXML parse error");
  }

  const parts = Array.from(doc.querySelectorAll("part"));
  if (parts.length === 0) throw new Error("No parts found in MusicXML file");

  const selectedIdx = partIndex ?? (() => {
    const infos = getMusicXmlPartInfo(xmlString);
    return infos.find((p) => p.isBestGuess)?.index ?? 0;
  })();

  const partEl = parts[selectedIdx];
  if (!partEl) throw new Error(`Part index ${selectedIdx} not found`);

  const { notes: rawNotes, bpm } = parsePartNotes(partEl);

  let lastString: string | undefined;
  const notes: GameNote[] = [];

  for (let i = 0; i < rawNotes.length; i++) {
    const raw = rawNotes[i];
    const vNote = findNoteByMidi(raw.midi, lastString);
    if (!vNote) continue;

    notes.push({
      id: `mxml-${i}`,
      midiNumber: raw.midi,
      noteName: vNote.name,
      string: vNote.string,
      finger: vNote.finger,
      lane: STRING_TO_LANE[vNote.string],
      startTimeSec: raw.startTimeSec,
      durationSec: raw.durationSec,
      y: 0,
      tailHeight: 0,
      state: "upcoming",
      staffPosition: vNote.staffPosition,
      accidental: vNote.accidental,
      position: vNote.position,
      slurStart: raw.slurStart || undefined,
      slurEnd: raw.slurEnd || undefined,
    });

    lastString = vNote.string;
  }

  const durationSec =
    notes.length > 0
      ? notes[notes.length - 1].startTimeSec + notes[notes.length - 1].durationSec
      : 0;

  return { title, bpm, ticksPerBeat: 480, durationSec, notes };
}

export async function parseMxlToSong(
  buffer: ArrayBuffer,
  title: string,
  partIndex?: number
): Promise<MappedSong> {
  const xmlString = await decompressMxlToXml(buffer);
  return parseMusicXmlToSong(xmlString, title, partIndex);
}
