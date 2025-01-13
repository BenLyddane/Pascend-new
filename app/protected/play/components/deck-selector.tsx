"use client";

import { useState, useEffect } from "react";
import { Card, Deck, CardRarity } from "@/types/game.types";
import { GameCard } from "@/components/game-card";
import { fetchDecks, type DeckWithCards } from "@/app/actions/fetchDecks";
import { createClient } from "@/utils/supabase/client";

export default function DeckSelector({
  onDeckSelect,
  selectedDeck,
  label = "Select a Deck",
}: {
  onDeckSelect: (deck: Deck) => void;
  selectedDeck?: Deck | null;
  label?: string;
}) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
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
        // Convert DeckWithCards to Deck ensuring all required fields
        const convertedDecks: Deck[] = result.decks.map((deck) => ({
          id: deck.id,
          name: deck.name,
          cards: deck.cards.map((card) => ({
            id: card.id,
            name: card.name,
            description: card.description,
            power: card.power,
            health: card.health,
            rarity: card.rarity as CardRarity,
            created_at: card.created_at ?? null,
            image_url: card.image_url ?? null,
            is_active: card.is_active ?? null,
            keywords: card.keywords ?? null,
            modifier: card.modifier ?? null,
            special_effects: card.special_effects ?? null,
            user_id: card.user_id,
            edition: card.edition,
          })),
          created_at: deck.created_at || new Date().toISOString(),
          user_id: deck.user_id || user.id,
          description: deck.description || undefined,
          deck_type: deck.deck_type,
          is_active: deck.is_active || undefined,
          last_used_at: deck.last_used_at || undefined,
          wins: deck.wins || undefined,
          losses: deck.losses || undefined,
          total_matches: deck.total_matches || undefined,
        }));
        setDecks(convertedDecks);
      } catch (error) {
        console.error("Error fetching decks:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDecks();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{label}</h3>

      <div className="grid grid-cols-2 gap-4">
        {decks.map((deck) => (
          <button
            key={deck.id}
            onClick={() => onDeckSelect(deck)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedDeck?.id === deck.id
                ? "border-primary bg-primary/10"
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

            <div className="flex gap-2 overflow-x-auto pb-2">
              {deck.cards.slice(0, 3).map((card) => (
                <div key={card.id} className="flex-shrink-0 w-24">
                  <GameCard card={card} />
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
