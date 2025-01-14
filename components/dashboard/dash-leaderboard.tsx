import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrophyIcon, MedalIcon, User2Icon } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Database } from "@/types/database.types";

type LeaderboardPlayer = Database["public"]["Functions"]["get_leaderboard"]["Returns"][0];

function getRankTierColor(tier: string | null) {
  switch (tier) {
    case "bronze":
      return "text-orange-600";
    case "silver":
      return "text-gray-400";
    case "gold":
      return "text-yellow-400";
    case "platinum":
      return "text-cyan-400";
    case "diamond":
      return "text-blue-500";
    case "master":
      return "text-purple-500";
    default:
      return "text-gray-500";
  }
}

function getWinRate(wins: number | null, totalMatches: number | null): string {
  if (!wins || !totalMatches || totalMatches === 0) return "0%";
  return `${Math.round((wins / totalMatches) * 100)}%`;
}

async function getTopPlayers(): Promise<LeaderboardPlayer[]> {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .rpc('get_leaderboard', { limit_count: 3, offset_count: 0 });

  if (error || !profiles) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }

  return profiles;
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
            ? players.map((player, index) => (
                <div key={player.user_id} className="flex items-center">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                      {getRankIcon(index + 1)}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={player.avatar_url || undefined} />
                          <AvatarFallback>
                            {player.display_name
                              ?.substring(0, 2)
                              .toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {player.display_name || "Unknown Player"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {player.rank_points?.toLocaleString() || 0} pts
                        </span>
                        <span className={getRankTierColor(player.rank_tier)}>
                          {player.rank_tier
                            ? player.rank_tier.charAt(0).toUpperCase() +
                              player.rank_tier.slice(1)
                            : "Unranked"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium">
                      Win Rate: {getWinRate(player.wins, player.total_matches)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Streak: {player.current_streak || 0}
                    </span>
                  </div>
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
