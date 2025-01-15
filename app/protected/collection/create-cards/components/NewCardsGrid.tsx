import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/game-card";
import { TempCard } from "@/types/game.types";
import { CardWithEffects } from "@/app/actions/fetchDecks";
import { convertToBaseCardEffects } from "@/app/utils/card-helpers";

interface NewCardsGridProps {
  cards: TempCard[];
  userId: string;
  usePurchasedToken: boolean;
  isLoading: boolean;
  onKeepCard: (cardId: string) => Promise<void>;
}

export function NewCardsGrid({
  cards,
  userId,
  usePurchasedToken,
  isLoading,
  onKeepCard,
}: NewCardsGridProps) {
  if (cards.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Recently Generated Cards</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.id} className="flex flex-col space-y-4">
            <div className="relative">
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs z-10">
                New
              </div>
              <GameCard
                card={
                  {
                    ...card,
                    edition: "standard",
                    is_active: true,
                    keywords: [],
                    user_id: userId,
                    generated_with_purchased_tokens: usePurchasedToken,
                    image_url: card.image_url || null,
                    created_at: card.created_at || null,
                    special_effects: convertToBaseCardEffects(
                      card.special_effects
                    ),
                    special_properties: [],
                  } satisfies CardWithEffects
                }
              />
            </div>
            <Button
              onClick={() => onKeepCard(card.id)}
              disabled={isLoading}
              className="w-full"
            >
              Keep Card
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
