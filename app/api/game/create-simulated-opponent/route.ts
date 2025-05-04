import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { CardWithEffects } from "@/app/actions/fetchDecks";

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
    const { playerDeckId } = body;
    
    if (!playerDeckId) {
      return NextResponse.json({ error: "Player deck ID is required" }, { status: 400 });
    }
    
    try {
      console.log("Creating simulated opponent for player:", user.id);
      
      try {
        // Create a simulated deck with cards of different rarities
        const simulatedDeck = await createSimulatedDeck(supabase);
        
        // Return the simulated deck with cards
        return NextResponse.json({
          success: true,
          deck: simulatedDeck
        });
      } catch (error) {
        console.error("Detailed error creating simulated deck:", error);
        return NextResponse.json({ 
          error: error instanceof Error ? error.message : "Failed to create simulated deck",
          details: error instanceof Error ? error.stack : "No stack trace available"
        }, { status: 500 });
      }
    } catch (error) {
      console.error("Error in try-catch block:", error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : "Failed to create simulated deck" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error creating simulated opponent:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to create a simulated deck with random cards of specific rarities
async function createSimulatedDeck(supabase: any) {
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
    
    // Return the deck with cards
    const result = {
      ...newDeck,
      cards: selectedCards
    };
    
    return result;
  } catch (error) {
    console.error("Error creating deck with cards:", error);
    throw error;
  }
}
