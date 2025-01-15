import Link from "next/link";
import { ProfileNav } from "./components/profile-nav";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { TokenDisplay } from "@/components/token-display";
import { Badge } from "@/components/ui/badge";

// Function to get rank tier color
const getRankColor = (tier: string) => {
  const colors = {
    bronze: "bg-orange-600",
    silver: "bg-gray-400",
    gold: "bg-yellow-500",
    platinum: "bg-cyan-400",
    diamond: "bg-blue-500",
    master: "bg-purple-600",
  };
  return colors[tier as keyof typeof colors] || "bg-gray-500";
};

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <TokenDisplay
            tokens={profile?.free_tokens || 0}
            purchasedTokens={profile?.purchased_tokens || 0}
            minimal={true}
          />
          <Link
            href="/protected/tokens"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Manage Tokens →
          </Link>
        </div>
     
      </div>

      <ProfileNav />

      {children}
    </div>
  );
}
