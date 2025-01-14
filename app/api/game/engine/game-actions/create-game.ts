import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { GameCard, GameState } from "@/app/protected/play/game-engine/types";
import { GameMode } from "@/app/protected/play/game-modes/types";
import { ServerGameEngine } from "../../server-game-engine";
import { validateGameCards } from "../utils/card-validator";
import { serializeGameState } from "../utils/state-converter";

export interface CreateGamePayload {
  player1Cards: GameCard[];
  player2Cards: GameCard[];
  mode: GameMode;
  player2Id?: string;
  player1DeckId: string;
  player2DeckId: string;
}

export async function createGame(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: CreateGamePayload
) {
  const { player1Cards, player2Cards, mode, player1DeckId, player2DeckId } = payload;

  // Validate cards belong to players (skip validation in practice mode)
  const validationResult = await validateGameCards(
    supabase,
    userId,
    player1Cards,
    player2Cards,
    mode
  );
  if (!validationResult.success) {
    return {
      error: validationResult.error,
      status: 400
    };
  }

  // Validate deck sizes
  if (!player1Cards?.length || !player2Cards?.length) {
    return {
      error: "Invalid deck size",
      status: 400
    };
  }

  if (player1Cards.length !== player2Cards.length) {
    return {
      error: "Deck sizes must match",
      status: 400
    };
  }

  try {
    // Create new server-side game instance
    const gameEngine = new ServerGameEngine(player1Cards, player2Cards);
    const initialState = gameEngine.getGameState();

    // Create game record in database with initial version
    const serializedState = serializeGameState({
      ...initialState,
      version: 1
    });

    const insertData: Database["public"]["Tables"]["active_games"]["Insert"] = {
      player1_id: userId,
      player2_id: mode === "practice" ? userId : payload.player2Id || userId,
      status: "in_progress",
      game_state: serializedState,
      player1_deck_id: player1DeckId,
      player2_deck_id: player2DeckId,
      processing: false,
      last_processed: new Date().toISOString()
    };

    const { data: game, error: createError } = await supabase
      .from("active_games")
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating game:", createError);
      return {
        error: "Failed to create game",
        status: 500
      };
    }

    return {
      data: {
        gameId: game.id,
        state: initialState,
      }
    };
  } catch (error) {
    console.error("Error in createGame:", error);
    return {
      error: "Internal server error",
      status: 500
    };
  }
}
