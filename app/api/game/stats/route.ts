import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse the request body
    const body = await request.json();
    const { opponentId, result, stats, mode = "ranked" } = body;
    
    if (!opponentId || !result || !stats) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Validate result
    if (!["win", "loss", "draw"].includes(result)) {
      return NextResponse.json({ error: "Invalid result" }, { status: 400 });
    }
    
    // Handle stats differently based on mode
    if (mode === "practice") {
      // Update player_stats for practice mode
      await updatePracticeStats(user.id, result, stats, supabase);
    } else {
      // Update ranked_stats for ranked mode
      await updateRankedStats(user.id, opponentId, result, stats, supabase);
    }
    
    // Save match history
    const { error: historyError } = await supabase
      .from("match_history")
      .insert({
        user_id: user.id,
        opponent_id: opponentId,
        match_type: mode,
        result,
        damage_dealt: stats.totalDamageDealt || 0,
        damage_received: stats.totalDamageReceived || 0,
        cards_defeated: stats.cardsDefeated || 0,
        turns_played: stats.turnsPlayed || 0,
        special_abilities_used: stats.specialAbilitiesUsed || 0,
        started_at: stats.startedAt || new Date().toISOString(),
        ended_at: new Date().toISOString()
      });
    
    if (historyError) {
      console.error("Error saving match history:", historyError);
      return NextResponse.json({ error: "Failed to save match history" }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error("Error processing game stats:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to update practice stats
async function updatePracticeStats(userId: string, result: string, stats: any, supabase: any) {
  // Get current player stats
  const { data: playerStats, error: statsError } = await supabase
    .from("player_stats")
    .select("*")
    .eq("user_id", userId)
    .single();
  
  if (statsError && statsError.code !== 'PGRST116') {
    console.error("Error fetching player stats:", statsError);
    throw new Error("Failed to fetch player stats");
  }
  
  // Initialize stats if they don't exist
  const currentStats = playerStats || {
    user_id: userId,
    total_matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    current_streak: 0,
    longest_streak: 0,
    total_damage_dealt: 0,
    total_damage_received: 0,
    total_cards_defeated: 0,
    total_turns_played: 0,
    total_special_abilities_used: 0,
    mode: "practice"
  };
  
  // Calculate new stats
  let newStats: any = {
    total_matches: (currentStats.total_matches || 0) + 1,
    wins: (currentStats.wins || 0) + (result === "win" ? 1 : 0),
    losses: (currentStats.losses || 0) + (result === "loss" ? 1 : 0),
    draws: (currentStats.draws || 0) + (result === "draw" ? 1 : 0),
    current_streak: result === "win" 
      ? (currentStats.current_streak || 0) + 1 
      : (result === "loss" ? 0 : currentStats.current_streak || 0),
    total_damage_dealt: (currentStats.total_damage_dealt || 0) + (stats.totalDamageDealt || 0),
    total_damage_received: (currentStats.total_damage_received || 0) + (stats.totalDamageReceived || 0),
    total_cards_defeated: (currentStats.total_cards_defeated || 0) + (stats.cardsDefeated || 0),
    total_turns_played: (currentStats.total_turns_played || 0) + (stats.turnsPlayed || 0),
    total_special_abilities_used: (currentStats.total_special_abilities_used || 0) + (stats.specialAbilitiesUsed || 0),
    last_match_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    mode: "practice"
  };
  
  // Update longest streak if needed
  if (result === "win" && newStats.current_streak > (currentStats.longest_streak || 0)) {
    newStats.longest_streak = newStats.current_streak;
  } else {
    newStats.longest_streak = currentStats.longest_streak || 0;
  }
  
  // Update player stats
  const { error: updateError } = await supabase
    .from("player_stats")
    .upsert({
      ...newStats,
      user_id: userId
    });
  
  if (updateError) {
    console.error("Error updating player stats:", updateError);
    throw new Error("Failed to update player stats");
  }
}

// Helper function to update ranked stats
async function updateRankedStats(userId: string, opponentId: string, result: string, stats: any, supabase: any) {
  // Get current ranked stats
  const { data: rankedStats, error: statsError } = await supabase
    .from("ranked_stats")
    .select("*")
    .eq("user_id", userId)
    .single();
  
  if (statsError && statsError.code !== 'PGRST116') {
    console.error("Error fetching ranked stats:", statsError);
    throw new Error("Failed to fetch ranked stats");
  }
  
  // Initialize stats if they don't exist
  const currentStats = rankedStats || {
    user_id: userId,
    total_matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    current_streak: 0,
    longest_streak: 0,
    rank_points: 1000,
    rank_tier: "Bronze",
    highest_rank_points: 1000,
    highest_rank_tier: "Bronze",
    season_id: "season_1"
  };
  
  // Calculate rank change based on current rank tier
  const currentRankTier = currentStats.rank_tier || 'Bronze';
  const rankChange = calculateRankChange(result, currentRankTier);
  const newRankPoints = Math.max(0, (currentStats.rank_points || 1000) + rankChange);
  
  // Calculate new rank tier
  const newRankTier = calculateRankTier(newRankPoints);
  
  // Calculate new stats
  let newStats: any = {
    total_matches: (currentStats.total_matches || 0) + 1,
    wins: (currentStats.wins || 0) + (result === "win" ? 1 : 0),
    losses: (currentStats.losses || 0) + (result === "loss" ? 1 : 0),
    draws: (currentStats.draws || 0) + (result === "draw" ? 1 : 0),
    current_streak: result === "win" 
      ? (currentStats.current_streak || 0) + 1 
      : (result === "loss" ? 0 : currentStats.current_streak || 0),
    rank_points: newRankPoints,
    rank_tier: newRankTier,
    last_match_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Update longest streak if needed
  if (result === "win" && newStats.current_streak > (currentStats.longest_streak || 0)) {
    newStats.longest_streak = newStats.current_streak;
  } else {
    newStats.longest_streak = currentStats.longest_streak || 0;
  }
  
  // Update highest rank if needed
  if (newRankPoints > (currentStats.highest_rank_points || 0)) {
    newStats.highest_rank_points = newRankPoints;
    newStats.highest_rank_tier = newRankTier;
  } else {
    newStats.highest_rank_points = currentStats.highest_rank_points || 1000;
    newStats.highest_rank_tier = currentStats.highest_rank_tier || "Bronze";
  }
  
  // Update ranked stats
  const { error: updateError } = await supabase
    .from("ranked_stats")
    .upsert({
      ...newStats,
      user_id: userId
    });
  
  if (updateError) {
    console.error("Error updating ranked stats:", updateError);
    throw new Error("Failed to update ranked stats");
  }
  
  // Also update opponent's stats if they exist
  if (opponentId) {
    try {
      // Get opponent's ranked stats
      const { data: opponentStats, error: opponentError } = await supabase
        .from("ranked_stats")
        .select("*")
        .eq("user_id", opponentId)
        .single();
      
      if (!opponentError && opponentStats) {
        // Calculate opponent's result (opposite of player's result)
        const opponentResult = result === "win" ? "loss" : result === "loss" ? "win" : "draw";
        
        // Calculate opponent's rank change based on their rank tier
        const opponentRankTier = opponentStats.rank_tier || 'Bronze';
        const opponentRankChange = calculateRankChange(opponentResult, opponentRankTier);
        const newOpponentRankPoints = Math.max(0, (opponentStats.rank_points || 1000) + opponentRankChange);
        
        // Update opponent's ranked stats
        await supabase
          .from("ranked_stats")
          .update({
            rank_points: newOpponentRankPoints,
            rank_tier: calculateRankTier(newOpponentRankPoints),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", opponentId);
      }
    } catch (error) {
      console.warn("Error updating opponent stats:", error);
      // Continue even if opponent stats update fails
    }
  }
}

// Helper function to calculate rank change based on current rank tier
function calculateRankChange(result: string, rankTier: string = 'Bronze'): number {
  // Base points for each result
  let winPoints = 25;
  let lossPoints = -15;
  let drawPoints = 5;
  
  // Adjust points based on rank tier
  switch (rankTier.toLowerCase()) {
    case 'bronze':
      // Default values for Bronze
      break;
    case 'silver':
      winPoints = 20;
      lossPoints = -18;
      break;
    case 'gold':
      winPoints = 18;
      lossPoints = -20;
      break;
    case 'platinum':
      winPoints = 15;
      lossPoints = -22;
      break;
    case 'diamond':
      winPoints = 12;
      lossPoints = -25;
      break;
    case 'master':
      winPoints = 10;
      lossPoints = -30;
      break;
    default:
      // Use default values for unknown ranks
      break;
  }
  
  // Return points based on match result
  switch (result) {
    case "win":
      return winPoints;
    case "loss":
      return lossPoints;
    case "draw":
      return drawPoints;
    default:
      return 0;
  }
}

// Helper function to calculate rank tier
function calculateRankTier(rankPoints: number): string {
  if (rankPoints < 1000) {
    return "Bronze";
  } else if (rankPoints < 1500) {
    return "Silver";
  } else if (rankPoints < 2000) {
    return "Gold";
  } else if (rankPoints < 2500) {
    return "Platinum";
  } else if (rankPoints < 3000) {
    return "Diamond";
  } else {
    return "Master";
  }
}
