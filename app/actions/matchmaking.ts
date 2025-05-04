'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { MatchmakingEntry, MatchmakingStatus } from '@/types/game.types'
import { CardWithEffects } from './fetchDecks'

// Find a suitable opponent in the matchmaking queue
export async function findOpponent(queueEntryId: string) {
  const supabase = await createClient()

  try {
    // Get the current queue entry
    const { data: currentEntry, error: currentError } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('id', queueEntryId)
      .single()

    if (currentError) throw currentError
    if (!currentEntry) throw new Error('Queue entry not found')

    // Find a suitable opponent
    // For now, just find anyone who's waiting, but in the future we can add rank-based matchmaking
    const { data: opponents, error: opponentError } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('status', 'waiting')
      .neq('id', queueEntryId) // Don't match with self
      .order('joined_at', { ascending: true }) // Match with the player who's been waiting longest
      .limit(1)

    if (opponentError) throw opponentError

    if (opponents && opponents.length > 0) {
      const opponent = opponents[0]

      // Start a transaction to update both players' queue entries
      const { error: updateError } = await supabase.rpc('match_players', {
        player1_id: queueEntryId,
        player2_id: opponent.id
      })

      if (updateError) throw updateError

      return { matched: true, opponent }
    }

    return { matched: false }
  } catch (error) {
    console.error('Error in findOpponent:', error)
    throw error
  }
}

// Create a new matchmaking queue entry
export async function createQueueEntry(deckId: string) {
  const supabase = await createClient()

  try {
    // Get the user's rank points from their ranked_stats
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get rank points from ranked_stats
    const { data: rankedStats, error: statsError } = await supabase
      .from('ranked_stats')
      .select('rank_points, rank_tier')
      .eq('user_id', user.id)
      .single()

    // If no stats found or error, create default stats with 1000 points
    if (statsError && statsError.code === 'PGRST116') {
      // Create default stats for new user
      const { error: createError } = await supabase
        .from('ranked_stats')
        .insert({
          user_id: user.id,
          rank_points: 1000,
          rank_tier: 'Bronze',
          wins: 0,
          losses: 0,
          draws: 0,
          total_matches: 0,
          current_streak: 0
        })
      
      if (createError) throw createError
    } else if (statsError) {
      throw statsError
    }

    // Create the queue entry
    const { data: entry, error: queueError } = await supabase
      .from('matchmaking_queue')
      .insert({
        user_id: user.id,
        deck_id: deckId,
        status: 'waiting' as MatchmakingStatus,
        rank_points: rankedStats?.rank_points || 1000,
        joined_at: new Date().toISOString()
      })
      .select()
      .single()

    if (queueError) throw queueError

    return entry
  } catch (error) {
    console.error('Error in createQueueEntry:', error)
    throw error
  }
}

// Update the status of a queue entry
export async function updateQueueStatus(
  queueEntryId: string,
  status: MatchmakingStatus
) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('matchmaking_queue')
      .update({ status })
      .eq('id', queueEntryId)

    if (error) throw error
  } catch (error) {
    console.error('Error in updateQueueStatus:', error)
    throw error
  }
}

// Remove a player from the queue
export async function leaveQueue(queueEntryId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('id', queueEntryId)

    if (error) throw error
  } catch (error) {
    console.error('Error in leaveQueue:', error)
    throw error
  }
}

