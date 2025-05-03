'use server';

import { createClient } from "@/utils/supabase/server";
import { DeckWithCards, CardWithEffects } from "./fetchDecks";
import { mergeSpecialEffects } from "./fetchCards";
import { revalidatePath } from "next/cache";

export async function fetchDecks(): Promise<DeckWithCards[]> {
  console.log("Fetching decks from server action...");
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("User not authenticated");
      return [];
    }
    
    // Fetch all active cards for the user with their special properties
    const { data: cards, error: cardsError } = await supabase
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
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (cardsError) {
      console.error("Error fetching cards:", cardsError);
      return [];
    }

    // Fetch all active decks for the user
    const { data: decks, error: decksError } = await supabase
      .from("player_decks")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (decksError) {
      console.error("Error fetching decks:", decksError);
      return [];
    }

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
    
    // Filter decks to only include those with exactly 5 cards
    const validDecks = normalizedDecks.filter(
      (deck: DeckWithCards) => deck.cards && deck.cards.length === 5
    );
    
    console.log(`Found ${validDecks.length} valid decks`);
    
    // Revalidate the path to ensure fresh data
    revalidatePath("/protected/play");
    revalidatePath("/protected/play/practice");
    revalidatePath("/protected/play/multiplayer");
    
    return validDecks;
  } catch (error) {
    console.error("Error in fetchDecks:", error);
    return [];
  }
}
