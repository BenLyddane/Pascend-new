'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { MatchmakingEntry, MatchmakingStatus } from '@/types/game.types'

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
    // Get the user's rank points from their profile
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: profile, error: profileError } = await supabase
      .from('player_profiles')
      .select('rank_points')
      .eq('user_id', user.id)
      .single()

    if (profileError) throw profileError

    // Create the queue entry
    const { data: entry, error: queueError } = await supabase
      .from('matchmaking_queue')
      .insert({
        user_id: user.id,
        deck_id: deckId,
        status: 'waiting' as MatchmakingStatus,
        rank_points: profile?.rank_points || 1000,
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
