import {
  GameState,
  CardState,
  BattleLogEntry,
  BattleEffect,
  BattleEffectTiming,
} from "./types";
import { EffectsProcessor } from "./effects-processor";
import { DamageCalculator } from "./damage-calculator";

export class BattleManager {
  private stateHistory: Map<string, number>;
  private readonly MAX_REPEATED_STATES = 5;
  private readonly MAX_TURNS = 100;

  constructor(
    private gameState: GameState,
    private effectsProcessor: EffectsProcessor,
    private damageCalculator: DamageCalculator
  ) {
    this.stateHistory = new Map();
  }

  private lastHealthStates: { attacker: number; defender: number }[] = [];
  private readonly MAX_HEALTH_HISTORY = 10;
  private readonly MIN_HEALTH_CHANGE = 1;

  private checkForInfiniteLoop(): boolean {
    const { attacker, defender } = this.getCurrentBattlers();

    // Add current health state
    this.lastHealthStates.push({
      attacker: attacker.health,
      defender: defender.health,
    });

    // Keep only last N states
    if (this.lastHealthStates.length > this.MAX_HEALTH_HISTORY) {
      this.lastHealthStates.shift();
    }

    // If we don't have enough history yet, continue
    if (this.lastHealthStates.length < this.MAX_HEALTH_HISTORY) {
      return false;
    }

    // Check if health has changed significantly in the last N turns
    const firstState = this.lastHealthStates[0];
    const lastState = this.lastHealthStates[this.lastHealthStates.length - 1];
    const healthChangeAttacker = Math.abs(
      lastState.attacker - firstState.attacker
    );
    const healthChangeDefender = Math.abs(
      lastState.defender - firstState.defender
    );

    // Check for infinite loop conditions:
    // 1. Health hasn't changed significantly
    // 2. Excessive turns
    // 3. Both players are healing/not taking damage
    const noSignificantChange =
      healthChangeAttacker < this.MIN_HEALTH_CHANGE &&
      healthChangeDefender < this.MIN_HEALTH_CHANGE;
    const excessiveTurns = this.gameState.currentTurn >= this.MAX_TURNS;
    const bothHealing =
      lastState.attacker >= firstState.attacker &&
      lastState.defender >= firstState.defender;

    if (noSignificantChange || excessiveTurns || bothHealing) {
      console.log("Infinite loop detected - declaring draw");
      if (noSignificantChange)
        console.log("Reason: No significant health change");
      if (excessiveTurns) console.log("Reason: Excessive turns");
      if (bothHealing)
        console.log("Reason: Both players healing/not taking damage");
      this.gameState.winner = "draw";
      return true;
    }

    return false;
  }

  processTurn(): BattleLogEntry | null {
    if (this.gameState.winner || this.checkForInfiniteLoop()) return null;

    const { attacker, defender } = this.getCurrentBattlers();
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

    if (attacker.isDefeated || defender.isDefeated) {
      this.advanceBattle();
      return null;
    }

    // Calculate initial state
    const attackerStartHealth = attacker.health;
    const defenderStartHealth = defender.health;
    const attackerStartPower = attacker.power;
    const defenderStartPower = defender.power;

    // Initialize battle log entry
    const logEntry: BattleLogEntry = {
      turn: this.gameState.currentTurn,
      attacker: {
        card: attacker.card,
        damage: 0,
        startHealth: attackerStartHealth,
        endHealth: attacker.health,
        startPower: attackerStartPower,
        endPower: attacker.power,
      },
      defender: {
        card: defender.card,
        damage: 0,
        startHealth: defenderStartHealth,
        endHealth: defender.health,
        startPower: defenderStartPower,
        endPower: defender.power,
      },
      effects: [],
    };

    // Process effects in order
    this.processEffectPhase("turn_start", attacker, defender, logEntry);
    this.processEffectPhase("pre_combat", attacker, defender, logEntry);
    this.processCombatPhase(attacker, defender, logEntry);
    this.processEffectPhase("post_combat", attacker, defender, logEntry);
    this.processEffectPhase("turn_end", attacker, defender, logEntry);

    if (this.damageCalculator.checkDefeat(defender)) {
      this.processDefeat(defender, attacker, logEntry);
    }

    // Update final health values
    logEntry.attacker.endHealth = attacker.health;
    logEntry.defender.endHealth = defender.health;

    // Log the battle entry in text format
    console.log("\n=== Battle Log Entry ===");
    console.log(
      `Turn ${logEntry.turn} - ${this.gameState.player1GoesFirst ? "Player 1" : "Player 2"} goes first`
    );
    console.log(`\nAttacker: ${logEntry.attacker.card.name}`);
    console.log(
      `Health: ${logEntry.attacker.startHealth}/${logEntry.attacker.card.health}`
    );
    console.log(
      `Power: ${logEntry.attacker.startPower}${logEntry.attacker.startPower !== logEntry.attacker.endPower ? ` → ${logEntry.attacker.endPower}` : ""}`
    );

    console.log(`\nDefender: ${logEntry.defender.card.name}`);
    console.log(
      `Health: ${logEntry.defender.startHealth}/${logEntry.defender.card.health}`
    );
    console.log(
      `Power: ${logEntry.defender.startPower}${logEntry.defender.startPower !== logEntry.defender.endPower ? ` → ${logEntry.defender.endPower}` : ""}`
    );

    console.log("\nEffects:");
    logEntry.effects.forEach((effect) => {
      const timing = effect.timing ? `[${effect.timing}] ` : "";
      console.log(`${timing}${effect.description}`);
    });
    console.log("======================\n");

    this.gameState.battleLog.push(logEntry);
    this.gameState.currentTurn++;

    this.checkGameEnd();

    return logEntry;
  }

