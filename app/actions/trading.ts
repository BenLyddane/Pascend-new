"use server";

import { createClient } from "@/utils/supabase/server";
import { TradeListingData, TradingCardData } from "@/app/protected/trading/types";
import { Database } from "@/types/database.types";

type TradeListingStatus = Database["public"]["Enums"]["trade_listing_status"];

export async function listCardForTrade(
  userId: string,
  cardId: string,
  tokenPrice: number
) {
  const supabase = await createClient();

  // Verify minimum price
  if (tokenPrice < 2) {
    throw new Error("Minimum listing price is 2 tokens");
  }

  // Check if card exists and belongs to user
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("user_id, generated_with_purchased_tokens")
    .eq("id", cardId)
    .single();

  if (cardError || !card) {
    throw new Error("Card not found");
  }

  if (card.user_id !== userId) {
    throw new Error("You don't own this card");
  }

  if (!card.generated_with_purchased_tokens) {
    throw new Error("This card cannot be traded (generated with free tokens)");
  }

  try {
    // Start a transaction
    const { error: beginError } = await supabase.rpc('begin_transaction');
    if (beginError) throw beginError;

    try {
      // Delete any cancelled listings for this card
      const { error: deleteError } = await supabase
        .from("trade_listings")
        .delete()
        .eq("card_id", cardId)
        .eq("seller_id", userId)
        .eq("status", "cancelled" as TradeListingStatus);

      if (deleteError) throw deleteError;

      // Check if card is already actively listed
      const { data: existingListing } = await supabase
        .from("trade_listings")
        .select("id")
        .eq("card_id", cardId)
        .eq("status", "active" as TradeListingStatus)
        .single();

      if (existingListing) {
        throw new Error("Card is already listed for trade");
      }

      // Create new listing
      const { error: listingError } = await supabase.rpc("create_trade_listing", {
        p_card_id: cardId,
        p_seller_id: userId,
        p_token_price: tokenPrice
      });

      if (listingError) throw listingError;

      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) throw commitError;

    } catch (error) {
      // Rollback on any error
      const { error: rollbackError } = await supabase.rpc('rollback_transaction');
      if (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError);
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in listCardForTrade:", error);
    throw new Error("Failed to create listing: " + (error as Error).message);
  }
}

export async function purchaseCard(
  userId: string,
  listingId: string
) {
  const supabase = await createClient();

  try {
    // Call the purchase function (handles all validation and transaction logic)
    const { error } = await supabase.rpc("purchase_trade_listing", {
      p_listing_id: listingId,
      p_buyer_id: userId
    });

    if (error) {
      throw new Error("Failed to purchase card: " + error.message);
    }
  } catch (error) {
    console.error("Error purchasing card:", error);
    throw error;
  }
}

export async function cancelListing(
  userId: string,
  listingId: string
) {
  const supabase = await createClient();

  // Verify listing exists and belongs to user
  const { data: listing, error: listingError } = await supabase
    .from("trade_listings")
    .select("seller_id, status")
    .eq("id", listingId)
    .single();

  if (listingError || !listing) {
    throw new Error("Listing not found");
  }

  if (listing.seller_id !== userId) {
    throw new Error("You don't own this listing");
  }

  if (listing.status !== "active") {
    throw new Error("Listing is not active");
  }

  // Cancel listing
  const { error: updateError } = await supabase
    .from("trade_listings")
    .update({ status: "cancelled" as TradeListingStatus })
    .eq("id", listingId);

  if (updateError) {
    throw new Error("Failed to cancel listing");
  }
}

export async function getActiveTradingListings(userId: string): Promise<TradeListingData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trade_listings")
    .select(`
      id,
      token_price,
      listed_at,
      seller_id,
      status,
      card:cards (
        id,
        name,
        description,
        image_url,
        rarity,
        power,
        health,
        modifier,
        special_effects,
        created_at,
        edition,
        generated_with_purchased_tokens,
        is_active,
        user_id,
        special_properties,
        keywords
      )
    `)
    .eq("status", "active" as TradeListingStatus)
    .neq("seller_id", userId) // Don't show user's own listings
    .order("listed_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch trade listings");
  }

  // Transform the data to ensure it matches our expected type
  const rawListings = data as unknown as Array<{
    id: string;
    token_price: number;
    listed_at: string;
    seller_id: string;
    status: TradeListingStatus;
    card: TradingCardData;
  }>;

  const listings = rawListings.map(listing => ({
    ...listing,
    card: {
      ...listing.card,
      special_effects: listing.card.special_effects || []
    }
  }));

  return listings;
}

