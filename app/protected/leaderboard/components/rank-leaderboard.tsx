"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RankBadge } from "@/components/rank-badge";

type RankedPlayer = {
  user_id: string;
  display_name: string | null;
  rank_points: number;
  rank_tier: string;
  wins: number;
  losses: number;
  draws: number;
  total_matches: number;
  win_rate: number;
};

export default function RankLeaderboard() {
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("rank_points");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const supabase = createClient();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };

    fetchCurrentUser();
  }, [supabase]);

  // Apply filters and sorting to players
  useEffect(() => {
    if (!players.length) return;
    
    let result = [...players];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(player => 
        player.display_name?.toLowerCase().includes(term)
      );
    }
    
    // Apply tier filter
    if (selectedTier !== "all") {
      result = result.filter(player => 
        player.rank_tier.toLowerCase() === selectedTier.toLowerCase()
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA: number;
      let valueB: number;
      
      switch (sortField) {
        case "rank_points":
          valueA = a.rank_points;
          valueB = b.rank_points;
          break;
        case "wins":
          valueA = a.wins;
          valueB = b.wins;
          break;
        case "losses":
          valueA = a.losses;
          valueB = b.losses;
          break;
        case "win_rate":
          valueA = a.win_rate;
          valueB = b.win_rate;
          break;
        case "total_matches":
          valueA = a.total_matches;
          valueB = b.total_matches;
          break;
        default:
          valueA = a.rank_points;
          valueB = b.rank_points;
      }
      
      return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
    });
    
    setFilteredPlayers(result);
  }, [players, searchTerm, selectedTier, sortField, sortDirection]);

  useEffect(() => {
    const fetchRankedPlayers = async () => {
      setLoading(true);
      
      try {
        // Join ranked_stats with player_profiles to get display names
        const { data, error } = await supabase
          .from('ranked_stats')
          .select(`
            *,
            player_profiles:user_id (
              display_name
            )
          `)
          .order('rank_points', { ascending: false })
          .limit(100);
        
        if (error) {
          console.error("Error fetching ranked players:", error);
          return;
        }
        
        // Process the data to calculate win rates and format for display
        const processedData = data.map((player: any) => {
          const totalMatches = (player.wins || 0) + (player.losses || 0) + (player.draws || 0);
          const winRate = totalMatches > 0 ? ((player.wins || 0) / totalMatches) * 100 : 0;
          
          return {
            user_id: player.user_id,
            display_name: player.player_profiles?.display_name || "Unknown Player",
            rank_points: player.rank_points || 0,
            rank_tier: player.rank_tier || "Bronze",
            wins: player.wins || 0,
            losses: player.losses || 0,
            draws: player.draws || 0,
            total_matches: totalMatches,
            win_rate: winRate
          };
        });
        
        setPlayers(processedData);
        setFilteredPlayers(processedData);
      } catch (error) {
        console.error("Error in fetchRankedPlayers:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRankedPlayers();
    
    // Set up a subscription to ranked_stats changes
    const channel = supabase
      .channel('ranked_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ranked_stats'
        },
        () => {
          // Refresh the leaderboard when changes occur
          fetchRankedPlayers();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  
  // Toggle sort direction or change sort field
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Ranked Leaderboard</CardTitle>
        <CardDescription>Top players ranked by skill</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select
            value={selectedTier}
            onValueChange={setSelectedTier}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="bronze">Bronze</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="platinum">Platinum</SelectItem>
              <SelectItem value="diamond">Diamond</SelectItem>
              <SelectItem value="master">Master</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="p-0 h-auto font-semibold"
                    onClick={() => handleSort("rank_tier")}
                  >
                    Tier <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="p-0 h-auto font-semibold"
                    onClick={() => handleSort("rank_points")}
                  >
                    Points <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    className="p-0 h-auto font-semibold ml-auto"
                    onClick={() => handleSort("total_matches")}
                  >
                    W/L/D <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    className="p-0 h-auto font-semibold ml-auto"
                    onClick={() => handleSort("win_rate")}
                  >
                    Win Rate <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map((player, index) => (
                <TableRow 
                  key={player.user_id}
                  className={player.user_id === currentUserId ? "bg-muted/50" : ""}
                >
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    {player.display_name}
                    {player.user_id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <RankBadge tier={player.rank_tier} showPoints={false} />
                  </TableCell>
                  <TableCell>{player.rank_points}</TableCell>
                  <TableCell className="text-right">
                    {player.wins}/{player.losses}/{player.draws}
                  </TableCell>
                  <TableCell className="text-right">
                    {player.win_rate.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
              {players.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No ranked players found. Be the first to play ranked matches!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
