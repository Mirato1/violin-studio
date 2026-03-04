"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import {
  type NotationMode,
  loadNotationPreference,
  saveNotationPreference,
} from "@/lib/notation";

interface NotationContextValue {
  notation: NotationMode;
  toggleNotation: () => void;
}

const NotationContext = createContext<NotationContextValue>({
  notation: "abc",
  toggleNotation: () => {},
});

export function NotationProvider({ children }: { children: ReactNode }) {
  const [notation, setNotation] = useState<NotationMode>("abc");

  useEffect(() => {
    setNotation(loadNotationPreference());
  }, []);

  const toggleNotation = useCallback(() => {
    setNotation((prev) => {
      const next = prev === "abc" ? "solfege" : "abc";
      saveNotationPreference(next);
      return next;
    });
  }, []);

  return (
    <NotationContext.Provider value={{ notation, toggleNotation }}>
      {children}
    </NotationContext.Provider>
  );
}

export function useNotation() {
  return useContext(NotationContext);
}
