// components/dashboard/dash-leaderboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrophyIcon, MedalIcon, User2Icon } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";

interface LeaderboardPlayer {
  id: string;
  username: string;
  points: number;
  win_rate: number;
  rank: number;
}

async function getTopPlayers(): Promise<LeaderboardPlayer[]> {
  const supabase = await createClient();

  // Get top players from player_profiles
  const { data: profiles, error } = await supabase
    .from("player_profiles")
    .select(`
      user_id,
      rank_points,
      wins,
      total_matches,
      settings
    `)
    .order("rank_points", { ascending: false })
    .limit(3);

  if (error || !profiles) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }

  return profiles.map((profile, index) => ({
    id: profile.user_id,
    username: profile.settings?.displayName || "Unknown Player",
    points: profile.rank_points || 0,
    win_rate: profile.total_matches ? 
      Math.round((profile.wins || 0) / profile.total_matches * 100) : 0,
    rank: index + 1
  }));
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <TrophyIcon size={16} className="text-yellow-500" />;
    case 2:
      return <MedalIcon size={16} className="text-gray-400" />;
    case 3:
      return <MedalIcon size={16} className="text-amber-700" />;
    default:
      return <User2Icon size={16} />;
  }
}

export async function DashLeaderboard() {
  const players = await getTopPlayers();

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Top Players</CardTitle>
        <Link
          href="/protected/leaderboard"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          View full leaderboard →
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {players.length > 0
            ? players.map((player) => (
                <div key={player.id} className="flex items-center">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                      {getRankIcon(player.rank)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {player.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {player.points.toLocaleString()} pts
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    Win Rate: {player.win_rate}%
                  </span>
                </div>
              ))
            : // Skeleton loading state
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default DashLeaderboard;
