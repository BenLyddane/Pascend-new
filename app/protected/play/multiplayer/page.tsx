"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle, Trophy } from "lucide-react";
import Link from "next/link";
import MultiplayerMode from "../components/multiplayer-mode";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { RankBadge } from "@/components/rank-badge";

export default function MultiplayerModePage() {
  const [playerRank, setPlayerRank] = useState<{
    rank_points: number;
    rank_tier: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlayerRank = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from("ranked_stats")
            .select("rank_points, rank_tier")
            .eq("user_id", user.id)
            .single();
          
          if (error) {
            if (error.code === 'PGRST116') { // No data found
              // Create default rank for new players
              const { data: newRank, error: insertError } = await supabase
                .from("ranked_stats")
                .insert({
                  user_id: user.id,
                  rank_points: 1000,
                  rank_tier: "Bronze"
                })
                .select("rank_points, rank_tier")
                .single();
              
              if (!insertError && newRank) {
                setPlayerRank(newRank);
              }
            } else {
              console.error("Error fetching rank:", error);
            }
          } else if (data) {
            setPlayerRank(data);
          }
        }
      } catch (error) {
        console.error("Error in fetchPlayerRank:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlayerRank();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Play Mode</h1>
              {!isLoading && playerRank && (
                <RankBadge tier={playerRank.rank_tier} points={playerRank.rank_points} size="md" />
              )}
              {!isLoading && !playerRank && (
                <RankBadge tier="Unranked" showPoints={false} size="sm" />
              )}
            </div>
          </div>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-green-500 to-teal-500
                     hover:from-green-600 hover:to-teal-600
                     text-white shadow-lg transition-all hover:scale-105"
          >
            <a href="/protected/collection/deck-building">
              <PlusCircle className="mr-2 h-5 w-5" />
              My Decks
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <Link href="/protected/play/practice">
            <div className="p-6 rounded-lg border-2 border-muted cursor-pointer">
              <div className="font-semibold text-xl mb-2">Practice Mode</div>
              <p className="text-muted-foreground">
                Play against yourself to test deck combinations. Ban cards, reorder your deck, and watch the auto-battle unfold!
              </p>
            </div>
          </Link>

          <Link href="/protected/play/multiplayer">
            <div className="p-6 rounded-lg border-2 border-primary bg-primary/10 cursor-pointer">
              <div className="flex justify-between items-center">
                <div className="font-semibold text-xl mb-2">Ranked Multiplayer</div>
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="text-muted-foreground">
                Battle against other players online. Ban cards, reorder your deck, and climb the ranks!
              </p>
            </div>
          </Link>
        </div>

        {/* Multiplayer mode component */}
        <div className="mt-8">
          <MultiplayerMode />
        </div>
      </div>
    </div>
  );
}
