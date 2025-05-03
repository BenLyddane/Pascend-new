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
}

/**
 * Saves match statistics to the database after a game is completed
 * This includes:
 * 1. Recording the match in match_history
 * 2. Updating player_stats with cumulative statistics
 * 3. Updating player_decks with win/loss records
 */
export async function updateMatchStats(
  gameState: GameState,
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
    
    // 1. Save match history
    const { error: matchHistoryError } = await supabase
      .from('match_history')
      .insert({
        user_id: userId,
        opponent_id: null, // For practice mode, there's no real opponent
        match_type: 'practice',
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
    
    // 2. Update player stats
    // First, get current stats
    const { data: currentStats, error: statsError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (statsError && statsError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("Error fetching player stats:", statsError);
      return { success: false, error: statsError.message };
    }
    
    // Calculate new stats
    const newStats = calculateNewPlayerStats(currentStats || { user_id: userId }, matchStats);
    
    // Update or insert player stats
    const { error: updateStatsError } = await supabase
      .from('player_stats')
      .upsert(newStats);
    
    if (updateStatsError) {
      console.error("Error updating player stats:", updateStatsError);
      return { success: false, error: updateStatsError.message };
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
  // Note: This assumes the game state has these properties, which may need to be added
  const player1DeckId = (gameState as any).player1DeckId;
  const player2DeckId = (gameState as any).player2DeckId;
  
  return {
    result,
    cardsDefeated,
    damageDealt,
    damageReceived,
    specialAbilitiesUsed,
    turnsPlayed: gameState.currentTurn,
    player1DeckId,
    player2DeckId
  };
}

/**
 * Calculates new player stats based on current stats and match results
 */
function calculateNewPlayerStats(currentStats: any, matchStats: MatchStats): PlayerStats {
  const now = new Date().toISOString();
  
  // Initialize with defaults if no current stats
  const stats: PlayerStats = {
    user_id: currentStats.user_id,
    total_matches: (currentStats.total_matches || 0) + 1,
    total_damage_dealt: (currentStats.total_damage_dealt || 0) + matchStats.damageDealt,
    total_damage_received: (currentStats.total_damage_received || 0) + matchStats.damageReceived,
    total_cards_defeated: (currentStats.total_cards_defeated || 0) + matchStats.cardsDefeated,
    total_turns_played: (currentStats.total_turns_played || 0) + matchStats.turnsPlayed,
    total_special_abilities_used: (currentStats.total_special_abilities_used || 0) + matchStats.specialAbilitiesUsed,
    last_match_at: now,
    updated_at: now
  };
  
  // Update win/loss/draw counts and streaks
  if (matchStats.result === 'win') {
    stats.wins = (currentStats.wins || 0) + 1;
    stats.current_streak = (currentStats.current_streak || 0) + 1;
    stats.longest_streak = Math.max(currentStats.longest_streak || 0, stats.current_streak || 0);
    
    // Update rank points (simple implementation - can be made more complex)
    stats.rank_points = (currentStats.rank_points || 0) + 10;
  } else if (matchStats.result === 'loss') {
    stats.losses = (currentStats.losses || 0) + 1;
    stats.current_streak = 0;
    
    // Decrease rank points, but don't go below 0
    stats.rank_points = Math.max(0, (currentStats.rank_points || 0) - 5);
  } else { // draw
    stats.draws = (currentStats.draws || 0) + 1;
    // No change to streak for draws
    
    // Small increase in rank points for draws
    stats.rank_points = (currentStats.rank_points || 0) + 2;
  }
  
  // Set rank tier based on rank points
  stats.rank_tier = calculateRankTier(stats.rank_points || 0);
  
  // If this is the first record, set created_at
  if (!currentStats.created_at) {
    stats.created_at = now;
  }
  
  return stats;
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
 * Calculates rank tier based on rank points
 */
function calculateRankTier(rankPoints: number | undefined): string {
  if (rankPoints === undefined) return 'Bronze';
  if (rankPoints < 100) return 'Bronze';
  if (rankPoints < 300) return 'Silver';
  if (rankPoints < 600) return 'Gold';
  if (rankPoints < 1000) return 'Platinum';
  if (rankPoints < 1500) return 'Diamond';
  return 'Mythic';
}

// For backward compatibility with existing code
export const saveMatchStats = updateMatchStats;
