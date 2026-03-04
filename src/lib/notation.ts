export type NotationMode = "abc" | "solfege";

const SOLFEGE_MAP: Record<string, string> = {
  C: "Do",
  D: "Re",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si",
};

/** Convert a display name like "F#", "Bb", "A" to solfège */
export function toNotation(displayName: string, mode: NotationMode): string {
  if (mode === "abc") return displayName;
  const letter = displayName.charAt(0).toUpperCase();
  const suffix = displayName.slice(1);
  return (SOLFEGE_MAP[letter] ?? letter) + suffix;
}

/** Convert a full note name like "F#5" to solfège with octave */
export function toNotationFull(noteName: string, mode: NotationMode): string {
  if (mode === "abc") return noteName;
  const octave = noteName.match(/\d+$/)?.[0] ?? "";
  const nameWithoutOctave = noteName.replace(/\d+$/, "");
  return toNotation(nameWithoutOctave, mode) + octave;
}

/** Convert a violin string letter ("G","D","A","E") to solfège */
export function stringToNotation(s: string, mode: NotationMode): string {
  if (mode === "abc") return s;
  return SOLFEGE_MAP[s] ?? s;
}

const STORAGE_KEY = "violin-studio-notation";

export function loadNotationPreference(): NotationMode {
  if (typeof window === "undefined") return "abc";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "solfege" ? "solfege" : "abc";
}

export function saveNotationPreference(mode: NotationMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, mode);
}
