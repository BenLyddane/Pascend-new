import { GameState, GameEvent, generateId } from '../types';

interface GetStatePayload {
  timestamp: number;
}

export function getState(
  state: GameState,
  payload: GetStatePayload
): GameState {
  // Simply return a copy of the current state
  // This is used to get the current state without modifying it
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function validateGameState(state: GameState): boolean {
  // Validate that the state has all required properties
  if (!state.gameId || 
      !state.player1Cards || 
      !state.player2Cards || 
      state.currentTurn === undefined || 
      state.player1GoesFirst === undefined || 
      state.status === undefined) {
    return false;
  }
  
  // Validate player cards
  if (!Array.isArray(state.player1Cards) || !Array.isArray(state.player2Cards)) {
    return false;
  }
  
  // Validate that each card has required properties
  for (const card of [...state.player1Cards, ...state.player2Cards]) {
    if (!card.id || 
        card.power === undefined || 
        card.health === undefined || 
        card.maxHealth === undefined || 
        card.position === undefined || 
        card.isDefeated === undefined) {
      return false;
    }
  }
  
  return true;
}

export function checkGameOver(state: GameState): GameState {
  // Clone the state to avoid mutations
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Check if the game is already over
  if (newState.status === 'completed') {
    return newState;
  }
  
  // Get the active cards for each player
  const activePlayer1Cards = newState.player1Cards.filter(card => !card.isDefeated);
  const activePlayer2Cards = newState.player2Cards.filter(card => !card.isDefeated);
  
  // Check if the game is over
  if (activePlayer1Cards.length === 0 && activePlayer2Cards.length === 0) {
    // It's a draw
    newState.winner = 'draw';
    newState.drawReason = 'All cards defeated';
    newState.status = 'completed';
    
    // Add game end event
    const gameEndEvent: GameEvent = {
      id: generateId('event'),
      type: 'game_ended',
      timestamp: Date.now(),
      turn: newState.currentTurn,
      data: {
        winner: 'draw',
        reason: 'All cards defeated'
      }
    };
    
    newState.events.push(gameEndEvent);
  } else if (activePlayer1Cards.length === 0) {
    // Player 2 wins
    newState.winner = 2;
    newState.status = 'completed';
    
    // Add game end event
    const gameEndEvent: GameEvent = {
      id: generateId('event'),
      type: 'game_ended',
      timestamp: Date.now(),
      turn: newState.currentTurn,
      data: {
        winner: 2,
        reason: 'All player 1 cards defeated'
      }
    };
    
    newState.events.push(gameEndEvent);
  } else if (activePlayer2Cards.length === 0) {
    // Player 1 wins
    newState.winner = 1;
    newState.status = 'completed';
    
    // Add game end event
    const gameEndEvent: GameEvent = {
      id: generateId('event'),
      type: 'game_ended',
      timestamp: Date.now(),
      turn: newState.currentTurn,
      data: {
        winner: 1,
        reason: 'All player 2 cards defeated'
      }
    };
    
    newState.events.push(gameEndEvent);
  }
  
  // Update version and last updated timestamp
  if (newState.status === 'completed') {
    newState.version += 1;
    newState.lastUpdated = Date.now();
  }
  
  return newState;
}

export function updateActiveCardIndices(state: GameState): GameState {
  // Clone the state to avoid mutations
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Find the first non-defeated card for each player
  const activePlayer1CardIndex = newState.player1Cards.findIndex(card => !card.isDefeated);
  const activePlayer2CardIndex = newState.player2Cards.findIndex(card => !card.isDefeated);
  
  // Update active card indices
  if (activePlayer1CardIndex !== -1) {
    newState.activeCardIndices.player1 = activePlayer1CardIndex;
  }
  
  if (activePlayer2CardIndex !== -1) {
    newState.activeCardIndices.player2 = activePlayer2CardIndex;
  }
  
  // Update version and last updated timestamp
  newState.version += 1;
  newState.lastUpdated = Date.now();
  
  return newState;
}
