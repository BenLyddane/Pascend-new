import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User2Icon, TrophyIcon, MedalIcon } from "lucide-react";
import { RankBadge } from "@/components/rank-badge";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Database } from "@/types/database.types";

// Define our own type for leaderboard players
type LeaderboardPlayer = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  rank_points: number | null;
  rank_tier: string | null;
  wins: number | null;
  losses: number | null;
  draws: number | null;
  total_matches: number | null;
  current_streak: number | null;
};


function getWinRate(wins: number | null, totalMatches: number | null): string {
  if (!wins || !totalMatches || totalMatches === 0) return "0%";
  return `${Math.round((wins / totalMatches) * 100)}%`;
}

async function getTopPlayers(): Promise<LeaderboardPlayer[]> {
  const supabase = await createClient();

  try {
    // Try to use the get_leaderboard function first
    try {
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .rpc('get_leaderboard', { limit_count: 3, offset_count: 0 });
      
      if (!leaderboardError && leaderboardData && leaderboardData.length > 0) {
        // Transform the data to match our LeaderboardPlayer type
        return leaderboardData.map((player: any) => {
          // Make sure rank_tier is properly formatted (lowercase for consistency)
          let rankTier = player.rank_tier || 'bronze';
          if (typeof rankTier === 'string') {
            rankTier = rankTier.toLowerCase();
          }
          
          return {
            user_id: player.user_id,
            display_name: player.display_name || 'Unknown Player',
            avatar_url: player.avatar_url,
            rank_points: player.rank_points || 0,
            rank_tier: rankTier,
            wins: player.wins || 0,
            losses: player.losses || 0,
            draws: 0, // Not included in get_leaderboard function
            total_matches: player.total_matches || 0,
            current_streak: player.current_streak || 0
          };
        });
      }
    } catch (rpcError) {
      console.error("Error using get_leaderboard RPC:", rpcError);
    }
    
    // If RPC fails, get data directly from player_stats
    const { data: playerStatsData, error: playerStatsError } = await supabase
      .from('player_stats')
      .select('*')
      .order('rank_points', { ascending: false })
      .limit(3);
    
    if (playerStatsError) {
      console.error("Error fetching player stats:", playerStatsError);
      return [];
    }
    
    // Get player profiles
    const userIds = playerStatsData.map(player => player.user_id);
    const { data: profilesData } = await supabase
      .from('player_profiles')
      .select('*')
      .in('user_id', userIds);
    
    // Combine the data
    return playerStatsData.map(stats => {
      const profile = profilesData?.find(p => p.user_id === stats.user_id) || { 
        display_name: null, 
        avatar_url: null 
      };
      
      const totalMatches = (stats.wins || 0) + (stats.losses || 0) + (stats.draws || 0);
      
      // Make sure rank_tier is properly formatted (lowercase for consistency)
      let rankTier = stats.rank_tier || 'bronze';
      if (typeof rankTier === 'string') {
        rankTier = rankTier.toLowerCase();
      }
      
      return {
        user_id: stats.user_id,
        display_name: profile.display_name || "Unknown Player",
        avatar_url: profile.avatar_url,
        rank_points: stats.rank_points || 0,
        rank_tier: rankTier,
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        draws: stats.draws || 0,
        total_matches: totalMatches || stats.total_matches || 0,
        current_streak: stats.current_streak || 0
      };
    });
  } catch (error) {
    console.error("Error in getTopPlayers:", error);
    return [];
  }
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
        <RankBadge 
          tier={player.rank_tier || 'Unranked'} 
          size="sm"
          showPoints={false}
        />
      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium">
                      {player.wins || 0}/{player.losses || 0}
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
