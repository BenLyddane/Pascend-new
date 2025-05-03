// Battlefield types for the new auto-battle system
import { BattleLogEntry, isBattleLogEntry } from "./battle-log-types";
import { CardWithEffects } from "@/app/actions/fetchDecks";

// Define the CardState type to match what's used in the battlefield component
export interface CardState {
  card: CardWithEffects;
  health: number;
  power: number;
  maxHealth: number;
  position: number;
  isDefeated: boolean;
  effects: any[];
}

export interface BattlefieldProps {
  player1Cards: CardState[];
  player2Cards: CardState[];
  currentBattle: {
    card1Index: number;
    card2Index: number;
    winner?: number | 'draw';
  };
  onCardClick: (card: CardState) => void;
  battleLog: BattleLogEntry[];
  player1GoesFirst: boolean;
  isPlayer1Turn: boolean;
}

export interface BattleAnimation {
  type: 'attack' | 'damage' | 'heal' | 'effect' | 'defeat';
  source: 'player1' | 'player2';
  target: 'player1' | 'player2';
}
