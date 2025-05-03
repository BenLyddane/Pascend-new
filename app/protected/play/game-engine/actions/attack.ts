import { GameCard, GameState, GameEvent, generateId } from '../types';

interface AttackPayload {
  attackerIndex: number;
  targetIndex: number;
  timestamp: number;
}

export function processAttack(
  state: GameState,
  payload: AttackPayload
): GameState {
  // Clone the state to avoid mutations
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Determine whose turn it is
  const isPlayer1Turn = newState.currentTurn % 2 === (newState.player1GoesFirst ? 1 : 0);
  
  // Get the attacker and defender cards
  const attackerCards = isPlayer1Turn ? newState.player1Cards : newState.player2Cards;
  const defenderCards = isPlayer1Turn ? newState.player2Cards : newState.player1Cards;
  
  // Validate indices
  if (
    payload.attackerIndex < 0 || 
    payload.attackerIndex >= attackerCards.length ||
    payload.targetIndex < 0 ||
    payload.targetIndex >= defenderCards.length
  ) {
    throw new Error('Invalid card indices');
  }
  
  // Get the attacker and defender
  const attacker = attackerCards[payload.attackerIndex];
  const defender = defenderCards[payload.targetIndex];
  
  // Validate that cards are not defeated
  if (attacker.isDefeated || defender.isDefeated) {
    throw new Error('Cannot attack with or target defeated cards');
  }
  
  // Calculate and apply attacker's damage first
  const attackDamage = calculateDamage(attacker, defender);
  defender.health = Math.max(0, defender.health - attackDamage);
  
  // Check if defender is defeated
  const defenderDefeated = defender.health <= 0;
  if (defenderDefeated) {
    defender.isDefeated = true;
    defender.health = 0;
  }
  
  // Only allow counter-attack if defender is still alive
  let counterDamage = 0;
  let attackerDefeated = false;
  
  if (!defenderDefeated) {
    // Calculate and apply defender's counter damage
    counterDamage = calculateDamage(defender, attacker);
    attacker.health = Math.max(0, attacker.health - counterDamage);
    
    // Check if attacker is defeated
    attackerDefeated = attacker.health <= 0;
    if (attackerDefeated) {
      attacker.isDefeated = true;
      attacker.health = 0;
    }
  }
  
  // Create attack event
  const attackEvent: GameEvent = {
    id: generateId('event'),
    type: 'attack',
    timestamp: payload.timestamp || Date.now(),
    turn: newState.currentTurn,
    data: {
      attackerIndex: payload.attackerIndex,
      targetIndex: payload.targetIndex,
      attackerCard: {
        id: attacker.id,
        name: attacker.name,
        startHealth: attacker.health + counterDamage,
        endHealth: attacker.health,
        damage: attackDamage,
        isDefeated: attackerDefeated
      },
      defenderCard: {
        id: defender.id,
        name: defender.name,
        startHealth: defender.health + attackDamage,
        endHealth: defender.health,
        damage: counterDamage,
        isDefeated: defenderDefeated
      }
    }
  };
  
  // Add event to state
  newState.events.push(attackEvent);
  
  // If cards were defeated, add defeat events
  if (attackerDefeated) {
    newState.events.push({
      id: generateId('event'),
      type: 'card_defeated',
      timestamp: Date.now(),
      turn: newState.currentTurn,
      data: {
        cardId: attacker.id,
        cardName: attacker.name,
        player: isPlayer1Turn ? 1 : 2
      }
    });
  }
  
  if (defenderDefeated) {
    newState.events.push({
      id: generateId('event'),
      type: 'card_defeated',
      timestamp: Date.now(),
      turn: newState.currentTurn,
      data: {
        cardId: defender.id,
        cardName: defender.name,
        player: isPlayer1Turn ? 2 : 1
      }
    });
  }
  
  // Check if the game is over
  const activePlayer1Cards = newState.player1Cards.filter(card => !card.isDefeated);
  const activePlayer2Cards = newState.player2Cards.filter(card => !card.isDefeated);
  
  if (activePlayer1Cards.length === 0 && activePlayer2Cards.length === 0) {
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
  } else if (activePlayer1Cards.length === 0) {
    // Player 2 wins
    newState.winner = 2;
    newState.status = 'completed';
    
    // Add game end event
    newState.events.push({
      id: generateId('event'),
      type: 'game_ended',
      timestamp: Date.now(),
      turn: newState.currentTurn,
      data: {
        winner: 2,
        reason: 'All player 1 cards defeated'
      }
    });
  } else if (activePlayer2Cards.length === 0) {
    // Player 1 wins
    newState.winner = 1;
    newState.status = 'completed';
    
    // Add game end event
    newState.events.push({
      id: generateId('event'),
      type: 'game_ended',
      timestamp: Date.now(),
      turn: newState.currentTurn,
      data: {
        winner: 1,
        reason: 'All player 2 cards defeated'
      }
    });
  }
  
  // Update version and last updated timestamp
  newState.version += 1;
  newState.lastUpdated = Date.now();
  
  return newState;
}

// Helper function to calculate damage
function calculateDamage(attacker: GameCard, defender: GameCard): number {
  // Start with base power
  let damage = attacker.power;
  
  // Apply special effects from the attacker
  attacker.special_effects.forEach(effect => {
    if (effect.effect_type === 'damage' || effect.effect_type === 'buff') {
      // Use the actual effect value
      damage += effect.value;
      console.log(`Applied ${effect.name} effect: +${effect.value} damage (${effect.effect_type})`);
    }
  });
  
  // Apply any gameplay effects that modify damage
  attacker.gameplay_effects.forEach(effect => {
    if (effect.effect_type === 'damage_boost' || effect.effect_type === 'buff') {
      damage += effect.value;
      console.log(`Applied gameplay effect: +${effect.value} damage (${effect.effect_type})`);
    }
  });
  
  // Apply any defense effects from the defender's special effects
  defender.special_effects.forEach(effect => {
    if (effect.effect_type === 'shield' || effect.effect_type === 'defense') {
      const reduction = effect.value;
      damage = Math.max(1, damage - reduction); // Minimum 1 damage
      console.log(`Applied ${effect.name} defense: -${reduction} damage (${effect.effect_type})`);
    }
  });
  
  // Apply any defense effects from the defender's gameplay effects
  defender.gameplay_effects.forEach(effect => {
    if (effect.effect_type === 'damage_reduction' || effect.effect_type === 'shield') {
      const reduction = effect.value;
      damage = Math.max(1, damage - reduction); // Minimum 1 damage
      console.log(`Applied gameplay defense: -${reduction} damage (${effect.effect_type})`);
    }
  });
  
  // Log the damage calculation for debugging
  console.log(`Damage calculation: ${attacker.name} (Power: ${attacker.power}) -> ${defender.name} = ${damage} damage`);
  
  return damage;
}
