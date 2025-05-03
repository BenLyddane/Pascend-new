// Game state types for the new auto-battle system
import { BattleLogEntry } from "./battle-log-types";
import { CardState } from "./battlefield-types";

export interface Battle {
  card1Index: number;
  card2Index: number;
  winner?: number | 'draw';
}

export interface GameState {
  gameId: string;
  player1Cards: CardState[];
  player2Cards: CardState[];
  currentTurn: number;
  currentBattle: Battle | null;
  battleLog: BattleLogEntry[];
  player1GoesFirst: boolean;
  winner: 1 | 2 | "draw" | null;
  drawReason?: string;
  status: "setup" | "playing" | "completed";
}
