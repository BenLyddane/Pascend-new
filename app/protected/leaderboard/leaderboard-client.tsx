"use client";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Database } from "@/types/database.types";

type PlayerProfile = Database["public"]["Tables"]["player_profiles"]["Row"] & {
  "auth.users"?: {
    email?: string;
  } | null;
};

interface LeaderboardClientProps {
  topPlayers: PlayerProfile[];
  userRank: number | null;
  currentUserId: string;
}

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

export default function LeaderboardClient({
  topPlayers,
  userRank,
  currentUserId,
}: LeaderboardClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        {userRank && (
          <div className="text-lg">
            Your Rank: <span className="font-bold">#{userRank}</span>
          </div>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Rank Points</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Win Rate</TableHead>
              <TableHead className="text-right">Wins</TableHead>
              <TableHead className="text-right">Losses</TableHead>
              <TableHead className="text-right">Streak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topPlayers.map((player, index) => (
              <TableRow
                key={player.user_id}
                className={
                  player.user_id === currentUserId ? "bg-accent/50" : ""
                }
              >
                <TableCell className="font-medium">#{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={player.avatar_url || undefined} />
                      <AvatarFallback>
                        {player["auth.users"]?.email
                          ?.substring(0, 2)
                          .toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      {player["auth.users"]?.email || "Unknown Player"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{player.rank_points}</TableCell>
                <TableCell>
                  <span className={getRankTierColor(player.rank_tier)}>
                    {player.rank_tier
                      ? player.rank_tier.charAt(0).toUpperCase() +
                        player.rank_tier.slice(1)
                      : "Unranked"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {getWinRate(player.wins, player.total_matches)}
                </TableCell>
                <TableCell className="text-right">{player.wins || 0}</TableCell>
                <TableCell className="text-right">
                  {player.losses || 0}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end text-sm">
                    <span>Current: {player.current_streak || 0}</span>
                    <span className="text-muted-foreground">
                      Best: {player.longest_streak || 0}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
