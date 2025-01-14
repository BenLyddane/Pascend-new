"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Card, GameCard, convertToGameCard } from "@/app/protected/play/game-engine/types";
import { Database } from "@/types/database.types";

type Deck = Database["public"]["Tables"]["player_decks"]["Row"] & {
  cards: Card[];
};

type MatchmakingStatus = "waiting" | "matched" | "completed";
type MatchmakingEntry =
  Database["public"]["Tables"]["matchmaking_queue"]["Row"];
import { createClient } from "@/utils/supabase/client";
import DeckSelector from "./deck-selector";
import GameSetup from "./game-setup";
import GamePlay from "./game-play";

type MatchState = "selecting" | "queuing" | "setup" | "playing";

// Helper function to parse card list
const parseCardList = (
  cardList: Database["public"]["Tables"]["player_decks"]["Row"]["card_list"]
): Card[] => {
  if (!cardList) return [];
  try {
    if (typeof cardList === "string") {
      return JSON.parse(cardList) as Card[];
    }
    if (Array.isArray(cardList)) {
      return cardList as unknown as Card[];
    }
    return [];
  } catch (e) {
    console.error("Error parsing card list:", e);
    return [];
  }
};

export default function TestMatchmaking() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [matchState, setMatchState] = useState<MatchState>("selecting");
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [queueEntry, setQueueEntry] = useState<MatchmakingEntry | null>(null);
  const [opponent, setOpponent] = useState<{
    id: string;
    name: string;
    deck: Deck;
  } | null>(null);
  const [gameCards, setGameCards] = useState<{
    player1Cards: GameCard[];
    player2Cards: GameCard[];
  }>({
    player1Cards: [],
    player2Cards: [],
  });

  const supabase = createClient();

  // Simulate joining the matchmaking queue
  const joinQueue = async () => {
    if (!selectedDeck) return;

    try {
      // Create a test queue entry
      const { data: entry, error: queueError } = await supabase
        .from("matchmaking_queue")
        .insert({
          deck_id: selectedDeck.id,
          status: "waiting" as MatchmakingStatus,
          rank_points: 1000,
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (queueError) throw queueError;

      setQueueEntry(entry);
      setMatchState("queuing");

      // Simulate finding an opponent after a short delay
      setTimeout(simulateOpponentFound, 3000);
    } catch (error) {
      console.error("Error joining test queue:", error);
    }
  };

  // Simulate finding an opponent
  const simulateOpponentFound = async () => {
    if (!queueEntry) return;

    try {
      // Get a random deck from the user's collection to use as opponent
      const { data: opponentDeck, error: deckError } = await supabase
        .from("player_decks")
        .select("*")
        .neq("id", queueEntry.deck_id)
        .limit(1)
        .single();

      if (deckError) throw deckError;

      // Update queue entry status
      await supabase
        .from("matchmaking_queue")
        .update({
          status: "matched",
          opponent_deck_id: opponentDeck.id,
        })
        .eq("id", queueEntry.id);

      // Add cards array to opponent deck
      const deckWithCards: Deck = {
        ...opponentDeck,
        cards: parseCardList(opponentDeck.card_list),
      };

      setOpponent({
        id: "test-opponent",
        name: "Test Opponent",
        deck: deckWithCards,
      });
      setMatchState("setup");
    } catch (error) {
      console.error("Error simulating opponent:", error);
    }
  };

  const handleSetupComplete = (
    deck1Cards: Card[],
    deck2Cards: Card[],
    player1Ready: boolean,
    player2Ready: boolean
  ) => {
    if (player1Ready) {
      // Simulate opponent being ready after a short delay
      setTimeout(() => {
      // Convert UI cards to game cards
      const gameCards1 = deck1Cards.map((card) => {
        const gameCard = convertToGameCard(card);
        console.log("Converted Player 1 Card:", {
          name: gameCard.name,
          gameplay_effects: gameCard.gameplay_effects,
          special_effects: gameCard.special_effects,
        });
        return gameCard;
      });
      const gameCards2 = deck2Cards.map((card) => {
        const gameCard = convertToGameCard(card);
        console.log("Converted Player 2 Card:", {
          name: gameCard.name,
          gameplay_effects: gameCard.gameplay_effects,
          special_effects: gameCard.special_effects,
        });
        return gameCard;
      });

      setGameCards({
        player1Cards: gameCards1,
        player2Cards: gameCards2,
      });
        setMatchState("playing");
      }, 1000);
    }
  };

  const handleReturnToMatchmaking = () => {
    setMatchState("selecting");
    setSelectedDeck(null);
    setQueueEntry(null);
    setOpponent(null);
    setGameCards({
      player1Cards: [],
      player2Cards: [],
    });
  };

  const handleGameEnd = async (winner: 1 | 2 | "draw", stats: any) => {
    if (!queueEntry) return;

    try {
      // Update matchmaking queue status
      await supabase
        .from("matchmaking_queue")
        .update({
          status: "completed",
        })
        .eq("id", queueEntry.id);

      // Save match stats as this is treated like a real match
      // This helps test the stats tracking system
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get current player stats
      const { data: playerStats, error: statsError } = await supabase
        .from("player_profiles")
        .select("rank_points, total_matches, wins, losses")
        .eq("user_id", user.id)
        .single();

      if (statsError) throw statsError;

      // Calculate new stats
      const newStats = {
        total_matches: (playerStats?.total_matches || 0) + 1,
        wins: (playerStats?.wins || 0) + (winner === 1 ? 1 : 0),
        losses: (playerStats?.losses || 0) + (winner === 2 ? 1 : 0),
        rank_points:
          (playerStats?.rank_points || 1000) +
          (winner === 1 ? 25 : winner === 2 ? -20 : 0), // Draw
      };

      // Update player stats
      await supabase
        .from("player_profiles")
        .update(newStats)
        .eq("user_id", user.id);

      // Save match history
      await supabase.from("match_history").insert({
        user_id: user.id,
        match_type: "test_ranked",
        result: winner === 1 ? "win" : winner === 2 ? "loss" : "draw",
        damage_dealt: stats.totalDamageDealt,
        cards_defeated: stats.cardsDefeated,
        turns_played: stats.turnsPlayed,
        special_abilities_used: stats.specialAbilitiesUsed,
      });
    } catch (error) {
      console.error("Error handling test game end:", error);
    }
  };

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id === "a0b2c7cb-bc5a-42c9-9c8a-35b1b4dda0a8") {
        setIsAdmin(true);
      }
    };
    checkAdminStatus();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (matchState === "queuing" && queueEntry) {
        supabase
          .from("matchmaking_queue")
          .delete()
          .eq("id", queueEntry.id)
          .then(({ error }) => {
            if (error) console.error("Error cleaning up test queue:", error);
          });
      }
    };
  }, [matchState, queueEntry]);

  if (!isAdmin) {
    return null;
  }

  if (matchState === "selecting") {
    return (
      <div className="space-y-8">
        <div className="bg-card p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold mb-2">Test Mode</h3>
          <p className="text-muted-foreground">
            This mode simulates matchmaking by using one of your other decks as
            an opponent. Stats are still tracked but matches are marked as test
            matches.
          </p>
        </div>

        <DeckSelector
          label="Select Your Deck"
          selectedDeck={selectedDeck}
          onDeckSelect={(deck) => {
            // Add cards array when setting selected deck
            setSelectedDeck({
              ...deck,
              cards: parseCardList(deck.card_list),
            });
          }}
        />

        <div className="flex justify-center">
          <button
            onClick={joinQueue}
            disabled={!selectedDeck}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            Start Test Match
          </button>
        </div>
      </div>
    );
  }

  if (matchState === "queuing") {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <p>Simulating matchmaking...</p>
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
        isOnlineMatch={true} // Treat as online match to test stats
        onReturnToMatchmaking={handleReturnToMatchmaking}
      />
    );
  }

  return null;
}
