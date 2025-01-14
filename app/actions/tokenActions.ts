"use server";

import { createClient } from "@/utils/supabase/server";

export async function getUserTokens(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("player_profiles")
    .select("tokens, purchased_tokens")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error("Failed to fetch token balance");
  }

  return {
    tokens: data?.tokens ?? 0,
    purchasedTokens: data?.purchased_tokens ?? 0,
  };
}

export async function refundToken(
  userId: string,
  wasUsedPurchasedToken: boolean
): Promise<void> {
  const supabase = await createClient();

  // Record refund transaction - the trigger will handle the token update
  const { error: transactionError } = await supabase
    .from("token_transactions")
    .insert({
      user_id: userId,
      amount: 1,
      transaction_type: "card_generation_refund",
      is_purchased: wasUsedPurchasedToken,
    });

  if (transactionError) {
    console.error("Failed to process refund:", transactionError);
    throw new Error("Failed to process refund");
  }
}

export async function deductTokenForCardGeneration(
  userId: string,
  usePurchasedToken: boolean
): Promise<{
  remainingTokens: number;
  remainingPurchasedTokens: number;
  usedPurchasedToken: boolean;
}> {
  const supabase = await createClient();

  try {
    // Insert transaction - the trigger will handle balance check and deduction
    const { error: transactionError } = await supabase
      .from("token_transactions")
      .insert({
        user_id: userId,
        amount: -1,
        transaction_type: "card_generation",
        is_purchased: usePurchasedToken,
      });

    if (transactionError) {
      // Handle specific error cases
      if (transactionError.message.includes('Insufficient purchased tokens')) {
        throw new Error("No purchased tokens available. Would you like to buy more tokens?");
      }
      if (transactionError.message.includes('Insufficient free tokens')) {
        const { data: profile } = await supabase
          .from("player_profiles")
          .select("purchased_tokens")
          .eq("user_id", userId)
          .single();

        if (profile?.purchased_tokens > 0) {
          throw new Error("No free tokens available. You can use your purchased tokens instead.");
        }
        throw new Error("No tokens available. Would you like to buy some tokens?");
      }
      throw new Error("Failed to deduct token");
    }
  } catch (error) {
    console.error("Error deducting token:", error);
    throw error;
  }

  // Get updated balances after successful deduction
  const { data: updatedProfile, error: fetchError } = await supabase
    .from("player_profiles")
    .select("tokens, purchased_tokens")
    .eq("user_id", userId)
    .single();

  if (fetchError || !updatedProfile) {
    throw new Error("Failed to fetch updated token balance");
  }

  return {
    remainingTokens: updatedProfile.tokens,
    remainingPurchasedTokens: updatedProfile.purchased_tokens,
    usedPurchasedToken: usePurchasedToken,
  };
}
