"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotation } from "@/contexts/NotationContext";

const NAV_ITEMS = [
  { href: "/", label: "Studio" },
  { href: "/flashcards", label: "Sight Reading" },
  { href: "/game", label: "Performance" },
  { href: "/reference", label: "Repertoire" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { notation, toggleNotation } = useNotation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-gold/15 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <span className="gold-text text-lg opacity-60">{"\u{1D11E}"}</span>
          <span className="gold-gradient-text text-xl font-bold tracking-wide">
            Violin Studio
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                "after:absolute after:bottom-0 after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:bg-gold after:transition-all after:duration-300",
                pathname === item.href
                  ? "gold-text after:w-3/4"
                  : "text-muted-foreground hover:text-foreground hover:after:w-1/2"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Notation toggle */}
          <button
            onClick={toggleNotation}
            className="rounded-full border border-gold/20 px-3 py-1 text-xs font-bold tracking-wider text-muted-foreground transition-all hover:border-gold/40 hover:text-foreground"
          >
            {notation === "abc" ? "ABC" : "DoReMi"}
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-gold/10 transition-all duration-300 md:hidden",
          mobileOpen ? "max-h-64" : "max-h-0 border-t-0"
        )}
      >
        <div className="mx-auto max-w-5xl space-y-1 px-4 py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block rounded-md px-4 py-3 text-sm font-semibold transition-colors",
                pathname === item.href
                  ? "gold-text bg-gold/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-gold/5"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="gold-divider" />
    </nav>
  );
}
