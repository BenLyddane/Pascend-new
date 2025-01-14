import { Database, Json } from "@/types/database.types";
import { CardEffect, CardWithEffects } from "@/types/game.types";

// Re-export types from game.types.ts
export type { CardEffect, CardWithEffects };

// Effect modifier types
export interface EffectModifier {
  type: "power_boost" | "power_reduction";
  value: number;
}

// Effect types
export type EffectType =
  | "on_turn_start"
  | "on_attack"
  | "on_damage_received"
  | "on_damage_dealt"
  | "on_turn_end"
  | "on_death";

export type EffectIcon =
  | "Bomb"
  | "Sword"
  | "Shield"
  | "Flame"
  | "Heart"
  | "ShieldCheck"
  | "RefreshCw";

// UI display effect types
export type DisplayEffect = "Explosive" | "Offensive" | "Defensive";

// UI card interface (used by components)
export interface UiCard extends CardWithEffects {
  effects?: DisplayEffect[];
}

// Special effect structure (type-safe version)
export interface SpecialEffect extends CardEffect {
  effect_type: EffectType;
  effect_icon: EffectIcon;
}

// Game card type
export interface GameCard extends CardWithEffects {
  gameplay_effects: CardEffect[];
}

// Game action types for server communication
export interface GameAction {
  type: "PLAY_CARD" | "USE_EFFECT" | "END_TURN";
  payload: {
    cardId?: string;
    targetId?: string;
    effectIndex?: number;
  };
}

// State of a card during gameplay
export interface CardState {
  card: GameCard;
  health: number;
  maxHealth: number;
  power: number;
  isDefeated: boolean;
  effects: CardEffect[];
}

// New type for visible card state (what opponents can see)
export interface VisibleCardState {
  id: string;
  name: string;
  image_url: string | null;
  health: number;
  maxHealth: number;
  power: number;
  isDefeated: boolean;
  activeEffects: CardEffect[];
}

// Battle effect timing types
export type BattleEffectTiming =
  | "turn_start"
  | "pre_combat"
  | "combat"
  | "post_combat"
  | "turn_end"
  | "on_death"
  | "game_end"
  | "error";

// Entry in the battle log
export interface BattleLogEntry {
  turn: number;
  attacker: {
    card: GameCard;
    damage: number;
    startHealth: number;
    endHealth: number;
    startPower: number;
    endPower: number;
  };
  defender: {
    card: GameCard;
    damage: number;
    startHealth: number;
    endHealth: number;
    startPower: number;
    endPower: number;
  };
  effects: BattleEffect[];
}

export interface BattleEffect {
  type: "hit" | "special" | "stat" | "defeat" | "game_end" | "error";
  description: string;
  icon?: string;
  timing?: BattleEffectTiming;
}

// Overall game state
export interface GameState {
  currentTurn: number;
  player1GoesFirst: boolean;
  player1Cards: CardState[];
  player2Cards: CardState[];
  player1VisibleCards: VisibleCardState[];
  player2VisibleCards: VisibleCardState[];
  currentBattle: {
    card1Index: number;
    card2Index: number;
  };
  winner: 1 | 2 | "draw" | null;
  drawReason?: string;
  battleLog: BattleLogEntry[];
  stats: GameStats;
  version?: number;
  error?: string;
}

// Game statistics
export interface GameStats {
  totalDamageDealt: number;
  cardsDefeated: number;
  turnsPlayed: number;
  specialAbilitiesUsed: number;
}

// Type definitions for JSON parsing
export type JsonObject = { [key: string]: Json | undefined };

export interface JsonSpecialEffect extends JsonObject {
  name: string;
  description: string;
  effect_type: string;
  effect_icon: string;
  value: number;
}

// Type guards and helper functions
export function isJsonObject(value: Json): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasEffectProperties(obj: JsonObject): obj is JsonSpecialEffect {
  return (
    typeof obj.effect_type === "string" &&
    typeof obj.effect_icon === "string" &&
    typeof obj.value === "number" &&
    typeof obj.name === "string" &&
    typeof obj.description === "string"
  );
}

export function isValidEffectType(type: string): type is EffectType {
  return [
    "on_turn_start",
    "on_attack",
    "on_damage_received",
    "on_damage_dealt",
    "on_turn_end",
    "on_death",
  ].includes(type as EffectType);
}

export function isValidEffectIcon(icon: string): icon is EffectIcon {
  return [
    "Bomb",
    "Sword",
    "Shield",
    "Flame",
    "Heart",
    "ShieldCheck",
    "RefreshCw",
  ].includes(icon as EffectIcon);
}

// Helper function to convert UI card to game engine card
export function convertToGameCard(card: CardWithEffects): GameCard {
  return {
    ...card,
    gameplay_effects: card.special_effects.map(effect => ({
      name: effect.name,
      description: effect.description,
      effect_type: effect.effect_type as EffectType,
      effect_icon: effect.effect_icon as EffectIcon,
      value: effect.value
    }))
  };
}

// Helper function to convert game engine card to UI card
export function convertToUiCard(gameCard: GameCard): UiCard {
  const displayEffects: DisplayEffect[] = gameCard.gameplay_effects.map(
    (effect) => {
      switch (effect.effect_icon) {
        case "Bomb":
          return "Explosive";
        case "Sword":
          return "Offensive";
        case "Shield":
          return "Defensive";
        default:
          return "Offensive";
      }
    }
  );

  return {
    ...gameCard,
    effects: displayEffects,
  };
}

// Helper function to convert CardState to VisibleCardState
export function toVisibleCardState(cardState: CardState): VisibleCardState {
  return {
    id: cardState.card.id,
    name: cardState.card.name,
    image_url: cardState.card.image_url,
    health: cardState.health,
    maxHealth: cardState.maxHealth,
    power: cardState.power,
    isDefeated: cardState.isDefeated,
    activeEffects: cardState.effects.map(effect => ({
      name: effect.name,
      description: effect.description,
      effect_type: effect.effect_type,
      effect_icon: effect.effect_icon,
      value: effect.value
    }))
  };
}

export function parseGameplayEffects(special_effects: Json): CardEffect[] {
  if (!special_effects || !Array.isArray(special_effects)) {
    return [];
  }

  try {
    const jsonObjects = special_effects.filter(isJsonObject);
    const withProperties = jsonObjects.filter(hasEffectProperties);
    const validEffects = withProperties.filter((effect) => {
      const validType = isValidEffectType(effect.effect_type);
      const validIcon = isValidEffectIcon(effect.effect_icon);
      return validType && validIcon;
    }) as (JsonSpecialEffect & {
      effect_type: EffectType;
      effect_icon: EffectIcon;
    })[];

    return validEffects.map((effect) => ({
      name: effect.name,
      description: effect.description,
      effect_type: effect.effect_type,
      effect_icon: effect.effect_icon,
      value: effect.value
    }));
  } catch (error) {
    console.error("Error parsing gameplay effects:", error);
    return [];
  }
}

// Re-export UiCard as Card for backward compatibility with components
export type Card = UiCard;
