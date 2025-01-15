import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Json } from "@/types/database.types";
import { GameState } from "@/app/protected/play/game-engine/types";
import { ServerGameEngine } from "../../server-game-engine";
import {
  validateAndConvertGameState,
  serializeGameState,
} from "../utils/state-converter";

export class GameAutoProcessor {
  private readonly TURN_INTERVAL = 2000; // 2 seconds for better responsiveness
  private readonly BATCH_SIZE = 1; // Process one turn at a time for real-time updates
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly gameId: string,
    private readonly userId: string
  ) {}

  async startProcessing() {
    try {
      // First get current game state to check version
      const { data: currentGame } = await this.supabase
        .from("active_games")
        .select("*")
        .eq("id", this.gameId)
        .single();

      if (!currentGame) {
        console.error("[GameEngine] Game not found:", this.gameId);
        return;
      }

      // Parse current game state and increment version
      const currentState = validateAndConvertGameState(currentGame.game_state);
      const newState = {
        ...currentState,
        version: (currentState.version || 0) + 1
      };

      // Try to set processing flag with version update
      const { data: game, error: flagError } = await this.supabase
        .from("active_games")
        .update({
          processing: true,
          last_processed: new Date().toISOString(),
          game_state: serializeGameState(newState)
        })
        .eq("id", this.gameId)
        .eq("processing", false)
        .eq("game_state->version", currentState.version || 0)
        .select()
        .single();

      if (flagError) {
        console.error("[GameEngine] Error setting processing flag:", flagError);
        return;
      }

      if (!game) {
        console.error("[GameEngine] Failed to acquire processing lock for game:", this.gameId);
        return;
      }

      console.log("[GameEngine] Successfully acquired processing lock for game:", this.gameId);

      // Initialize game engine with current state
      const gameState = validateAndConvertGameState(game.game_state);
      await this.processGameTurns(gameState);
    } catch (error) {
      console.error("[GameEngine] Fatal error in turn processing:", error);
      await this.handleFatalError(error);
    } finally {
      await this.clearProcessingFlag();
    }
  }

  private async processGameTurns(initialState: GameState) {
    let gameState = initialState;
    let gameEngine = new ServerGameEngine([], [], gameState);

    while (!gameState.winner) {
      // Check if game is still active
      const { data: freshGame, error: fetchError } = await this.supabase
        .from("active_games")
        .select("*")
        .eq("id", this.gameId)
        .single();

      if (fetchError || !freshGame || freshGame.status === "completed") {
        console.log("[GameEngine] Game no longer active");
        break;
      }

      // Process one turn at a time for real-time updates
      await this.delay(this.TURN_INTERVAL);

      const actionResult = gameEngine.processAction({
        type: "END_TURN",
        payload: {},
      });

      if (!actionResult.success) {
        console.error(
          "[GameEngine] Error processing turn:",
          actionResult.error
        );
        break;
      }

      gameState = gameEngine.getGameState();
      
      // Update state immediately after each turn
      if (!(await this.updateGameState(gameState))) {
        // If update failed after retries, refresh state and continue
        const { data: refreshedGame } = await this.supabase
          .from("active_games")
          .select("*")
          .eq("id", this.gameId)
          .single();

        if (refreshedGame) {
          // Create new engine instance with fresh state
          gameState = validateAndConvertGameState(refreshedGame.game_state);
          gameEngine = new ServerGameEngine([], [], gameState);
        } else {
          break;
        }
      }
    }
  }

  private async updateGameState(gameState: GameState): Promise<boolean> {
    // Get current version before update
    const { data: currentGame } = await this.supabase
      .from("active_games")
      .select("game_state")
      .eq("id", this.gameId)
      .single();

    if (!currentGame) {
      console.error("[GameEngine] Game not found during update");
      return false;
    }

    const currentState = validateAndConvertGameState(currentGame.game_state);
    const serializedState = serializeGameState({
      ...gameState,
      version: (currentState.version || 0) + 1
    });

    let retryCount = 0;
    while (retryCount < this.MAX_RETRIES) {
      const { error: updateError } = await this.supabase
        .from("active_games")
        .update({
          game_state: serializedState,
          status: gameState.winner ? "completed" : "in_progress",
          winner_id: gameState.winner === 1 ? this.userId : null,
          last_processed: new Date().toISOString(),
        })
        .eq("id", this.gameId)
        .eq("game_state->version", currentState.version || 0);

      if (!updateError) {
        return true;
      }

      if (updateError.message?.includes("version")) {
        return false; // Version conflict, caller should refresh state
      }

      retryCount++;
      await this.delay(1000 * Math.pow(2, retryCount));
    }

    return false;
  }

  private async handleFatalError(error: any) {
    try {
      const currentState = await this.getCurrentGameState();
      const errorState = currentState
        ? {
            ...currentState,
            error: error.message,
          }
        : { error: error.message };

      await this.supabase
        .from("active_games")
        .update({
          status: "error",
          processing: false,
          game_state: serializeGameState(errorState as GameState),
        })
        .eq("id", this.gameId);
      console.log("[GameEngine] Game marked as errored");
    } catch (updateError) {
      console.error(
        "[GameEngine] Failed to mark game as errored:",
        updateError
      );
    }
  }

  private async clearProcessingFlag() {
    await this.supabase
      .from("active_games")
      .update({
        processing: false,
        last_processed: new Date().toISOString(),
      })
      .eq("id", this.gameId);
  }

  private async getCurrentGameState(): Promise<GameState | null> {
    const { data: game } = await this.supabase
      .from("active_games")
      .select("game_state")
      .eq("id", this.gameId)
      .single();

    if (!game?.game_state) return null;

    try {
      return validateAndConvertGameState(game.game_state);
    } catch (error) {
      console.error("[GameEngine] Error converting game state:", error);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
