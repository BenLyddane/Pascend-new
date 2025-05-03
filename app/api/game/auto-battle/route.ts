import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { CardWithEffects } from "@/app/actions/fetchDecks";
import { GameCard, GameState } from "@/app/protected/play/game-engine/types";
import { 
  setupGame, 
  runAutoBattle 
} from "@/app/protected/play/game-engine/auto-battle";
import { convertToGameCard } from "@/app/protected/play/game-engine/types";

// Define the request types
interface SetupGameRequest {
  action: "SETUP_GAME";
  payload: {
    player1Cards: CardWithEffects[];
    player2Cards: CardWithEffects[];
    player1Bans: number[];
    player2Bans: number[];
    player1Order: number[];
    player2Order: number[];
    player1GoesFirst?: boolean;
    mode: string;
    player1DeckId: string;
    player2DeckId: string;
  };
}

interface RunBattleRequest {
  action: "RUN_BATTLE";
  gameId: string;
  payload: {
    maxRounds?: number;
  };
}

type AutoBattleRequest = SetupGameRequest | RunBattleRequest;

// In-memory storage for game states
const gameStates = new Map<string, GameState>();

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse the request body
    const body: AutoBattleRequest = await request.json();
    
    // Handle the request based on the action
    switch (body.action) {
      case "SETUP_GAME":
        return handleSetupGame(body, user.id, supabase);
      
      case "RUN_BATTLE":
        return handleRunBattle(body, user.id);
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing auto-battle request:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Handler for setting up a game
async function handleSetupGame(request: SetupGameRequest, userId: string, supabase: any) {
  try {
    const { 
      player1Cards, 
      player2Cards, 
      player1Bans, 
      player2Bans, 
      player1Order, 
      player2Order, 
      player1GoesFirst,
      mode,
      player1DeckId,
      player2DeckId
    } = request.payload;
    
    // Validate the request
    if (!player1Cards?.length || !player2Cards?.length) {
      return NextResponse.json({ error: "Invalid deck configuration" }, { status: 400 });
    }
    
    if (player1Bans.length !== 2 || player2Bans.length !== 2) {
      return NextResponse.json({ error: "Each player must ban exactly 2 cards" }, { status: 400 });
    }
    
    if (player1Order.length !== 3 || player2Order.length !== 3) {
      return NextResponse.json({ error: "Each player must reorder exactly 3 cards" }, { status: 400 });
    }
    
    // Convert cards to game cards
    const p1Cards = player1Cards.map((card, index) => convertToGameCard(card, index));
    const p2Cards = player2Cards.map((card, index) => convertToGameCard(card, index));
    
    // Setup the game
    const gameState = setupGame(
      p1Cards,
      p2Cards,
      player1Bans,
      player2Bans,
      player1Order,
      player2Order,
      player1GoesFirst
    );
    
    // Store the game state
    gameStates.set(gameState.gameId, gameState);
    
    // For practice mode, also save to the database
    if (mode === "practice") {
      try {
        // Determine the opponent ID (for practice mode, it's the same user)
        const player2Id = mode === "practice" ? userId : userId; // In a real app, this would be the opponent's ID
        
        // Create the game in the database
        const { data, error } = await supabase.rpc("create_game_atomic", {
          p_user_id: userId,
          p_mode: mode,
          p_player2_id: player2Id,
          p_game_state: gameState,
          p_player1_deck_id: player1DeckId,
          p_player2_deck_id: player2DeckId,
          p_player1_goes_first: gameState.player1GoesFirst
        });
        
        if (error) {
          console.error("Error creating game in database:", error);
          // Continue anyway, since we have the game state in memory
        }
      } catch (error) {
        console.error("Error saving game to database:", error);
        // Continue anyway, since we have the game state in memory
      }
    }
    
    // Return the game state
    return NextResponse.json({
      gameId: gameState.gameId,
      gameState
    });
  } catch (error) {
    console.error("Error setting up game:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to setup game" },
      { status: 500 }
    );
  }
}

// Handler for running a battle
function handleRunBattle(request: RunBattleRequest, userId: string) {
  try {
    const { gameId, payload } = request;
    const { maxRounds = 20 } = payload || {};
    
    // Get the game state
    const gameState = gameStates.get(gameId);
    
    if (!gameState) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    
    // Run the auto-battle
    const finalState = runAutoBattle(gameState, maxRounds);
    
    // Update the stored game state
    gameStates.set(gameId, finalState);
    
    // Return the final state
    return NextResponse.json({
      gameState: finalState
    });
  } catch (error) {
    console.error("Error running battle:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run battle" },
      { status: 500 }
    );
  }
}
