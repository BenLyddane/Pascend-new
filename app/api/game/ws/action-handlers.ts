import { SupabaseClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import { GameActionType, createGame, processTurn, endGame, GameAutoProcessor } from "../engine/game-actions";
import { CreateGamePayload } from "../engine/game-actions/create-game";
import { validateAndConvertGameState } from "../engine/utils/state-converter";
import { validateGameAction } from "../validate-game-action";
import { ConnectionManager } from "./connection-manager";
import { GameActionResponse, GameErrorResponse } from "./types";
import { Database } from "@/types/database.types";
import { GameAction, GameState } from "@/app/protected/play/game-engine/types";
import { GameMode } from "@/app/protected/play/game-modes/types";

interface ExtendedGameState extends GameState {
  player1_id: string;
  player2_id: string;
  current_player_id?: string;
}

export class GameActionHandler {
  private channels: Map<string, ReturnType<SupabaseClient['channel']>> = new Map();

  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly connectionManager: ConnectionManager,
    private readonly ws: WebSocket,
    private readonly userId: string
  ) {}

  private sendError(error: string): void {
    const errorResponse: GameErrorResponse = {
      type: 'error',
      error,
      timestamp: Date.now()
    };
    this.ws.send(JSON.stringify(errorResponse));
  }

  private sendActionResponse(action: GameActionType, gameId: string | undefined, payload: any): void {
    const response: GameActionResponse = {
      type: 'action',
      action,
      gameId,
      payload,
      timestamp: Date.now()
    };
    this.ws.send(JSON.stringify(response));
  }

  async handleCreateGame(payload: CreateGamePayload): Promise<void> {
    try {
      // Validate payload
      if (!payload.player1Cards?.length || !payload.player2Cards?.length) {
        throw new Error('Invalid deck configuration');
      }

      if (!payload.player1DeckId || !payload.player2DeckId) {
        throw new Error('Missing deck IDs');
      }

      if (!payload.mode) {
        throw new Error('Game mode is required');
      }

      const result = await createGame(this.supabase, this.userId, payload);
      if (!result.data) {
        throw new Error(result.error || 'Failed to create game');
      }

      const gameId = result.data.gameId;

      // Get player IDs
      const { data: game } = await this.supabase
        .from('active_games')
        .select('player1_id, player2_id')
        .eq('id', gameId)
        .single();

      if (!game) {
        throw new Error('Failed to get game data');
      }

      const initialState: ExtendedGameState = {
        ...validateAndConvertGameState(result.data.state),
        player1_id: game.player1_id,
        player2_id: game.player2_id
      };

      // Store and broadcast state
      this.connectionManager.setGameState(gameId, initialState);
      this.connectionManager.addGameConnection(gameId, this.ws);
      this.connectionManager.broadcastGameState(gameId, initialState);

      this.sendActionResponse('CREATE_GAME', gameId, result.data);
    } catch (error) {
      this.sendError(error instanceof Error ? error.message : 'Failed to create game');
    }
  }

  async handleProcessTurn(gameId: string, payload: GameAction & { mode?: string }): Promise<void> {
    try {
      const currentState = this.connectionManager.getGameState(gameId);
      if (!currentState) {
        throw new Error('Game state not found');
      }

      // Get game mode from database
      const { data: gameData, error: gameError } = await this.supabase
        .from('active_games')
        .select('mode')
        .eq('id', gameId)
        .single();

      if (gameError || !gameData) {
        throw new Error('Failed to fetch game data');
      }

      // Validate player's turn
      const isPlayersTurn = this.userId === currentState.current_player_id;
      if (!isPlayersTurn) {
        throw new Error('Not your turn');
      }

      // Validate action
      const validationResult = validateGameAction(
        payload,
        currentState,
        this.userId === currentState.player1_id
      );

      if (!validationResult.isValid) {
        throw new Error(validationResult.error || 'Invalid action');
      }

      const result = await processTurn(this.supabase, gameId, {
        action: payload,
        mode: (gameData.mode || 'practice') as GameMode
      });

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to process turn');
      }

      const newState: ExtendedGameState = {
        ...validateAndConvertGameState(result.data.state),
        player1_id: currentState.player1_id,
        player2_id: currentState.player2_id
      };

      // Update and broadcast state
      this.connectionManager.setGameState(gameId, newState);
      this.connectionManager.broadcastGameState(gameId, newState);

      this.sendActionResponse('PROCESS_TURN', gameId, result.data);
    } catch (error) {
      this.sendError(error instanceof Error ? error.message : 'Failed to process turn');
    }
  }

  async handleAutoProcessing(gameId: string): Promise<void> {
    try {
      const processor = new GameAutoProcessor(this.supabase, gameId, this.userId);

      // Clean up any existing channel subscription
      const existingChannel = this.channels.get(gameId);
      if (existingChannel) {
        await existingChannel.unsubscribe();
        this.channels.delete(gameId);
      }

      // Subscribe to state updates
      const channel = this.supabase
        .channel(`game_${gameId}_auto`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'active_games',
          filter: `id=eq.${gameId}`,
        }, async (payload) => {
          if (!payload.new?.game_state) return;

          const currentState = this.connectionManager.getGameState(gameId);
          if (!currentState) return;

          const newState: ExtendedGameState = {
            ...validateAndConvertGameState(payload.new.game_state),
            player1_id: currentState.player1_id,
            player2_id: currentState.player2_id
          };

          this.connectionManager.setGameState(gameId, newState);
          this.connectionManager.broadcastGameState(gameId, newState);
        })
        .subscribe();

      // Store channel for cleanup
      this.channels.set(gameId, channel);

      await processor.startProcessing();
      this.sendActionResponse('START_AUTO_PROCESSING', gameId, { success: true });
    } catch (error) {
      this.sendError(error instanceof Error ? error.message : 'Auto processing failed');
    }
  }

  async handleEndGame(gameId: string, payload: any): Promise<void> {
    try {
      const currentState = this.connectionManager.getGameState(gameId);
      if (!currentState) {
        throw new Error('Game state not found');
      }

      const result = await endGame(this.supabase, gameId, this.userId, payload);
      if (!result.data) {
        throw new Error('Failed to end game');
      }

      const finalState: ExtendedGameState = {
        ...validateAndConvertGameState(result.data),
        player1_id: currentState.player1_id,
        player2_id: currentState.player2_id
      };

      // Update and broadcast final state
      this.connectionManager.setGameState(gameId, finalState);
      this.connectionManager.broadcastGameState(gameId, finalState);

      // Clean up game resources
      this.connectionManager.cleanupGame(gameId);

      // Clean up channel subscription if exists
      const channel = this.channels.get(gameId);
      if (channel) {
        await channel.unsubscribe();
        this.channels.delete(gameId);
      }

      this.sendActionResponse('END_GAME', gameId, result.data);
    } catch (error) {
      this.sendError(error instanceof Error ? error.message : 'Failed to end game');
    }
  }

  // Cleanup method to be called when the connection is closed
  async cleanup(): Promise<void> {
    // Unsubscribe from all channels
    await Promise.all(
      Array.from(this.channels.entries()).map(async ([gameId, channel]) => {
        await channel.unsubscribe();
        this.channels.delete(gameId);
      })
    );
  }
}
