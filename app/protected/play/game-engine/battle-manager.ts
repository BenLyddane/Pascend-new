import { GameState, CardState, BattleLogEntry } from "./types";
import { EffectsProcessor } from "./effects-processor";
import { DamageCalculator } from "./damage-calculator";
import { BattleStateManager } from "./battle-state-manager";
import { CombatProcessor } from "./combat-processor";
import { EffectPhaseProcessor } from "./effect-phase-processor";
import { BattleLogger } from "./battle-logger";

export class BattleManager {
  private stateManager: BattleStateManager;
  private combatProcessor: CombatProcessor;
  private effectPhaseProcessor: EffectPhaseProcessor;
  private battleLogger: BattleLogger;

  getCurrentBattlers(): { 
    attacker: CardState | null; 
    defender: CardState | null; 
  } {
    return this.stateManager.getCurrentBattlers();
  }

  constructor(
    private gameState: GameState,
    effectsProcessor: EffectsProcessor,
    damageCalculator: DamageCalculator
  ) {
    this.stateManager = new BattleStateManager(gameState);
    this.combatProcessor = new CombatProcessor(
      effectsProcessor,
      damageCalculator
    );
    this.effectPhaseProcessor = new EffectPhaseProcessor(effectsProcessor);
    this.battleLogger = new BattleLogger(gameState);
  }

  processTurn(): BattleLogEntry | null {
    console.log("\n=== Processing Turn ===");
    console.log("Current Turn:", this.gameState.currentTurn);
    console.log("Player 1 Goes First:", this.gameState.player1GoesFirst);

    // Check for game-ending conditions
    if (this.stateManager.hasWinner()) {
      console.log("Game already has a winner");
      const { attacker, defender } = this.stateManager.getCurrentBattlers();
      if (!attacker || !defender) return null;

      // Create a final battle log entry
      const logEntry = this.battleLogger.createLogEntry(
        attacker,
        defender,
        this.gameState.currentTurn
      );

      // Add game end effect
      logEntry.effects.push({
        type: "game_end",
        description: `Game Over! ${this.gameState.winner === 1 ? "Player 1" : this.gameState.winner === 2 ? "Player 2" : "Draw"}${this.gameState.drawReason ? ` - ${this.gameState.drawReason}` : ""}`,
        timing: "game_end",
      });

      this.battleLogger.logBattleEntry(logEntry);
      return logEntry;
    }

    const { attacker, defender } = this.stateManager.getCurrentBattlers();
    if (!attacker || !defender) {
      console.log("No valid battlers found");
      console.log("Attacker:", attacker);
      console.log("Defender:", defender);
      return null;
    }

    // Check for infinite loop
    if (this.stateManager.checkForInfiniteLoop(attacker, defender)) {
      console.log("Game ended due to infinite loop detection");
      return null;
    }

    console.log("\n=== Starting Turn ===");
    console.log("Attacker:", {
      name: attacker.card.name,
      health: attacker.health,
      power: attacker.power,
      gameplay_effects: attacker.card.gameplay_effects,
    });
    console.log("Defender:", {
      name: defender.card.name,
      health: defender.health,
      power: defender.power,
      gameplay_effects: defender.card.gameplay_effects,
    });

    // Mark cards with 0 health as defeated and advance battle if needed
    if (attacker.health <= 0) {
      console.log("Attacker defeated:", attacker.card.name);
      attacker.isDefeated = true;
      this.stateManager.advanceBattle();
      return null;
    }
    if (defender.health <= 0) {
      console.log("Defender defeated:", defender.card.name);
      defender.isDefeated = true;
      this.stateManager.advanceBattle();
      return null;
    }

      try {
        console.log("Processing turn phases");
        
        // Create log entry for this turn
        const turnLogEntry = this.battleLogger.createLogEntry(
          attacker,
          defender,
          this.gameState.currentTurn
        );

        // Process pre-combat effects
        
        this.effectPhaseProcessor.processPhase("turn_start", attacker, defender, turnLogEntry);
        this.effectPhaseProcessor.processPhase("pre_combat", attacker, defender, turnLogEntry);
        
        // Process main combat phase
        console.log("Processing combat - Main phase", {
          attacker: attacker.card.name,
          defender: defender.card.name
        });
        
        // Attacker's strike
        this.combatProcessor.processCombat(attacker, defender, turnLogEntry);
        
        // Check for defeated defender
        if (defender.health <= 0) {
          console.log("Defender defeated during main combat");
          this.combatProcessor.processDefeat(defender, attacker, turnLogEntry);
          defender.isDefeated = true;
          
          // Update log and advance battle
          this.battleLogger.updateHealthValues(turnLogEntry, attacker, defender);
          this.battleLogger.logBattleEntry(turnLogEntry);
          this.stateManager.advanceBattle();
          return turnLogEntry;
        }
        
        // Defender's counter-attack if they survived
        console.log("Processing combat - Counter-attack phase");
        this.combatProcessor.processCombat(defender, attacker, turnLogEntry);
        
        // Check for defeated attacker
        if (attacker.health <= 0) {
          console.log("Attacker defeated during counter-attack");
          attacker.isDefeated = true;
          
          // Update log and advance battle
          this.battleLogger.updateHealthValues(turnLogEntry, attacker, defender);
          this.battleLogger.logBattleEntry(turnLogEntry);
          this.stateManager.advanceBattle();
          return turnLogEntry;
        }
        
        // Process post-combat effects
        this.effectPhaseProcessor.processPhase("post_combat", attacker, defender, turnLogEntry);
        
        // Clean up temporary effects for both attacker and defender
        this.effectPhaseProcessor.cleanupTemporaryEffects(attacker);
        this.effectPhaseProcessor.cleanupTemporaryEffects(defender);
        
        this.effectPhaseProcessor.processPhase("turn_end", attacker, defender, turnLogEntry);

        // Update and log final state
        this.battleLogger.updateHealthValues(turnLogEntry, attacker, defender);
        this.battleLogger.logBattleEntry(turnLogEntry);
        
        this.stateManager.incrementTurn();
        this.stateManager.checkGameEnd();

      console.log("Turn completed", {
        attackerHealth: attacker.health,
        defenderHealth: defender.health,
        currentTurn: this.gameState.currentTurn,
        winner: this.gameState.winner
      });

      return turnLogEntry;
    } catch (error) {
      console.error("Error processing turn:", error);
      // Create error log entry
      const errorLogEntry = this.battleLogger.createLogEntry(
        attacker,
        defender,
        this.gameState.currentTurn
      );
      // Add error to battle log
      errorLogEntry.effects.push({
        type: "error",
        description: `Error processing turn: ${error instanceof Error ? error.message : "Unknown error"}`,
        timing: "error"
      });
      this.battleLogger.logBattleEntry(errorLogEntry);
      return errorLogEntry;
    }
  }
}
