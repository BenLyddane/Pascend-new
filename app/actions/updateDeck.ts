"use server";

import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database.types";

type Card = Database['public']['Tables']['cards']['Row'];
type DeckCard = Pick<Card, 'id' | 'name' | 'power' | 'health'>;

interface UpdateDeckProps {
  id: string;
  name: string;
  description: string;
  card_list: DeckCard[];
  user_id: string;
}

interface UpdateDeckResponse {
  success: boolean;
  message: string;
}

export async function updateDeck({
  id,
  name,
  description,
  card_list,
  user_id,
}: UpdateDeckProps): Promise<UpdateDeckResponse> {
  // Validate input
  if (!id || !name || !user_id || card_list.length !== 5) {
    return {
      success: false,
      message: "Invalid deck data. Please ensure you have exactly 5 cards and a deck name.",
    };
  }

  const supabase = await createClient();

  try {
    // Update the player deck
    const { error: deckError } = await supabase
      .from("player_decks")
      .update({
        name,
        description,
        card_list: card_list.map(({ id, name, power, health }) => ({
          id,
          name,
          power,
          health
        })),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user_id); // Extra safety check

    if (deckError) throw deckError;

    return {
      success: true,
      message: "Deck updated successfully!",
    };
  } catch (error) {
    console.error("Error updating deck:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update deck",
    };
  }
}
