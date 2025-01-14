import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { GameAction, GameState } from "@/app/protected/play/game-engine/types";
import { GameMode } from "@/app/protected/play/game-modes/types";
import { ServerGameEngine } from "../../server-game-engine";
import { validateGameAction, validateGameState } from "../../validate-game-action";
import { validateAndConvertGameState, serializeGameState } from "../utils/state-converter";

export interface ProcessTurnPayload {
  action: GameAction;
  mode: GameMode;
}

export async function processTurn(
  supabase: SupabaseClient<Database>,
  gameId: string,
  payload: ProcessTurnPayload
) {
  let processingSet = false;
  
  try {
    // Get game from database
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

    // Only handle processing flag in non-practice modes
    if (payload.mode !== "practice") {
      // Check if game is already being processed
      if (game.processing) {
        return {
          error: "Game is being processed",
          status: 400
        };
      }

      // Set processing flag
      const { error: processingError } = await supabase
        .from("active_games")
        .update({ processing: true })
        .eq("id", gameId);

      if (processingError) {
        console.error("[GameEngine] Error setting processing flag:", processingError);
        return {
          error: "Failed to acquire processing lock",
          status: 500
        };
      }
      
      processingSet = true;
    }
    // Initialize game engine with stored state
    const currentState = validateAndConvertGameState(game.game_state);
    console.log("[GameEngine] Retrieved game state:", currentState);

    const gameEngine = new ServerGameEngine([], [], currentState);
    const stateValidation = validateGameState(currentState);
    if (!stateValidation.isValid) {
      return {
        error: stateValidation.error,
        status: 400
      };
    }

    // Process the action without validation in practice mode
    console.log("[GameEngine] Processing action for mode:", payload.mode);

    if (payload.mode !== "practice") {
      const actionValidation = validateGameAction(
        payload.action,
        currentState,
        true
      );
      if (!actionValidation.isValid) {
        return {
          error: actionValidation.error,
          status: 400
        };
      }
    }

    // Process the action
    const actionResult = gameEngine.processAction(payload.action);
    if (!actionResult.success) {
      return {
        error: actionResult.error,
        status: 400
      };
    }

    const newState = gameEngine.getGameState();
    const currentVersion = currentState.version || 0;

    // Update with optimistic locking
    const { error: updateError } = await supabase
      .from("active_games")
      .update({
        game_state: serializeGameState({
          ...newState,
          version: currentVersion + 1
        }),
        status: newState.winner ? "completed" : "in_progress",
        winner_id: newState.winner ? game.player1_id : null,
        last_processed: new Date().toISOString()
      })
      .eq("id", gameId)
      .eq("game_state->version", currentVersion);

    if (updateError) {
      console.error("[GameEngine] Error updating game state:", updateError);
      // If version mismatch, return current state to client
      if (updateError.message?.includes('version')) {
        const { data: freshGame } = await supabase
          .from("active_games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (freshGame) {
          return {
            result: { success: false, error: "State was updated by another process" },
            state: validateAndConvertGameState(freshGame.game_state)
          };
        }
      }
      return {
        error: "Failed to update game state",
        status: 500
      };
    }

    return {
      data: {
        result: actionResult,
        state: newState,
      }
    };
  } catch (error) {
    console.error("Error processing turn:", error);
    return {
      error: "Internal server error",
      status: 500
    };
  } finally {
    // Clear processing flag in non-practice modes if it was set
    if (processingSet) {
      const { error: clearError } = await supabase
        .from("active_games")
        .update({ processing: false })
        .eq("id", gameId);

      if (clearError) {
        console.error("[GameEngine] Error clearing processing flag:", clearError);
      }
    }
  }
}
