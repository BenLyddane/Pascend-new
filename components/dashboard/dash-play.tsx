// components/dashboard/dash-play.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GamepadIcon,
  SwordIcon,
  UsersIcon,
  BotIcon,
  TrophyIcon,
  Loader2Icon,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Suspense } from "react";

interface GameStats {
  currentStreak: number;
  dailyGamesPlayed: number;
  isInMatch: boolean;
}

async function getPlayerGameStats(): Promise<GameStats> {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      currentStreak: 0,
      dailyGamesPlayed: 0,
      isInMatch: false,
    };
  }

  // Get player's game stats
  const { data: stats, error } = await supabase
    .from("player_stats")
    .select("current_streak, daily_games_played, is_in_match")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching game stats:", error);
    return {
      currentStreak: 0,
      dailyGamesPlayed: 0,
      isInMatch: false,
    };
  }

  return {
    currentStreak: stats?.current_streak || 0,
    dailyGamesPlayed: stats?.daily_games_played || 0,
    isInMatch: stats?.is_in_match || false,
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

async function DashPlayContent() {
  const stats = await getPlayerGameStats();

  return (
    <CardContent className="space-y-4">
      {/* Game Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col items-center p-2 rounded-lg bg-accent/50">
          <span className="text-sm text-muted-foreground">Daily Games</span>
          <span className="text-2xl font-bold">{stats.dailyGamesPlayed}</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-accent/50">
          <span className="text-sm text-muted-foreground">Current Streak</span>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold">{stats.currentStreak}</span>
            <TrophyIcon size={16} className="text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Quick Match Button */}
      <GameModeButton
        href={
          stats.isInMatch ? "/protected/play/current" : "/protected/play/quick"
        }
        icon={GamepadIcon}
        title={stats.isInMatch ? "Resume Match" : "Quick Match"}
        description={
          stats.isInMatch
            ? "Continue your current game"
            : "Play against a random opponent"
        }
      />

      {/* Other Game Modes */}
      <div className="grid grid-cols-2 gap-4">
        <GameModeButton
          href="/protected/play/practice"
          icon={BotIcon}
          title="Practice"
        />

        <GameModeButton
          href="/protected/play/friends"
          icon={UsersIcon}
          title="Play Friends"
        />

        <GameModeButton
          href="/protected/play/tournament"
          icon={TrophyIcon}
          title="Tournament"
        />

        <GameModeButton
          href="/protected/play/training"
          icon={SwordIcon}
          title="Training"
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
      <Suspense fallback={<LoadingState />}>
        <DashPlayContent />
      </Suspense>
    </Card>
  );
}

export default DashPlay;
