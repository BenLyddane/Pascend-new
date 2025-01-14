"use server";

import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database.types";
import { mergeSpecialEffects } from "./fetchCards";

// Define base types from database schema
type Card = Database["public"]["Tables"]["cards"]["Row"];
type PlayerDeck = Database["public"]["Tables"]["player_decks"]["Row"];
type SpecialProperty =
  Database["public"]["Tables"]["special_properties"]["Row"];

// Define the extended types that include relationships
export type CardWithEffects = Omit<Card, "special_effects"> & {
  special_effects: {
    name: string;
    description: string;
    effect_type: string;
    effect_icon: string;
    value: number;
  }[];
  special_properties?: SpecialProperty[];
  trade_listings?: {
    id: string;
    token_price: number;
    status: Database["public"]["Enums"]["trade_listing_status"];
  }[];
};

export type DeckWithCards = Omit<PlayerDeck, "card_list"> & {
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
    // Fetch all active cards for the user with their special properties
    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select(
        `
        *,
        trade_listings(
          id,
          token_price,
          status
        ),
        card_properties:card_properties(
          value,
          special_properties:special_properties(
            name,
            description,
            effect_type,
            effect_icon,
            value,
            power_level,
            rarity_modifier,
            allowed_rarities,
            combo_tags
          )
        )
      `
      )
      .eq("user_id", userId)
      .eq("is_active", true);

    if (cardsError) throw cardsError;

    // Fetch all active decks for the user
    const { data: decks, error: decksError } = await supabase
      .from("player_decks")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (decksError) throw decksError;

    // Transform decks data to include full card objects
    const normalizedDecks: DeckWithCards[] = decks.map((deck) => {
      // Parse the card_list JSON and match with full card objects
      const cardList = deck.card_list as { id: string }[];
      const deckCards = cardList
        .map(({ id }) => {
          const card = cards.find((card) => card.id === id);
          if (!card) return undefined;

          // Use mergeSpecialEffects to handle both special_properties and special_effects
          return mergeSpecialEffects(card);
        })
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
