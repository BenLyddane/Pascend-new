// Auto-battle engine for the new game system
import { CardWithEffects } from "@/app/actions/fetchDecks";
import { CardState } from "../components/battlefield-types";
import { BattleLogEntry, CardBattleLogEntry, StateChangeLogEntry } from "../components/battle-log-types";
import { Battle, GameState } from "../components/game-state-types";
import { createClient } from "@/utils/supabase/server";

// Function to generate a UUID using Supabase
async function generateUUID(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('generate_uuid');
  
  if (error) {
    console.error('Error generating UUID:', error);
    // Fallback to a timestamp-based ID if Supabase fails
    return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  return data;
}

// For simplicity in this client-side code, we'll use a timestamp-based ID
// In a real implementation, we would use the async generateUUID function
function generateClientId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Initialize a card state from a card
export function initializeCardState(card: CardWithEffects, position: number): CardState {
  return {
    card,
    health: card.health,
    power: card.power,
    maxHealth: card.health,
    position,
    isDefeated: false,
    effects: [],
  };
}

// Initialize a game state from player cards
export function initializeGameState(
  player1Cards: CardWithEffects[],
  player2Cards: CardWithEffects[],
  player1GoesFirst: boolean = Math.random() > 0.5
): GameState {
  // Initialize card states
  const p1Cards = player1Cards.map((card, index) => 
    initializeCardState(card, index)
  );
  
  const p2Cards = player2Cards.map((card, index) => 
    initializeCardState(card, index)
  );

  // Create initial state change log entry
  const initialLog: StateChangeLogEntry = {
    entryId: generateClientId(),
    turn: 0,
    timestamp: Date.now(),
    description: `Game started. ${player1GoesFirst ? "Player 1" : "Player 2"} goes first.`,
    effects: [
      {
        type: "state_change",
        description: "Game initialized",
      }
    ]
  };

  // Return the initial game state
  return {
    gameId: generateClientId(),
    player1Cards: p1Cards,
    player2Cards: p2Cards,
    currentTurn: 1,
    currentBattle: null,
    battleLog: [initialLog],
    player1GoesFirst,
    winner: null,
    status: "setup",
  };
}

// Process a single turn of auto-battle
export function processTurn(gameState: GameState): GameState {
  // Clone the game state to avoid mutating the original
  const newState = JSON.parse(JSON.stringify(gameState)) as GameState;
  
  // Determine whose turn it is
  const isPlayer1Turn = newState.currentTurn % 2 === (newState.player1GoesFirst ? 1 : 0);
  
  // Get the active cards for each player (not defeated)
  const activePlayer1Cards = newState.player1Cards.filter(card => !card.isDefeated);
  const activePlayer2Cards = newState.player2Cards.filter(card => !card.isDefeated);
  
  // Check if the game is over
  if (activePlayer1Cards.length === 0 && activePlayer2Cards.length === 0) {
    newState.winner = "draw";
    newState.drawReason = "All cards defeated";
    newState.status = "completed";
    
    // Add a state change log entry
    newState.battleLog.push({
      entryId: generateClientId(),
      turn: newState.currentTurn,
      timestamp: Date.now(),
      description: "Game ended in a draw. All cards defeated.",
      effects: [
        {
          type: "game_end",
          description: "Draw - All cards defeated",
        }
      ]
    });
    
    return newState;
  }
  
  if (activePlayer1Cards.length === 0) {
    newState.winner = 2;
    newState.status = "completed";
    
    // Add a state change log entry
    newState.battleLog.push({
      entryId: generateClientId(),
      turn: newState.currentTurn,
      timestamp: Date.now(),
      description: "Player 2 wins! All of Player 1's cards are defeated.",
      effects: [
        {
          type: "game_end",
          description: "Player 2 wins",
        }
      ]
    });
    
    return newState;
  }
  
  if (activePlayer2Cards.length === 0) {
    newState.winner = 1;
    newState.status = "completed";
    
    // Add a state change log entry
    newState.battleLog.push({
      entryId: generateClientId(),
      turn: newState.currentTurn,
      timestamp: Date.now(),
      description: "Player 1 wins! All of Player 2's cards are defeated.",
      effects: [
        {
          type: "game_end",
          description: "Player 1 wins",
        }
      ]
    });
    
    return newState;
  }
  
  // Determine the active card for each player
  const activeCardIndex1 = activePlayer1Cards[0].position;
  const activeCardIndex2 = activePlayer2Cards[0].position;
  
  // Set up the current battle
  newState.currentBattle = {
    card1Index: activeCardIndex1,
    card2Index: activeCardIndex2,
  };
  
  // Get the cards that will battle
  const card1 = newState.player1Cards[activeCardIndex1];
  const card2 = newState.player2Cards[activeCardIndex2];
  
  // Process battle effects (turn start)
  const turnStartLog: StateChangeLogEntry = {
    entryId: uuidv4(),
    turn: newState.currentTurn,
    timestamp: Date.now(),
    description: `Turn ${newState.currentTurn}: ${isPlayer1Turn ? "Player 1" : "Player 2"}'s turn.`,
    effects: [
      {
        type: "state_change",
        description: `${isPlayer1Turn ? "Player 1" : "Player 2"} begins their turn`,
      }
    ]
  };
  
  newState.battleLog.push(turnStartLog);
  
  // Process the battle
  const battleResult = processBattle(card1, card2, newState.currentTurn);
  
  // Update card states based on battle result
  card1.health = battleResult.attacker.endHealth;
  card2.health = battleResult.defender.endHealth;
  
  // Check if any cards were defeated
  if (card1.health <= 0) {
    card1.health = 0;
    card1.isDefeated = true;
    
    // Add defeat effect to the battle log
    battleResult.effects.push({
      type: "defeat",
      description: `${card1.card.name} was defeated!`,
      sourceCard: card2.card.name,
    });
  }
  
  if (card2.health <= 0) {
    card2.health = 0;
    card2.isDefeated = true;
    
    // Add defeat effect to the battle log
    battleResult.effects.push({
      type: "defeat",
      description: `${card2.card.name} was defeated!`,
      sourceCard: card1.card.name,
    });
  }
  
  // Add the battle log entry
  newState.battleLog.push(battleResult);
  
  // Process turn end effects
  const turnEndLog: StateChangeLogEntry = {
    entryId: uuidv4(),
    turn: newState.currentTurn,
    timestamp: Date.now(),
    description: `Turn ${newState.currentTurn} ended.`,
    effects: [
      {
        type: "state_change",
        description: "Turn ended",
      }
    ]
  };
  
  newState.battleLog.push(turnEndLog);
  
  // Increment the turn counter
  newState.currentTurn++;
  
  // Update game status
  newState.status = "playing";
  
  return newState;
}

// Process a battle between two cards
function processBattle(
  attackerState: CardState,
  defenderState: CardState,
  turn: number
): CardBattleLogEntry {
  // Calculate damage based on power and any effects
  const attackerDamage = calculateDamage(attackerState, defenderState);
  const defenderDamage = calculateDamage(defenderState, attackerState);
  
  // Calculate new health values
  const attackerEndHealth = Math.max(0, attackerState.health - defenderDamage);
  const defenderEndHealth = Math.max(0, defenderState.health - attackerDamage);
  
  // Create battle effects
  const effects = [
    {
      type: "hit" as const,
      description: `${attackerState.card.name} attacks for ${attackerDamage} damage`,
      sourceCard: attackerState.card.name,
      value: attackerDamage,
    },
    {
      type: "hit" as const,
      description: `${defenderState.card.name} counterattacks for ${defenderDamage} damage`,
      sourceCard: defenderState.card.name,
      value: defenderDamage,
    },
  ];
  
  // Process any special effects from the cards
  processSpecialEffects(attackerState, defenderState, effects);
  
  // Return the battle log entry
  return {
    entryId: uuidv4(),
    turn,
    timestamp: Date.now(),
    attacker: {
      card: {
        id: attackerState.card.id,
        name: attackerState.card.name,
      },
      damage: attackerDamage,
      startHealth: attackerState.health,
      endHealth: attackerEndHealth,
    },
    defender: {
      card: {
        id: defenderState.card.id,
        name: defenderState.card.name,
      },
      damage: defenderDamage,
      startHealth: defenderState.health,
      endHealth: defenderEndHealth,
    },
    effects,
  };
}

// Calculate damage based on power and effects
function calculateDamage(attacker: CardState, defender: CardState): number {
  // Base damage is the card's power
  let damage = attacker.power;
  
  // Apply any damage modifiers from special effects
  // For now, we'll just use the base power
  
  return damage;
}

// Process special effects from cards
function processSpecialEffects(
  attacker: CardState,
  defender: CardState,
  effects: any[]
): void {
  // Process attacker's special effects
  if (attacker.card.special_effects) {
    attacker.card.special_effects.forEach(effect => {
      // Add special effect to the battle log
      effects.push({
        type: "special",
        description: `${effect.name}: ${effect.description}`,
        sourceCard: attacker.card.name,
        value: effect.value,
      });
    });
  }
  
  // Process defender's special effects
  if (defender.card.special_effects) {
    defender.card.special_effects.forEach(effect => {
      // Add special effect to the battle log
      effects.push({
        type: "special",
        description: `${effect.name}: ${effect.description}`,
        sourceCard: defender.card.name,
        value: effect.value,
      });
    });
  }
}

// Run a complete auto-battle game
export function runAutoBattle(
  player1Cards: CardWithEffects[],
  player2Cards: CardWithEffects[],
  player1GoesFirst: boolean = Math.random() > 0.5,
  maxTurns: number = 100
): GameState {
  // Initialize the game state
  let gameState = initializeGameState(player1Cards, player2Cards, player1GoesFirst);
  
  // Process turns until the game is over or we reach the maximum number of turns
  let turnCount = 0;
  while (gameState.winner === null && turnCount < maxTurns) {
    gameState = processTurn(gameState);
    turnCount++;
  }
  
  // If we reached the maximum number of turns, end the game as a draw
  if (turnCount >= maxTurns && gameState.winner === null) {
    gameState.winner = "draw";
    gameState.drawReason = "Maximum turns reached";
    gameState.status = "completed";
    
    // Add a state change log entry
    gameState.battleLog.push({
      entryId: uuidv4(),
      turn: gameState.currentTurn,
      timestamp: Date.now(),
      description: "Game ended in a draw. Maximum turns reached.",
      effects: [
        {
          type: "game_end",
          description: "Draw - Maximum turns reached",
        }
      ]
    });
  }
  
  return gameState;
}
