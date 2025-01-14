import { createGame, CreateGamePayload } from './create-game';
import { processTurn, ProcessTurnPayload } from './process-turn';
import { endGame, EndGamePayload } from './end-game';
import { GameAutoProcessor } from './auto-processor';

// Re-export all action handlers
export {
  createGame,
  processTurn,
  endGame,
  GameAutoProcessor
};

// Re-export all payload types
export type {
  CreateGamePayload,
  ProcessTurnPayload,
  EndGamePayload
};

// Action type definitions
export type GameActionType = 
  | 'CREATE_GAME'
  | 'PROCESS_TURN'
  | 'START_AUTO_PROCESSING'
  | 'END_GAME';

// Common result type for all actions
export interface GameActionResult<T = any> {
  error?: string;
  status?: number;
  data?: T;
}

// Action handler type definitions
export interface GameActionHandlers {
  createGame: typeof createGame;
  processTurn: typeof processTurn;
  endGame: typeof endGame;
  GameAutoProcessor: typeof GameAutoProcessor;
}

// Action metadata for documentation and validation
export const GAME_ACTIONS = {
  CREATE_GAME: {
    description: 'Creates a new game instance with initial state',
    requiresGameId: false,
    requiresProcessing: false
  },
  PROCESS_TURN: {
    description: 'Processes a single turn action in the game',
    requiresGameId: true,
    requiresProcessing: false
  },
  START_AUTO_PROCESSING: {
    description: 'Starts automatic turn processing for AI or simulation',
    requiresGameId: true,
    requiresProcessing: false
  },
  END_GAME: {
    description: 'Ends a game and cleans up resources',
    requiresGameId: true,
    requiresProcessing: false
  }
} as const;

// Utility type to extract payload type based on action
export type ActionPayload<T extends GameActionType> = 
  T extends 'CREATE_GAME' ? CreateGamePayload :
  T extends 'PROCESS_TURN' ? ProcessTurnPayload :
  T extends 'END_GAME' ? EndGamePayload :
  never;
