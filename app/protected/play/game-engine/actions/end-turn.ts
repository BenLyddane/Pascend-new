import { GameState, GameEvent, generateId } from '../types';
import { processEffects } from './process-effects';
import { checkGameOver, updateActiveCardIndices } from './game-state';

interface EndTurnPayload {
  timestamp: number;
}

export function endTurn(
  state: GameState,
  payload: EndTurnPayload
): GameState {
  // Clone the state to avoid mutations
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Determine whose turn it is
  const isPlayer1Turn = newState.currentTurn % 2 === (newState.player1GoesFirst ? 1 : 0);
  
  // Process end-of-turn effects
  const stateWithEndTurnEffects = processEffects(newState, 'end_turn');
  
  // Create turn end event
  const turnEndEvent: GameEvent = {
    id: generateId('event'),
    type: 'turn_ended',
    timestamp: payload.timestamp || Date.now(),
    turn: stateWithEndTurnEffects.currentTurn,
    data: {
      player: isPlayer1Turn ? 1 : 2
    }
  };
  
  // Add event to state
  stateWithEndTurnEffects.events.push(turnEndEvent);
  
  // Increment turn counter
  stateWithEndTurnEffects.currentTurn += 1;
  
  // Determine the new current player
  const newIsPlayer1Turn = stateWithEndTurnEffects.currentTurn % 2 === (stateWithEndTurnEffects.player1GoesFirst ? 1 : 0);
  
  // Create turn start event
  const turnStartEvent: GameEvent = {
    id: generateId('event'),
    type: 'turn_started',
    timestamp: Date.now(),
    turn: stateWithEndTurnEffects.currentTurn,
    data: {
      player: newIsPlayer1Turn ? 1 : 2
    }
  };
  
  // Add event to state
  stateWithEndTurnEffects.events.push(turnStartEvent);
  
  // Process start-of-turn effects
  const stateWithStartTurnEffects = processEffects(stateWithEndTurnEffects, 'start_turn');
  
  // Update active card indices
  const stateWithUpdatedIndices = updateActiveCardIndices(stateWithStartTurnEffects);
  
  // Check if the game is over
  const finalState = checkGameOver(stateWithUpdatedIndices);
  
  // Update version and last updated timestamp
  finalState.version += 1;
  finalState.lastUpdated = Date.now();
  
  return finalState;
}
