import { Database } from "@/types/database.types";

export type TradeListingStatus = Database["public"]["Enums"]["trade_listing_status"];
export type DbCard = Database["public"]["Tables"]["cards"]["Row"];
export type DbTradeListing = Database["public"]["Tables"]["trade_listings"]["Row"];
export type DbCardProperty = Database["public"]["Tables"]["card_properties"]["Row"];
export type DbSpecialProperty = Database["public"]["Tables"]["special_properties"]["Row"];
export type DbPlayerProfile = Database["public"]["Tables"]["player_profiles"]["Row"];

type EffectType = Database["public"]["Enums"]["effect_type"];

export interface CardSpecialEffect {
  name: string;
  description: string;
  effect_type: EffectType;
  effect_icon: string;
  value: number;
}

export interface CardWithProperties extends DbCard {
  card_properties?: Array<{
    value: number | null;
    special_properties: DbSpecialProperty;
  }>;
}

export interface ListingWithCard extends DbTradeListing {
  cards: CardWithProperties;
}

export interface TradeError extends Error {
  code?: string;
  details?: {
    requiredTokens?: number;
    availableTokens?: number;
    isPurchasedTokensRequired?: boolean;
  };
}

export interface TokenBalance {
  free_tokens: number;
  purchased_tokens: number;
}
