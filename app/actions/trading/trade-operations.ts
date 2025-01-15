"use server";

import { createClient } from "@/utils/supabase/server";
import { TokenBalance, TradeError } from "./types";

async function getTokenBalance(userId: string): Promise<TokenBalance> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("player_profiles")
    .select("purchased_tokens, free_tokens")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error("Failed to fetch token balance");
  }

  return {
    purchased_tokens: data.purchased_tokens,
    free_tokens: data.free_tokens
  };
}

async function validateTokenBalance(
  userId: string, 
  requiredTokens: number,
  usePurchasedTokens: boolean
): Promise<void> {
  const balance = await getTokenBalance(userId);
  const availableTokens = usePurchasedTokens ? balance.purchased_tokens : balance.free_tokens;
  
  if (availableTokens < requiredTokens) {
    const error = new Error(
      usePurchasedTokens 
        ? "Insufficient purchased tokens" 
        : "Insufficient free tokens"
    ) as TradeError;
    error.code = "INSUFFICIENT_TOKENS";
    error.details = {
      requiredTokens,
      availableTokens,
      isPurchasedTokensRequired: usePurchasedTokens
    };
    throw error;
  }
}

export async function purchaseCard(userId: string, listingId: string, usePurchasedTokens: boolean = true) {
  const supabase = await createClient();

  try {
    // Get listing details to check price
    const { data: listing, error: listingError } = await supabase
      .from("trade_listings")
      .select("token_price, status")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      throw new Error("Listing not found");
    }

    if (listing.status !== "active") {
      throw new Error("Listing is no longer active");
    }

    // Validate token balance before attempting purchase
    await validateTokenBalance(userId, listing.token_price, usePurchasedTokens);

    // Call the purchase function
    const { error } = await supabase.rpc("purchase_trade_listing", {
      p_listing_id: listingId,
      p_buyer_id: userId,
      p_use_purchased_tokens: usePurchasedTokens
    });

    if (error) {
      if (error.message.includes("insufficient tokens")) {
        const tokenError = new Error("Insufficient purchased tokens") as TradeError;
        tokenError.code = "INSUFFICIENT_TOKENS";
        tokenError.details = {
          requiredTokens: listing.token_price,
          isPurchasedTokensRequired: true
        };
        throw tokenError;
      }
      throw new Error("Failed to purchase card: " + error.message);
    }
  } catch (error) {
    console.error("Error purchasing card:", error);
    throw error;
  }
}

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
    return {
      eligible: false,
      reason: "Card was generated with free tokens and cannot be traded",
    };
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
    .eq("status", "active")
    .single();

  if (listingError && listingError.code !== "PGRST116") {
    // PGRST116 is "no rows returned"
    console.error("Error checking listing:", listingError);
    throw new Error(`Failed to check listing: ${listingError.message}`);
  }

  if (existingListing) {
    return { eligible: false, reason: "Card is already listed for trade" };
  }

  return { eligible: true };
}
