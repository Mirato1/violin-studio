export interface MidiFile {
  format: number;
  trackCount: number;
  ticksPerBeat: number;
  tracks: MidiTrack[];
}

export interface MidiTrack {
  events: MidiEvent[];
}

export type MidiEvent =
  | NoteOnEvent
  | NoteOffEvent
  | MetaEvent
  | ControlChangeEvent;

export interface NoteOnEvent {
  type: "noteOn";
  deltaTime: number;
  channel: number;
  note: number;
  velocity: number;
}

export interface NoteOffEvent {
  type: "noteOff";
  deltaTime: number;
  channel: number;
  note: number;
  velocity: number;
}

export interface MetaEvent {
  type: "meta";
  deltaTime: number;
  metaType: number;
  data: Uint8Array;
}

export interface ControlChangeEvent {
  type: "controlChange";
  deltaTime: number;
  channel: number;
  controller: number;
  value: number;
}