  private getCurrentBattlers(): { attacker: CardState; defender: CardState } {
    // After first turn, just alternate based on turn number
    const isPlayer1Turn =
      this.gameState.currentTurn % 2 ===
      (this.gameState.player1GoesFirst ? 1 : 0);

    const attacker = isPlayer1Turn
      ? this.gameState.player1Cards[this.gameState.currentBattle.card1Index]
      : this.gameState.player2Cards[this.gameState.currentBattle.card2Index];

    const defender = isPlayer1Turn
      ? this.gameState.player2Cards[this.gameState.currentBattle.card2Index]
      : this.gameState.player1Cards[this.gameState.currentBattle.card1Index];

    return { attacker, defender };
  }

  private processEffectPhase(
    timing: BattleEffectTiming,
    attacker: CardState,
    defender: CardState,
    logEntry: BattleLogEntry
  ): void {
    console.log(`\n--- Processing ${timing} Phase ---`);
    const effects = this.effectsProcessor.processSpecialAbilities(
      attacker,
      defender,
      timing
    );

    if (effects.specialEffects.length > 0) {
      console.log("Special Effects:", effects.specialEffects);
    }
    if (effects.attackerEffects.length > 0) {
      console.log("Attacker Effects:", effects.attackerEffects);
    }
    if (effects.defenderEffects.length > 0) {
      console.log("Defender Effects:", effects.defenderEffects);
    }

    logEntry.effects.push(...effects.specialEffects);
  }

  private processCombatPhase(
    attacker: CardState,
    defender: CardState,
    logEntry: BattleLogEntry
  ): void {
    console.log("\n--- Processing Combat Phase ---");

    // Get pre-combat effects for damage calculation
    const preCombatEffects = this.effectsProcessor.processSpecialAbilities(
      attacker,
      defender,
      "pre_combat"
    );
    console.log("Pre-combat Effects:", preCombatEffects);

    // Apply attacker's power modifications
    let attackerPowerBoost = 0;
    preCombatEffects.attackerEffects.forEach((effect) => {
      if (effect.type === "power_boost") {
        attackerPowerBoost += effect.value;
        console.log(
          `Applying power boost to ${attacker.card.name}: +${effect.value}`
        );
      }
    });
    attacker.power += attackerPowerBoost;

    // Apply defender's power modifications
    let defenderPowerReduction = 0;
    preCombatEffects.defenderEffects.forEach((effect) => {
      if (effect.type === "power_reduction") {
        defenderPowerReduction += effect.value;
        console.log(
          `Applying power reduction to ${defender.card.name}: -${effect.value}`
        );
      }
    });
    defender.power = Math.max(0, defender.power - defenderPowerReduction);

    // Calculate and apply damage
    const damage = this.damageCalculator.calculateDamage(
      attacker,
      defender,
      preCombatEffects
    );
    console.log("Calculated Damage:", damage);
    this.damageCalculator.applyDamage(defender, damage);
    logEntry.defender.damage = damage;

    // Update power values in log entry
    logEntry.attacker.endPower = attacker.power;
    logEntry.defender.endPower = defender.power;

    // Add combat effect to log with modifier info
    const attackerModifier = attacker.card.modifier || 0;
    const modifierText =
      attackerModifier !== 0
        ? ` (${attackerModifier > 0 ? "+" : ""}${attackerModifier} modifier)`
        : "";
    logEntry.effects.push({
      type: "hit",
      description: `${attacker.card.name} dealt ${damage} damage to ${defender.card.name}${modifierText}`,
      timing: "combat",
    });

    // Process combat-time effects (but don't add to log since they're already included)
    this.effectsProcessor.processSpecialAbilities(attacker, defender, "combat");
  }

  private processDefeat(
    defeated: CardState,
    victor: CardState,
    logEntry: BattleLogEntry
  ): void {
    console.log("\n--- Processing Defeat ---");
    console.log(`${defeated.card.name} was defeated by ${victor.card.name}`);

    defeated.isDefeated = true;

    const deathEffects = this.effectsProcessor.processSpecialAbilities(
      victor,
      defeated,
      "on_death"
    );
    if (deathEffects.specialEffects.length > 0) {
      console.log("Death Effects:", deathEffects.specialEffects);
    }
    logEntry.effects.push(...deathEffects.specialEffects);

    logEntry.effects.push({
      type: "defeat",
      description: `${defeated.card.name} was defeated!`,
      timing: "on_death",
    });
  }

  private advanceBattle(): void {
    const p1Remaining = this.gameState.player1Cards.filter(
      (c: CardState) => !c.isDefeated
    ).length;
    const p2Remaining = this.gameState.player2Cards.filter(
      (c: CardState) => !c.isDefeated
    ).length;

    if (p1Remaining === 0 || p2Remaining === 0) {
      this.checkGameEnd();
      return;
    }

    // Find next non-defeated cards
    while (
      this.gameState.player1Cards[this.gameState.currentBattle.card1Index]
        ?.isDefeated
    ) {
      this.gameState.currentBattle.card1Index++;
    }
    while (
      this.gameState.player2Cards[this.gameState.currentBattle.card2Index]
        ?.isDefeated
    ) {
      this.gameState.currentBattle.card2Index++;
    }
  }

  private checkGameEnd(): void {
    const p1Defeated = this.gameState.player1Cards.every(
      (c: CardState) => c.isDefeated
    );
    const p2Defeated = this.gameState.player2Cards.every(
      (c: CardState) => c.isDefeated
    );

    if (p1Defeated && p2Defeated) {
      this.gameState.winner = "draw";
    } else if (p1Defeated) {
      this.gameState.winner = 2;
    } else if (p2Defeated) {
      this.gameState.winner = 1;
    }
  }
}
