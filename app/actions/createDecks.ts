"use server";

import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database.types";

type PlayerDeck = Database['public']['Tables']['player_decks']['Row'];
type Card = Database['public']['Tables']['cards']['Row'];

// Define the minimal card data needed for deck creation
type DeckCard = Pick<Card, 'id' | 'name' | 'power' | 'health'>;

interface CreateDeckProps {
  name: string;
  description: string;
  card_list: DeckCard[];
  user_id: string;
  deck_type: string;
}

interface CreateDeckResponse {
  id: string;
  name: string;
  description: string;
  success: boolean;
  message: string;
}

export async function createDeck({
  name,
  description,
  card_list,
  user_id,
  deck_type,
}: CreateDeckProps): Promise<CreateDeckResponse> {
  // Validate input
  if (!name || !user_id || card_list.length !== 5) {
    return {
      id: "",
      name: "",
      description: "",
      success: false,
      message: "Invalid deck data. Please ensure you have exactly 5 cards and a deck name.",
    };
  }

  const supabase = await createClient();

  try {
    // Create the player deck with the card list stored as JSON
    const { data: deck, error: deckError } = await supabase
      .from("player_decks")
      .insert({
        name,
        description,
        user_id,
        is_active: true,
        deck_type,
        card_list: card_list.map(({ id, name, power, health }) => ({
          id,
          name,
          power,
          health
        })),
        wins: 0,
        losses: 0,
        total_matches: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (deckError) throw deckError;

    return {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      success: true,
      message: "Deck created successfully!",
    };
  } catch (error) {
    console.error("Error creating deck:", error);
    return {
      id: "",
      name: "",
      description: "",
      success: false,
      message: error instanceof Error ? error.message : "Failed to create deck",
    };
  }
}
