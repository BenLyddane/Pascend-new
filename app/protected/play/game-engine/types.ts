import { CardWithEffects } from "@/app/actions/fetchDecks";
import { GameMode } from "../game-modes/types";

// Game state types
export interface GameState {
  gameId: string;
  player1Cards: GameCard[];
  player2Cards: GameCard[];
  currentTurn: number;
  player1GoesFirst: boolean;
  activeCardIndices: {
    player1: number;
    player2: number;
  };
  winner: 1 | 2 | "draw" | null;
  drawReason?: string;
  status: "setup" | "playing" | "completed";
  version: number; // For optimistic concurrency control
  events: GameEvent[];
  lastUpdated: number;
}

// Game card type with gameplay effects
export interface GameCard {
  id: string;
  name: string;
  description: string;
  image_url: string;
  power: number;
  health: number;
  maxHealth: number;
  rarity: string;
  deck_id?: string;
  position: number;
  isDefeated: boolean;
  gameplay_effects: GameplayEffect[];
  special_effects: SpecialEffect[];
}

// Game event type for tracking game history
export interface GameEvent {
  id: string;
  type: GameEventType;
  timestamp: number;
  turn: number;
  data: any;
}

// Game event types
export type GameEventType = 
  | "game_created" 
  | "turn_started" 
  | "attack" 
  | "effect_triggered" 
  | "card_defeated" 
  | "turn_ended" 
  | "game_ended";

// Special effect type
export interface SpecialEffect {
  name: string;
  description: string;
  effect_type: string;
  effect_icon: string;
  value: number;
  temporary?: boolean;
}

// Gameplay effect type (active during gameplay)
export interface GameplayEffect {
  name: string;
  description: string;
  effect_type: string;
  effect_icon: string;
  value: number;
  duration?: number;
  source?: string;
}

// Game action types
export interface GameAction {
  type: GameActionType;
  payload: any;
}

export type GameActionType = 
  | "ATTACK" 
  | "END_TURN" 
  | "USE_ABILITY" 
  | "GET_STATE";

// Helper function to convert a CardWithEffects to a GameCard
export function convertToGameCard(card: CardWithEffects, position: number = 0): GameCard {
  return {
    id: card.id,
    name: card.name,
    description: card.description || "",
    image_url: card.image_url || "",
    power: card.power,
    health: card.health,
    maxHealth: card.health,
    rarity: card.rarity,
    position,
    isDefeated: false,
    gameplay_effects: [],
    special_effects: Array.isArray(card.special_effects) 
      ? card.special_effects.map(effect => ({
          name: effect.name,
          description: effect.description,
          effect_type: effect.effect_type,
          effect_icon: effect.effect_icon,
          value: effect.value || 0
        }))
      : []
  };
}

// Helper function to create a new game state
export function createInitialGameState(
  player1Cards: CardWithEffects[],
  player2Cards: CardWithEffects[],
  player1GoesFirst: boolean = Math.random() > 0.5
): GameState {
  // Convert cards to game cards
  const p1Cards = player1Cards.map((card, index) => 
    convertToGameCard(card, index)
  );
  
  const p2Cards = player2Cards.map((card, index) => 
    convertToGameCard(card, index)
  );

  // Generate a unique game ID
  const gameId = `game-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Create initial game state
  return {
    gameId,
    player1Cards: p1Cards,
    player2Cards: p2Cards,
    currentTurn: 1,
    player1GoesFirst,
    activeCardIndices: {
      player1: 0,
      player2: 0
    },
    winner: null,
    status: "setup",
    version: 1,
    events: [
      {
        id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: "game_created",
        timestamp: Date.now(),
        turn: 0,
        data: {
          player1CardsCount: p1Cards.length,
          player2CardsCount: p2Cards.length,
          player1GoesFirst
        }
      }
    ],
    lastUpdated: Date.now()
  };
}

// Helper function to generate a unique ID
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
