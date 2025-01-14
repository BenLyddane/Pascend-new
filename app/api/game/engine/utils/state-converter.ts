import { Json } from "@/types/database.types";
import { GameState, CardState, VisibleCardState, BattleLogEntry } from "@/app/protected/play/game-engine/types";

// Type guard to check if a value matches the GameState structure
export function isValidGameState(json: unknown): json is GameState {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return false;

  const state = json as any;
  return (
    typeof state.currentTurn === 'number' &&
    typeof state.player1GoesFirst === 'boolean' &&
    Array.isArray(state.player1Cards) &&
    Array.isArray(state.player2Cards) &&
    Array.isArray(state.player1VisibleCards) &&
    Array.isArray(state.player2VisibleCards) &&
    typeof state.currentBattle === 'object' &&
    typeof state.currentBattle.card1Index === 'number' &&
    typeof state.currentBattle.card2Index === 'number' &&
    Array.isArray(state.battleLog) &&
    typeof state.stats === 'object'
  );
}

// Convert database Json to GameState with validation
export function validateAndConvertGameState(json: Json | null): GameState {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  
  if (!isValidGameState(parsed)) {
    throw new Error('Invalid game state structure');
  }

  return parsed;
}

// Convert GameState to database Json
export function serializeGameState(state: GameState): Json {
  const serialized = JSON.parse(JSON.stringify({
    ...state,
    // Ensure all required GameState properties are serialized
    currentTurn: state.currentTurn,
    player1GoesFirst: state.player1GoesFirst,
    player1Cards: state.player1Cards,
    player2Cards: state.player2Cards,
    player1VisibleCards: state.player1VisibleCards,
    player2VisibleCards: state.player2VisibleCards,
    currentBattle: state.currentBattle,
    battleLog: state.battleLog,
    stats: state.stats,
    winner: state.winner,
    version: state.version || 0
  }));

  return serialized;
}
