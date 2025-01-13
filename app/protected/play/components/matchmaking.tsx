"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Deck,
  MatchmakingEntry,
  MatchmakingStatus,
} from "@/types/game.types";
import { createClient } from "@/utils/supabase/client";
import {
  createQueueEntry,
  leaveQueue as leaveQueueAction,
} from "@/app/actions/matchmaking";
import { MatchmakingQueue } from "./matchmaking-queue";
import DeckSelector from "./deck-selector";
import GameSetup from "./game-setup";
import GamePlay from "./game-play";

type MatchState = "selecting" | "queuing" | "setup" | "playing";

export default function Matchmaking() {
  const [matchState, setMatchState] = useState<MatchState>("selecting");
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [queueEntry, setQueueEntry] = useState<MatchmakingEntry | null>(null);
  const [opponent, setOpponent] = useState<{
    id: string;
    name: string;
    deck: Deck;
  } | null>(null);
  const [gameCards, setGameCards] = useState<{
    player1Cards: Card[];
    player2Cards: Card[];
  }>({
    player1Cards: [],
    player2Cards: [],
  });

  const supabase = createClient();

  // Handle joining the matchmaking queue
  const joinQueue = async () => {
    if (!selectedDeck) return;

    try {
      const entry = await createQueueEntry(selectedDeck.id);
      setQueueEntry(entry);
      setMatchState("queuing");
      startMatchmaking(entry);
    } catch (error) {
      console.error("Error joining queue:", error);
    }
  };

  // Start listening for opponent
  const startMatchmaking = async (entry: MatchmakingEntry) => {
    // Listen for changes to the matchmaking queue
    const channel = supabase
      .channel("matchmaking")
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

            if (opponentError) {
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
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      channel.unsubscribe();
    };
  };

  // Leave the queue
  const handleLeaveQueue = async () => {
    if (!queueEntry) return;

    try {
      await leaveQueueAction(queueEntry.id);
      setMatchState("selecting");
      setQueueEntry(null);
    } catch (error) {
      console.error("Error leaving queue:", error);
    }
  };

  const handleSetupComplete = (
    deck1Cards: Card[],
    deck2Cards: Card[],
    player1Ready: boolean,
    player2Ready: boolean
  ) => {
    if (player1Ready && player2Ready) {
      setGameCards({
        player1Cards: deck1Cards,
        player2Cards: deck2Cards,
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
            if (error) console.error("Error updating game status:", error);
          });
      }
    }
  };

  const handleGameEnd = async (winner: 1 | 2 | "draw") => {
    if (!queueEntry) return;

    try {
      // Update matchmaking queue status
      await supabase
        .from("matchmaking_queue")
        .update({
          status: "completed",
        })
        .eq("id", queueEntry.id);

      // TODO: Update player stats
      // TODO: Handle game end UI/UX
      console.log("Game ended with winner:", winner);
    } catch (error) {
      console.error("Error handling game end:", error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (matchState === "queuing" && queueEntry) {
        handleLeaveQueue();
      }
    };
  }, [matchState, queueEntry]);

  if (matchState === "selecting") {
    return (
      <div className="space-y-8">
        <DeckSelector
          label="Select Your Deck"
          selectedDeck={selectedDeck}
          onDeckSelect={setSelectedDeck}
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
        isPracticeMode={false}
      />
    );
  }

  if (matchState === "playing") {
    return (
      <GamePlay
        player1Cards={gameCards.player1Cards}
        player2Cards={gameCards.player2Cards}
        onGameEnd={handleGameEnd}
      />
    );
  }

  return null;
}
