import FlashcardDeck from "@/components/flashcards/FlashcardDeck";

export default function FlashcardsPage() {
  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-6 px-4 py-8">
      <div className="animate-fade-in-up">
        <h1 className="gold-gradient-text text-3xl font-bold tracking-tight">Sight Reading</h1>
        <div className="gold-divider mt-2 w-24" />
        <p className="mt-2 text-muted-foreground">
          Practice reading notes on the staff. Cards you struggle with will appear more often.
        </p>
      </div>
      <FlashcardDeck />
    </div>
  );
}
