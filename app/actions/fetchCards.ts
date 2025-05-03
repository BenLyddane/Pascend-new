import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database.types";

export type SpecialProperty = Database["public"]["Tables"]["special_properties"]["Row"];
export type CardProperty = Database["public"]["Tables"]["card_properties"]["Row"] & {
  special_properties: SpecialProperty;
};

export type TradeListing = {
  id: string;
  token_price: number;
  status: Database["public"]["Enums"]["trade_listing_status"];
};

export type Card = Database["public"]["Tables"]["cards"]["Row"] & {
  card_properties?: CardProperty[];
  trade_listings?: TradeListing[];
};

// Helper function to merge special effects from both sources
import { CardWithEffects } from "./fetchDecks";

export function mergeSpecialEffects(card: Card): CardWithEffects {
  const dbEffects = card.card_properties?.map(cp => ({
    name: cp.special_properties.name,
    description: cp.special_properties.description,
    effect_type: cp.special_properties.effect_type,
    effect_icon: cp.special_properties.effect_icon,
    value: cp.value || cp.special_properties.value || 0
  })) || [];

  let jsonEffects: {
    name: string;
    description: string;
    effect_type: string;
    effect_icon: string;
    value: number;
  }[] = [];

  if (card.special_effects) {
    try {
      const effects = typeof card.special_effects === 'string' 
        ? JSON.parse(card.special_effects) 
        : card.special_effects;
      
      if (Array.isArray(effects)) {
        jsonEffects = effects.map(effect => ({
          name: String(effect.name || ''),
          description: String(effect.description || ''),
          effect_type: String(effect.effect_type || ''),
          effect_icon: String(effect.effect_icon || ''),
          value: Number(effect.value || 0)
        }));
      }
    } catch (error) {
      console.error('Error parsing special effects:', error);
    }
  }

  const { special_effects: _, ...cardWithoutEffects } = card;
  
  // Create a map to track unique effects by name to avoid duplicates
  const uniqueEffects = new Map();
  
  // Process all effects and keep only unique ones
  [...dbEffects, ...jsonEffects].forEach(effect => {
    const key = `${effect.name}-${effect.effect_type}`;
    // Only keep the first occurrence of each effect
    if (!uniqueEffects.has(key)) {
      uniqueEffects.set(key, effect);
    }
  });
  
  return {
    ...cardWithoutEffects,
    special_effects: Array.from(uniqueEffects.values())
  };
}

export async function fetchCards(userId: string): Promise<Card[]> {
  console.log("Fetching cards for user:", userId);

  const supabase = await createClient();

  try {
    const { data: cards, error } = await supabase
      .from("cards")
      .select(`
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
      `)
      .eq("user_id", userId)
      .eq("is_active", true);

    console.log("Query result:", { cards, error });

    if (error) {
      console.error("Error fetching cards:", error);
      return [];
    }

    if (!cards || cards.length === 0) {
      console.log("No cards found for user");
      return [];
    }

    return cards;
  } catch (e) {
    console.error("Unexpected error in fetchCards:", e);
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
    .select("rarity")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching collection stats:", error);
    return {
      total: 0,
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };
  }

  // Calculate stats
  const stats = cards?.reduce(
    (acc, card) => {
      acc.total += 1;
      const rarity = card.rarity?.toLowerCase() || "";

      if (rarity === "common") acc.common += 1;
      else if (rarity === "rare") acc.rare += 1;
      else if (rarity === "epic") acc.epic += 1;
      else if (rarity === "legendary") acc.legendary += 1;

      return acc;
    },
    {
      total: 0,
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    }
  );

  return (
    stats || {
      total: 0,
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    }
  );
}
