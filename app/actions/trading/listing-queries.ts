"use server";

import { createClient } from "@/utils/supabase/server";
import { TradeListingData, TradingCardData } from "@/app/protected/trading/types";
import { ListingWithCard, CardWithProperties, TradeListingStatus } from "./types";
import { LISTING_WITH_CARD_QUERY, transformCardData } from "./utils";

export async function getActiveTradingListings(
  userId: string
): Promise<TradeListingData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trade_listings")
    .select(LISTING_WITH_CARD_QUERY)
    .eq("status", "active")
    .neq("seller_id", userId) // Don't show user's own listings
    .order("listed_at", { ascending: false });

  if (error) {
    console.error("Error fetching trade listings:", error);
    throw new Error(`Failed to fetch trade listings: ${error.message}`);
  }

  const listings = (data || []).map((listing: any) => {
    const cardData = listing.cards;
    if (!cardData) {
      console.error("Missing card data for listing:", listing.id);
      return null;
    }

    return {
      id: listing.id,
      token_price: listing.token_price,
      listed_at: listing.listed_at,
      seller_id: listing.seller_id,
      status: listing.status as TradeListingStatus,
      card: transformCardData(cardData)
    };
  }).filter((listing): listing is TradeListingData => listing !== null);

  return listings;
}

export async function getUserListings(
  userId: string
): Promise<TradeListingData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trade_listings")
    .select(LISTING_WITH_CARD_QUERY)
    .eq("seller_id", userId)
    .eq("status", "active")
    .order("listed_at", { ascending: false });

  if (error) {
    console.error("Error fetching user listings:", error);
    throw new Error(`Failed to fetch user listings: ${error.message}`);
  }

  const listings = (data || []).map((listing: any) => {
    const cardData = listing.cards;
    if (!cardData) {
      console.error("Missing card data for listing:", listing.id);
      return null;
    }

    return {
      id: listing.id,
      token_price: listing.token_price,
      listed_at: listing.listed_at,
      seller_id: listing.seller_id,
      status: listing.status as TradeListingStatus,
      card: transformCardData(cardData)
    };
  }).filter((listing): listing is TradeListingData => listing !== null);

  return listings;
}

export async function getAvailableCardsForTrading(
  userId: string
): Promise<TradingCardData[]> {
  const supabase = await createClient();

  try {
    // Get all user's cards with their trade listings and special effects in one query
    const { data: cards, error } = await supabase
      .from("cards")
      .select(
        `
        *,
        trade_listings(
          id,
          token_price,
          status
        ),
        card_properties:card_properties(
          value,
          special_properties:special_properties(
            name,
            description,
            effect_type,
            effect_icon,
            value
          )
        )
      `
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("generated_with_purchased_tokens", true);

    if (error) {
      console.error("Error fetching available cards:", error);
      throw new Error(`Failed to fetch available cards: ${error.message}`);
    }

    if (!cards) {
      return [];
    }

    // Filter out cards that are already listed for trade
    const availableCards = cards.filter(
      (card: CardWithProperties & {
        trade_listings?: Array<{
          status: TradeListingStatus;
        }>;
      }) => !card.trade_listings?.some((listing: { status: TradeListingStatus }) => listing.status === "active")
    );

    // Transform the data to match TradingCardData type
    return availableCards.map(transformCardData);
  } catch (error) {
    console.error("Error in getAvailableCardsForTrading:", error);
    throw error;
  }
}
