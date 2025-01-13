"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database.types";

type PlayerCard = Database["public"]["Tables"]["player_cards"]["Row"];

export async function createTradeList({
  cardId,
  tokenPrice,
  userId
}: {
  cardId: string;
  tokenPrice: number;
  userId: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  if (tokenPrice < 2) {
    throw new Error("Token price must be at least 2");
  }

  // Check if user owns the card and it's not the last copy in a deck
  const { data: playerCard, error: cardError } = await supabase
    .from("player_cards")
    .select(`
      id, 
      quantity,
      card_id,
      player_decks!deck_cards(id)
    `)
    .eq("user_id", user.id)
    .eq("card_id", cardId)
    .single();

  if (cardError || !playerCard) {
    throw new Error("You don't own this card");
  }

  if (!playerCard.quantity || playerCard.quantity < 1) {
    throw new Error("Invalid card quantity");
  }

  // If card is in a deck and user only has one copy, prevent trading
  if (playerCard.quantity === 1 && (playerCard as any).player_decks.length > 0) {
    throw new Error("Cannot trade the last copy of a card that is in a deck");
  }

  // Check if card is already listed
  const { data: existingListing } = await supabase
    .from("trade_listings")
    .select("id")
    .eq("seller_id", user.id)
    .eq("card_id", cardId)
    .eq("status", "active")
    .single();

  if (existingListing) {
    throw new Error("Card is already listed for trade");
  }

  // Create trade listing
  const { error } = await supabase
    .from("trade_listings")
    .insert({
      seller_id: user.id,
      card_id: cardId,
      token_price: tokenPrice,
      status: "active",
    });

  if (error) throw error;

  revalidatePath("/trading");
}

export async function purchaseTrade(listingId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Call the purchase_trade_listing function
  const { data, error } = await supabase
    .rpc("purchase_trade_listing", {
      p_listing_id: listingId,
      p_buyer_id: user.id,
    });

  if (error) throw error;

  revalidatePath("/trading");
  return data;
}
