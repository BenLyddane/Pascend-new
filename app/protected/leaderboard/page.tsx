import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LeaderboardClient from "./leaderboard-client";
import { Tables } from "@/types/database.types";

type PlayerProfile = Tables<"player_profiles">;

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch top players ordered by rank points
  const { data: topPlayers } = await supabase
    .from("player_profiles")
    .select("*")
    .order("rank_points", { ascending: false })
    .limit(100);

  // Get user's own rank by counting players with higher rank points
  const { count: userRank } = await supabase
    .from("player_profiles")
    .select("*", { count: "exact", head: true })
    .gt("rank_points", (topPlayers || []).find((p) => p.user_id === user.id)?.rank_points || 0);

  return (
    <div className="container mx-auto p-4">
      <LeaderboardClient
        topPlayers={topPlayers || []}
        userRank={userRank || null}
        currentUserId={user.id}
      />
    </div>
  );
}
