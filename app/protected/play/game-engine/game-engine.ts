import {
  GameCard,
  GameState,
  CardState,
  BattleLogEntry,
  GameStats,
  CardEffect,
  toVisibleCardState,
  VisibleCardState,
} from "./types";
import { EffectsProcessor } from "./effects-processor";
import { DamageCalculator } from "./damage-calculator";
import { BattleManager } from "./battle-manager";

export class GameEngine {
  private gameState: GameState;
  private gameStats: GameStats;
  private effectsProcessor: EffectsProcessor;
  private damageCalculator: DamageCalculator;
  private battleManager: BattleManager;

  constructor(
    player1Cards: GameCard[],
    player2Cards: GameCard[]
  ) {
    console.log("\n=== Initializing Game Engine ===");
    this.gameStats = {
      totalDamageDealt: 0,
      cardsDefeated: 0,
      turnsPlayed: 0,
      specialAbilitiesUsed: 0,
    };

    const player1GoesFirst = Math.random() < 0.5;
    console.log("Player 1 Goes First:", player1GoesFirst);
    console.log("Initial Turn:", 1);

    // Create card states for both players
    const player1CardStates = player1Cards.map(card => this.createCardState(card));
    const player2CardStates = player2Cards.map(card => this.createCardState(card));

    // Create visible states for both players
    const player1VisibleStates = player1CardStates.map(toVisibleCardState);
    const player2VisibleStates = player2CardStates.map(toVisibleCardState);

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
        specialAbilitiesUsed: 0
      }
    };

    this.effectsProcessor = new EffectsProcessor(this.gameStats);
    this.damageCalculator = new DamageCalculator();
    this.battleManager = new BattleManager(
      this.gameState,
      this.effectsProcessor,
      this.damageCalculator
    );
  }

  private createCardState(card: GameCard): CardState {
    console.log("\n=== Creating Card State ===");
    console.log("Original card:", {
      name: card.name,
      gameplay_effects: JSON.stringify(card.gameplay_effects, null, 2),
      modifier: card.modifier,
    });

    const cardState = {
      card,
      health: card.health,
      maxHealth: card.health,
      power: card.power,
      effects: Array.isArray(card.gameplay_effects) ? [...card.gameplay_effects] : [],
      isDefeated: false,
    };

    console.log("Created card state:", {
      name: cardState.card.name,
      effects: JSON.stringify(cardState.effects, null, 2),
      modifier: cardState.card.modifier,
    });

    return cardState;
  }

  public processTurn(): BattleLogEntry | null {
    const result = this.battleManager.processTurn();

    // Update visible states after processing turn
    this.updateVisibleStates();

    return result;
  }

  private updateVisibleStates() {
    // Update visible states for both players
    this.gameState.player1VisibleCards = this.gameState.player1Cards.map(toVisibleCardState);
    this.gameState.player2VisibleCards = this.gameState.player2Cards.map(toVisibleCardState);
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getGameStats(): GameStats {
    return this.gameStats;
  }
}
