import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database.types";

export type Card = Database['public']['Tables']['cards']['Row'];
export type PlayerCard = Database['public']['Tables']['player_cards']['Row'] & {
  card: Card;
};

export async function fetchCards(userId: string): Promise<Card[]> {
  console.log('Fetching cards for user:', userId);
  
  const supabase = await createClient();
  
  try {
    const { data: cards, error } = await supabase
      .from("cards")
      .select('*')
      .eq("user_id", userId)
      .eq("is_active", true);

    console.log('Query result:', { cards, error });

    if (error) {
      console.error("Error fetching cards:", error);
      return [];
    }

    if (!cards || cards.length === 0) {
      console.log('No cards found for user');
      return [];
    }

    return cards;
  } catch (e) {
    console.error('Unexpected error in fetchCards:', e);
    return [];
  }
}

export async function fetchCollectionStats(userId: string): Promise<{
  total: number;
  common: number;
  rare: number;
  epic: number;
  legendary: number;
}> {
  const supabase = await createClient();
  
  // Get all active cards for the user
  const { data: cards, error } = await supabase
    .from("cards")
    .select('rarity')
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching collection stats:", error);
    return {
      total: 0,
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    };
  }

  // Calculate stats
  const stats = cards?.reduce((acc, card) => {
    acc.total += 1;
    const rarity = card.rarity?.toLowerCase() || '';
    
    if (rarity === 'common') acc.common += 1;
    else if (rarity === 'rare') acc.rare += 1;
    else if (rarity === 'epic') acc.epic += 1;
    else if (rarity === 'legendary') acc.legendary += 1;
    
    return acc;
  }, {
    total: 0,
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0
  });

  return stats || {
    total: 0,
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0
  };
}
