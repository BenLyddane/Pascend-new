import { GameState } from "@/app/protected/play/game-engine/types";

/**
 * Validates and converts a game state from the database to the game engine format
 * @param state The game state from the database
 * @returns The validated and converted game state
 */
export function validateAndConvertGameState(state: any): GameState {
  // Ensure the state has all required properties
  if (!state || typeof state !== 'object') {
    throw new Error('Invalid game state: state must be an object');
  }
  
  // Check required properties
  const requiredProps = [
    'gameId', 
    'player1Cards', 
    'player2Cards', 
    'currentTurn', 
    'player1GoesFirst', 
    'status'
  ];
  
  for (const prop of requiredProps) {
    if (!(prop in state)) {
      throw new Error(`Invalid game state: missing required property '${prop}'`);
    }
  }
  
  // Ensure player cards are arrays
  if (!Array.isArray(state.player1Cards) || !Array.isArray(state.player2Cards)) {
    throw new Error('Invalid game state: player cards must be arrays');
  }
  
  // Ensure each card has required properties
  const validateCard = (card: any, index: number, player: number) => {
    if (!card || typeof card !== 'object') {
      throw new Error(`Invalid card at player ${player}, index ${index}: card must be an object`);
    }
    
    const requiredCardProps = [
      'id', 
      'power', 
      'health', 
      'maxHealth', 
      'position', 
      'isDefeated'
    ];
    
    for (const prop of requiredCardProps) {
      if (!(prop in card)) {
        throw new Error(`Invalid card at player ${player}, index ${index}: missing required property '${prop}'`);
      }
    }
  };
  
  state.player1Cards.forEach((card: any, index: number) => validateCard(card, index, 1));
  state.player2Cards.forEach((card: any, index: number) => validateCard(card, index, 2));
  
  // Ensure activeCardIndices exists or create it
  if (!state.activeCardIndices) {
    state.activeCardIndices = {
      player1: state.player1Cards.findIndex((card: any) => !card.isDefeated),
      player2: state.player2Cards.findIndex((card: any) => !card.isDefeated)
    };
  }
  
  // Ensure events array exists
  if (!state.events) {
    state.events = [];
  }
  
  // Ensure version exists
  if (state.version === undefined) {
    state.version = 1;
  }
  
  // Ensure lastUpdated exists
  if (state.lastUpdated === undefined) {
    state.lastUpdated = Date.now();
  }
  
  return state as GameState;
}

/**
 * Converts a game state to a format suitable for storing in the database
 * @param state The game state to convert
 * @returns The converted game state
 */
export function convertGameStateForDatabase(state: GameState): any {
  // Create a deep copy of the state
  const dbState = JSON.parse(JSON.stringify(state));
  
  // Add any database-specific properties or transformations here
  
  return dbState;
}
