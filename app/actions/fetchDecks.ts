"use server";

import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database.types";

// Define base types from database schema
type Card = Database['public']['Tables']['cards']['Row'];
type PlayerDeck = Database['public']['Tables']['player_decks']['Row'];

// Define the extended types that include relationships
export type CardWithEffects = Card;

export type DeckWithCards = Omit<PlayerDeck, 'card_list'> & {
  cards: CardWithEffects[];
};

// Define return type for the function
export interface FetchDecksResult {
  decks: DeckWithCards[];
  cards: CardWithEffects[];
}

export async function fetchDecks(userId: string): Promise<FetchDecksResult> {
  const supabase = await createClient();

  try {
    // Fetch all active cards for the user
    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select('*')
      .eq("user_id", userId)
      .eq("is_active", true);

    if (cardsError) throw cardsError;

    // Fetch all active decks for the user
    const { data: decks, error: decksError } = await supabase
      .from("player_decks")
      .select('*')
      .eq("user_id", userId)
      .eq("is_active", true);

    if (decksError) throw decksError;

    // Transform decks data to include full card objects
    const normalizedDecks: DeckWithCards[] = decks.map((deck) => {
      // Parse the card_list JSON and match with full card objects
      const cardList = deck.card_list as { id: string }[];
      const deckCards = cardList
        .map(({ id }) => cards.find(card => card.id === id))
        .filter((card): card is CardWithEffects => card !== undefined);

      // Create the deck object without the card_list property
      const { card_list, ...deckWithoutCards } = deck;

      return {
        ...deckWithoutCards,
        cards: deckCards,
      };
    });

    return {
      decks: normalizedDecks,
      cards: cards,
    };
  } catch (error) {
    console.error("Error fetching decks and cards:", error);
    throw new Error("Failed to fetch decks and cards");
  }
}
