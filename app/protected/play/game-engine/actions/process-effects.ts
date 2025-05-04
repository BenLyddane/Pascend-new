import { GameCard, GameState, GameEvent, generateId } from '../types';

interface EffectContext {
  sourceCard: GameCard;
  targetCard?: GameCard;
  state: GameState;
  turn: number;
  isPlayer1Turn: boolean;
}

type EffectTrigger = 
  | 'start_turn' 
  | 'end_turn' 
  | 'attack' 
  | 'damage_dealt' 
  | 'damage_received';

export function processEffects(
  state: GameState,
  trigger: EffectTrigger,
  context?: Partial<EffectContext>
): GameState {
  // Clone the state to avoid mutations
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Determine whose turn it is
  const isPlayer1Turn = newState.currentTurn % 2 === (newState.player1GoesFirst ? 1 : 0);
  
  // Get the active cards for each player
  const player1Cards = newState.player1Cards;
  const player2Cards = newState.player2Cards;
  
  // Process effects for player 1 cards
  player1Cards.forEach(card => {
    if (!card.isDefeated) {
      processCardEffects(card, trigger, {
        sourceCard: card,
        state: newState,
        turn: newState.currentTurn,
        isPlayer1Turn,
        ...context
      });
    }
  });
  
  // Process effects for player 2 cards
  player2Cards.forEach(card => {
    if (!card.isDefeated) {
      processCardEffects(card, trigger, {
        sourceCard: card,
        state: newState,
        turn: newState.currentTurn,
        isPlayer1Turn,
        ...context
      });
    }
  });
  
  // Update version and last updated timestamp
  newState.version += 1;
  newState.lastUpdated = Date.now();
  
  return newState;
}

function processCardEffects(
  card: GameCard,
  trigger: EffectTrigger,
  context: EffectContext
): void {
  // Process special effects that match the trigger
  card.special_effects.forEach(effect => {
    if (shouldTriggerEffect(effect, trigger)) {
      // Apply the effect
      applyEffect(effect, context);
      
      // Add effect triggered event
      const event: GameEvent = {
        id: generateId('event'),
        type: 'effect_triggered',
        timestamp: Date.now(),
        turn: context.turn,
        data: {
          cardId: card.id,
          cardName: card.name,
          effectName: effect.name,
          effectDescription: effect.description
            .replace(/{modifier}/g, effect.value.toString())
            .replace(/{value}/g, effect.value.toString()),
          effectValue: effect.value,
          effectType: effect.effect_type
        }
      };
      
      context.state.events.push(event);
    }
  });
  
  // Process gameplay effects (temporary effects)
  card.gameplay_effects = card.gameplay_effects.filter(effect => {
    // Decrement duration for temporary effects
    if (effect.duration !== undefined) {
      effect.duration -= 1;
      return effect.duration > 0; // Keep if duration is still positive
    }
    return true; // Keep permanent effects
  });
}

