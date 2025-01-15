"use server";

import { createClient } from "@/utils/supabase/server";
import { TradeListingStatus, TradeError } from "./types";

const MIN_LISTING_PRICE = 2;
const MAX_LISTING_PRICE = 1000;

interface ListingValidation {
  valid: boolean;
  error?: TradeError;
}

async function validateListingPrice(tokenPrice: number): Promise<ListingValidation> {
  if (tokenPrice < MIN_LISTING_PRICE) {
    const error = new Error(`Minimum listing price is ${MIN_LISTING_PRICE} tokens`) as TradeError;
    error.code = "INVALID_PRICE";
    error.details = { requiredTokens: MIN_LISTING_PRICE };
    return { valid: false, error };
  }

  if (tokenPrice > MAX_LISTING_PRICE) {
    const error = new Error(`Maximum listing price is ${MAX_LISTING_PRICE} tokens`) as TradeError;
    error.code = "INVALID_PRICE";
    error.details = { requiredTokens: MAX_LISTING_PRICE };
    return { valid: false, error };
  }

  return { valid: true };
}

async function validateCardForListing(
  supabase: any,
  userId: string,
  cardId: string
): Promise<ListingValidation> {
  // Check if card exists and belongs to user
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("user_id, generated_with_purchased_tokens, is_active")
    .eq("id", cardId)
    .single();

  if (cardError || !card) {
    const error = new Error("Card not found") as TradeError;
    error.code = "CARD_NOT_FOUND";
    return { valid: false, error };
  }

  if (card.user_id !== userId) {
    const error = new Error("You don't own this card") as TradeError;
    error.code = "NOT_OWNER";
    return { valid: false, error };
  }

  if (!card.generated_with_purchased_tokens) {
    const error = new Error("This card cannot be traded (generated with free tokens)") as TradeError;
    error.code = "FREE_TOKEN_CARD";
    return { valid: false, error };
  }

  if (!card.is_active) {
    const error = new Error("This card is not active") as TradeError;
    error.code = "CARD_INACTIVE";
    return { valid: false, error };
  }

  // Check if card is already listed
  const { data: existingListing } = await supabase
    .from("trade_listings")
    .select("id")
    .eq("card_id", cardId)
    .eq("status", "active")
    .single();

  if (existingListing) {
    const error = new Error("This card is already listed") as TradeError;
    error.code = "ALREADY_LISTED";
    return { valid: false, error };
  }

  return { valid: true };
}

export async function listCardForTrade(
  userId: string,
  cardId: string,
  tokenPrice: number
) {
  const supabase = await createClient();

  // Validate price
  const priceValidation = await validateListingPrice(tokenPrice);
  if (!priceValidation.valid && priceValidation.error) {
    throw priceValidation.error;
  }

  // Validate card
  const cardValidation = await validateCardForListing(supabase, userId, cardId);
  if (!cardValidation.valid && cardValidation.error) {
    throw cardValidation.error;
  }

  // Create listing using database function that handles the transaction
  const { data: listingId, error: listingError } = await supabase.rpc(
    "create_trade_listing",
    {
      p_card_id: cardId,
      p_seller_id: userId,
      p_token_price: tokenPrice,
    }
  );

  if (listingError) {
    console.error("Error creating listing:", listingError);
    const error = new Error("Failed to create listing: " + listingError.message) as TradeError;
    error.code = "LISTING_CREATION_FAILED";
    throw error;
  }

  return listingId;
}

export async function cancelListing(userId: string, listingId: string) {
  const supabase = await createClient();

  // Verify listing exists and belongs to user
  const { data: listing, error: listingError } = await supabase
    .from("trade_listings")
    .select("seller_id, status")
    .eq("id", listingId)
    .single();

  if (listingError || !listing) {
    const error = new Error("Listing not found") as TradeError;
    error.code = "LISTING_NOT_FOUND";
    throw error;
  }

  if (listing.seller_id !== userId) {
    const error = new Error("You don't own this listing") as TradeError;
    error.code = "NOT_OWNER";
    throw error;
  }

  if (listing.status !== "active") {
    const error = new Error("Listing is not active") as TradeError;
    error.code = "LISTING_NOT_ACTIVE";
    throw error;
  }

  // Cancel listing
  const { error: updateError } = await supabase
    .from("trade_listings")
    .update({ status: "cancelled" as TradeListingStatus })
    .eq("id", listingId);

  if (updateError) {
    const error = new Error("Failed to cancel listing") as TradeError;
    error.code = "CANCEL_FAILED";
    throw error;
  }
}
