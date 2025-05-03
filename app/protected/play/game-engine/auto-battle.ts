import { GameState, GameCard, GameEvent, generateId } from './types';
import { processAttack } from './actions/attack';
import { endTurn } from './actions/end-turn';

/**
 * Process a single auto-battle round
 * @param state The current game state
 * @returns The updated game state after one round
 */
export function processAutoBattleRound(state: GameState): GameState {
  // Clone the state to avoid mutations
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Determine whose turn it is
  const isPlayer1Turn = newState.currentTurn % 2 === (newState.player1GoesFirst ? 1 : 0);
  
  // Get the active cards
  const attackerCards = isPlayer1Turn ? newState.player1Cards : newState.player2Cards;
  const defenderCards = isPlayer1Turn ? newState.player2Cards : newState.player1Cards;
  
  // Find the first non-defeated attacker and defender
  const attackerIndex = attackerCards.findIndex(card => !card.isDefeated);
  const defenderIndex = defenderCards.findIndex(card => !card.isDefeated);
  
  // If either player has no active cards, end the battle
  if (attackerIndex === -1 || defenderIndex === -1) {
    // Check if the game is already over
    if (newState.status === 'completed') {
      return newState;
    }
    
    // Determine the winner
    if (attackerIndex === -1 && defenderIndex === -1) {
      // It's a draw
      newState.winner = 'draw';
      newState.drawReason = 'All cards defeated';
      newState.status = 'completed';
      
      // Add game end event
      newState.events.push({
        id: generateId('event'),
        type: 'game_ended',
        timestamp: Date.now(),
        turn: newState.currentTurn,
        data: {
          winner: 'draw',
          reason: 'All cards defeated'
        }
      });
    } else if (attackerIndex === -1) {
      // Defender wins
      newState.winner = isPlayer1Turn ? 2 : 1;
      newState.status = 'completed';
      
      // Add game end event
      newState.events.push({
        id: generateId('event'),
        type: 'game_ended',
        timestamp: Date.now(),
        turn: newState.currentTurn,
        data: {
          winner: isPlayer1Turn ? 2 : 1,
          reason: `All ${isPlayer1Turn ? 'player 1' : 'player 2'} cards defeated`
        }
      });
    } else {
      // Attacker wins
      newState.winner = isPlayer1Turn ? 1 : 2;
      newState.status = 'completed';
      
      // Add game end event
      newState.events.push({
        id: generateId('event'),
        type: 'game_ended',
        timestamp: Date.now(),
        turn: newState.currentTurn,
        data: {
          winner: isPlayer1Turn ? 1 : 2,
          reason: `All ${isPlayer1Turn ? 'player 2' : 'player 1'} cards defeated`
        }
      });
    }
    
    return newState;
  }
  
  // Process the attack
  const attackPayload = {
    attackerIndex,
    targetIndex: defenderIndex,
    timestamp: Date.now()
  };
  
  newState = processAttack(newState, attackPayload);
  
  // End the turn
  const endTurnPayload = {
    timestamp: Date.now()
  };
  
  newState = endTurn(newState, endTurnPayload);
  
  return newState;
}

/**
 * Run a complete auto-battle
 * @param state The initial game state
 * @param maxRounds Maximum number of rounds to run (default: 20)
 * @returns The final game state
 */
export function runAutoBattle(state: GameState, maxRounds: number = 20): GameState {
  let currentState = JSON.parse(JSON.stringify(state)) as GameState;
  let rounds = 0;
  
  // Track health of cards to detect stalemate
  let previousHealthStates: {player1: number[], player2: number[]}[] = [];
  
  // Run rounds until the game is over or we reach the maximum
  while (currentState.status !== 'completed' && rounds < maxRounds) {
    // Store current health state before processing the round
    const currentHealthState = {
      player1: currentState.player1Cards.map(card => card.health),
      player2: currentState.player2Cards.map(card => card.health)
    };
    
    // Check for stalemate - if health hasn't changed for 5 consecutive rounds
    if (previousHealthStates.length >= 5) {
      const isStalemate = previousHealthStates.slice(-5).every(prevState => 
        JSON.stringify(prevState.player1) === JSON.stringify(currentHealthState.player1) &&
        JSON.stringify(prevState.player2) === JSON.stringify(currentHealthState.player2)
      );
      
      if (isStalemate) {
        // End the battle as a draw due to stalemate
        currentState.winner = 'draw';
        currentState.drawReason = 'Stalemate detected - no health changes for 5 rounds';
        currentState.status = 'completed';
        
        // Add game end event
        currentState.events.push({
          id: generateId('event'),
          type: 'game_ended',
          timestamp: Date.now(),
          turn: currentState.currentTurn,
          data: {
            winner: 'draw',
            reason: 'Stalemate detected'
          }
        });
        
        break;
      }
    }
    
    // Add current health state to history
    previousHealthStates.push(currentHealthState);
    if (previousHealthStates.length > 10) {
      // Keep only the last 10 states to limit memory usage
      previousHealthStates.shift();
    }
    
    // Process the round
    currentState = processAutoBattleRound(currentState);
    rounds++;
  }
  
  // If we reached the maximum rounds without a winner, end as a draw
  if (rounds >= maxRounds && currentState.status !== 'completed') {
    currentState.winner = 'draw';
    currentState.drawReason = 'Maximum rounds reached';
    currentState.status = 'completed';
    
    // Add game end event
    currentState.events.push({
      id: generateId('event'),
      type: 'game_ended',
      timestamp: Date.now(),
      turn: currentState.currentTurn,
      data: {
        winner: 'draw',
        reason: 'Maximum rounds reached'
      }
    });
  }
  
  return currentState;
}

