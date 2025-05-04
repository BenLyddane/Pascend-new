import { createClient } from "@/utils/supabase/client";
import { updateMatchStats } from "@/app/actions/updateMatchStats";
import { GameState } from "@/app/protected/play/game-engine/types";

export async function saveMatchStats(
  userId: string,
  opponentId: string,
  winner: 1 | 2 | "draw",
  stats: any
): Promise<void> {
  try {
    // Convert the parameters to a GameState-like object that updateMatchStats expects
    const gameStateForStats: Partial<GameState> & { 
      mode?: string;
      opponentId?: string;
      player1DeckId?: string;
      player2DeckId?: string;
    } = {
      winner,
      events: stats.events || [],
      lastUpdated: Date.now(),
      player1Cards: stats.player1Cards || [],
      player2Cards: stats.player2Cards || [],
      currentTurn: stats.currentTurn || 0,
      player1GoesFirst: stats.player1GoesFirst || true,
      mode: stats.mode || "ranked",
      opponentId: opponentId,
      player1DeckId: stats.player1DeckId,
      player2DeckId: stats.player2DeckId
    };
    
    // Handle simulated opponents
    const isSimulatedOpponent = opponentId === "simulated-opponent-id";
    if (isSimulatedOpponent) {
      console.log("Saving stats for game against simulated opponent");
    }
    
    await updateMatchStats(gameStateForStats as GameState, userId);
  } catch (error) {
    console.error("Error saving match stats:", error);
    throw new Error("Failed to save match statistics");
  }
}

export async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("Failed to get current user");
  }

  return user.id;
}
