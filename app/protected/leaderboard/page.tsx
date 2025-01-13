import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LeaderboardClient from "./leaderboard-client";
import { Tables } from "@/types/database.types";

type PlayerProfile = Tables<"player_profiles"> & {
  auth: {
    users: {
      email: string;
    };
  };
};

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
    .select(
      `
      user_id,
      rank_points,
      rank_tier,
      seasonal_rank_points,
      season_highest_rank,
      wins,
      losses,
      draws,
      current_streak,
      longest_streak,
      total_matches,
      avatar_url,
      auth.users!player_profiles_user_id_fkey (
        email
      )
    `
    )
    .order("rank_points", { ascending: false })
    .limit(100);

  // Get user's own rank
  const { data: userRank } = await supabase.rpc("get_player_rank", {
    player_id: user.id,
  });

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
