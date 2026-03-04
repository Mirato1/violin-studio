"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNotation } from "@/contexts/NotationContext";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/game", label: "Guitar Hero" },
  { href: "/reference", label: "Reference" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { notation, toggleNotation } = useNotation();

  return (
    <nav className="border-b border-gold/20 bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link href="/" className="gold-text text-xl font-bold tracking-wide">
          Violin Studio
        </Link>
        <div className="flex gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-semibold transition-all",
                pathname === item.href
                  ? "gold-text bg-gold/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-gold/5"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <button
          onClick={toggleNotation}
          className="ml-auto rounded-md border border-gold/20 px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-all hover:border-gold/40 hover:text-foreground hover:bg-gold/5"
        >
          {notation === "abc" ? "ABC" : "Do Re Mi"}
        </button>
      </div>
      <div className="gold-divider" />
    </nav>
  );
}
