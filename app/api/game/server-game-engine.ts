import {
  GameCard,
  GameState,
  CardState,
  BattleLogEntry,
  GameStats,
  GameAction,
  toVisibleCardState,
  VisibleCardState,
} from "@/app/protected/play/game-engine/types";
import { EffectsProcessor } from "@/app/protected/play/game-engine/effects-processor";
import { DamageCalculator } from "@/app/protected/play/game-engine/damage-calculator";
import { BattleManager } from "@/app/protected/play/game-engine/battle-manager";

export class ServerGameEngine {
  private gameState: GameState;
  private gameStats: GameStats;
  private effectsProcessor: EffectsProcessor;
  private damageCalculator: DamageCalculator;
  private battleManager: BattleManager;
  private actionQueue: {
    timestamp: number;
    action: GameAction;
  }[] = [];
  private readonly MIN_ACTION_INTERVAL = 1000; // Minimum 1 second between actions
  private readonly MAX_TURN_TIME = 30000; // Maximum 30 seconds per turn
  private readonly MAX_QUEUE_SIZE = 10; // Prevent queue flooding
  private turnTimer: NodeJS.Timeout | null = null;
  private lastProcessedTime: number = Date.now();

  private processQueue() {
    const now = Date.now();

    // Process any actions that have waited long enough
    while (this.actionQueue.length > 0) {
      const nextAction = this.actionQueue[0];
      if (now - nextAction.timestamp >= this.MIN_ACTION_INTERVAL) {
        // Remove from queue and process
        this.actionQueue.shift();
        const result = this.executeAction(nextAction.action);
        if (result.success) {
          this.lastProcessedTime = now;
        }
      } else {
        // If the next action isn't ready, none of them are
        break;
      }
    }
  }

  constructor(
    player1Cards: GameCard[],
    player2Cards: GameCard[],
    existingState?: GameState
  ) {
    console.log(
      "[ServerGameEngine] Initializing with existing state:",
      !!existingState
    );

    // Validate deck sizes
    if (!existingState) {
      if (!player1Cards.length || !player2Cards.length) {
        throw new Error("Invalid deck size");
      }
      if (player1Cards.length !== player2Cards.length) {
        throw new Error("Deck sizes must match");
      }
    }

    // Initialize game stats
    this.gameStats = {
      totalDamageDealt: 0,
      cardsDefeated: 0,
      turnsPlayed: 0,
      specialAbilitiesUsed: 0,
    };

    if (existingState) {
      console.log("[ServerGameEngine] Loading existing game state");
      this.gameState = existingState;
    } else {
      console.log("[ServerGameEngine] Creating new game state");
      // Determine first player with server-side randomization
      const player1GoesFirst = Math.random() < 0.5;

      // Create card states for both players
      const player1CardStates = player1Cards.map((card) =>
        this.createCardState(card)
      );
      const player2CardStates = player2Cards.map((card) =>
        this.createCardState(card)
      );

      // Create visible states for both players
      const player1VisibleStates = player1CardStates.map(toVisibleCardState);
      const player2VisibleStates = player2CardStates.map(toVisibleCardState);

      // Initialize game state with deep cloning to prevent reference manipulation
      this.gameState = {
        currentTurn: 1,
        player1GoesFirst,
        player1Cards: player1CardStates,
        player2Cards: player2CardStates,
        player1VisibleCards: player1VisibleStates,
        player2VisibleCards: player2VisibleStates,
        currentBattle: {
          card1Index: 0,
          card2Index: 0,
        },
        winner: null,
        battleLog: [],
        stats: {
          totalDamageDealt: 0,
          cardsDefeated: 0,
          turnsPlayed: 0,
          specialAbilitiesUsed: 0,
        },
      };
    }

    // Initialize game components with current state
    this.effectsProcessor = new EffectsProcessor(this.gameStats);
    this.damageCalculator = new DamageCalculator();
    this.battleManager = new BattleManager(
      this.gameState,
      this.effectsProcessor,
      this.damageCalculator
    );

    console.log("[ServerGameEngine] Game components initialized");

    this.lastProcessedTime = Date.now();
    this.startTurnTimer();
  }

  private createCardState(card: GameCard): CardState {
    // Create a new card state with validated properties
    return {
      card: { ...card }, // Clone to prevent reference manipulation
      health: Math.max(1, Math.min(card.health, 999)), // Validate health within reasonable bounds
      maxHealth: Math.max(1, Math.min(card.health, 999)),
      power: Math.max(0, Math.min(card.power, 999)), // Validate power within reasonable bounds
      isDefeated: false,
      effects: Array.isArray(card.gameplay_effects)
        ? [...card.gameplay_effects]
        : [],
    };
  }