function applyEffect(effect: any, context: EffectContext): void {
  const { sourceCard, targetCard, state, isPlayer1Turn } = context;
  
  // Get the opponent's active card
  const isSourcePlayer1 = isPlayer1Turn === (sourceCard.id.includes('player1') || state.player1Cards.some(c => c.id === sourceCard.id));
  const opponentCards = isSourcePlayer1 ? state.player2Cards : state.player1Cards;
  const opponentActiveCard = opponentCards.find(card => !card.isDefeated);
  
  // Apply card modifier to effect value
  // Use nullish coalescing to handle undefined/null but allow 0 as a valid value
  const cardModifier = sourceCard.modifier !== undefined && sourceCard.modifier !== null 
    ? sourceCard.modifier 
    : 1;
  
  console.log(`Applying effect: ${effect.name}, base value: ${effect.value}, card modifier: ${cardModifier}`);
  const effectValue = effect.value * cardModifier;
  console.log(`Final effect value: ${effectValue}`);
  
  // Normalize effect type for consistent handling
  const effectTypeLower = effect.effect_type.toLowerCase();
  const effectNameLower = effect.name.toLowerCase();
  
  // Apply effect based on type
  switch (true) {
    // Healing effects
    case effectTypeLower === 'heal' || 
         effectTypeLower === 'regeneration' || 
         effectNameLower.includes('regeneration') || 
         effectNameLower.includes('heal'):
      // Heal the source card
      if (sourceCard) {
        sourceCard.health = Math.min(sourceCard.maxHealth, sourceCard.health + effectValue);
      }
      break;
      
    // Damage over time effects
    case effectTypeLower === 'burning' || 
         effectTypeLower === 'dot' || 
         effectTypeLower === 'damage_over_time' || 
         effectNameLower.includes('burning') || 
         effectNameLower.includes('poison') || 
         effectNameLower.includes('bleed'):
      // Apply damage to opponent's active card
      if (opponentActiveCard) {
        opponentActiveCard.health = Math.max(0, opponentActiveCard.health - effectValue);
        if (opponentActiveCard.health <= 0) {
          opponentActiveCard.isDefeated = true;
          opponentActiveCard.health = 0;
        }
      }
      break;
      
    // Buff effects
    case effectTypeLower === 'damage_boost' || 
         effectTypeLower === 'buff' || 
         effectTypeLower === 'battle_momentum' || 
         effectNameLower.includes('battle momentum'):
      // Add a temporary damage boost effect
      if (sourceCard) {
        sourceCard.gameplay_effects.push({
          name: effect.name,
          description: effect.description,
          effect_type: 'damage_boost',
          effect_icon: effect.effect_icon || '💪',
          value: effectValue,
          duration: 1, // Lasts for one turn
          source: sourceCard.id
        });
      }
      break;
      
    // Defense effects
    case effectTypeLower === 'damage_reduction' || 
         effectTypeLower === 'shield' || 
         effectTypeLower === 'defense' || 
         effectNameLower.includes('shield') || 
         effectNameLower.includes('armor'):
      // Add a temporary damage reduction effect
      if (sourceCard) {
        sourceCard.gameplay_effects.push({
          name: effect.name,
          description: effect.description,
          effect_type: 'damage_reduction',
          effect_icon: effect.effect_icon || '🛡️',
          value: effectValue,
          duration: 1, // Lasts for one turn
          source: sourceCard.id
        });
      }
      break;
      
    // Debuff effects
    case effectTypeLower === 'chilling_presence' || 
         effectTypeLower === 'debuff' || 
         effectTypeLower === 'weaken' || 
         effectNameLower.includes('chilling') || 
         effectNameLower.includes('frost'):
      // Reduce target's attack
      if (opponentActiveCard) {
        opponentActiveCard.gameplay_effects.push({
          name: effect.name,
          description: effect.description,
          effect_type: 'attack_reduction',
          effect_icon: effect.effect_icon || '🔽',
          value: effectValue,
          duration: 1, // Lasts for one turn
          source: sourceCard?.id
        });
      }
      break;
      
    // Life drain effects
    case effectTypeLower === 'life_drain' || 
         effectTypeLower === 'vampiric' || 
         effectNameLower.includes('life drain') || 
         effectNameLower.includes('leech'):
      // Heal the source card when dealing damage
      if (sourceCard && opponentActiveCard) {
        sourceCard.health = Math.min(sourceCard.maxHealth, sourceCard.health + effectValue);
      }
      break;
      
    // Thorns/reflect effects
    case effectTypeLower === 'spiked_armor' || 
         effectTypeLower === 'thorns' || 
         effectTypeLower === 'reflect_damage' || 
         effectNameLower.includes('thorns') || 
         effectNameLower.includes('reflect'):
      // Reflect damage back to attacker
      if (sourceCard && targetCard) {
        targetCard.health = Math.max(0, targetCard.health - effectValue);
        if (targetCard.health <= 0) {
          targetCard.isDefeated = true;
          targetCard.health = 0;
        }
      }
      break;
      
    // Poison/DoT application
    case effectTypeLower === 'poison' || 
         effectNameLower.includes('poison'):
      // Apply damage over time effect
      if (opponentActiveCard) {
        opponentActiveCard.gameplay_effects.push({
          name: effect.name,
          description: effect.description,
          effect_type: 'damage_over_time',
          effect_icon: effect.effect_icon || '☠️',
          value: effectValue,
          duration: 3, // Lasts for three turns
          source: sourceCard?.id
        });
      }
      break;
      
    // Stun effects
    case effectTypeLower === 'stun' || 
         effectTypeLower === 'freeze' || 
         effectNameLower.includes('stun') || 
         effectNameLower.includes('freeze'):
      // Prevent target from attacking
      if (opponentActiveCard) {
        opponentActiveCard.gameplay_effects.push({
          name: effect.name,
          description: effect.description,
          effect_type: 'stun',
          effect_icon: effect.effect_icon || '⚡',
          value: 0,
          duration: 1, // Lasts for one turn
          source: sourceCard?.id
        });
      }
      break;
      
    // Default case for any other effect types
    default:
      // For any other effect types, add a generic gameplay effect
      if (sourceCard) {
        sourceCard.gameplay_effects.push({
          name: effect.name,
          description: effect.description,
          effect_type: effectTypeLower,
          effect_icon: effect.effect_icon || '✨',
          value: effectValue,
          duration: 1, // Default to one turn
          source: sourceCard.id
        });
      }
      break;
  }
  
  // Add a detailed event for the effect
  const playerText = isPlayer1Turn ? "Player 1" : "Player 2";
  const targetPlayerText = isPlayer1Turn ? "Player 2" : "Player 1";
  
  context.state.events.push({
    id: generateId('event'),
    type: 'effect_triggered',
    timestamp: Date.now(),
    turn: context.turn,
    data: {
      cardId: sourceCard.id,
      cardName: sourceCard.name,
      effectName: effect.name,
      effectDescription: effect.description
        .replace(/{modifier}/g, effect.value.toString())
        .replace(/{value}/g, effect.value.toString()),
      effectValue: effectValue,
      effectType: effect.effect_type,
      sourcePlayer: isPlayer1Turn ? 1 : 2,
      sourcePlayerName: playerText,
      targetPlayer: isPlayer1Turn ? 2 : 1,
      targetPlayerName: targetPlayerText,
      targetCardName: targetCard?.name || sourceCard.name
    }
  });
}

