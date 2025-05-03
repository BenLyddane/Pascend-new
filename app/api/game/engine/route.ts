import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { GameState, createInitialGameState } from "@/app/protected/play/game-engine/types";
import { validateGameAction } from "@/app/api/game/validate-game-action";
import { validateAndConvertGameState, convertGameStateForDatabase } from "./utils/state-converter";
import { GameAction, processGameAction } from "./game-actions";

// Define the request types
interface CreateGameRequest {
  action: "CREATE_GAME";
  payload: {
    player1Cards: any[];
    player2Cards: any[];
    player1DeckId: string;
    player2DeckId: string;
    mode: string;
    initialVersion?: number;
    player1GoesFirst?: boolean;
    player2Id?: string;
  };
}

interface ProcessTurnRequest {
  action: "PROCESS_TURN";
  gameId: string;
  payload: {
    action: GameAction;
    mode?: string;
  };
}

type GameEngineRequest = CreateGameRequest | ProcessTurnRequest;

// Handler for POST requests
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse the request body
    const body: GameEngineRequest = await request.json();
    
    // Handle the request based on the action
    switch (body.action) {
      case "CREATE_GAME":
        return handleCreateGame(body, user.id, supabase);
      
      case "PROCESS_TURN":
        return handleProcessTurn(body, user.id, supabase);
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing game engine request:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Handler for creating a new game
async function handleCreateGame(request: CreateGameRequest, userId: string, supabase: any) {
  try {
    const { player1Cards, player2Cards, player1DeckId, player2DeckId, mode, player1GoesFirst } = request.payload;
    
    // Validate the request
    if (!player1Cards?.length || !player2Cards?.length) {
      return NextResponse.json({ error: "Invalid deck configuration" }, { status: 400 });
    }
    
    if (!player1DeckId || !player2DeckId) {
      return NextResponse.json({ error: "Missing deck IDs" }, { status: 400 });
    }
    
    if (!mode) {
      return NextResponse.json({ error: "Game mode is required" }, { status: 400 });
    }
    
    // Create the initial game state
    const initialState = createInitialGameState(
      player1Cards,
      player2Cards,
      player1GoesFirst !== undefined ? player1GoesFirst : Math.random() > 0.5
    );
    
    // Determine the opponent ID (for practice mode, it's the same user)
    const player2Id = mode === "practice" ? userId : request.payload.player2Id || userId;
    
    // Create the game in the database using the create_game_atomic function
    const { data, error } = await supabase.rpc("create_game_atomic", {
      p_user_id: userId,
      p_mode: mode,
      p_player2_id: player2Id,
      p_game_state: initialState,
      p_player1_deck_id: player1DeckId,
      p_player2_deck_id: player2DeckId,
      p_player1_goes_first: initialState.player1GoesFirst
    });
    
    if (error) {
      console.error("Error creating game:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Return the game ID and initial state
    return NextResponse.json({
      gameId: data.id,
      state: initialState
    });
  } catch (error) {
    console.error("Error creating game:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create game" },
      { status: 500 }
    );
  }
}

// Handler for processing a turn
async function handleProcessTurn(request: ProcessTurnRequest, userId: string, supabase: any) {
  try {
    const { gameId, payload } = request;
    const { action, mode } = payload;
    
    // Get the current game state from the database
    const { data: gameData, error: gameError } = await supabase
      .from("active_games")
      .select("game_state, player1_id, player2_id, current_player_id")
      .eq("id", gameId)
      .single();
    
    if (gameError || !gameData) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    
    // Parse and validate the game state
    let currentState: GameState;
    try {
      currentState = validateAndConvertGameState(gameData.game_state);
    } catch (error) {
      console.error("Invalid game state:", error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : "Invalid game state" 
      }, { status: 400 });
    }
    
    // Check if it's the user's turn (skip for practice mode)
    if (mode !== "practice" && gameData.current_player_id !== userId) {
      return NextResponse.json({ error: "Not your turn" }, { status: 403 });
    }
    
    // Validate the action
    const isPlayer1 = gameData.player1_id === userId;
    const validationResult = validateGameAction(action, currentState, isPlayer1);
    if (!validationResult.isValid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }
    
    // Process the action
    let newState: GameState;
    try {
      newState = processGameAction(currentState, action);
    } catch (error) {
      console.error("Error processing game action:", error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : "Failed to process game action" 
      }, { status: 400 });
    }
    
    // Determine the current player for the next turn
    const isPlayer1Turn = newState.currentTurn % 2 === (newState.player1GoesFirst ? 1 : 0);
    const currentPlayerId = isPlayer1Turn ? gameData.player1_id : gameData.player2_id;
    
    // Update the game state in the database
    const dbState = convertGameStateForDatabase(newState);
    const { error: updateError } = await supabase
      .from("active_games")
      .update({
        game_state: dbState,
        current_turn_number: newState.currentTurn,
        current_player_id: currentPlayerId,
        updated_at: new Date().toISOString()
      })
      .eq("id", gameId);
    
    if (updateError) {
      console.error("Error updating game state:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    // Return the updated state
    return NextResponse.json({
      data: {
        state: newState
      }
    });
  } catch (error) {
    console.error("Error processing turn:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process turn" },
      { status: 500 }
    );
  }
}
