import * as Tone from "tone";

export interface ViolinSynthEngine {
  synth: Tone.PolySynth;
  vibrato: Tone.Vibrato;
  eq: Tone.EQ3;
  reverb: Tone.Reverb;
  volume: Tone.Volume;
}

export async function createViolinSynth(): Promise<ViolinSynthEngine> {
  const volume = new Tone.Volume(0);

  const eq = new Tone.EQ3({
    low: -6,
    mid: 3,
    high: -3,
  });

  const reverb = new Tone.Reverb({
    decay: 1.5,
    wet: 0.2,
  });

  // CRITICAL: Reverb generates its impulse response async.
  // Must await before chaining, otherwise audio is blocked.
  await reverb.ready;

  const vibrato = new Tone.Vibrato({
    frequency: 5,
    depth: 0.1,
    type: "sine",
  });

  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "fatsawtooth",
      count: 3,
      spread: 20,
    },
    envelope: {
      attack: 0.1,
      decay: 0.3,
      sustain: 0.8,
      release: 0.4,
    },
  });

  synth.chain(vibrato, eq, reverb, volume, Tone.getDestination());

  return { synth, vibrato, eq, reverb, volume };
}

export function disposeViolinSynth(engine: ViolinSynthEngine) {
  engine.synth.dispose();
  engine.vibrato.dispose();
  engine.eq.dispose();
  engine.reverb.dispose();
  engine.volume.dispose();
}
