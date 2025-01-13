"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2Icon } from "lucide-react";

interface QueuePlayer {
  id: string;
  displayName: string;
  joinedAt: string;
  rankPoints: number;
}

interface QueueResponse {
  id: string;
  user_id: string;
  joined_at: string;
  rank_points: number;
  player_profiles: {
    rank_points: number | null;
  } | null;
  auth_user: {
    raw_user_meta_data: {
      name?: string;
      full_name?: string;
      user_name?: string;
    };
  } | null;
}

export function MatchmakingQueue() {
  const [queuePlayers, setQueuePlayers] = useState<QueuePlayer[]>([]);
  const [searchTime, setSearchTime] = useState(0);
  const supabase = createClient();

  // Fetch current queue players
  useEffect(() => {
    const fetchQueuePlayers = async () => {
      const { data: players, error } = (await supabase
        .from("matchmaking_queue")
        .select(
          `
          id,
          user_id,
          joined_at,
          rank_points,
          player_profiles!matchmaking_queue_user_id_fkey (
            rank_points
          ),
          auth_user:user_id (
            raw_user_meta_data
          )
        `
        )
        .eq("status", "waiting")) as {
        data: QueueResponse[] | null;
        error: any;
      };

      if (error) {
        console.error("Error fetching queue players:", error);
        return;
      }

      if (players) {
        setQueuePlayers(
          players.map((p) => ({
            id: p.id,
            displayName:
              p.auth_user?.raw_user_meta_data?.name ||
              p.auth_user?.raw_user_meta_data?.full_name ||
              p.auth_user?.raw_user_meta_data?.user_name ||
              "Unknown Player",
            joinedAt: p.joined_at,
            rankPoints: p.player_profiles?.rank_points || p.rank_points || 1000,
          }))
        );
      }
    };

    // Initial fetch
    fetchQueuePlayers();

    // Subscribe to queue changes
    const channel = supabase
      .channel("matchmaking_queue_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matchmaking_queue",
        },
        () => {
          fetchQueuePlayers();
        }
      )
      .subscribe();

    // Refresh every 10 seconds as backup
    const interval = setInterval(fetchQueuePlayers, 10000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Update search time
  useEffect(() => {
    const interval = setInterval(() => {
      setSearchTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatWaitTime = (joinedAt: string) => {
    const waitTimeSeconds = Math.floor(
      (Date.now() - new Date(joinedAt).getTime()) / 1000
    );
    if (waitTimeSeconds < 60) return `${waitTimeSeconds}s`;
    return `${Math.floor(waitTimeSeconds / 60)}m ${waitTimeSeconds % 60}s`;
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Players in Queue ({queuePlayers.length})
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="animate-spin h-4 w-4" />
          <span>Searching: {searchTime}s</span>
        </div>
      </div>

      {queuePlayers.length > 0 ? (
        <div className="bg-accent/50 rounded-lg divide-y divide-accent">
          {queuePlayers.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-3"
            >
              <div>
                <span className="font-medium">{player.displayName}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({player.rankPoints} RP)
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Waiting: {formatWaitTime(player.joinedAt)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No other players in queue</p>
          <p className="text-sm">You'll be matched as soon as someone joins</p>
        </div>
      )}
    </div>
  );
}
