import { TempCard } from "@/types/game.types";
import { ClientTempCardCarousel } from "../temp-card-carousel";

interface PreviousCardsSectionProps {
  cards: TempCard[];
  currentNewCardIds: string[];
  userId: string;
}

export function PreviousCardsSection({
  cards,
  currentNewCardIds,
  userId,
}: PreviousCardsSectionProps) {
  const previousCards = cards.filter(
    (card) => !currentNewCardIds.includes(card.id)
  );

  if (previousCards.length === 0) return null;

  return (
    <>
      <div className="my-8 flex items-center">
        <div className="flex-grow h-px bg-border"></div>
        <span className="px-4 text-sm text-muted-foreground">
          Previously Generated Cards
        </span>
        <div className="flex-grow h-px bg-border"></div>
      </div>
      <ClientTempCardCarousel
        cards={previousCards}
        userId={userId}
      />
    </>
  );
}
