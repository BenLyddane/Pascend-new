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

    // Check for dead or defeated cards before processing turn
    if (attacker.isDefeated || defender.isDefeated || attacker.health <= 0 || defender.health <= 0) {
      console.log("One or both battlers are dead or defeated");
      console.log("Attacker:", {
        health: attacker.health,
        isDefeated: attacker.isDefeated
      });
      console.log("Defender:", {
        health: defender.health,
        isDefeated: defender.isDefeated
      });
      
      // Mark cards with 0 health as defeated
      if (attacker.health <= 0) attacker.isDefeated = true;
      if (defender.health <= 0) defender.isDefeated = true;
      
      this.stateManager.advanceBattle();
      return null;
    }

    // Create battle log entry
    const logEntry = this.battleLogger.createLogEntry(
      attacker,
      defender,
      this.gameState.currentTurn
    );

    // Process effects in order
    this.effectPhaseProcessor.processPhase(
      "turn_start",
      attacker,
      defender,
      logEntry
    );
    this.effectPhaseProcessor.processPhase(
      "pre_combat",
      attacker,
      defender,
      logEntry
    );
    this.combatProcessor.processCombat(attacker, defender, logEntry);
    this.effectPhaseProcessor.processPhase(
      "post_combat",
      attacker,
      defender,
      logEntry
    );
    this.effectPhaseProcessor.cleanupTemporaryEffects(attacker);
    this.effectPhaseProcessor.processPhase(
      "turn_end",
      attacker,
      defender,
      logEntry
    );

    if (defender.health <= 0) {
      this.combatProcessor.processDefeat(defender, attacker, logEntry);
    }

    // Update final health values and log the entry
    this.battleLogger.updateHealthValues(logEntry, attacker, defender);
    this.battleLogger.logBattleEntry(logEntry);

    this.stateManager.incrementTurn();
    this.stateManager.checkGameEnd();

    return logEntry;
  }
}
