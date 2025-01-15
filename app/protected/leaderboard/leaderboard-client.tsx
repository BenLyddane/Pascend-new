"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { LeaderboardFilters, SortField, SortDirection } from "./components/leaderboard-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tables } from "@/types/database.types";

type PlayerProfile = Tables<"player_profiles">;

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState<string | "all">("all");
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection } | null>(null);

  const filteredPlayers = useMemo(() => {
    let filtered = [...topPlayers];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        player => player.display_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply tier filter
    if (selectedTier !== "all") {
      filtered = filtered.filter(player => player.rank_tier === selectedTier);
    }

    // Apply sorting
    if (sort) {
      filtered.sort((a, b) => {
        let aValue: number = 0;
        let bValue: number = 0;

        switch (sort.field) {
          case "rank_points":
            aValue = a.rank_points || 0;
            bValue = b.rank_points || 0;
            break;
          case "wins":
            aValue = a.wins || 0;
            bValue = b.wins || 0;
            break;
          case "losses":
            aValue = a.losses || 0;
            bValue = b.losses || 0;
            break;
          case "current_streak":
            aValue = a.current_streak || 0;
            bValue = b.current_streak || 0;
            break;
          case "win_rate":
            aValue = a.wins && a.total_matches ? (a.wins / a.total_matches) * 100 : 0;
            bValue = b.wins && b.total_matches ? (b.wins / b.total_matches) * 100 : 0;
            break;
        }

        return sort.direction === "asc" ? aValue - bValue : bValue - aValue;
      });
    }

    return filtered;
  }, [topPlayers, searchTerm, selectedTier, sort]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          {userRank !== null && (
            <div className="text-lg">
              Your Rank: <span className="font-bold">#{userRank + 1}</span>
            </div>
          )}
        </div>

        <LeaderboardFilters
          onSearchChange={setSearchTerm}
          onTierFilter={setSelectedTier}
          onSort={(field, direction) => setSort({ field, direction })}
          currentSort={sort}
        />
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
            {filteredPlayers.map((player, index) => (
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
                        {player.display_name
                          ?.substring(0, 2)
                          .toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      {player.display_name || "Unknown Player"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{player.rank_points || 0}</TableCell>
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
