import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { MatchmakingEntry, MatchmakingStatus } from "@/types/game.types";

// Define the request types
interface JoinQueueRequest {
  action: "JOIN_QUEUE";
  payload: {
    deckId: string;
  };
}

interface LeaveQueueRequest {
  action: "LEAVE_QUEUE";
  payload: {
    queueEntryId: string;
  };
}

interface CheckStatusRequest {
  action: "CHECK_STATUS";
  payload: {
    queueEntryId: string;
  };
}

type MatchmakingRequest = JoinQueueRequest | LeaveQueueRequest | CheckStatusRequest;

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse the request body
    const body: MatchmakingRequest = await request.json();
    
    // Handle the request based on the action
    switch (body.action) {
      case "JOIN_QUEUE":
        return handleJoinQueue(body, user.id, supabase);
      
      case "LEAVE_QUEUE":
        return handleLeaveQueue(body, user.id, supabase);
      
      case "CHECK_STATUS":
        return handleCheckStatus(body, user.id, supabase);
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing matchmaking request:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Handler for joining the matchmaking queue
async function handleJoinQueue(request: JoinQueueRequest, userId: string, supabase: any) {
  try {
    const { deckId } = request.payload;
    
    // Validate the deck
    const { data: deck, error: deckError } = await supabase
      .from("player_decks")
      .select("*")
      .eq("id", deckId)
      .eq("user_id", userId)
      .single();
    
    if (deckError || !deck) {
      return NextResponse.json({ error: "Invalid deck" }, { status: 400 });
    }
    
    // Check if the user is already in queue
    const { data: existingEntry, error: existingError } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "waiting")
      .maybeSingle();
    
    if (existingEntry) {
      // User is already in queue, return the existing entry
      return NextResponse.json({
        queueEntry: existingEntry
      });
    }
    
// Get the user's rank points from ranked_stats
    const { data: rankedStats, error: rankedStatsError } = await supabase
      .from("ranked_stats")
      .select("rank_points, rank_tier")
      .eq("user_id", userId)
      .single();
    
    if (rankedStatsError) {
      console.warn("Error fetching ranked stats:", rankedStatsError);
      // If no ranked stats exist, create a new entry with default values
      if (rankedStatsError.code === 'PGRST116') {
        await supabase
          .from("ranked_stats")
          .insert({
            user_id: userId,
            rank_points: 1000,
            rank_tier: 'Bronze'
          });
      }
    }
    
    // Create a new queue entry
    const { data: entry, error: queueError } = await supabase
      .from("matchmaking_queue")
      .insert({
        user_id: userId,
        deck_id: deckId,
        status: "waiting" as MatchmakingStatus,
        rank_points: rankedStats?.rank_points || 1000,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (queueError) {
      return NextResponse.json({ error: queueError.message }, { status: 500 });
    }
    
    // Try to find an opponent
    const matchResult = await findOpponent(entry.id, supabase);
    
    // Return the queue entry
    return NextResponse.json({
      queueEntry: entry,
      matched: matchResult.matched,
      opponent: matchResult.matched ? matchResult.opponent : null
    });
  } catch (error) {
    console.error("Error joining queue:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to join queue" },
      { status: 500 }
    );
  }
}

// Handler for leaving the matchmaking queue
async function handleLeaveQueue(request: LeaveQueueRequest, userId: string, supabase: any) {
  try {
    const { queueEntryId } = request.payload;
    
    // Validate the queue entry
    const { data: entry, error: entryError } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("id", queueEntryId)
      .eq("user_id", userId)
      .single();
    
    if (entryError || !entry) {
      return NextResponse.json({ error: "Invalid queue entry" }, { status: 400 });
    }
    
    // Remove the queue entry
    const { error: deleteError } = await supabase
      .from("matchmaking_queue")
      .delete()
      .eq("id", queueEntryId);
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error("Error leaving queue:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to leave queue" },
      { status: 500 }
    );
  }
}

// Handler for checking the status of a queue entry
async function handleCheckStatus(request: CheckStatusRequest, userId: string, supabase: any) {
  try {
    const { queueEntryId } = request.payload;
    
    // Get the queue entry
    const { data: entry, error: entryError } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("id", queueEntryId)
      .single();
    
    if (entryError || !entry) {
      return NextResponse.json({ error: "Queue entry not found" }, { status: 404 });
    }
    
    // If the entry is matched, get the opponent's deck
    let opponent = null;
    if (entry.status === "matched" && entry.opponent_deck_id) {
      const { data: opponentDeck, error: opponentError } = await supabase
        .from("player_decks")
        .select(`
          *,
          auth_user:user_id (
            raw_user_meta_data
          )
        `)
        .eq("id", entry.opponent_deck_id)
        .single();
      
      if (!opponentError && opponentDeck) {
        const opponentName =
          opponentDeck.auth_user?.raw_user_meta_data?.name ||
          opponentDeck.auth_user?.raw_user_meta_data?.full_name ||
          opponentDeck.auth_user?.raw_user_meta_data?.user_name ||
          "Opponent";
        
        opponent = {
          id: opponentDeck.user_id,
          name: opponentName,
          deck: opponentDeck
        };
      }
    }
    
    return NextResponse.json({
      queueEntry: entry,
      opponent,
      matched: entry.status === "matched"
    });
  } catch (error) {
    console.error("Error checking status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check status" },
      { status: 500 }
    );
  }
}

// Helper function to find an opponent
async function findOpponent(queueEntryId: string, supabase: any) {
  try {
    // Get the current queue entry
    const { data: currentEntry, error: currentError } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("id", queueEntryId)
      .single();
    
    if (currentError || !currentEntry) {
      throw new Error("Queue entry not found");
    }
    
    // Get the player's rank points
    const playerRankPoints = currentEntry.rank_points || 1000;
    
    // Find opponents with similar rank (within 300 points)
    let { data: opponents, error: opponentError } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("status", "waiting")
      .neq("id", queueEntryId) // Don't match with self
      .gte("rank_points", playerRankPoints - 300) // Lower rank bound
      .lte("rank_points", playerRankPoints + 300) // Upper rank bound
      .order("joined_at", { ascending: true }) // Match with the player who's been waiting longest
      .limit(5); // Get a few potential opponents
    
    // If no opponents in the rank range, fall back to anyone waiting
    if (!opponents || opponents.length === 0) {
      const { data: anyOpponents, error: anyOpponentError } = await supabase
        .from("matchmaking_queue")
        .select("*")
        .eq("status", "waiting")
        .neq("id", queueEntryId) // Don't match with self
        .order("joined_at", { ascending: true }) // Match with the player who's been waiting longest
        .limit(1);
      
      if (anyOpponentError) {
        throw anyOpponentError;
      }
      
      if (anyOpponents && anyOpponents.length > 0) {
        opponents = anyOpponents;
      }
    }
    
    if (opponentError) {
      throw opponentError;
    }
    
    if (opponents && opponents.length > 0) {
      const opponent = opponents[0];
      
      // Start a transaction to update both players' queue entries
      const { error: updateError } = await supabase.rpc("match_players", {
        player1_id: queueEntryId,
        player2_id: opponent.id
      });
      
      if (updateError) {
        throw updateError;
      }
      
      return { matched: true, opponent };
    }
    
    return { matched: false };
  } catch (error) {
    console.error("Error in findOpponent:", error);
    throw error;
  }
}
