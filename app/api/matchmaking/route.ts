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
    console.log("Starting matchmaking request processing");
    
    // Get the authenticated user
    const supabase = await createClient();
    console.log("Supabase client created");
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Authentication error: " + authError.message }, { status: 401 });
    }
    
    if (!user) {
      console.error("No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log("User authenticated:", user.id);
    
    // Parse the request body
    let body;
    try {
      body = await request.json();
      console.log("Request body parsed:", body?.action);
      
      // Validate that the body has a valid action
      if (!body || (body.action !== "JOIN_QUEUE" && body.action !== "LEAVE_QUEUE" && body.action !== "CHECK_STATUS")) {
        console.error("Invalid action:", body?.action);
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    
    // Handle the request based on the action
    try {
      switch (body.action) {
        case "JOIN_QUEUE":
          console.log("Handling JOIN_QUEUE action");
          return await handleJoinQueue(body as JoinQueueRequest, user.id, supabase);
        
        case "LEAVE_QUEUE":
          console.log("Handling LEAVE_QUEUE action");
          return await handleLeaveQueue(body as LeaveQueueRequest, user.id, supabase);
        
        case "CHECK_STATUS":
          console.log("Handling CHECK_STATUS action");
          return await handleCheckStatus(body as CheckStatusRequest, user.id, supabase);
        
        default:
          console.error("Invalid action:", body.action);
          return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    } catch (actionError) {
      console.error(`Error handling ${body.action} action:`, actionError);
      return NextResponse.json(
        { error: `Error in ${body.action}: ${actionError instanceof Error ? actionError.message : "Unknown error"}` },
        { status: 500 }
      );
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
    console.log("Checking status for queue entry:", queueEntryId);
    
    // Get the queue entry
    const { data: entry, error: entryError } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("id", queueEntryId)
      .single();
    
    if (entryError || !entry) {
      console.error("Queue entry not found:", entryError);
      return NextResponse.json({ error: "Queue entry not found" }, { status: 404 });
    }
    
    console.log("Queue entry status:", entry.status, "opponent_deck_id:", entry.opponent_deck_id);
    
    // If the entry is matched, get the opponent's deck
    let opponent = null;
    if (entry.status === "matched" && entry.opponent_deck_id) {
      console.log("Entry is matched with opponent deck:", entry.opponent_deck_id);
      
      // Get the opponent deck details
      const { data: opponentDeck, error: opponentDeckError } = await supabase
        .from("player_decks")
        .select("*")
        .eq("id", entry.opponent_deck_id)
        .single();
      
      if (opponentDeckError) {
        console.error("Error fetching opponent deck:", opponentDeckError);
        return NextResponse.json({ error: "Failed to fetch opponent deck" }, { status: 500 });
      }
      
      console.log("Opponent deck user_id:", opponentDeck.user_id);
      
      // Check if this is a simulated opponent by checking the user_id
      const isSimulatedOpponent = opponentDeck.user_id === "00000000-0000-0000-0000-000000000000";
      
      if (isSimulatedOpponent) {
        console.log("This is a simulated opponent");
        
        // Get the player's rank to adjust the simulated opponent's rank
        const { data: playerRank, error: rankError } = await supabase
          .from("ranked_stats")
          .select("rank_points, rank_tier")
          .eq("user_id", userId)
          .single();
        
        // Set the simulated opponent's rank based on the player's rank
        let opponentRankPoints = 1000; // Default
        let opponentRankTier = "Bronze"; // Default
        
        if (!rankError && playerRank) {
          // Make the simulated opponent slightly lower ranked than the player
          opponentRankPoints = Math.max(500, playerRank.rank_points - 100);
          opponentRankTier = playerRank.rank_tier;
        }
        
        opponent = {
          id: opponentDeck.user_id,
          user_id: opponentDeck.user_id,
          name: "Simulated Opponent",
          deck: opponentDeck,
          rank: {
            rank_tier: opponentRankTier,
            rank_points: opponentRankPoints
          },
          isSimulated: true
        };
      } else {
        // Regular opponent - don't try to access auth.users directly
        console.log("Using default opponent name to avoid auth.users query");
        
        // Try to get user profile from player_profiles table
        let opponentName = "Opponent";
        try {
          const { data: profile, error: profileError } = await supabase
            .from("player_profiles")
            .select("display_name")
            .eq("user_id", opponentDeck.user_id)
            .maybeSingle();
          
          if (!profileError && profile) {
            opponentName = profile.display_name || "Opponent";
            console.log("Found opponent name from player_profiles:", opponentName);
          }
        } catch (profileErr) {
          console.log("Error accessing player_profiles:", profileErr);
        }
        
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

// Helper function to create a simulated deck with random cards of specific rarities
// Adjusted to take player rank into account
async function createSimulatedDeck(supabase: any, playerUserId: string) {
  try {
    // Get cards of different rarities - using the public cards that are viewable by everyone
    const { data: legendaryCards, error: legendaryError } = await supabase
      .from("cards")
      .select("*")
      .eq("is_active", true)
      .eq("rarity", "legendary")
      .order("created_at", { ascending: false })
      .limit(20);
    
    const { data: epicCards, error: epicError } = await supabase
      .from("cards")
      .select("*")
      .eq("is_active", true)
      .eq("rarity", "epic")
      .order("created_at", { ascending: false })
      .limit(50);
    
    const { data: rareCards, error: rareError } = await supabase
      .from("cards")
      .select("*")
      .eq("is_active", true)
      .eq("rarity", "rare")
      .order("created_at", { ascending: false })
      .limit(50);
    
    const { data: commonCards, error: commonError } = await supabase
      .from("cards")
      .select("*")
      .eq("is_active", true)
      .eq("rarity", "common")
      .order("created_at", { ascending: false })
      .limit(50);
    
    // If we don't have enough cards of a specific rarity, get random cards as fallback
    if ((!legendaryCards?.length && !epicCards?.length) || !rareCards?.length || !commonCards?.length) {
      console.log("Not enough cards of specific rarities, using random cards as fallback");
      const { data: randomCards, error: randomError } = await supabase
        .from("cards")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (randomError || !randomCards || randomCards.length === 0) {
        throw new Error("Failed to get random cards");
      }
      
      // Shuffle the cards and pick 5
      const shuffledCards = randomCards.sort(() => 0.5 - Math.random());
      const selectedCards = shuffledCards.slice(0, 5);
      return createDeckWithCards(supabase, selectedCards);
    }
    
    // Shuffle each rarity group
    const shuffledLegendary = legendaryCards?.sort(() => 0.5 - Math.random()) || [];
    const shuffledEpic = epicCards?.sort(() => 0.5 - Math.random()) || [];
    const shuffledRare = rareCards?.sort(() => 0.5 - Math.random()) || [];
    const shuffledCommon = commonCards?.sort(() => 0.5 - Math.random()) || [];
    
    // Select cards according to the desired distribution
    const selectedCards = [
      ...(shuffledLegendary.length > 0 ? shuffledLegendary.slice(0, 1) : []), // 1 legendary if available
      ...(shuffledEpic.length > 0 ? shuffledEpic.slice(0, 1) : []),           // 1 epic if available
      ...shuffledRare.slice(0, 2),                                            // 2 rare cards
      ...shuffledCommon.slice(0, 1)                                           // 1 common card
    ];
    
    // If we couldn't get enough cards, fill with random cards
    if (selectedCards.length < 5) {
      console.log(`Only got ${selectedCards.length} cards, filling with random cards`);
      const missingCount = 5 - selectedCards.length;
      const allCards = [...shuffledLegendary, ...shuffledEpic, ...shuffledRare, ...shuffledCommon];
      const shuffledAll = allCards.sort(() => 0.5 - Math.random());
      
      // Add random cards, avoiding duplicates
      const existingIds = selectedCards.map(card => card.id);
      for (const card of shuffledAll) {
        if (!existingIds.includes(card.id)) {
          selectedCards.push(card);
          existingIds.push(card.id);
          if (selectedCards.length >= 5) break;
        }
      }
    }
    
    return createDeckWithCards(supabase, selectedCards);
  } catch (error) {
    console.error("Error creating simulated deck:", error);
    throw error;
  }
}

// Helper function to create a deck with the selected cards
async function createDeckWithCards(supabase: any, selectedCards: any[]) {
  try {
    // Create a new deck for the simulated opponent
    const deckName = `Simulated Deck ${Date.now()}`;
    
    // Insert the deck with a consistent UUID for simulated opponents
    const { data: newDeck, error: deckError } = await supabase
      .from("player_decks")
      .insert({
        name: deckName,
        description: "A balanced deck with legendary, epic, rare, and common cards",
        user_id: "00000000-0000-0000-0000-000000000000", // Use the consistent UUID for simulated opponents
        deck_type: "standard",
        card_list: selectedCards.map((card: { id: string }) => ({ id: card.id })),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        wins: 0,
        losses: 0,
        total_matches: 0
      })
      .select()
      .single();
    
    if (deckError || !newDeck) {
      console.error("Failed to create simulated deck:", deckError);
      throw new Error("Failed to create simulated deck");
    }
    
    // Store information about the deck order for the simulated opponent
    const simulatedChoices = {
      bans: [], // Simulated opponent won't ban any cards
      order: [0, 1, 2, 3, 4].sort(() => 0.5 - Math.random()) // Random order
    };
    
    // Store the simulated choices in the database for later retrieval
    const { error: choicesError } = await supabase
      .from("simulated_opponent_choices")
      .insert({
        deck_id: newDeck.id,
        choices: simulatedChoices,
        created_at: new Date().toISOString()
      });
    
    if (choicesError) {
      console.warn("Failed to store simulated choices:", choicesError);
    }
    
    return newDeck;
  } catch (error) {
    console.error("Error creating deck with cards:", error);
    throw error;
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
    
    // Check if the player has been waiting for more than 30 seconds (reduced for testing)
    const waitingTime = Date.now() - new Date(currentEntry.joined_at).getTime();
    const hasWaitedTooLong = waitingTime > 30000; // 30 seconds for faster testing
    
    console.log(`Player waiting time: ${waitingTime}ms, hasWaitedTooLong: ${hasWaitedTooLong}`);
    
    // In development mode, prioritize matching with the simulated opponent
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      const { data: simulatedOpponents, error: simError } = await supabase
        .from("matchmaking_queue")
        .select("*")
        .eq("status", "waiting")
        .eq("user_id", "00000000-0000-0000-0000-000000000000") // Match with simulated opponent
        .limit(1);
      
      if (!simError && simulatedOpponents && simulatedOpponents.length > 0) {
        console.log("Found simulated opponent for testing");
        return { matched: true, opponent: simulatedOpponents[0] };
      }
    }
    
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
      
      // For simulated opponents, handle the matching directly instead of using the match_players function
      if (opponent.user_id === "00000000-0000-0000-0000-000000000000") {
        console.log("Matching with simulated opponent directly");
        
        // Update the current player's queue entry
        const { error: updateCurrentError } = await supabase
          .from("matchmaking_queue")
          .update({
            status: "matched",
            opponent_deck_id: opponent.deck_id
          })
          .eq("id", queueEntryId);
        
        if (updateCurrentError) {
          throw updateCurrentError;
        }
        
        // Update the simulated opponent's queue entry
        const { error: updateOpponentError } = await supabase
          .from("matchmaking_queue")
          .update({
            status: "matched",
            opponent_deck_id: currentEntry.deck_id
          })
          .eq("id", opponent.id);
        
        if (updateOpponentError) {
          throw updateOpponentError;
        }
      } else {
        // Start a transaction to update both players' queue entries
        const { error: updateError } = await supabase.rpc("match_players", {
          player1_id: queueEntryId,
          player2_id: opponent.id
        });
        
        if (updateError) {
          throw updateError;
        }
      }
      
      return { matched: true, opponent };
    }
    
    // If player has waited too long, create a simulated opponent regardless of other conditions
    if (hasWaitedTooLong) {
      console.log("Player has waited too long, creating simulated opponent");
      
      try {
        // Get the player's rank information to create an appropriate opponent
        const { data: playerRankData, error: rankError } = await supabase
          .from("ranked_stats")
          .select("rank_points, rank_tier")
          .eq("user_id", currentEntry.user_id)
          .single();
        
        // Use player's rank or default to 1000 points
        const playerRank = !rankError && playerRankData ? playerRankData : { rank_points: 1000, rank_tier: "Bronze" };
        console.log("Player rank for simulated opponent:", playerRank);
        
        // Create a simulated deck with cards appropriate for the player's rank
        const simulatedDeck = await createSimulatedDeck(supabase, currentEntry.user_id);
        console.log("Created simulated deck:", simulatedDeck.id);
        
        // Create a simulated opponent entry in the matchmaking queue
        // Use the player's rank to determine the simulated opponent's rank
        const simulatedRankPoints = Math.max(500, playerRank.rank_points - 100); // Slightly lower than player
        
        const { data: simulatedOpponent, error: simulatedError } = await supabase
          .from("matchmaking_queue")
          .insert({
            user_id: "00000000-0000-0000-0000-000000000000", // Use the consistent UUID for simulated opponents
            deck_id: simulatedDeck.id,
            status: "matched",
            opponent_deck_id: currentEntry.deck_id,
            rank_points: simulatedRankPoints,
            joined_at: new Date().toISOString(),
            is_simulated: true // Mark explicitly as simulated
          })
          .select()
          .single();
        
        if (simulatedError) {
          console.error("Error creating simulated opponent entry:", simulatedError);
          throw simulatedError;
        }
        
        console.log("Created simulated opponent entry:", simulatedOpponent.id);
        
        // Update the current player's queue entry to matched status
        const { error: updateError } = await supabase
          .from("matchmaking_queue")
          .update({
            status: "matched",
            opponent_deck_id: simulatedDeck.id
          })
          .eq("id", queueEntryId);
        
        if (updateError) {
          console.error("Error updating queue entry:", updateError);
          throw updateError;
        }
        
        console.log("Updated player queue entry to matched status");
        
        // Fetch the updated queue entry to confirm it was updated
        const { data: updatedEntry, error: fetchError } = await supabase
          .from("matchmaking_queue")
          .select("*")
          .eq("id", queueEntryId)
          .single();
        
        if (fetchError) {
          console.error("Error fetching updated queue entry:", fetchError);
        } else {
          console.log("Updated queue entry:", updatedEntry);
        }
        
        // Fetch the simulated deck to return with the opponent
        const { data: deckDetails, error: deckError } = await supabase
          .from("player_decks")
          .select("*")
          .eq("id", simulatedDeck.id)
          .single();
        
        if (deckError) {
          console.error("Error fetching deck details:", deckError);
        }
        
        // Return the simulated opponent with complete deck details
        // Use the player's rank to determine the simulated opponent's rank
        return { 
          matched: true, 
          opponent: {
            id: "00000000-0000-0000-0000-000000000000",
            user_id: "00000000-0000-0000-0000-000000000000",
            name: "Simulated Opponent",
            deck: deckDetails || simulatedDeck,
            rank: {
              rank_tier: playerRank.rank_tier,
              rank_points: simulatedRankPoints
            },
            isSimulated: true
          }
        };
      } catch (error) {
        console.error("Error creating simulated opponent:", error);
        throw error;
      }
    }
    
    return { matched: false };
  } catch (error) {
    console.error("Error in findOpponent:", error);
    throw error;
  }
}
