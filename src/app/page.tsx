import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    href: "/flashcards",
    title: "Flashcards",
    description: "Learn to read notes on the staff with spaced repetition. Master each note at your own pace.",
    icon: "🎯",
  },
  {
    href: "/game",
    title: "Guitar Hero Mode",
    description: "Watch notes fall in real-time as you play along. Upload MIDI files or use built-in songs.",
    icon: "🎮",
  },
  {
    href: "/reference",
    title: "Reference",
    description: "Browse all first-position notes organized by string. See staff notation, finger numbers, and positions.",
    icon: "📚",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Violin Studio</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          From tablature to sheet music — learn to read notes on the staff
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <Link key={f.href} href={f.href}>
            <Card className="h-full transition-colors hover:bg-accent/50">
              <CardHeader>
                <div className="text-3xl">{f.icon}</div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
