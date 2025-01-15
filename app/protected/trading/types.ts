import { Database } from "@/types/database.types";

type Card = Database["public"]["Tables"]["cards"]["Row"];
type TradeListing = Database["public"]["Tables"]["trade_listings"]["Row"];

type EffectType = Database["public"]["Enums"]["effect_type"];

export interface TradingCardData extends Omit<Card, "special_effects"> {
  special_effects: {
    name: string;
    description: string;
    effect_type: EffectType;
    effect_icon: string;
    value: number;
  }[];
  special_properties?: {
    allowed_rarities: string[] | null;
    combo_tags: string[] | null;
    created_at: string;
    description: string;
    effect_icon: string;
    effect_type: EffectType;
    id: string;
    name: string;
    power_level: number | null;
    rarity_modifier: number[] | null;
    value: number | null;
  }[];
}

export interface TradeListingData extends Omit<TradeListing, "card_id"> {
  card: TradingCardData;
}
