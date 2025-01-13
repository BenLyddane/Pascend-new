"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { keepCard } from "@/app/actions/keepCard";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/game-card";
import type { Database } from "@/types/database.types";
import { TempCard } from "@/types/game.types";

type DbCard = Database["public"]["Tables"]["cards"]["Row"];
type DbSpecialProperty = Database["public"]["Tables"]["special_properties"]["Row"];

type GameCardType = {
  id: string;
  name: string;
  description: string;
  power: number;
  health: number;
  modifier: number | null;
  rarity: string;
  image_url: string | null;
  special_effects?: DbSpecialProperty[] | null;
  edition: string;
  is_active: boolean | null;
  keywords: string[] | null;
  user_id: string;
  created_at: string | null;
};

interface ClientTempCardCarouselProps {
  cards: TempCard[];
  userId: string;
}

export function ClientTempCardCarousel({
  cards: initialCards,
  userId,
}: ClientTempCardCarouselProps) {
  const [cards, setCards] = useState(initialCards);
  const [currentStartIndex, setCurrentStartIndex] = useState(0);
  const [isKeeping, setIsKeeping] = useState<string | null>(null);
  const { toast } = useToast();

  if (!cards || cards.length === 0) {
    return null;
  }

  const cardsPerSlide = 3;
  const visibleCards = cards.slice(
    currentStartIndex,
    currentStartIndex + cardsPerSlide
  );

  const handlePrev = () => {
    setCurrentStartIndex((prev) => Math.max(prev - cardsPerSlide, 0));
  };

  const handleNext = () => {
    const nextIndex = currentStartIndex + cardsPerSlide;
    if (nextIndex < cards.length) {
      setCurrentStartIndex(nextIndex);
    }
  };

  const handleKeep = async (cardId: string) => {
    setIsKeeping(cardId);
    try {
      // Find the card being kept to get its gen_id
      const keptCard = cards.find((card) => card.id === cardId);
      if (!keptCard) return;

      await keepCard({ keptCardId: cardId, userId });

      // Remove all cards with the same gen_id from the state
      setCards((prevCards) => {
        const newCards = prevCards.filter(
          (card) => card.gen_id !== keptCard.gen_id
        );

        // Adjust currentStartIndex if necessary
        if (currentStartIndex >= newCards.length) {
          setCurrentStartIndex(Math.max(0, newCards.length - cardsPerSlide));
        }

        return newCards;
      });

      toast({
        title: "Success",
        description: "Card has been kept successfully!",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to keep card:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to keep the card. Please try again.",
        duration: 3000,
      });
    } finally {
      setIsKeeping(null);
    }
  };

  const canGoPrev = currentStartIndex > 0;
  const canGoNext = currentStartIndex + cardsPerSlide < cards.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {cards.length > cardsPerSlide ? `Showing ${currentStartIndex + 1}-${Math.min(currentStartIndex + cardsPerSlide, cards.length)} of ${cards.length} Cards` : "Available Cards"}
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCards.map((card) => (
          <div key={card.id} className="flex flex-col space-y-4">
            <GameCard 
              card={{
                ...card,
                edition: "standard",
                is_active: true,
                keywords: [],
                user_id: userId,
                special_effects: card.special_effects as DbSpecialProperty[] | null
              } satisfies GameCardType} 
            />
            <Button
              onClick={() => handleKeep(card.id)}
              disabled={isKeeping === card.id}
              className="w-full"
            >
              {isKeeping === card.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Keeping...
                </>
              ) : (
                "Keep Card"
              )}
            </Button>
          </div>
        ))}
      </div>

      {cards.length > cardsPerSlide && (
        <div className="flex justify-between items-center mt-6">
          <Button 
            variant="outline" 
            onClick={handlePrev} 
            disabled={!canGoPrev}
            className="w-[100px]"
          >
            ← Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {Math.floor(currentStartIndex / cardsPerSlide) + 1} of {Math.ceil(cards.length / cardsPerSlide)}
          </span>
          <Button 
            variant="outline" 
            onClick={handleNext} 
            disabled={!canGoNext}
            className="w-[100px]"
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
