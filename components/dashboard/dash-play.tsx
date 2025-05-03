"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GamepadIcon,
  SwordIcon,
  TrophyIcon,
  Loader2Icon,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";

interface GameStats {
  totalMatches: number;
  currentStreak: number;
  rankPoints: number;
  wins: number;
  losses: number;
  rankTier: string;
}

async function getPlayerGameStats(): Promise<GameStats | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get ranked stats from ranked_stats table
  const { data: rankedStats, error: rankedError } = await supabase
    .from("ranked_stats")
    .select("total_matches, current_streak, rank_points, rank_tier, wins, losses")
    .eq("user_id", user.id)
    .single();

  if (rankedError && rankedError.code !== 'PGRST116') {
    console.error("Error fetching ranked stats:", rankedError);
  }

  // If no ranked stats found or error, return default stats
  // We don't try to create stats from the client side due to RLS policies
  if (!rankedStats || rankedError) {
    console.log("Using default rank stats");
    return {
      totalMatches: 0,
      currentStreak: 0,
      rankPoints: 1000,
      wins: 0,
      losses: 0,
      rankTier: 'Bronze',
    };
  }

  return {
    totalMatches: rankedStats?.total_matches || 0,
    currentStreak: rankedStats?.current_streak || 0,
    rankPoints: rankedStats?.rank_points || 1000,
    wins: rankedStats?.wins || 0,
    losses: rankedStats?.losses || 0,
    rankTier: rankedStats?.rank_tier || 'Bronze',
  };
}

function GameModeButton({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <Button
      variant={description ? "default" : "outline"}
      className={`w-full flex items-center gap-2 ${description ? "h-16" : "h-24 flex-col"}`}
      asChild
    >
      <Link href={href}>
        <Icon size={description ? 20 : 24} />
        <div
          className={`flex ${description ? "flex-col items-start" : "flex-col items-center"}`}
        >
          <span className="font-medium">{title}</span>
          {description && (
            <span className="text-xs text-primary-foreground/80">
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
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-green-500">{stats?.wins || 0}</span>
            <span className="text-lg font-bold text-muted-foreground">/</span>
            <span className="text-2xl font-bold text-red-500">{stats?.losses || 0}</span>
          </div>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-accent/50">
          <span className="text-sm text-muted-foreground">Rank</span>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold">{stats?.rankTier || 'Unranked'}</span>
            <TrophyIcon size={16} className="text-yellow-500" />
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
          title="Play Now"
          description="Start a new game"
        />
        <GameModeButton
          href="/protected/play/practice"
          icon={SwordIcon}
          title="Practice Mode"
          description="Play against AI"
        />
      </div>
    </CardContent>
  );
}

export function DashPlay() {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Quick Play</CardTitle>
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
