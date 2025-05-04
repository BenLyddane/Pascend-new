"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GamepadIcon,
  SwordIcon,
  Loader2Icon,
} from "lucide-react";
import { RankBadge } from "@/components/rank-badge";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";

interface GameStats {
  totalMatches: number;
  currentStreak: number;
  rankPoints: number;
  wins: number;
  losses: number;
  draws?: number;
  rankTier: string;
}

async function getPlayerGameStats(): Promise<GameStats | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Try to get stats from player_stats table
  const { data: playerStats, error: playerStatsError } = await supabase
    .from("player_stats")
    .select("total_matches, current_streak, rank_points, rank_tier, wins, losses, draws")
    .eq("user_id", user.id)
    .single();

  if (playerStatsError && playerStatsError.code !== 'PGRST116') {
    console.error("Error fetching player stats:", playerStatsError);
  }

  // If no player stats found or error, create default stats
  if (!playerStats || playerStatsError) {
    console.log("Using default player stats");
    
    // Create default stats with 500 points for new users
    const { error: createError } = await supabase
      .from("player_stats")
      .insert({
        user_id: user.id,
        rank_points: 500,
        rank_tier: 'bronze',
        wins: 0,
        losses: 0,
        draws: 0,
        total_matches: 0,
        current_streak: 0
      });
      
    if (createError) {
      console.error("Error creating default player stats:", createError);
    }
    
    return {
      totalMatches: 0,
      currentStreak: 0,
      rankPoints: 500,
      wins: 0,
      losses: 0,
      draws: 0,
      rankTier: 'Bronze',
    };
  }

  return {
    totalMatches: playerStats?.total_matches || 0,
    currentStreak: playerStats?.current_streak || 0,
    rankPoints: playerStats?.rank_points || 0,
    wins: playerStats?.wins || 0,
    losses: playerStats?.losses || 0,
    draws: playerStats?.draws || 0,
    rankTier: playerStats?.rank_tier || 'Bronze',
  };
}

function GameModeButton({
  href,
  icon: Icon,
  title,
  description,
  primary = false,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description?: string;
  primary?: boolean;
}) {
  return (
    <Button
      variant={primary ? "default" : "outline"}
      className={`w-full flex items-center gap-2 ${description ? "h-16" : "h-24 flex-col"} ${primary ? "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 shadow-md" : ""}`}
      asChild
    >
      <Link href={href}>
        <Icon size={description ? 20 : 24} />
        <div
          className={`flex ${description ? "flex-col items-start" : "flex-col items-center"}`}
        >
          <span className="font-medium">{title}</span>
          {description && (
            <span className={`text-xs ${primary ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
              {description}
            </span>
          )}
        </div>
      </Link>
    </Button>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-48">
      <Loader2Icon className="animate-spin h-8 w-8 text-muted-foreground" />
    </div>
  );
}

function DashPlayContent() {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlayerGameStats().then(stats => {
      setStats(stats);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState />;

  return (
    <CardContent className="space-y-4">
      {/* Game Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="flex flex-col items-center p-2 rounded-lg bg-accent/50">
          <span className="text-sm text-muted-foreground">Win/Loss</span>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xl font-bold text-green-500">{stats?.wins || 0}</span>
            <span className="text-lg font-medium text-muted-foreground">/</span>
            <span className="text-xl font-bold text-red-500">{stats?.losses || 0}</span>
            {stats?.draws && stats.draws > 0 && (
              <>
                <span className="text-lg font-medium text-muted-foreground">/</span>
                <span className="text-xl font-bold text-blue-500">{stats.draws}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-accent/50">
          <span className="text-sm text-muted-foreground">Rank</span>
          <div className="flex items-center justify-center mt-1">
            <RankBadge 
              tier={stats?.rankTier || 'Unranked'} 
              points={stats?.rankPoints} 
              size="md"
              showPoints={false}
            />
          </div>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-accent/50">
          <span className="text-sm text-muted-foreground">Rank Points</span>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold">{stats?.rankPoints || 0}</span>
            <SwordIcon size={16} className="text-blue-500" />
          </div>
        </div>
      </div>

      {/* Play Buttons */}
      <div className="space-y-2">
        <GameModeButton
          href="/protected/play/multiplayer"
          icon={GamepadIcon}
          title="Ranked Match"
          description="Battle against other players"
          primary={true}
        />
        <GameModeButton
          href="/protected/play/practice"
          icon={SwordIcon}
          title="Practice Mode"
          description="Play against your own decks!"
        />
      </div>
    </CardContent>
  );
}

export function DashPlay() {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Play</CardTitle>
        <Link
          href="/protected/play"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          More options →
        </Link>
      </CardHeader>
      <DashPlayContent />
    </Card>
  );
}
