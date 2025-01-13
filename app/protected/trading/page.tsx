import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TradingClient from "./trading-client";
import { Database } from "@/types/database.types";

export default async function TradingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch active trade listings
  const { data: activeListings, error: listingsError } = await supabase
    .from("trade_listings")
    .select(
      `
      id,
      token_price,
      seller_id,
      card_id,
      cards (
        id,
        name,
        description,
        image_url,
        rarity,
        power,
        health
      )
    `
    )
    .eq("status", "active")
    .returns<
      (Database["public"]["Tables"]["trade_listings"]["Row"] & {
        cards: Database["public"]["Tables"]["cards"]["Row"];
      })[]
    >();

  // Get user's token balance
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tokens")
    .eq("id", user.id)
    .single();

  if (listingsError || profileError) {
    console.error("Error fetching trading data:", {
      listingsError,
      profileError,
    });
    redirect("/error");
  }

  return (
    <div className="container mx-auto p-4">
      <TradingClient
        activeListings={activeListings || []}
        userTokens={profile?.tokens || 0}
        userId={user.id}
      />
    </div>
  );
}