  private startTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }

    this.turnTimer = setTimeout(() => {
      if (!this.gameState.winner) {
        // Auto-end turn if time limit reached
        this.gameState.winner = "draw";
        this.gameState.drawReason = "Turn time limit exceeded";
      }
    }, this.MAX_TURN_TIME);
  }

  public processAction(action: GameAction): {
    success: boolean;
    error?: string;
  } {
    // Add action to queue with timestamp
    const now = Date.now();

    // Prevent queue flooding
    if (this.actionQueue.length >= this.MAX_QUEUE_SIZE) {
      return {
        success: false,
        error: "Too many pending actions",
      };
    }

    // Check if enough time has passed since last action
    if (now - this.lastProcessedTime < this.MIN_ACTION_INTERVAL) {
      // Instead of rejecting, queue the action
      this.actionQueue.push({
        timestamp: now,
        action,
      });
      return {
        success: true,
        error: "Action queued for processing",
      };
    }

    // Process immediate action
    const result = this.executeAction(action);
    if (result.success) {
      this.lastProcessedTime = now;

      // Process any queued actions that are ready
      this.processQueue();
    }

    return result;
  }

  private executeAction(action: GameAction): {
    success: boolean;
    error?: string;
  } {
    // Execute the action based on type
    try {
      switch (action.type) {
        case "PLAY_CARD":
          return this.validateAndProcessCardPlay(action);
        case "USE_EFFECT":
          return this.validateAndProcessEffect(action);
        case "END_TURN":
          return this.validateAndProcessTurnEnd();
        default:
          return { success: false, error: "Invalid action type" };
      }
    } catch (error) {
      console.error("Error processing action:", error);
      return { success: false, error: "Internal game engine error" };
    } finally {
      // Update visible states after any action
      this.updateVisibleStates();
    }
  }

  private validateAndProcessCardPlay(action: GameAction) {
    if (!action.payload.cardId) {
      return { success: false, error: "Card ID is required" };
    }

    // Add validation logic here
    // Verify card exists and can be played
    return { success: true };
  }

  private validateAndProcessEffect(action: GameAction) {
    if (!action.payload.cardId || !action.payload.effectIndex) {
      return { success: false, error: "Card ID and effect index are required" };
    }

    // Add validation logic here
    // Verify effect exists and can be used
    return { success: true };
  }

  private validateAndProcessTurnEnd() {
    console.log("Processing turn end", {
      currentTurn: this.gameState.currentTurn,
      currentBattle: this.gameState.currentBattle,
    });

    try {
      // Process end of turn effects
      const { attacker, defender } = this.battleManager.getCurrentBattlers();
      if (attacker && defender) {
        // BattleLogger already adds the entry to gameState.battleLog
        this.battleManager.processTurn();
      }

      // Update game state
      this.gameState.currentTurn++;

      // Check for game end conditions
      const player1Alive = this.gameState.player1Cards.some(
        (card) => !card.isDefeated
      );
      const player2Alive = this.gameState.player2Cards.some(
        (card) => !card.isDefeated
      );

      if (!player1Alive && !player2Alive) {
        this.gameState.winner = "draw";
        this.gameState.drawReason = "All cards defeated";
      } else if (!player1Alive) {
        this.gameState.winner = 2;
      } else if (!player2Alive) {
        this.gameState.winner = 1;
      }

      // Update timing
      this.lastProcessedTime = Date.now();
      this.startTurnTimer();

      console.log("Turn processed", {
        newTurn: this.gameState.currentTurn,
        winner: this.gameState.winner,
      });

      return {
        success: true,
        stats: this.gameStats,
      };
    } catch (error) {
      console.error("Error processing turn:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process turn",
      };
    }
  }

  private updateVisibleStates() {
    console.log("Updating visible states");
    try {
      // Update visible states for both players
      this.gameState.player1VisibleCards =
        this.gameState.player1Cards.map(toVisibleCardState);
      this.gameState.player2VisibleCards =
        this.gameState.player2Cards.map(toVisibleCardState);

      // Log current game state for debugging
      console.log("Game state updated", {
        player1Cards: this.gameState.player1Cards.length,
        player2Cards: this.gameState.player2Cards.length,
        currentBattle: this.gameState.currentBattle,
        winner: this.gameState.winner,
      });
    } catch (error) {
      console.error("Error updating visible states:", error);
      throw error;
    }
  }

  public getGameState(): GameState {
    try {
      // Deep clone to prevent manipulation
      const state = JSON.parse(JSON.stringify(this.gameState));
      console.log("Getting game state", {
        turn: state.currentTurn,
        battle: state.currentBattle,
        winner: state.winner,
      });
      return state;
    } catch (error) {
      console.error("Error getting game state:", error);
      throw error;
    }
  }

  public getGameStats(): GameStats {
    return { ...this.gameStats }; // Clone to prevent manipulation
  }

  public cleanup() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }
  }
}
