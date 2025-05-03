import { Database } from "./database.types";

// Extract base types from database schema
type DbCard = Database["public"]["Tables"]["cards"]["Row"];
type DbTempCard = Database["public"]["Tables"]["temp_cards"]["Row"];
type DbSpecialProperty = Database["public"]["Tables"]["special_properties"]["Row"];
type DbDeck = Database["public"]["Tables"]["player_decks"]["Row"];

// Extract matchmaking types from database schema
type DbMatchmakingQueue = Database["public"]["Tables"]["matchmaking_queue"]["Row"];

// Card rarity type based on the database schema
// We define this as a literal type to allow its use as object keys while ensuring it matches the database
export type CardRarity = "common" | "rare" | "epic" | "legendary";
// Type assertion to ensure CardRarity matches database schema
type AssertCardRarity = CardRarity extends DbCard["rarity"] ? true : false;
type AssertDbRarity = DbCard["rarity"] extends CardRarity ? true : false;
type _assertRarityMatch = [AssertCardRarity, AssertDbRarity] extends [true, true] ? true : never;

// Card style for generation based on ai.json stylePrompts
export type CardStyle = 
  | "Pixel Art" 
  | "Sci Fi" 
  | "Fantasy" 
  | "Cyberpunk" 
  | "Steampunk" 
  | "Anime" 
  | "Realistic" 
  | "Watercolor" 
  | "Art Nouveau" 
  | "Gothic" 
  | "Minimalist" 
  | "Pop Art" 
  | "Chibi" 
  | "Vaporwave" 
  | "Dark Fantasy" 
  | "Retrofuturism" 
  | "Comic Book" 
  | "Stained Glass" 
  | "Classical Oil" 
  | "Synthwave" 
  | "Low Poly" 
  | "Art Deco" 
  | "Studio Ghibli" 
  | "Cosmic Horror" 
  | "Tribal" 
  | "Street Art" 
  | "Biomechanical" 
  | "Impressionist" 
  | "Ethereal" 
  | "Abstract";

// Special property type based on database schema
export type SpecialProperty = DbSpecialProperty;

// Card generation request type
export type CardGenerationRequest = {
  prompt: string;
  style: CardStyle;
  userId: string;
  usePurchasedToken: boolean;
};

// Temp card type based on database schema
export type TempCard = DbTempCard;

// Base effect type for gameplay
export interface BaseCardEffect {
  name: string;
  description: string;
  effect_type: string;
  effect_icon: string;
  value: number;
  temporary?: boolean; // Optional flag for temporary effects that should be cleaned up
}

// Full effect type from database
export type DbCardEffect = DbSpecialProperty;

// Maintain backward compatibility
export type CardEffect = BaseCardEffect;

// Card with effects type that handles both gameplay and database effects
export type CardWithEffects = Omit<DbCard, "special_effects"> & {
  special_effects: BaseCardEffect[];
  special_properties?: DbCardEffect[];
};

// Helper type for converting between effect types
export type GameplayEffect = BaseCardEffect & {
  value: number; // Override to make non-null for gameplay
};

// Type guard for BaseCardEffect
export function isBaseCardEffect(value: unknown): value is BaseCardEffect {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "description" in value &&
    "effect_type" in value &&
    "effect_icon" in value &&
    "value" in value &&
    typeof (value as BaseCardEffect).name === "string" &&
    typeof (value as BaseCardEffect).description === "string" &&
    typeof (value as BaseCardEffect).effect_type === "string" &&
    typeof (value as BaseCardEffect).effect_icon === "string" &&
    typeof (value as BaseCardEffect).value === "number"
  );
}


// Card type
export type Card = CardWithEffects;

// Deck types that match database schema and fetchDecks.ts behavior
export type DeckWithCards = Omit<DbDeck, "card_list"> & {
  cards: CardWithEffects[];
};

// Helper function to create a base card effect
export function createBaseCardEffect(
  effect_type: string,
  effect_icon: string,
  value: number,
  name = "Effect",
  description = "Card effect"
): BaseCardEffect {
  return {
    name,
    description,
    effect_type,
    effect_icon,
    value
  };
}

// Matchmaking types
export type MatchmakingStatus = DbMatchmakingQueue["status"];
export type MatchmakingEntry = DbMatchmakingQueue;

// Game types with proper effect handling
export type GameCard = CardWithEffects & {
  gameplay_effects: GameplayEffect[];
};

// Base Deck type with proper effect handling
export type Deck = DeckWithCards;

export type GameDeck = Omit<DbDeck, "card_list"> & {
  cards: GameCard[];
};

// Helper functions for effect conversion
export function convertDbEffectToGameplay(dbEffect: DbCardEffect): GameplayEffect {
  return {
    name: dbEffect.name,
    description: dbEffect.description,
    effect_type: dbEffect.effect_type,
    effect_icon: dbEffect.effect_icon,
    value: dbEffect.value ?? 0 // Provide default for gameplay
  };
}

export function convertDbEffectsToGameplay(dbEffects: DbCardEffect[] | null): GameplayEffect[] {
  if (!dbEffects) return [];
  return dbEffects.map(convertDbEffectToGameplay);
}
