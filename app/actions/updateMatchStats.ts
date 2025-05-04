"use server";

import { createClient } from "@/utils/supabase/server";
import { GameState } from "@/app/protected/play/game-engine/types";
import { cookies } from "next/headers";
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from "@/types/database.types";

// Define types for match statistics
interface MatchStats {
  result: 'win' | 'loss' | 'draw';
  cardsDefeated: number;
  damageDealt: number;
  damageReceived: number;
  specialAbilitiesUsed: number;
  turnsPlayed: number;
  player1DeckId?: string;
  player2DeckId?: string;
  mode?: 'practice' | 'ranked';
}

// Define types for player statistics
interface PlayerStats {
  user_id: string;
  total_matches: number;
  wins?: number;
  losses?: number;
  draws?: number;
  current_streak?: number;
  longest_streak?: number;
  total_damage_dealt: number;
  total_damage_received: number;
  total_cards_defeated: number;
  total_turns_played: number;
  total_special_abilities_used: number;
  rank_points?: number;
  rank_tier?: string;
  last_match_at: string;
  updated_at: string;
  created_at?: string;
  mode?: string;
}

/**
 * Saves match statistics to the database after a game is completed
 * This includes:
 * 1. Recording the match in match_history
 * 2. Updating player_stats with cumulative statistics for practice mode
 * 3. Updating ranked_stats for ranked mode
 * 4. Updating player_decks with win/loss records
 */