/**
 * Ban cards from a deck
 * @param cards The deck of cards
 * @param banIndices The indices of cards to ban
 * @returns The deck with banned cards removed
 */
export function banCards(cards: GameCard[], banIndices: number[]): GameCard[] {
  // Sort ban indices in descending order to avoid index shifting
  const sortedBanIndices = [...banIndices].sort((a, b) => b - a);
  
  // Clone the cards array
  const newCards = [...cards];
  
  // Remove banned cards
  for (const index of sortedBanIndices) {
    if (index >= 0 && index < newCards.length) {
      newCards.splice(index, 1);
    }
  }
  
  return newCards;
}

/**
 * Reorder cards in a deck
 * @param cards The deck of cards
 * @param newOrder The new order of card indices
 * @returns The reordered deck
 */
export function reorderCards(cards: GameCard[], newOrder: number[]): GameCard[] {
  // Validate the new order
  if (newOrder.length !== cards.length) {
    console.warn(`Warning: New order length (${newOrder.length}) doesn't match cards length (${cards.length}). Adjusting...`);
    
    // If the lengths don't match, we'll create a valid order
    const validOrder = Array.from({ length: cards.length }, (_, i) => i);
    
    // Return cards with updated positions
    return cards.map((card, index) => ({
      ...card,
      position: index
    }));
  }
  
  // Check for duplicate indices
  const uniqueIndices = new Set(newOrder);
  if (uniqueIndices.size !== newOrder.length) {
    console.warn('Warning: New order contains duplicate indices. Adjusting...');
    
    // If there are duplicates, we'll create a valid order
    const validOrder = Array.from({ length: cards.length }, (_, i) => i);
    
    // Return cards with updated positions
    return cards.map((card, index) => ({
      ...card,
      position: index
    }));
  }
  
  // Check that all indices are valid
  let hasInvalidIndex = false;
  for (const index of newOrder) {
    if (index < 0 || index >= cards.length) {
      console.warn(`Warning: Invalid index in new order: ${index}. Adjusting...`);
      hasInvalidIndex = true;
      break;
    }
  }
  
  if (hasInvalidIndex) {
    // If there are invalid indices, we'll create a valid order
    const validOrder = Array.from({ length: cards.length }, (_, i) => i);
    
    // Return cards with updated positions
    return cards.map((card, index) => ({
      ...card,
      position: index
    }));
  }
  
  // If all validations pass, create the reordered deck
  const reorderedCards = newOrder.map(index => cards[index]);
  
  // Update positions
  return reorderedCards.map((card, index) => ({
    ...card,
    position: index
  }));
}

/**
 * Setup a game with banning and reordering
 * @param player1Cards Player 1's initial cards
 * @param player2Cards Player 2's initial cards
 * @param player1Bans Indices of player 2's cards that player 1 wants to ban
 * @param player2Bans Indices of player 1's cards that player 2 wants to ban
 * @param player1Order New order for player 1's remaining cards
 * @param player2Order New order for player 2's remaining cards
 * @param player1GoesFirst Whether player 1 goes first
 * @returns The initial game state after setup
 */
export function setupGame(
  player1Cards: GameCard[],
  player2Cards: GameCard[],
  player1Bans: number[],
  player2Bans: number[],
  player1Order: number[],
  player2Order: number[],
  player1GoesFirst: boolean = Math.random() > 0.5
): GameState {
  // Ban cards
  const player1RemainingCards = banCards(player1Cards, player2Bans);
  const player2RemainingCards = banCards(player2Cards, player1Bans);
  
  // Reorder cards
  const player1FinalCards = reorderCards(player1RemainingCards, player1Order);
  const player2FinalCards = reorderCards(player2RemainingCards, player2Order);
  
  // Generate a unique game ID
  const gameId = `game-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Create initial game state
  return {
    gameId,
    player1Cards: player1FinalCards,
    player2Cards: player2FinalCards,
    currentTurn: 1,
    player1GoesFirst,
    activeCardIndices: {
      player1: 0,
      player2: 0
    },
    winner: null,
    status: "playing",
    version: 1,
    events: [
      {
        id: generateId('event'),
        type: "game_created",
        timestamp: Date.now(),
        turn: 0,
        data: {
          player1CardsCount: player1FinalCards.length,
          player2CardsCount: player2FinalCards.length,
          player1GoesFirst,
          player1Bans,
          player2Bans,
          player1Order,
          player2Order
        }
      }
    ],
    lastUpdated: Date.now()
  };
}
