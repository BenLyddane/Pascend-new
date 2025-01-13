"use server";

import { createClient } from "@/utils/supabase/server";

export async function updateMatchStats(
  userId: string,
  opponentId: string,
  winner: 1 | 2 | "draw",
  stats: {
    totalDamageDealt: number;
    cardsDefeated: number;
    turnsPlayed: number;
    specialAbilitiesUsed: number;
  }
) {
  const supabase = await createClient();

  try {
    // Get both players' current stats
    const { data: players } = await supabase
      .from("player_profiles")
      .select("user_id, rank_points")
      .in("user_id", [userId, opponentId]);

    if (!players || players.length !== 2) {
      throw new Error("Could not find player profiles");
    }

    const player = players.find(p => p.user_id === userId);
    const opponent = players.find(p => p.user_id === opponentId);

    if (!player || !opponent) {
      throw new Error("Could not find player or opponent profile");
    }

    // Update stats for both players
    await supabase.rpc("update_player_stats", {
      p_user_id: userId,
      p_won: winner === 1,
      p_opponent_rank_points: opponent.rank_points
    });

    await supabase.rpc("update_player_stats", {
      p_user_id: opponentId,
      p_won: winner === 2,
      p_opponent_rank_points: player.rank_points
    });

    // Save match history
    await supabase
      .from("match_history")
      .insert({
        user_id: userId,
        opponent_id: opponentId,
        match_type: "ranked",
        result: winner === 1 ? "win" : winner === 2 ? "loss" : "draw",
        damage_dealt: stats.totalDamageDealt,
        cards_defeated: stats.cardsDefeated,
        turns_played: stats.turnsPlayed,
        special_abilities_used: stats.specialAbilitiesUsed,
      });

  } catch (error) {
    console.error("Error updating match stats:", error);
    throw error;
  }
}
