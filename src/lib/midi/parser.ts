import type { MidiFile, MidiTrack, MidiEvent } from "./types";

/**
 * Custom MIDI binary parser. No external libraries.
 * Supports Format 0 and Format 1 MIDI files.
 * Robust: skips unknown chunks, handles malformed tracks gracefully.
 */

function readVarLen(
  view: DataView,
  offset: number,
  maxOffset: number
): { value: number; bytesRead: number } {
  let value = 0;
  let bytesRead = 0;
  let byte: number;
  do {
    if (offset + bytesRead >= maxOffset) {
      return { value, bytesRead };
    }
    byte = view.getUint8(offset + bytesRead);
    value = (value << 7) | (byte & 0x7f);
    bytesRead++;
    if (bytesRead > 4) return { value, bytesRead }; // graceful fallback
  } while (byte & 0x80);
  return { value, bytesRead };
}

function readString(view: DataView, offset: number, length: number): string {
  let str = "";
  for (let i = 0; i < length; i++) {
    str += String.fromCharCode(view.getUint8(offset + i));
  }
  return str;
}

function safeGetUint8(view: DataView, offset: number): number {
  if (offset >= view.byteLength) return 0;
  return view.getUint8(offset);
}

function parseTrack(view: DataView, offset: number, length: number): MidiTrack {
  const events: MidiEvent[] = [];
  const end = Math.min(offset + length, view.byteLength);
  let pos = offset;
  let lastStatus = 0;

  while (pos < end) {
    try {
      // Read delta time
      const dt = readVarLen(view, pos, end);
      const deltaTime = dt.value;
      pos += dt.bytesRead;
      if (pos >= end) break;

      // Read status byte (handle running status)
      let statusByte = safeGetUint8(view, pos);
      if (statusByte & 0x80) {
        lastStatus = statusByte;
        pos++;
      } else {
        // Running status: reuse last status, current byte is data
        statusByte = lastStatus;
        if (!statusByte) {
          pos++;
          continue; // no valid status yet, skip
        }
      }

      if (pos >= end) break;

      const type = statusByte & 0xf0;
      const channel = statusByte & 0x0f;

      if (statusByte === 0xff) {
        // Meta event
        if (pos >= end) break;
        const metaType = safeGetUint8(view, pos);
        pos++;
        const len = readVarLen(view, pos, end);
        pos += len.bytesRead;
        const dataLen = Math.min(len.value, end - pos);
        const data = new Uint8Array(dataLen);
        for (let i = 0; i < dataLen; i++) {
          data[i] = safeGetUint8(view, pos + i);
        }
        pos += len.value; // advance by declared length, not clamped
        events.push({ type: "meta", deltaTime, metaType, data });
      } else if (statusByte === 0xf0 || statusByte === 0xf7) {
        // SysEx event - skip
        const len = readVarLen(view, pos, end);
        pos += len.bytesRead + len.value;
      } else if (type === 0x90) {
        // Note On
        if (pos + 1 >= end) break;
        const note = safeGetUint8(view, pos);
        const velocity = safeGetUint8(view, pos + 1);
        pos += 2;
        if (velocity === 0) {
          events.push({ type: "noteOff", deltaTime, channel, note, velocity: 0 });
        } else {
          events.push({ type: "noteOn", deltaTime, channel, note, velocity });
        }
      } else if (type === 0x80) {
        // Note Off
        if (pos + 1 >= end) break;
        const note = safeGetUint8(view, pos);
        const velocity = safeGetUint8(view, pos + 1);
        pos += 2;
        events.push({ type: "noteOff", deltaTime, channel, note, velocity });
      } else if (type === 0xb0) {
        // Control Change
        if (pos + 1 >= end) break;
        const controller = safeGetUint8(view, pos);
        const value = safeGetUint8(view, pos + 1);
        pos += 2;
        events.push({ type: "controlChange", deltaTime, channel, controller, value });
      } else if (type === 0xc0 || type === 0xd0) {
        // Program Change / Channel Pressure (1 data byte)
        pos += 1;
      } else if (type === 0xa0 || type === 0xe0) {
        // Aftertouch / Pitch Bend (2 data bytes)
        pos += 2;
      } else {
        // Unknown event type - skip 1 byte and continue
        pos++;
      }
    } catch {
      // If any read fails within a track, skip to end
      break;
    }
  }

  return { events };
}

export function parseMidi(buffer: ArrayBuffer): MidiFile {
  const view = new DataView(buffer);
  let pos = 0;

  if (view.byteLength < 14) {
    throw new Error("File too small to be a valid MIDI file");
  }

  // Read header chunk
  const headerTag = readString(view, pos, 4);
  if (headerTag !== "MThd") {
    throw new Error("Invalid MIDI file: missing MThd header");
  }
  pos += 4;

  const headerLength = view.getUint32(pos);
  pos += 4;

  if (headerLength < 6) {
    throw new Error("Invalid MIDI header length");
  }

  const format = view.getUint16(pos);
  const trackCount = view.getUint16(pos + 2);
  const division = view.getUint16(pos + 4);
  pos += headerLength;

  if (format > 1) {
    throw new Error("MIDI Format 2 is not supported");
  }

  if (division & 0x8000) {
    throw new Error("SMPTE time division is not supported");
  }

  const ticksPerBeat = division;

  // Read track chunks - skip unknown chunks gracefully
  const tracks: MidiTrack[] = [];
  while (pos + 8 <= view.byteLength && tracks.length < trackCount) {
    const chunkTag = readString(view, pos, 4);
    pos += 4;
    const chunkLength = view.getUint32(pos);
    pos += 4;

    if (chunkTag === "MTrk") {
      const track = parseTrack(view, pos, chunkLength);
      tracks.push(track);
    }
    // Skip chunk data (both MTrk and unknown chunks)
    pos += chunkLength;
  }

  if (tracks.length === 0) {
    throw new Error("No valid tracks found in MIDI file");
  }

  return { format, trackCount: tracks.length, ticksPerBeat, tracks };
}
