"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on game page — it needs full viewport height
  if (pathname === "/game") return null;

  return (
    <footer className="border-t border-gold/10 py-8">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <div className="gold-divider mx-auto mb-4 w-32" />
        <p className="text-sm font-semibold tracking-wider text-muted-foreground">
          Violin Studio
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Crafted for violinists
        </p>
      </div>
    </footer>
  );
}
