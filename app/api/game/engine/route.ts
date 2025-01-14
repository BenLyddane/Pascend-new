import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import {
  GameActionType,
  GameActionResult,
  createGame,
  processTurn,
  endGame,
  GameAutoProcessor,
  GAME_ACTIONS,
  ActionPayload,
  CreateGamePayload,
  ProcessTurnPayload,
  EndGamePayload
} from "./game-actions";
import { GameCard } from "@/app/protected/play/game-engine/types";
import { GameMode } from "@/app/protected/play/game-modes/types";

interface GameEngineRequest<T extends GameActionType = GameActionType> {
  action: T;
  gameId?: string;
  payload: ActionPayload<T>;
}

function isGameCard(obj: any): obj is GameCard {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.power === 'number' &&
    typeof obj.health === 'number'
  );
}

function isCreateGamePayload(action: GameActionType, payload: any): payload is CreateGamePayload {
  return (
    action === 'CREATE_GAME' &&
    typeof payload === 'object' &&
    payload !== null &&
    Array.isArray(payload.player1Cards) &&
    Array.isArray(payload.player2Cards) &&
    payload.player1Cards.every(isGameCard) &&
    payload.player2Cards.every(isGameCard) &&
    typeof payload.mode === 'string' &&
    typeof payload.player1DeckId === 'string' &&
    typeof payload.player2DeckId === 'string'
  );
}

function isProcessTurnPayload(action: GameActionType, payload: any): payload is ProcessTurnPayload {
  return (
    action === 'PROCESS_TURN' &&
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.action === 'object' &&
    payload.action !== null &&
    typeof payload.action.type === 'string' &&
    typeof payload.mode === 'string'
  );
}

function isEndGamePayload(action: GameActionType, payload: any): payload is EndGamePayload {
  return (
    action === 'END_GAME' &&
    typeof payload === 'object' &&
    payload !== null &&
    (payload.winnerId === undefined || typeof payload.winnerId === 'string')
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requestData = await request.json();
    const { action, gameId, payload } = requestData as GameEngineRequest;

    // Validate required parameters based on action metadata
    const actionMeta = GAME_ACTIONS[action];
    if (!actionMeta) {
      return NextResponse.json(
        { error: "Invalid action type" },
        { status: 400 }
      );
    }

    if (actionMeta.requiresGameId && !gameId) {
      return NextResponse.json(
        { error: "Game ID is required for this action" },
        { status: 400 }
      );
    }

    // Process the action
    let result: GameActionResult;
    switch (action) {
      case "CREATE_GAME": {
        if (!isCreateGamePayload(action, payload)) {
          return NextResponse.json(
            { error: "Invalid payload for CREATE_GAME action" },
            { status: 400 }
          );
        }
        result = await createGame(supabase, user.id, payload);
        break;
      }

      case "PROCESS_TURN": {
        if (!gameId) {
          return NextResponse.json(
            { error: "Game ID is required" },
            { status: 400 }
          );
        }
        if (!isProcessTurnPayload(action, payload)) {
          return NextResponse.json(
            { error: "Invalid payload for PROCESS_TURN action" },
            { status: 400 }
          );
        }
        result = await processTurn(supabase, gameId, payload);
        break;
      }

      case "START_AUTO_PROCESSING": {
        if (!gameId) {
          return NextResponse.json(
            { error: "Game ID is required" },
            { status: 400 }
          );
        }

        // Initialize auto processor
        const processor = new GameAutoProcessor(supabase, gameId, user.id);
        
        // Start processing non-blocking
        Promise.resolve(processor.startProcessing()).catch(error => {
          console.error("[GameEngine] Auto processing error:", error);
        });

        result = { data: { success: true } };
        break;
      }

      case "END_GAME": {
        if (!gameId) {
          return NextResponse.json(
            { error: "Game ID is required" },
            { status: 400 }
          );
        }
        if (!isEndGamePayload(action, payload)) {
          return NextResponse.json(
            { error: "Invalid payload for END_GAME action" },
            { status: 400 }
          );
        }
        result = await endGame(supabase, gameId, user.id, payload);
        break;
      }

      default: {
        const _exhaustiveCheck: never = action;
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
      }
    }

    // Handle action result
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("[GameEngine] Error:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
