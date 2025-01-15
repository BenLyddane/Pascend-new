import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { MarketListings } from "@/app/protected/trading/components/market-listings";
import { ListCardDialog } from "@/app/protected/trading/components/list-card-dialog";

export default async function MarketPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/");
  }

  // Fetch token balances
  const { data: profile } = await supabase
    .from("player_profiles")
    .select("free_tokens, purchased_tokens")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Card Market</h1>
      
      <ListCardDialog 
        userId={user.id} 
        onListingCreated={() => {
          // Market listings will auto-refresh when a new listing is created
        }} 
      />

      <div className="mt-8">
        <MarketListings userId={user.id} />
      </div>
    </div>
  );
}
