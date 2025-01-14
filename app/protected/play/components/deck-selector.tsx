"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CardRarity } from "@/types/game.types";
import {
  GameCard,
  CardEffect,
  convertToGameCard,
} from "@/app/protected/play/game-engine/types";
import { GameCardMinimal } from "@/components/game-card-minimal";
import { GameCard as GameCardFull } from "@/components/game-card";
import {
  fetchDecks,
  type DeckWithCards,
  type CardWithEffects,
} from "@/app/actions/fetchDecks";
import { mergeSpecialEffects } from "@/app/actions/fetchCards";
import { Database } from "@/types/database.types";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Helper function to convert between deck types
function convertDeck(
  deck: DeckWithCards
): Database["public"]["Tables"]["player_decks"]["Row"] & { cards: GameCard[] } {
  return {
    ...deck,
    card_list: deck.cards.map((card) => ({ id: card.id })),
    cards: deck.cards.map((card) => ({
      ...card,
      gameplay_effects: card.special_effects.map((effect) => ({
        effect_type: effect.effect_type,
        effect_icon: effect.effect_icon,
        value: effect.value,
      })),
    })) as GameCard[],
  };
}
import { createClient } from "@/utils/supabase/client";

export default function DeckSelector({
  onDeckSelect,
  selectedDeck,
  label = "Select a Deck",
}: {
  onDeckSelect: (
    deck:
      | DeckWithCards
      | (Database["public"]["Tables"]["player_decks"]["Row"] & {
          cards: GameCard[];
        })
  ) => void;
  selectedDeck?:
    | DeckWithCards
    | (Database["public"]["Tables"]["player_decks"]["Row"] & {
        cards: GameCard[];
      })
    | null;
  label?: string;
}) {
  const [decks, setDecks] = useState<DeckWithCards[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyEligible, setShowOnlyEligible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDeckForPreview, setSelectedDeckForPreview] =
    useState<DeckWithCards | null>(null);
  const decksPerPage = 6;
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);

  const isDeckEligible = (deck: DeckWithCards) => {
    // Check if deck has exactly 5 cards
    if (deck.cards.length !== 5) return false;

    // Check if any cards are listed for trade
    return !deck.cards.some((card) =>
      card.trade_listings?.some((listing) => listing.status === "active")
    );
  };

  useEffect(() => {
    async function initAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    }

    initAuth();
  }, []);

  useEffect(() => {
    async function loadDecks() {
      if (!user?.id) return;
      try {
        const result = await fetchDecks(user.id);
        setDecks(result.decks);
      } catch (error) {
        console.error("Error fetching decks:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDecks();
  }, [user?.id]);

  // Filter decks based on search query and eligibility
  const filteredDecks = useMemo(() => {
    return decks.filter((deck) => {
      const matchesSearch = deck.name?.toLowerCase().includes(searchQuery.toLowerCase() || "") ?? false;
      if (showOnlyEligible) {
        return matchesSearch && isDeckEligible(deck);
      }
      return matchesSearch;
    });
  }, [decks, searchQuery, showOnlyEligible]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredDecks.length / decksPerPage);
  const startIndex = (currentPage - 1) * decksPerPage;
  const paginatedDecks = filteredDecks.slice(
    startIndex,
    startIndex + decksPerPage
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{label}</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyEligible}
              onChange={(e) => {
                setShowOnlyEligible(e.target.checked);
                setCurrentPage(1); // Reset to first page when filter changes
              }}
              className="rounded border-gray-300"
            />
            Only Eligible Decks
          </label>
          <Input
            type="text"
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedDecks.map((deck) => (
          <TooltipProvider key={deck.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`p-4 rounded-lg border-2 transition-all h-[360px] ${
                    selectedDeck?.id === deck.id
                      ? "border-primary bg-primary/10"
                      : !isDeckEligible(deck)
                        ? "border-muted opacity-50"
                        : "border-muted"
                  }`}
                >
                  <div className="w-full">
                    <div 
                      className="mb-2 cursor-pointer hover:opacity-80"
                      onClick={() => setSelectedDeckForPreview(deck)}
                    >
                      <div className="h-[24px] overflow-hidden">
                        <h4 className="font-medium truncate">{deck.name}</h4>
                      </div>
                      <div className="text-sm text-muted-foreground h-[20px] overflow-hidden">
                        {deck.wins || 0}W - {deck.losses || 0}L
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      {deck.cards[0] && (
                        <div className="w-full">
                          <GameCardMinimal
                            card={deck.cards[0] as CardWithEffects}
                            className="w-full"
                            disableModal
                            onClick={() => setSelectedDeckForPreview(deck)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2">
                    {isDeckEligible(deck) ? (
                      <button
                        onClick={() =>
                          onDeckSelect(
                            "gameplay_effects" in deck.cards[0]
                              ? deck
                              : convertDeck(deck)
                          )
                        }
                        className="w-full px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Submit Deck
                      </button>
                    ) : (
                      <div className="w-full px-4 py-2 rounded border border-destructive bg-destructive/10 text-destructive text-center text-sm">
                        {deck.cards.length !== 5
                          ? "Deck requires exactly 5 cards"
                          : "Cards listed for trade"}
                      </div>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      <Dialog
        open={!!selectedDeckForPreview}
        onOpenChange={() => setSelectedDeckForPreview(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDeckForPreview?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pb-4">
            {selectedDeckForPreview?.cards.map((card, index) => (
              <GameCardFull
                key={card.id}
                card={card as CardWithEffects}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-primary/10 hover:bg-primary/20 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-primary/10 hover:bg-primary/20 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