export async function updateMatchStats(
  gameState: GameState & { mode?: string },
  userId?: string | null
) {
  try {
    const supabase = await createClient();
    
    // If no userId is provided, try to get the current user
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id;
    }
    
    // If still no userId, we can't save stats
    if (!userId) {
      console.error("Cannot save match stats: No user ID provided");
      return { success: false, error: "No user ID provided" };
    }
    
    // Extract match statistics from game state
    const matchStats = calculateMatchStats(gameState, userId);
    
    // Determine the match type (practice or ranked)
    const matchType = (gameState as any).mode || 'practice';
    matchStats.mode = matchType as 'practice' | 'ranked';
    
    // 1. Save match history
    const { error: matchHistoryError } = await supabase
      .from('match_history')
      .insert({
        user_id: userId,
        opponent_id: (gameState as any).opponentId || null,
        match_type: matchType,
        result: matchStats.result,
        damage_dealt: matchStats.damageDealt,
        damage_received: matchStats.damageReceived,
        cards_defeated: matchStats.cardsDefeated,
        turns_played: matchStats.turnsPlayed,
        special_abilities_used: matchStats.specialAbilitiesUsed,
        started_at: new Date(gameState.events[0].timestamp).toISOString(),
        ended_at: new Date(gameState.lastUpdated).toISOString()
      });
    
    if (matchHistoryError) {
      console.error("Error saving match history:", matchHistoryError);
      return { success: false, error: matchHistoryError.message };
    }
    
    // 2. Update stats based on match type
    if (matchType === 'practice') {
      // Update practice stats in player_stats table
      await updatePracticeStats(supabase, userId, matchStats);
    } else {
      // Update ranked stats in ranked_stats table
      await updateRankedStats(supabase, userId, matchStats);
    }
    
    // 3. Update deck stats if deck IDs are available
    if (matchStats.player1DeckId) {
      await updateDeckStats(
        supabase, 
        matchStats.player1DeckId, 
        matchStats.result === 'win'
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error("Unexpected error in updateMatchStats:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Updates practice mode statistics
 */
async function updatePracticeStats(supabase: SupabaseClient, userId: string, matchStats: MatchStats) {
  // First, get current stats
  const { data: currentStats, error: statsError } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (statsError && statsError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error("Error fetching player stats:", statsError);
    throw new Error(statsError.message);
  }
  
  const now = new Date().toISOString();
  
  // Initialize with defaults if no current stats
  const stats: any = {
    user_id: userId,
    total_matches: (currentStats?.total_matches || 0) + 1,
    total_damage_dealt: (currentStats?.total_damage_dealt || 0) + matchStats.damageDealt,
    total_damage_received: (currentStats?.total_damage_received || 0) + matchStats.damageReceived,
    total_cards_defeated: (currentStats?.total_cards_defeated || 0) + matchStats.cardsDefeated,
    total_turns_played: (currentStats?.total_turns_played || 0) + matchStats.turnsPlayed,
    total_special_abilities_used: (currentStats?.total_special_abilities_used || 0) + matchStats.specialAbilitiesUsed,
    last_match_at: now,
    updated_at: now,
    mode: 'practice'
  };
  
  // Update win/loss/draw counts and streaks
  if (matchStats.result === 'win') {
    stats.wins = (currentStats?.wins || 0) + 1;
    stats.current_streak = (currentStats?.current_streak || 0) + 1;
    stats.longest_streak = Math.max(currentStats?.longest_streak || 0, stats.current_streak);
  } else if (matchStats.result === 'loss') {
    stats.losses = (currentStats?.losses || 0) + 1;
    stats.current_streak = 0;
  } else { // draw
    stats.draws = (currentStats?.draws || 0) + 1;
    // No change to streak for draws
  }
  
  // If this is the first record, set created_at
  if (!currentStats?.created_at) {
    stats.created_at = now;
  }
  
  // Update or insert player stats
  const { error: updateStatsError } = await supabase
    .from('player_stats')
    .upsert(stats);
  
  if (updateStatsError) {
    console.error("Error updating player stats:", updateStatsError);
    throw new Error(updateStatsError.message);
  }
}

/**
 * Updates ranked mode statistics
 */
async function updateRankedStats(supabase: SupabaseClient, userId: string, matchStats: MatchStats) {
  // First, get current player stats
  const { data: currentStats, error: statsError } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (statsError && statsError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error("Error fetching player stats:", statsError);
    throw new Error(statsError.message);
  }
  
  const now = new Date().toISOString();
  
  // Calculate rank change based on current rank tier
  const currentRankTier = currentStats?.rank_tier || 'Bronze';
  const rankChange = calculateRankChange(matchStats.result, currentRankTier);
  const currentRankPoints = currentStats?.rank_points || 500; // Default to 500 for new users
  const newRankPoints = Math.max(0, currentRankPoints + rankChange);
  const newRankTier = calculateRankTier(newRankPoints);
  
  // Initialize with defaults if no current stats
  const stats: any = {
    user_id: userId,
    total_matches: (currentStats?.total_matches || 0) + 1,
    total_damage_dealt: (currentStats?.total_damage_dealt || 0) + matchStats.damageDealt,
    total_damage_received: (currentStats?.total_damage_received || 0) + matchStats.damageReceived,
    total_cards_defeated: (currentStats?.total_cards_defeated || 0) + matchStats.cardsDefeated,
    total_turns_played: (currentStats?.total_turns_played || 0) + matchStats.turnsPlayed,
    total_special_abilities_used: (currentStats?.total_special_abilities_used || 0) + matchStats.specialAbilitiesUsed,
    rank_points: newRankPoints,
    rank_tier: newRankTier,
    last_match_at: now,
    updated_at: now
  };
  
  // Update win/loss/draw counts and streaks
  if (matchStats.result === 'win') {
    stats.wins = (currentStats?.wins || 0) + 1;
    stats.current_streak = (currentStats?.current_streak || 0) + 1;
    stats.longest_streak = Math.max(currentStats?.longest_streak || 0, stats.current_streak);
  } else if (matchStats.result === 'loss') {
    stats.losses = (currentStats?.losses || 0) + 1;
    stats.current_streak = 0;
  } else { // draw
    stats.draws = (currentStats?.draws || 0) + 1;
    // No change to streak for draws
  }
  
  // If this is the first record, set created_at
  if (!currentStats) {
    stats.created_at = now;
  }
  
  // Update or insert player stats
  const { error: updateStatsError } = await supabase
    .from('player_stats')
    .upsert(stats);
  
  if (updateStatsError) {
    console.error("Error updating player stats:", updateStatsError);
    throw new Error(updateStatsError.message);
  }
}

/**
 * Calculates match statistics from the game state
 */
function calculateMatchStats(gameState: GameState, userId: string): MatchStats {
  // For practice mode, we assume the user is player 1
  const isPlayer1 = true;
  
  // Determine the result (win, loss, draw)
  const result = gameState.winner === 'draw' 
    ? 'draw' 
    : (gameState.winner === 1 ? 'win' : 'loss') as 'win' | 'loss' | 'draw';
  
  // Count defeated cards
  const playerCards = isPlayer1 ? gameState.player1Cards : gameState.player2Cards;
  const opponentCards = isPlayer1 ? gameState.player2Cards : gameState.player1Cards;
  const cardsDefeated = opponentCards.filter(card => card.isDefeated).length;
  
  // Calculate damage dealt and received
  let damageDealt = 0;
  let damageReceived = 0;
  let specialAbilitiesUsed = 0;
  
  // Process events to calculate stats
  gameState.events.forEach(event => {
    if (event.type === 'attack') {
      const attackData = event.data as any;
      
      // Check if this is an attack by the player or opponent
      const isPlayerAttack = (isPlayer1 && event.turn % 2 === (gameState.player1GoesFirst ? 1 : 0)) ||
                            (!isPlayer1 && event.turn % 2 !== (gameState.player1GoesFirst ? 1 : 0));
      
      if (isPlayerAttack && attackData.defenderCard) {
        // Calculate damage dealt by player
        const startHealth = attackData.defenderCard.startHealth || attackData.defenderCard.health + attackData.damage;
        const endHealth = attackData.defenderCard.endHealth || attackData.defenderCard.health;
        damageDealt += Math.max(0, startHealth - endHealth);
      } else if (attackData.attackerCard) {
        // Calculate damage received by player
        const startHealth = attackData.attackerCard.startHealth || attackData.attackerCard.health + attackData.damage;
        const endHealth = attackData.attackerCard.endHealth || attackData.attackerCard.health;
        damageReceived += Math.max(0, startHealth - endHealth);
      }
    } else if (event.type === 'effect_triggered') {
      const effectData = event.data as any;
      
      // Check if this is an effect triggered by the player
      const isPlayerEffect = (isPlayer1 && effectData.sourcePlayer === 1) ||
                            (!isPlayer1 && effectData.sourcePlayer === 2);
      
      if (isPlayerEffect) {
        specialAbilitiesUsed++;
      }
    }
  });
  
  // Extract deck IDs if available in the game state
  const player1DeckId = (gameState as any).player1DeckId;
  const player2DeckId = (gameState as any).player2DeckId;
  const mode = (gameState as any).mode || 'practice';
  
  return {
    result,
    cardsDefeated,
    damageDealt,
    damageReceived,
    specialAbilitiesUsed,
    turnsPlayed: gameState.currentTurn,
    player1DeckId,
    player2DeckId,
    mode: mode as 'practice' | 'ranked'
  };
}

/**
 * Updates deck statistics after a match
 */
async function updateDeckStats(supabase: SupabaseClient, deckId: string, isWin: boolean) {
  try {
    // Get current deck stats
    const { data: deck, error: deckError } = await supabase
      .from('player_decks')
      .select('total_matches, wins, losses')
      .eq('id', deckId)
      .single();
    
    if (deckError) {
      console.error("Error fetching deck stats:", deckError);
      return;
    }
    
    // Update deck stats
    const { error: updateError } = await supabase
      .from('player_decks')
      .update({
        total_matches: (deck.total_matches || 0) + 1,
        wins: isWin ? (deck.wins || 0) + 1 : (deck.wins || 0),
        losses: !isWin ? (deck.losses || 0) + 1 : (deck.losses || 0),
        last_used_at: new Date().toISOString()
      })
      .eq('id', deckId);
    
    if (updateError) {
      console.error("Error updating deck stats:", updateError);
    }
  } catch (error) {
    console.error("Error in updateDeckStats:", error);
  }
}

/**
 * Calculates rank change for ranked mode based on current rank tier
 * Higher ranks get fewer points for wins and lose more points for losses
 */
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

/**
 * Calculates rank tier based on rank points
 */
function calculateRankTier(rankPoints: number): string {
  if (rankPoints < 1000) {
    return 'Bronze';
  } else if (rankPoints < 1500) {
    return 'Silver';
  } else if (rankPoints < 2000) {
    return 'Gold';
  } else if (rankPoints < 2500) {
    return 'Platinum';
  } else if (rankPoints < 3000) {
    return 'Diamond';
  } else {
    return 'Master';
  }
}

// For backward compatibility with existing code
export const saveMatchStats = updateMatchStats;
