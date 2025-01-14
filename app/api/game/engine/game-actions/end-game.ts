import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

export interface EndGamePayload {
  winnerId?: string;
}

export async function endGame(
  supabase: SupabaseClient<Database>,
  gameId: string,
  userId: string,
  payload: EndGamePayload
) {
  try {
    // First verify the game exists and user has permission
    const { data: game, error: fetchError } = await supabase
      .from("active_games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (fetchError || !game) {
      console.error("Error fetching game:", fetchError);
      return {
        error: "Game not found",
        status: 404
      };
    }

    // Verify user has permission to end this game
    if (game.player1_id !== userId && game.player2_id !== userId) {
      return {
        error: "Unauthorized to end this game",
        status: 403
      };
    }

    // Only end games that aren't already completed
    if (game.status !== "completed") {
      const { error: updateError } = await supabase
        .from("active_games")
        .update({
          status: "completed",
          processing: false,
          game_state: null, // Clear state to save space
          winner_id: payload.winnerId || null,
          last_processed: new Date().toISOString()
        })
        .eq("id", gameId);

      if (updateError) {
        console.error("Error ending game:", updateError);
        return {
          error: "Failed to end game",
          status: 500
        };
      }
    }

    return {
      data: {
        success: true
      }
    };
  } catch (error) {
    console.error("Error in endGame:", error);
    return {
      error: "Internal server error",
      status: 500
    };
  }
}