function mapTriggerToEffectType(trigger: EffectTrigger): string {
  switch (trigger) {
    case 'start_turn':
      return 'on_turn_start';
    case 'end_turn':
      return 'on_turn_end';
    case 'attack':
      return 'on_attack';
    case 'damage_dealt':
      return 'on_damage_dealt';
    case 'damage_received':
      return 'on_damage_received';
    default:
      return '';
  }
}

// Helper function to check if an effect should be triggered based on its type
function shouldTriggerEffect(effect: any, trigger: EffectTrigger): boolean {
  // Get the mapped effect type for the trigger
  const mappedType = mapTriggerToEffectType(trigger);
  
  // Check if the effect type matches the mapped type
  if (effect.effect_type === mappedType) {
    return true;
  }
  
  // Handle special cases based on effect names and types
  const effectNameLower = effect.name.toLowerCase();
  const effectTypeLower = effect.effect_type.toLowerCase();
  
  // Handle regeneration effects on turn start
  if (trigger === 'start_turn' && 
      (effectNameLower.includes('regeneration') || 
       effectNameLower.includes('heal over time') ||
       effectNameLower.includes('recovery') ||
       effectTypeLower === 'regeneration' ||
       effectTypeLower === 'heal')) {
    return true;
  }
  
  // Handle damage over time effects on turn start (burning aura, poison, etc.)
  if (trigger === 'start_turn' && 
      (effectNameLower.includes('burning') || 
       effectNameLower.includes('poison') ||
       effectNameLower.includes('bleed') ||
       effectNameLower.includes('damage over time') ||
       effectTypeLower === 'dot' ||
       effectTypeLower === 'damage_over_time' ||
       effectTypeLower === 'burning')) {
    return true;
  }
  
  // Handle battle momentum effects on successful attack
  if (trigger === 'damage_dealt' && 
      (effectNameLower.includes('battle momentum') || 
       effectNameLower.includes('power up') ||
       effectNameLower.includes('strength') ||
       effectTypeLower === 'battle_momentum' ||
       effectTypeLower === 'buff')) {
    return true;
  }
  
  // Handle life drain effects on damage dealt
  if (trigger === 'damage_dealt' && 
      (effectNameLower.includes('life drain') || 
       effectNameLower.includes('vampiric') ||
       effectNameLower.includes('leech') ||
       effectTypeLower === 'life_drain' ||
       effectTypeLower === 'vampiric')) {
    return true;
  }
  
  // Handle spiked armor effects on damage received
  if (trigger === 'damage_received' && 
      (effectNameLower.includes('spiked armor') || 
       effectNameLower.includes('thorns') ||
       effectNameLower.includes('reflect') ||
       effectTypeLower === 'thorns' ||
       effectTypeLower === 'reflect_damage')) {
    return true;
  }
  
  // Handle chilling presence effects on attack
  if (trigger === 'attack' && 
      (effectNameLower.includes('chilling presence') || 
       effectNameLower.includes('frost') ||
       effectNameLower.includes('weaken') ||
       effectTypeLower === 'debuff' ||
       effectTypeLower === 'weaken')) {
    return true;
  }
  
  return false;
}
