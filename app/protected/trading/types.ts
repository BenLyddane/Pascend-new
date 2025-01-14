import { Database } from "@/types/database.types";

type Card = Database["public"]["Tables"]["cards"]["Row"];
type TradeListing = Database["public"]["Tables"]["trade_listings"]["Row"];

export interface TradingCardData extends Omit<Card, "user_id" | "created_at" | "edition" | "generated_with_purchased_tokens" | "is_active" | "keywords"> {
  special_effects: any[] | null;
}

export interface TradeListingData extends Omit<TradeListing, "card_id"> {
  card: TradingCardData;
}
