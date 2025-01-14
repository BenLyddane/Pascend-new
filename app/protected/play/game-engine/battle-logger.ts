import { CardState, BattleLogEntry, GameState, GameCard } from "./types";

export class BattleLogger {
  constructor(private gameState: GameState) {}

  createEmptyLogEntry(turn: number): BattleLogEntry {
    // Create a placeholder card for logging purposes
    const placeholderCard: GameCard = {
      id: "placeholder",
      name: "No Card",
      health: 0,
      power: 0,
      image_url: null,
      description: "Placeholder card",
      created_at: new Date().toISOString(),
      is_active: true,
      rarity: "common",
      edition: "1",
      user_id: "system",
      special_effects: [],
      gameplay_effects: [],
      keywords: [],
      modifier: 0,
    };

    return {
      turn,
      attacker: {
        card: placeholderCard,
        damage: 0,
        startHealth: 0,
        endHealth: 0,
        startPower: 0,
        endPower: 0,
      },
      defender: {
        card: placeholderCard,
        damage: 0,
        startHealth: 0,
        endHealth: 0,
        startPower: 0,
        endPower: 0,
      },
      effects: [],
    };
  }

  logStateTransition(
    turn: number,
    reason: string,
    details?: { previousState?: string; newState?: string }
  ): void {
    const logEntry = this.createEmptyLogEntry(turn);

    logEntry.effects.push({
      type: "state_change",
      description: reason,
      timing: "state_transition",
      details,
    });

    console.log("\n=== State Transition ===");
    console.log(`Turn ${turn}`);
    console.log(reason);
    if (details) {
      if (details.previousState)
        console.log(`Previous state: ${details.previousState}`);
      if (details.newState) console.log(`New state: ${details.newState}`);
    }
    console.log("======================\n");

    this.gameState.battleLog.push(logEntry);
  }

  logSkippedTurn(
    turn: number,
    reason: string,
    attacker?: CardState,
    defender?: CardState
  ): void {
    const logEntry = this.createEmptyLogEntry(turn);

    // If we have card info, include it in the log
    if (attacker) {
      logEntry.attacker = {
        card: attacker.card,
        damage: 0,
        startHealth: attacker.health,
        endHealth: attacker.health,
        startPower: attacker.power,
        endPower: attacker.power,
      };
    }

    if (defender) {
      logEntry.defender = {
        card: defender.card,
        damage: 0,
        startHealth: defender.health,
        endHealth: defender.health,
        startPower: defender.power,
        endPower: defender.power,
      };
    }

    logEntry.effects.push({
      type: "state_change",
      description: `Turn skipped: ${reason}`,
      timing: "state_transition",
    });

    console.log("\n=== Skipped Turn ===");
    console.log(`Turn ${turn}`);
    console.log(`Reason: ${reason}`);
    if (attacker) console.log(`Attacker: ${attacker.card.name}`);
    if (defender) console.log(`Defender: ${defender.card.name}`);
    console.log("======================\n");

    this.gameState.battleLog.push(logEntry);
  }

  createLogEntry(
    attacker: CardState,
    defender: CardState,
    turn: number
  ): BattleLogEntry {
    const attackerStartHealth = attacker.health;
    const defenderStartHealth = defender.health;
    const attackerStartPower = attacker.power;
    const defenderStartPower = defender.power;

    return {
      turn,
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
  }

  logBattleEntry(logEntry: BattleLogEntry): void {
    // Only log essential UI information
    const uiLogEntry: BattleLogEntry = {
      turn: logEntry.turn,
      attacker: {
        card: {
          ...logEntry.attacker.card,
          // Only include UI-relevant card info
          id: logEntry.attacker.card.id,
          name: logEntry.attacker.card.name,
          health: logEntry.attacker.card.health,
          power: logEntry.attacker.card.power,
          image_url: logEntry.attacker.card.image_url,
          modifier: logEntry.attacker.card.modifier,
        } as any, // Using any to satisfy TypeScript while keeping minimal info
        damage: logEntry.attacker.damage,
        startHealth: logEntry.attacker.startHealth,
        endHealth: logEntry.attacker.endHealth,
        startPower: logEntry.attacker.startPower,
        endPower: logEntry.attacker.endPower,
      },
      defender: {
        card: {
          ...logEntry.defender.card,
          // Only include UI-relevant card info
          id: logEntry.defender.card.id,
          name: logEntry.defender.card.name,
          health: logEntry.defender.card.health,
          power: logEntry.defender.card.power,
          image_url: logEntry.defender.card.image_url,
          modifier: logEntry.defender.card.modifier,
        } as any, // Using any to satisfy TypeScript while keeping minimal info
        damage: logEntry.defender.damage,
        startHealth: logEntry.defender.startHealth,
        endHealth: logEntry.defender.endHealth,
        startPower: logEntry.defender.startPower,
        endPower: logEntry.defender.endPower,
      },
      effects: logEntry.effects.map(effect => ({
        type: effect.type,
        description: effect.description,
        icon: effect.icon,
        timing: effect.timing,
        sourceCard: effect.sourceCard,
      })),
    };

    // Add to game state
    this.gameState.battleLog.push(uiLogEntry);
  }

  updateHealthValues(
    logEntry: BattleLogEntry,
    attacker: CardState,
    defender: CardState
  ): void {
    logEntry.attacker.endHealth = attacker.health;
    logEntry.defender.endHealth = defender.health;
  }
}
