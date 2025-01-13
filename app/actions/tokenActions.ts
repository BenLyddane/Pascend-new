"use server";

import { createClient } from "@/utils/supabase/server";

export async function getUserTokens(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("player_profiles")
    .select("tokens")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error("Failed to fetch token balance");
  }

  return data?.tokens ?? 0;
}

export async function deductTokenForCardGeneration(userId: string) {
  const supabase = await createClient();

  // Check token balance
  const { data: profile, error: profileError } = await supabase
    .from("player_profiles")
    .select("tokens")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error("Failed to check token balance");
  }

  if (profile.tokens < 1) {
    throw new Error("Insufficient tokens");
  }

  // Deduct token
  const { error: updateError } = await supabase
    .from("player_profiles")
    .update({ tokens: profile.tokens - 1 })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error("Failed to deduct token");
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from("token_transactions")
    .insert({
      user_id: userId,
      amount: -1,
      transaction_type: "card_generation"
    });

  if (transactionError) {
    console.error("Failed to record token transaction:", transactionError);
  }

  return profile.tokens - 1;
}
