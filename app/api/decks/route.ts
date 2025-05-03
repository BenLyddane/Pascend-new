import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { mergeSpecialEffects } from "@/app/actions/fetchCards";
import type { Database } from "@/types/database.types";

// Define base types from database schema
type Card = Database["public"]["Tables"]["cards"]["Row"];
type PlayerDeck = Database["public"]["Tables"]["player_decks"]["Row"];
type SpecialProperty = Database["public"]["Tables"]["special_properties"]["Row"];

// Define the extended types that include relationships
type CardWithEffects = Omit<Card, "special_effects"> & {
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

type DeckWithCards = Omit<PlayerDeck, "card_list"> & {
  cards: CardWithEffects[];
};

// Define return type for the function
interface FetchDecksResult {
  decks: DeckWithCards[];
  cards: CardWithEffects[];
}

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
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
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (cardsError) throw cardsError;

      // Fetch all active decks for the user
      const { data: decks, error: decksError } = await supabase
        .from("player_decks")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (decksError) throw decksError;

      // Transform decks data to include full card objects
      const normalizedDecks: DeckWithCards[] = decks.map((deck) => {
        // Parse the card_list JSON and match with full card objects
        const cardList = typeof deck.card_list === 'string' 
          ? JSON.parse(deck.card_list) 
          : deck.card_list as { id: string }[];
          
        const deckCards = cardList
          .map(({ id }: { id: string }) => {
            const card = cards.find((cardItem) => cardItem.id === id);
            if (!card) return undefined;

            // Use mergeSpecialEffects to handle both special_properties and special_effects
            return mergeSpecialEffects(card);
          })
          .filter((card: CardWithEffects | undefined): card is CardWithEffects => card !== undefined);

        // Create the deck object without the card_list property
        const { card_list, ...deckWithoutCards } = deck;

        return {
          ...deckWithoutCards,
          cards: deckCards,
        };
      });

      const result: FetchDecksResult = {
        decks: normalizedDecks,
        cards: cards.map((card: Card) => mergeSpecialEffects(card)),
      };
      
      return NextResponse.json(result);
    } catch (error) {
      console.error("Error fetching decks and cards:", error);
      return NextResponse.json(
        { error: "Failed to fetch decks and cards" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching decks:", error);
    return NextResponse.json(
      { error: "Failed to fetch decks" },
      { status: 500 }
    );
  }
}
