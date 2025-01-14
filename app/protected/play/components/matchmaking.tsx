"use client";

import { useState, useEffect, useCallback } from "react";
import { GameCard, UiCard, convertToGameCard } from "@/app/protected/play/game-engine/types";
import { MatchmakingEntry, MatchmakingStatus, GameDeck, DeckWithCards, CardEffect } from "@/types/game.types";

interface GameStats {
  totalDamageDealt: number;
  cardsDefeated: number;
  turnsPlayed: number;
  specialAbilitiesUsed: number;
}

interface Opponent {
  id: string;
  name: string;
  deck: GameDeck;
}

function convertToGameDeck(deck: DeckWithCards): GameDeck {
  const gameCards = deck.cards.map(card => ({
    ...card,
    gameplay_effects: (card.special_effects ?? []).map(effect => ({
      name: effect.name,
      description: effect.description,
      effect_type: effect.effect_type,
      effect_icon: effect.effect_icon,
      value: effect.value ?? 0
    }))
  })) as GameCard[];

  return {
    id: deck.id,
    name: deck.name,
    description: deck.description ?? null,
    user_id: deck.user_id,
    created_at: deck.created_at ?? null,
    deck_type: deck.deck_type,
    is_active: deck.is_active ?? true,
    last_used_at: deck.last_used_at ?? null,
    losses: deck.losses ?? 0,
    template_id: deck.template_id ?? null,
    total_matches: deck.total_matches ?? 0,
    updated_at: deck.updated_at ?? null,
    wins: deck.wins ?? 0,
    cards: gameCards
  };
}

import { createClient } from "@/utils/supabase/client";
import {
  createQueueEntry,
  leaveQueue as leaveQueueAction,
} from "@/app/actions/matchmaking";
import { MatchmakingQueue } from "./matchmaking-queue";
import DeckSelector from "./deck-selector";
import GameSetup from "./game-setup";
import GamePlay from "./game-play";
import { RealtimeChannel } from "@supabase/supabase-js";

type MatchState = "selecting" | "queuing" | "setup" | "playing";

