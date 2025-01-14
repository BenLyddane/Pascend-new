import { Database, Json } from "@/types/database.types";

// Base card type from database
export type DbCard = Database["public"]["Tables"]["cards"]["Row"];

// Game action types for server communication
export interface GameAction {
  type: "PLAY_CARD" | "USE_EFFECT" | "END_TURN";
  payload: {
    cardId?: string;
    targetId?: string;
    effectIndex?: number;
  };
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
export interface UiCard extends DbCard {
  effects?: DisplayEffect[];
}

// Database special property type
export interface SpecialProperty {
  id: string;
  name: string;
  description: string;
  effect_type: string;
  effect_icon: string;
  value: number | null;
  power_level: number | null;
  rarity_modifier: number[] | null;
  allowed_rarities: string[] | null;
  combo_tags: string[] | null;
  created_at: string;
}

// Special effect structure (type-safe version)
export interface SpecialEffect {
  name: string;
  description: string;
  effect_type: EffectType;
  effect_icon: EffectIcon;
  value: number;
}

// Card effect structure for gameplay
export interface CardEffect {
  effect_type: EffectType;
  effect_icon: EffectIcon;
  value: number;
}

// Game engine card type
export interface GameCard extends DbCard {
  gameplay_effects: CardEffect[];
}

// Effect modifier types
export interface EffectModifier {
  type: "power_boost" | "power_reduction";
  value: number;
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
  activeEffects: {
    effect_type: EffectType;
    effect_icon: EffectIcon;
  }[];
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
export function convertToGameCard(card: DbCard): GameCard {
  // Parse special_effects if it's a string
  const parsedEffects = typeof card.special_effects === 'string' 
    ? JSON.parse(card.special_effects)
    : card.special_effects;

  return {
    ...card,
    gameplay_effects: parseGameplayEffects(parsedEffects),
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
      effect_type: effect.effect_type,
      effect_icon: effect.effect_icon
    }))
  };
}

export function parseGameplayEffects(special_effects: Json): CardEffect[] {
  console.log("\n=== Parsing Gameplay Effects ===");
  console.log(
    "Input special_effects:",
    JSON.stringify(special_effects, null, 2)
  );

  if (!special_effects || !Array.isArray(special_effects)) {
    console.log("No special effects found or not an array");
    return [];
  }

  try {
    const jsonObjects = special_effects.filter(isJsonObject);
    console.log(
      "After isJsonObject filter:",
      JSON.stringify(jsonObjects, null, 2)
    );

    console.log("Checking each object for effect properties:");
    const withProperties = jsonObjects.filter((obj) => {
      console.log("Checking object:", obj);
      console.log("Has effect_type:", typeof obj.effect_type === "string");
      console.log("Has effect_icon:", typeof obj.effect_icon === "string");
      console.log("Has value:", typeof obj.value === "number");
      console.log("Has name:", typeof obj.name === "string");
      console.log("Has description:", typeof obj.description === "string");
      return hasEffectProperties(obj);
    });
    console.log(
      "After hasEffectProperties filter:",
      JSON.stringify(withProperties, null, 2)
    );

    console.log("Validating effect types and icons:");
    const validEffects = withProperties.filter((effect) => {
      console.log("Validating effect:", effect);
      const validType = isValidEffectType(effect.effect_type);
      const validIcon = isValidEffectIcon(effect.effect_icon);
      console.log("Valid type:", validType, "Valid icon:", validIcon);
      return validType && validIcon;
    }) as (JsonSpecialEffect & {
      effect_type: EffectType;
      effect_icon: EffectIcon;
    })[];
    console.log(
      "After type validation filter:",
      JSON.stringify(validEffects, null, 2)
    );

    const cardEffects = validEffects.map((effect) => {
      const cardEffect = {
        effect_type: effect.effect_type,
        effect_icon: effect.effect_icon,
        value: effect.value,
      };
      console.log("Created card effect:", cardEffect);
      return cardEffect;
    });
    console.log("Final card effects:", JSON.stringify(cardEffects, null, 2));

    return cardEffects;
  } catch (error: unknown) {
    console.error("Error parsing gameplay effects:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return [];
  }
}

// Re-export UiCard as Card for backward compatibility with components
export type Card = UiCard;