export async function getUserListings(userId: string): Promise<TradeListingData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trade_listings")
    .select(`
      id,
      token_price,
      listed_at,
      seller_id,
      status,
      card:cards (
        id,
        name,
        description,
        image_url,
        rarity,
        power,
        health,
        modifier,
        special_effects,
        created_at,
        edition,
        generated_with_purchased_tokens,
        is_active,
        user_id,
        special_properties,
        keywords
      )
    `)
    .eq("seller_id", userId)
    .order("listed_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch user listings");
  }

  // Transform the data to ensure it matches our expected type
  const rawListings = data as unknown as Array<{
    id: string;
    token_price: number;
    listed_at: string;
    seller_id: string;
    status: TradeListingStatus;
    card: TradingCardData;
  }>;

  const listings = rawListings.map(listing => ({
    ...listing,
    card: {
      ...listing.card,
      special_effects: listing.card.special_effects || []
    }
  }));

  return listings;
}

export async function getAvailableCardsForTrading(userId: string): Promise<TradingCardData[]> {
  const supabase = await createClient();

  try {
    // Get all user's cards with their trade listings and special effects in one query
    const { data: cards, error } = await supabase
      .from("cards")
      .select(`
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
      `)
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
    const availableCards = cards.filter((card: Database["public"]["Tables"]["cards"]["Row"] & {
      trade_listings?: Array<{ status: Database["public"]["Enums"]["trade_listing_status"] }>;
    }) => !card.trade_listings?.some(listing => listing.status === "active"));

    // Transform the data to match TradingCardData type
    return availableCards.map((card: Database["public"]["Tables"]["cards"]["Row"] & {
      card_properties?: Array<{
        value: number | null;
        special_properties: {
          name: string;
          description: string;
          effect_type: string;
          effect_icon: string;
          value: number | null;
        };
      }>;
    }) => ({
      ...card,
      special_effects: card.card_properties?.map(cp => ({
        name: cp.special_properties.name,
        description: cp.special_properties.description,
        effect_type: cp.special_properties.effect_type,
        effect_icon: cp.special_properties.effect_icon,
        value: cp.value || cp.special_properties.value || 0
      })) || []
    }));
  } catch (error) {
    console.error("Error in getAvailableCardsForTrading:", error);
    throw error;
  }
}

/**
 * Checks if a card is eligible for trading.
 * A card is eligible if:
 * 1. It belongs to the user
 * 2. It was generated with purchased tokens
 * 3. It is not currently listed for trade
 * 4. It is active
 */
export async function checkCardTradeEligibility(
  userId: string,
  cardId: string
): Promise<{ eligible: boolean; reason?: string }> {
  const supabase = await createClient();

  // Check if card exists and get its details
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("user_id, generated_with_purchased_tokens, is_active")
    .eq("id", cardId)
    .single();

  if (cardError) {
    console.error("Error checking card:", cardError);
    throw new Error(`Failed to check card: ${cardError.message}`);
  }

  if (!card) {
    return { eligible: false, reason: "Card not found" };
  }

  // Check ownership
  if (card.user_id !== userId) {
    return { eligible: false, reason: "You don't own this card" };
  }

  // Check if generated with purchased tokens
  if (!card.generated_with_purchased_tokens) {
    return { eligible: false, reason: "Card was generated with free tokens and cannot be traded" };
  }

  // Check if card is active
  if (!card.is_active) {
    return { eligible: false, reason: "Card is not active" };
  }

  // Check if card is already listed
  const { data: existingListing, error: listingError } = await supabase
    .from("trade_listings")
    .select("id")
    .eq("card_id", cardId)
    .eq("status", "active" as TradeListingStatus)
    .single();

  if (listingError && listingError.code !== "PGRST116") { // PGRST116 is "no rows returned"
    console.error("Error checking listing:", listingError);
    throw new Error(`Failed to check listing: ${listingError.message}`);
  }

  if (existingListing) {
    return { eligible: false, reason: "Card is already listed for trade" };
  }

  return { eligible: true };
}