// Create a simulated opponent deck with cards of different rarities
export async function createSimulatedOpponent(playerDeckId: string) {
  const supabase = await createClient()

  try {
    console.log("Creating simulated opponent for deck:", playerDeckId)
    
    // Get the player's deck to match against
    const { data: playerDeck, error: deckError } = await supabase
      .from('player_decks')
      .select('*')
      .eq('id', playerDeckId)
      .single()
    
    if (deckError) {
      console.error("Error fetching player deck:", deckError)
      throw new Error("Failed to fetch player deck")
    }
    
    // Get cards of different rarities
    const { data: legendaryCards, error: legendaryError } = await supabase
      .from('cards')
      .select('*')
      .eq('is_active', true)
      .eq('rarity', 'legendary')
      .order('created_at', { ascending: false })
      .limit(20)
    
    const { data: epicCards, error: epicError } = await supabase
      .from('cards')
      .select('*')
      .eq('is_active', true)
      .eq('rarity', 'epic')
      .order('created_at', { ascending: false })
      .limit(50)
    
    const { data: rareCards, error: rareError } = await supabase
      .from('cards')
      .select('*')
      .eq('is_active', true)
      .eq('rarity', 'rare')
      .order('created_at', { ascending: false })
      .limit(50)
    
    const { data: commonCards, error: commonError } = await supabase
      .from('cards')
      .select('*')
      .eq('is_active', true)
      .eq('rarity', 'common')
      .order('created_at', { ascending: false })
      .limit(50)
    
    // If we don't have enough cards of a specific rarity, get random cards as fallback
    if ((!legendaryCards?.length && !epicCards?.length) || !rareCards?.length || !commonCards?.length) {
      console.log("Not enough cards of specific rarities, using random cards as fallback")
      const { data: randomCards, error: randomError } = await supabase
        .from('cards')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (randomError || !randomCards || randomCards.length === 0) {
        throw new Error("Failed to get random cards")
      }
      
      // Shuffle the cards and pick 5
      const shuffledCards = randomCards.sort(() => 0.5 - Math.random())
      const selectedCards = shuffledCards.slice(0, 5)
      
      // Create a deck with these cards
      return createSimulatedDeck(supabase, selectedCards, playerDeck.user_id)
    }
    
    // Shuffle each rarity group
    const shuffledLegendary = legendaryCards?.sort(() => 0.5 - Math.random()) || []
    const shuffledEpic = epicCards?.sort(() => 0.5 - Math.random()) || []
    const shuffledRare = rareCards?.sort(() => 0.5 - Math.random()) || []
    const shuffledCommon = commonCards?.sort(() => 0.5 - Math.random()) || []
    
    // Select cards according to the desired distribution
    const selectedCards = [
      ...(shuffledLegendary.length > 0 ? shuffledLegendary.slice(0, 1) : []), // 1 legendary if available
      ...(shuffledEpic.length > 0 ? shuffledEpic.slice(0, 1) : []),           // 1 epic if available
      ...shuffledRare.slice(0, 2),                                            // 2 rare cards
      ...shuffledCommon.slice(0, 1)                                           // 1 common card
    ]
    
    // If we couldn't get enough cards, fill with random cards
    if (selectedCards.length < 5) {
      console.log(`Only got ${selectedCards.length} cards, filling with random cards`)
      const allCards = [...shuffledLegendary, ...shuffledEpic, ...shuffledRare, ...shuffledCommon]
      const shuffledAll = allCards.sort(() => 0.5 - Math.random())
      
      // Add random cards, avoiding duplicates
      const existingIds = selectedCards.map(card => card.id)
      for (const card of shuffledAll) {
        if (!existingIds.includes(card.id)) {
          selectedCards.push(card)
          existingIds.push(card.id)
          if (selectedCards.length >= 5) break
        }
      }
    }
    
    // Create a deck with these cards
    return createSimulatedDeck(supabase, selectedCards, playerDeck.user_id)
  } catch (error) {
    console.error("Error creating simulated opponent:", error)
    throw error
  }
}

// Helper function to create a simulated deck with the selected cards
async function createSimulatedDeck(supabase: any, selectedCards: any[], playerUserId: string) {
  try {
    // Create a new deck for the simulated opponent
    const deckName = `Simulated Deck ${Date.now()}`
    
    console.log("Creating simulated deck with name:", deckName)
    
    // Insert the deck into the simulated_decks table
    const deckData = {
      name: deckName,
      description: 'A balanced deck with legendary, epic, rare, and common cards',
      card_list: selectedCards.map((card: { id: string }) => ({ id: card.id })),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log("Attempting to create simulated deck with data:", deckData)
    
    // Create the deck in the simulated_decks table
    const { data: simulatedDeck, error: deckError } = await supabase
      .from('simulated_decks')
      .insert(deckData)
      .select()
      .single()
    
    if (deckError || !simulatedDeck) {
      console.error("Failed to create simulated deck:", deckError)
      throw new Error(`Failed to create simulated deck: ${deckError?.message || 'Unknown error'}`)
    }
    
    console.log("Successfully created simulated deck with ID:", simulatedDeck.id)
    
    // Store information about the deck order for the simulated opponent
    const simulatedChoices = {
      bans: [], // Simulated opponent won't ban any cards
      order: [0, 1, 2, 3, 4].sort(() => 0.5 - Math.random()) // Random order
    }
    
    // Store the simulated choices in the database for later retrieval
    const { error: choicesError } = await supabase
      .from('simulated_choices')
      .insert({
        deck_id: simulatedDeck.id,
        choices: simulatedChoices,
        created_at: new Date().toISOString()
      })
    
    if (choicesError) {
      console.warn("Failed to store simulated choices:", choicesError)
    }
    
    // For simulated opponents, we don't need to create a queue entry
    // Instead, we'll directly return the simulated deck and let the client handle it
    console.log("Skipping queue entry creation for simulated opponent")
    
    // Generate a fake queue entry ID
    const queueEntryId = `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    
    // Return the deck with cards
    return {
      ...simulatedDeck,
      cards: selectedCards,
      queueEntryId: queueEntryId,
      isSimulated: true // Add a flag to indicate this is a simulated opponent
    }
  } catch (error) {
    console.error("Error creating simulated deck:", error)
    throw error
  }
}
