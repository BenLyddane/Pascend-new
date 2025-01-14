import { GameState, CardState } from "./types";
import { BattleLogger } from "./battle-logger";

export class BattleStateManager {
  private readonly STATE_HISTORY_SIZE = 20;
  private stateHistory: string[] = [];
  private battleLogger: BattleLogger;

  constructor(private gameState: GameState) {
    this.battleLogger = new BattleLogger(gameState);
  }

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

    // When it's player 1's turn:
    // - Attacker should be player 1's card (card1Index)
    // - Defender should be player 2's card (card2Index)
    // When it's player 2's turn:
    // - Attacker should be player 2's card (card2Index)
    // - Defender should be player 1's card (card1Index)
    const attacker = isPlayer1Turn
      ? this.gameState.player1Cards[this.gameState.currentBattle.card1Index]
      : this.gameState.player2Cards[this.gameState.currentBattle.card2Index];

    const defender = isPlayer1Turn
      ? this.gameState.player2Cards[this.gameState.currentBattle.card2Index]
      : this.gameState.player1Cards[this.gameState.currentBattle.card1Index];

    console.log("Selected battlers:", {
      isPlayer1Turn,
      attacker: attacker?.card.name,
      defender: defender?.card.name
    });

    return { attacker, defender };
  }

  advanceBattle(): void {
    const { attacker, defender } = this.getCurrentBattlers();
    
    // Check if either card was defeated
    if (attacker?.isDefeated || attacker?.health <= 0) {
      // Find next non-defeated card for the attacker's side
      const isPlayer1Attacker = this.gameState.currentTurn % 2 === (this.gameState.player1GoesFirst ? 1 : 0);
      const attackerCards = isPlayer1Attacker ? this.gameState.player1Cards : this.gameState.player2Cards;
      const attackerIndex = isPlayer1Attacker ? 'card1Index' : 'card2Index';
      
      let foundNextCard = false;
      const startIndex = this.gameState.currentBattle[attackerIndex];
      let currentIndex = startIndex;
      
      do {
        currentIndex = (currentIndex + 1) % attackerCards.length;
        if (!attackerCards[currentIndex].isDefeated) {
          this.gameState.currentBattle[attackerIndex] = currentIndex;
          foundNextCard = true;
          const player = isPlayer1Attacker ? 'Player 1' : 'Player 2';
          console.log(`Found next ${player} card:`, attackerCards[currentIndex].card.name);
          this.battleLogger.logStateTransition(
            this.gameState.currentTurn,
            `Advanced to next ${player} card: ${attackerCards[currentIndex].card.name}`,
            {
              previousState: `${attackerCards[startIndex].card.name} (defeated)`,
              newState: attackerCards[currentIndex].card.name
            }
          );
          break;
        }
      } while (currentIndex !== startIndex);
      
      if (!foundNextCard) {
        const player = isPlayer1Attacker ? 'Player 1' : 'Player 2';
        console.log(`No more cards available for ${player}`);
        this.battleLogger.logStateTransition(
          this.gameState.currentTurn,
          `No more cards available for ${player}`,
          { previousState: "searching", newState: "game_end" }
        );
        this.checkGameEnd();
        return;
      }
    }
    
    if (defender?.isDefeated || defender?.health <= 0) {
      // Find next non-defeated card for the defender's side
      const isPlayer1Defender = this.gameState.currentTurn % 2 !== (this.gameState.player1GoesFirst ? 1 : 0);
      const defenderCards = isPlayer1Defender ? this.gameState.player1Cards : this.gameState.player2Cards;
      const defenderIndex = isPlayer1Defender ? 'card1Index' : 'card2Index';
      
      let foundNextCard = false;
      const startIndex = this.gameState.currentBattle[defenderIndex];
      let currentIndex = startIndex;
      
      do {
        currentIndex = (currentIndex + 1) % defenderCards.length;
        if (!defenderCards[currentIndex].isDefeated) {
          this.gameState.currentBattle[defenderIndex] = currentIndex;
          foundNextCard = true;
          console.log(`Found next ${isPlayer1Defender ? 'Player 1' : 'Player 2'} card:`, defenderCards[currentIndex].card.name);
          break;
        }
      } while (currentIndex !== startIndex);
      
      if (!foundNextCard) {
        console.log(`No more cards available for ${isPlayer1Defender ? 'Player 1' : 'Player 2'}`);
        this.checkGameEnd();
        return;
      }
    }
    
    // Check if we have valid battlers after advancement
    const newBattlers = this.getCurrentBattlers();
    if (!newBattlers.attacker || !newBattlers.defender) {
      console.log("No valid battles remaining");
      this.checkGameEnd();
    } else {
      console.log("Advanced to next battle:", {
        attacker: newBattlers.attacker.card.name,
        defender: newBattlers.defender.card.name,
        indices: this.gameState.currentBattle
      });
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
