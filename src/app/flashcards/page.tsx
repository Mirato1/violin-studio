import FlashcardDeck from "@/components/flashcards/FlashcardDeck";

export default function FlashcardsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Flashcards</h1>
        <p className="text-muted-foreground">
          Practice reading notes on the staff. Cards you struggle with will appear more often.
        </p>
      </div>
      <FlashcardDeck />
    </div>
  );
}
