import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Music, Gamepad2, BookOpen, ChevronDown, ArrowRight } from "lucide-react";

const features = [
  {
    href: "/flashcards",
    title: "Sight Reading",
    description: "Learn to read notes on the staff with spaced repetition. Master each note at your own pace.",
    icon: Music,
  },
  {
    href: "/game",
    title: "Performance",
    description: "Watch notes fall in real-time as you play along. Upload MIDI files or use built-in songs.",
    icon: Gamepad2,
  },
  {
    href: "/reference",
    title: "Repertoire",
    description: "Browse all notes organized by string, position, and finger number with staff notation.",
    icon: BookOpen,
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-4">
        {/* Radial warm spotlight */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 35%, oklch(0.20 0.04 75 / 0.6), transparent 70%)",
          }}
        />

        {/* Treble clef watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="select-none text-[20rem] leading-none text-gold/3">
            {"\u{1D11E}"}
          </span>
        </div>

        <div className="relative z-10 text-center">
          <h1 className="animate-fade-in-up gold-gradient-text text-6xl font-light tracking-tighter md:text-8xl">
            Violin Studio
          </h1>
          <div className="animate-fade-in-up-1 gold-divider animate-shimmer mx-auto mt-6 w-64" />
          <p className="animate-fade-in-up-2 mt-6 text-lg text-muted-foreground md:text-xl">
            Master the art of reading music on violin
          </p>
          <Link
            href="/flashcards"
            className="animate-fade-in-up-3 mt-8 inline-flex items-center gap-2 rounded-full border border-gold/30 px-6 py-2.5 text-sm font-semibold text-gold transition-all hover:border-gold/60 hover:bg-gold/10 hover:gold-glow"
          >
            Begin Practicing
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ChevronDown size={24} className="animate-bounce-subtle text-muted-foreground/40" />
        </div>
      </section>

      {/* Quote Section */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="gold-divider mx-auto w-24" />
          <blockquote className="mt-8 text-xl italic text-muted-foreground md:text-2xl">
            &ldquo;Music is the shorthand of emotion.&rdquo;
          </blockquote>
          <cite className="mt-3 block text-sm font-semibold tracking-wider text-gold-dim">
            &mdash; Leo Tolstoy
          </cite>
          <div className="gold-divider mx-auto mt-8 w-24" />
        </div>
      </section>

      {/* Feature Cards */}
      <section className="px-4 pb-20 pt-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="animate-fade-in-up mb-8 text-center text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Your Practice Suite
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {features.map((f, i) => (
              <Link key={f.href} href={f.href} className={`animate-fade-in-up-${i + 1}`}>
                <Card className="group h-full transition-transform duration-300 hover:scale-[1.03]">
                  <CardHeader>
                    <f.icon
                      size={32}
                      strokeWidth={1.5}
                      className="gold-text transition-transform duration-300 group-hover:scale-110"
                    />
                    <CardTitle className="mt-2 text-lg">{f.title}</CardTitle>
                    <CardDescription className="text-sm">{f.description}</CardDescription>
                    <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-gold-dim transition-colors group-hover:text-gold">
                      Explore
                      <ArrowRight size={12} />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
