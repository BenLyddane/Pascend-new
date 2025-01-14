import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { TokenPurchase } from "@/components/token-purchase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function TokensPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from("player_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold">Tokens</h1>

      <Card>
        <CardHeader>
          <CardTitle>Token Management</CardTitle>
          <CardDescription>Purchase and manage your tokens</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-3xl font-bold">
                {(profile?.tokens || 0) + (profile?.purchased_tokens || 0)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Free Tokens</p>
                <p className="text-xl font-semibold">{profile?.tokens || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Not tradeable</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Purchased Tokens</p>
                <p className="text-xl font-semibold">{profile?.purchased_tokens || 0}</p>
                <p className="text-xs text-green-500 mt-1">Tradeable</p>
              </div>
            </div>
          </div>
          <TokenPurchase
            userId={user.id}
            currentTokens={(profile?.tokens || 0) + (profile?.purchased_tokens || 0)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
