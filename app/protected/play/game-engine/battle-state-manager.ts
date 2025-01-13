import { GameState, CardState } from "./types";

export class BattleStateManager {
  private readonly STATE_HISTORY_SIZE = 20;
  private stateHistory: string[] = [];

  constructor(private gameState: GameState) {}

  checkForInfiniteLoop(attacker: CardState, defender: CardState): boolean {
    // Create a state snapshot that includes all relevant battle information
    const currentState = JSON.stringify({
      attackerHealth: attacker.health,
      attackerPower: attacker.power,
      attackerEffects: attacker.effects,
      defenderHealth: defender.health,
      defenderPower: defender.power,
      defenderEffects: defender.effects,
      turn: this.gameState.currentTurn % 2, // Only need to know if it's player 1 or 2's turn
    });

    // Add current state to history
    this.stateHistory.push(currentState);

    // Keep only the last N states
    if (this.stateHistory.length > this.STATE_HISTORY_SIZE) {
      this.stateHistory.shift();
    }

    // Check if this exact state has occurred before
    const stateOccurrences = this.stateHistory.filter(
      (state) => state === currentState
    ).length;

    // If we see the same state 3 times, it's definitely an infinite loop
    if (stateOccurrences >= 3) {
      console.log(
        "True infinite loop detected - exact same game state repeated 3 times"
      );
      this.gameState.winner = "draw";
      this.gameState.drawReason =
        "Battle reached an infinite loop - same game state repeating endlessly";
      return true;
    }

    return false;
  }

  getCurrentBattlers(): { attacker: CardState; defender: CardState } {
    // After first turn, just alternate based on turn number
    // If player1GoesFirst is true:
    // Turn 1 % 2 = 1 should be player 1's turn
    // Turn 2 % 2 = 0 should be player 2's turn
    const isPlayer1Turn =
      this.gameState.currentTurn % 2 ===
      (this.gameState.player1GoesFirst ? 1 : 0);

    console.log("\n=== Turn Details ===");
    console.log("Current Turn:", this.gameState.currentTurn);
    console.log("Player 1 Goes First:", this.gameState.player1GoesFirst);
    console.log("Is Player 1's Turn:", isPlayer1Turn);

    const attacker = isPlayer1Turn
      ? this.gameState.player1Cards[this.gameState.currentBattle.card1Index]
      : this.gameState.player2Cards[this.gameState.currentBattle.card2Index];

    const defender = isPlayer1Turn
      ? this.gameState.player2Cards[this.gameState.currentBattle.card2Index]
      : this.gameState.player1Cards[this.gameState.currentBattle.card1Index];

    return { attacker, defender };
  }

  advanceBattle(): void {
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

  checkGameEnd(): void {
    // Only check for game end if at least one turn has been completed
    if (this.gameState.currentTurn > 0) {
      const p1Defeated = this.gameState.player1Cards.every(
        (c: CardState) => c.isDefeated
      );
      const p2Defeated = this.gameState.player2Cards.every(
        (c: CardState) => c.isDefeated
      );

      if (p1Defeated && p2Defeated) {
        this.gameState.winner = "draw";
        this.gameState.drawReason =
          "Both players' cards were defeated simultaneously";
      } else if (p1Defeated) {
        this.gameState.winner = 2;
      } else if (p2Defeated) {
        this.gameState.winner = 1;
      }
    }
  }

  hasWinner(): boolean {
    return this.gameState.winner !== null;
  }

  incrementTurn(): void {
    this.gameState.currentTurn++;
  }
}