export default function Matchmaking() {
  const [matchState, setMatchState] = useState<MatchState>("selecting");
  const [selectedDeck, setSelectedDeck] = useState<GameDeck | null>(null);
  const [queueEntry, setQueueEntry] = useState<MatchmakingEntry | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [gameCards, setGameCards] = useState<{
    player1Cards: GameCard[];
    player2Cards: GameCard[];
  }>({
    player1Cards: [],
    player2Cards: [],
  });
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Handle joining the matchmaking queue
  const joinQueue = async () => {
    if (!selectedDeck) return;

    try {
      const entry = await createQueueEntry(selectedDeck.id);
      if (!entry) throw new Error("Failed to create queue entry");
      
      setQueueEntry(entry);
      setMatchState("queuing");
      startMatchmaking(entry);
    } catch (error) {
      console.error("Error joining queue:", error);
      setError("Failed to join queue");
    }
  };

  // Start listening for opponent
  const startMatchmaking = useCallback(async (entry: MatchmakingEntry) => {
    // Create and subscribe to a queue channel
    const queueChannel = supabase
      .channel(`queue:${entry.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = queueChannel.presenceState<{ user_id: string; online_at: string }>();
        console.log('Queue presence state:', state);
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matchmaking_queue",
          filter: `id=eq.${entry.id}`,
        },
        async (payload) => {
          const updatedEntry = payload.new as MatchmakingEntry;

          if (
            updatedEntry.status === "matched" &&
            updatedEntry.opponent_deck_id
          ) {
            // Fetch opponent's deck and user data
            const { data: opponentData, error: opponentError } = await supabase
              .from("player_decks")
              .select(
                `
                *,
                auth_user:user_id (
                  raw_user_meta_data
                )
              `
              )
              .eq("id", updatedEntry.opponent_deck_id)
              .single();

            if (opponentError || !opponentData) {
              console.error("Error fetching opponent:", opponentError);
              return;
            }

            // Update queue entry status to in_game
            await supabase
              .from("matchmaking_queue")
              .update({ status: "in_game" })
              .eq("id", entry.id);

            const opponentName =
              opponentData.auth_user?.raw_user_meta_data?.name ||
              opponentData.auth_user?.raw_user_meta_data?.full_name ||
              opponentData.auth_user?.raw_user_meta_data?.user_name ||
              "Opponent";

            setOpponent({
              id: opponentData.user_id,
              name: opponentName,
              deck: {
                ...opponentData,
                cards: [], // Cards will be loaded in GameSetup
              },
            });
            setMatchState("setup");

            // Create game channel
            const gameChannel = supabase.channel(`game:${entry.id}`)
              .on('broadcast', { event: 'game_state' }, ({ payload }) => {
                // Handle game state updates
                console.log('Game state update:', payload);
              })
              .on('broadcast', { event: 'game_end' }, ({ payload }) => {
                // Handle game end
                console.log('Game ended:', payload);
              });

            await gameChannel.subscribe();
            setChannel(gameChannel);
          }
        }
      );

    await queueChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await queueChannel.track({
          user_id: entry.user_id,
          online_at: new Date().toISOString(),
        });
      }
    });

    setChannel(queueChannel);

    // Cleanup function
    return () => {
      queueChannel.unsubscribe();
    };
  }, [supabase]);

  // Leave the queue
  const handleLeaveQueue = async () => {
    if (!queueEntry) return;

    try {
      await leaveQueueAction(queueEntry.id);
      setMatchState("selecting");
      setQueueEntry(null);
      channel?.unsubscribe();
      setChannel(null);
    } catch (error) {
      console.error("Error leaving queue:", error);
      setError("Failed to leave queue");
    }
  };

  const handleSetupComplete = (
    deck1Cards: UiCard[],
    deck2Cards: UiCard[],
    player1Ready: boolean,
    player2Ready: boolean
  ) => {
    if (player1Ready && player2Ready) {
      // Convert UI cards to game cards
      const gameCards1 = deck1Cards.map(convertToGameCard);
      const gameCards2 = deck2Cards.map(convertToGameCard);
      
      setGameCards({
        player1Cards: gameCards1,
        player2Cards: gameCards2,
      });
      setMatchState("playing");

      // Update game state in matchmaking queue
      if (queueEntry) {
        supabase
          .from("matchmaking_queue")
          .update({
            status: "in_game",
          })
          .eq("id", queueEntry.id)
          .then(({ error }) => {
            if (error) {
              console.error("Error updating game status:", error);
              setError("Failed to update game status");
            }
          });
      }
    }
  };

  const handleGameEnd = async (winner: 1 | 2 | "draw", stats: GameStats) => {
    if (!queueEntry) return;

    try {
      // Update matchmaking queue status
      await supabase
        .from("matchmaking_queue")
        .update({
          status: "completed",
        })
        .eq("id", queueEntry.id);

      // Clean up channel
      channel?.unsubscribe();
      setChannel(null);

      // Update player stats
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !opponent) return;

      // Get current player stats
      const { data: playerStats, error: statsError } = await supabase
        .from("player_profiles")
        .select("rank_points, total_matches, wins, losses")
        .eq("user_id", user.id)
        .single();

      if (statsError || !playerStats) throw statsError;

      // Calculate new stats
      const newStats = {
        total_matches: (playerStats.total_matches ?? 0) + 1,
        wins: (playerStats.wins ?? 0) + (winner === 1 ? 1 : 0),
        losses: (playerStats.losses ?? 0) + (winner === 2 ? 1 : 0),
        rank_points:
          (playerStats.rank_points ?? 1000) +
          (winner === 1 ? 25 : winner === 2 ? -20 : 0),
      };

      // Update player stats
      await supabase
        .from("player_profiles")
        .update(newStats)
        .eq("user_id", user.id);

      // Save match history
      await supabase.from("match_history").insert({
        user_id: user.id,
        opponent_id: opponent.id,
        match_type: "ranked",
        result: winner === 1 ? "win" : winner === 2 ? "loss" : "draw",
        damage_dealt: stats.totalDamageDealt,
        cards_defeated: stats.cardsDefeated,
        turns_played: stats.turnsPlayed,
        special_abilities_used: stats.specialAbilitiesUsed,
      });
    } catch (error) {
      console.error("Error handling game end:", error);
      setError("Failed to save game results");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (matchState === "queuing" && queueEntry) {
        handleLeaveQueue();
      }
      channel?.unsubscribe();
    };
  }, [matchState, queueEntry, channel]);

  if (error) {
    return (
      <div className="text-red-500 p-4 rounded-lg bg-red-100">
        Error: {error}
        <button
          onClick={() => setError(null)}
          className="ml-4 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (matchState === "selecting") {
    return (
      <div className="space-y-8">
        <DeckSelector
          label="Select Your Deck"
          selectedDeck={selectedDeck}
          onDeckSelect={(deck) => setSelectedDeck(convertToGameDeck(deck))}
        />

        <div className="flex justify-center">
          <button
            onClick={joinQueue}
            disabled={!selectedDeck}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            Find Opponent
          </button>
        </div>
      </div>
    );
  }

  if (matchState === "queuing") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Finding Match</h2>
          <p className="text-muted-foreground">
            Selected Deck: {selectedDeck?.name}
          </p>
        </div>

        <MatchmakingQueue />

        <div className="flex justify-center">
          <button
            onClick={handleLeaveQueue}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
          >
            Leave Queue
          </button>
        </div>
      </div>
    );
  }

  if (matchState === "setup" && opponent) {
    return (
      <GameSetup
        deck1={selectedDeck!}
        deck2={opponent.deck}
        onSetupComplete={handleSetupComplete}
        mode="ranked"
      />
    );
  }

  if (matchState === "playing") {
    return (
      <GamePlay
        player1Cards={gameCards.player1Cards}
        player2Cards={gameCards.player2Cards}
        player1DeckId={selectedDeck!.id}
        player2DeckId={opponent!.deck.id}
        onGameEnd={handleGameEnd}
        mode="ranked"
        isOnlineMatch={true}
        opponentId={opponent?.id}
      />
    );
  }

  return null;
}
