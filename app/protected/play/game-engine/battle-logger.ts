import { CardState, BattleLogEntry, GameState } from "./types";

export class BattleLogger {
  constructor(private gameState: GameState) {}

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
