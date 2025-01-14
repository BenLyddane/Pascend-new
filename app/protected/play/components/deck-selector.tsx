 "use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CardRarity } from "@/types/game.types";
import { GameCard, CardEffect, convertToGameCard } from "@/app/protected/play/game-engine/types";
import { GameCardMinimal } from "@/components/game-card-minimal";
import { fetchDecks, type DeckWithCards, type CardWithEffects } from "@/app/actions/fetchDecks";
import { mergeSpecialEffects } from "@/app/actions/fetchCards";
import { Database } from "@/types/database.types";

// Helper function to convert between deck types
function convertDeck(deck: DeckWithCards): Database["public"]["Tables"]["player_decks"]["Row"] & { cards: GameCard[] } {
  return {
    ...deck,
    card_list: deck.cards.map(card => ({ id: card.id })),
    cards: deck.cards.map(card => ({
      ...card,
      gameplay_effects: card.special_effects.map(effect => ({
        effect_type: effect.effect_type,
        effect_icon: effect.effect_icon,
        value: effect.value
      }))
    })) as GameCard[]
  };
}
import { createClient } from "@/utils/supabase/client";

export default function DeckSelector({
  onDeckSelect,
  selectedDeck,
  label = "Select a Deck",
}: {
  onDeckSelect: (deck: DeckWithCards | (Database["public"]["Tables"]["player_decks"]["Row"] & { cards: GameCard[] })) => void;
  selectedDeck?: DeckWithCards | (Database["public"]["Tables"]["player_decks"]["Row"] & { cards: GameCard[] }) | null;
  label?: string;
}) {
  const [decks, setDecks] = useState<DeckWithCards[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const decksPerPage = 6;
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    async function initAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
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

  // Filter decks based on search query
  const filteredDecks = useMemo(() => {
    return decks.filter(deck => 
      deck.name?.toLowerCase().includes(searchQuery.toLowerCase() || "") ?? false
    );
  }, [decks, searchQuery]);

  const hasDeckListedCards = (deck: DeckWithCards) => {
    return deck.cards.some(card => 
      card.trade_listings?.some(listing => listing.status === "active")
    );
  };

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
  const paginatedDecks = filteredDecks.slice(startIndex, startIndex + decksPerPage);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{label}</h3>
        <div className="w-64">
          <Input
            type="text"
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {paginatedDecks.map((deck) => (
          <TooltipProvider key={deck.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (!hasDeckListedCards(deck)) {
                      onDeckSelect('gameplay_effects' in deck.cards[0] ? deck : convertDeck(deck));
                    }
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedDeck?.id === deck.id
                      ? "border-primary bg-primary/10"
                      : hasDeckListedCards(deck)
                      ? "border-muted opacity-50 cursor-not-allowed"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium">{deck.name}</h4>
                {deck.description && (
                  <p className="text-sm text-muted-foreground">
                    {deck.description}
                  </p>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {deck.wins || 0}W - {deck.losses || 0}L
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              {deck.cards[0] && (
                <GameCardMinimal 
                  card={deck.cards[0] as CardWithEffects} 
                />
              )}
            </div>
                </button>
              </TooltipTrigger>
              {hasDeckListedCards(deck) && (
                <TooltipContent side="top">
                  <p>This deck contains cards that are listed for trade and cannot be used</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-primary/10 hover:bg-primary/20 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
