import { GameCard, GameState, CardState, BattleLogEntry, GameStats, convertToGameCard, CardEffect, DbCard } from './types';
import { EffectsProcessor } from './effects-processor';
import { DamageCalculator } from './damage-calculator';
import { BattleManager } from './battle-manager';

export class GameEngine {
  private gameState: GameState;
  private gameStats: GameStats;
  private effectsProcessor: EffectsProcessor;
  private damageCalculator: DamageCalculator;
  private battleManager: BattleManager;

  constructor(player1Cards: DbCard[], player2Cards: DbCard[]) {
    this.gameStats = {
      totalDamageDealt: 0,
      cardsDefeated: 0,
      turnsPlayed: 0,
      specialAbilitiesUsed: 0
    };

    this.gameState = {
      currentTurn: 1,
      player1GoesFirst: Math.random() < 0.5,
      player1Cards: player1Cards.map((card) => {
        console.log('\n=== Converting Player 1 Card ===');
        console.log('Original card:', {
          name: card.name,
          special_effects: JSON.stringify(card.special_effects, null, 2),
          modifier: card.modifier
        });
        const gameCard = convertToGameCard(card);
        console.log('Converted game card:', {
          name: gameCard.name,
          gameplay_effects: JSON.stringify(gameCard.gameplay_effects, null, 2),
          modifier: gameCard.modifier
        });
        const cardState = {
          card: gameCard,
          health: gameCard.health,
          maxHealth: gameCard.health,
          power: gameCard.power,
          effects: [...gameCard.gameplay_effects], // Create a new array to avoid reference issues
          isDefeated: false,
        };
        console.log('Created card state:', {
          name: cardState.card.name,
          effects: JSON.stringify(cardState.effects, null, 2),
          modifier: cardState.card.modifier
        });
        return cardState;
      }),
      player2Cards: player2Cards.map((card) => {
        console.log('\n=== Converting Player 2 Card ===');
        console.log('Original card:', {
          name: card.name,
          special_effects: JSON.stringify(card.special_effects, null, 2),
          modifier: card.modifier
        });
        const gameCard = convertToGameCard(card);
        console.log('Converted game card:', {
          name: gameCard.name,
          gameplay_effects: JSON.stringify(gameCard.gameplay_effects, null, 2),
          modifier: gameCard.modifier
        });
        const cardState = {
          card: gameCard,
          health: gameCard.health,
          maxHealth: gameCard.health,
          power: gameCard.power,
          effects: [...gameCard.gameplay_effects], // Create a new array to avoid reference issues
          isDefeated: false,
        };
        console.log('Created card state:', {
          name: cardState.card.name,
          effects: JSON.stringify(cardState.effects, null, 2),
          modifier: cardState.card.modifier
        });
        return cardState;
      }),
      currentBattle: {
        card1Index: 0,
        card2Index: 0,
      },
      winner: null,
      battleLog: [],
    };

    this.effectsProcessor = new EffectsProcessor(this.gameStats);
    this.damageCalculator = new DamageCalculator();
    this.battleManager = new BattleManager(
      this.gameState,
      this.effectsProcessor,
      this.damageCalculator
    );
  }

  public processTurn(): BattleLogEntry | null {
    return this.battleManager.processTurn();
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getGameStats(): GameStats {
    return this.gameStats;
  }
}
