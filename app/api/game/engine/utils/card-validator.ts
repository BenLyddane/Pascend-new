import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { GameCard } from "@/app/protected/play/game-engine/types";
import { GameMode } from "@/app/protected/play/game-modes/types";

export async function validateGameCards(
  supabase: SupabaseClient<Database, "public", Database["public"]>,
  userId: string,
  player1Cards: GameCard[],
  player2Cards: GameCard[],
  mode: GameMode
) {
  // Skip validation in practice mode
  if (mode === "practice") {
    return { success: true };
  }

  try {
    // Get all cards that should belong to the players
    const { data: userCards, error } = await supabase
      .from("cards")
      .select("id, user_id")
      .in("id", [...player1Cards.map((c) => c.id)]);

    if (error) throw error;

    if (!userCards) {
      return { success: false, error: "Failed to fetch cards" };
    }

    // Only validate player 1's cards in multiplayer
    const player1Valid = player1Cards.every((card) =>
      userCards.some(
        (userCard) => userCard.id === card.id && userCard.user_id === userId
      )
    );

    if (!player1Valid) {
      return { success: false, error: "Invalid cards in deck" };
    }

    return { success: true };
  } catch (error) {
    console.error("Card validation error:", error);
    return { success: false, error: "Failed to validate cards" };
  }
}
