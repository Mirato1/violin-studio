import FlashcardDeck from "@/components/flashcards/FlashcardDeck";

export default function FlashcardsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="gold-text text-3xl font-bold tracking-tight">Flashcards</h1>
        <div className="gold-divider mt-2 w-24" />
        <p className="mt-2 text-muted-foreground">
          Practice reading notes on the staff. Cards you struggle with will appear more often.
        </p>
      </div>
      <FlashcardDeck />
    </div>
  );
}
