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

  // Check if card is already listed
  const { data: existingListing } = await supabase
    .from("trade_listings")
    .select("id")
    .eq("card_id", cardId)
    .eq("status", "active" as TradeListingStatus)
    .single();

  if (existingListing) {
    throw new Error("Card is already listed for trade");
  }

  // Create listing
  const { error: listingError } = await supabase.rpc("create_trade_listing", {
    p_card_id: cardId,
    p_seller_id: userId,
    p_token_price: tokenPrice
  });

  if (listingError) {
    throw new Error("Failed to create listing: " + listingError.message);
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
        special_effects
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
        special_effects
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

  // Get cards that:
  // 1. Belong to the user
  // 2. Were generated with purchased tokens
  // 3. Are not currently listed for trade
  const { data, error } = await supabase
    .from("cards")
    .select(`
      id,
      name,
      description,
      image_url,
      rarity,
      power,
      health,
      modifier,
      special_effects
    `)
    .eq("user_id", userId)
    .eq("generated_with_purchased_tokens", true)
    .not("id", "in", (
      supabase
        .from("trade_listings")
        .select("card_id")
        .eq("status", "active" as TradeListingStatus)
    ));

  if (error) {
    throw new Error("Failed to fetch available cards");
  }

  return data.map(card => ({
    ...card,
    special_effects: card.special_effects || []
  }));
}
