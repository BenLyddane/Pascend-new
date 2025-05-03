"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DeckWithCards, CardWithEffects } from "@/app/actions/fetchDecks";
import { Database } from "@/types/database.types";
import SimpleDeckSelector from "./simple-deck-selector";
import { MultiplayerGameSetupManager } from "./game-setup/MultiplayerGameSetupManager";
import GamePlay from "./game-play";
import { MatchmakingQueue } from "./matchmaking-queue";
import { createClient } from "@/utils/supabase/client";
import { GameCard, convertToGameCard } from "../game-engine/types";
import { RankBadge } from "@/components/rank-badge";

// Define the Deck type to match what MultiplayerGameSetupManager expects
type Deck = Database["public"]["Tables"]["player_decks"]["Row"] & {
  cards: CardWithEffects[];
  card_list?: any; // Add this to satisfy the type requirement
};

type MatchmakingState = 
  | "selecting" // Selecting a deck
  | "queuing"   // In matchmaking queue
  | "setup"     // Setting up the game (banning/reordering)
  | "playing"   // Playing the game
  | "completed" // Game completed

export default function MultiplayerMode() {
  const [matchmakingState, setMatchmakingState] = useState<MatchmakingState>("selecting");
  const [selectedDeck, setSelectedDeck] = useState<DeckWithCards | null>(null);
  const [queueEntryId, setQueueEntryId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [playerRank, setPlayerRank] = useState<{
    rank_points: number;
    rank_tier: string;
  } | null>(null);
  const [gameCards, setGameCards] = useState<{
    player1Cards: CardWithEffects[];
    player2Cards: CardWithEffects[];
  }>({
    player1Cards: [],
    player2Cards: [],
  });
  
  const router = useRouter();
  const supabase = createClient();
  
  // Fetch player's rank when component mounts
  useEffect(() => {
    const fetchPlayerRank = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from("ranked_stats")
            .select("rank_points, rank_tier")
            .eq("user_id", user.id)
            .single();
          
          if (error) {
            if (error.code === 'PGRST116') { // No data found
              // Create default rank for new players
              const { data: newRank, error: insertError } = await supabase
                .from("ranked_stats")
                .insert({
                  user_id: user.id,
                  rank_points: 1000,
                  rank_tier: "Bronze"
                })
                .select("rank_points, rank_tier")
                .single();
              
              if (!insertError && newRank) {
                setPlayerRank(newRank);
              }
            } else {
              console.error("Error fetching rank:", error);
            }
          } else if (data) {
            setPlayerRank(data);
          }
        }
      } catch (error) {
        console.error("Error in fetchPlayerRank:", error);
      }
    };
    
    fetchPlayerRank();
  }, [supabase]);
  
  // Join the matchmaking queue
  const joinQueue = async () => {
    if (!selectedDeck) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/matchmaking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "JOIN_QUEUE",
          payload: {
            deckId: selectedDeck.id,
          },
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to join queue");
      }
      
      setQueueEntryId(data.queueEntry.id);
      setMatchmakingState("queuing");
      
      // If already matched, move to setup
      if (data.matched && data.opponent) {
        setOpponent(data.opponent);
        setMatchmakingState("setup");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to join queue");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Leave the matchmaking queue
  const leaveQueue = async () => {
    if (!queueEntryId) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/matchmaking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "LEAVE_QUEUE",
          payload: {
            queueEntryId,
          },
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to leave queue");
      }
      
      setQueueEntryId(null);
      setMatchmakingState("selecting");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to leave queue");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check queue status periodically
  useEffect(() => {
    if (matchmakingState !== "queuing" || !queueEntryId) return;
    
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/matchmaking", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "CHECK_STATUS",
            payload: {
              queueEntryId,
            },
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to check queue status");
        }
        
        if (data.matched && data.opponent) {
          setOpponent(data.opponent);
          setMatchmakingState("setup");
        }
      } catch (error) {
        console.error("Error checking queue status:", error);
      }
    };
    
    // Check immediately
    checkStatus();
    
    // Then check every 3 seconds
    const interval = setInterval(checkStatus, 3000);
    
    return () => clearInterval(interval);
  }, [matchmakingState, queueEntryId]);
  
  // Set up realtime subscription for queue updates
  useEffect(() => {
    if (matchmakingState !== "queuing" || !queueEntryId) return;
    
    const channel = supabase
      .channel(`queue:${queueEntryId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matchmaking_queue",
          filter: `id=eq.${queueEntryId}`,
        },
        async (payload) => {
          const updatedEntry = payload.new as any;
          
          if (updatedEntry.status === "matched" && updatedEntry.opponent_deck_id) {
            // Fetch opponent details
            const { data: opponentDeck, error } = await supabase
              .from("player_decks")
              .select(`
                *,
                auth_user:user_id (
                  raw_user_meta_data
                )
              `)
              .eq("id", updatedEntry.opponent_deck_id)
              .single();
            
            if (error || !opponentDeck) {
              console.error("Error fetching opponent:", error);
              return;
            }
            
            const opponentName =
              opponentDeck.auth_user?.raw_user_meta_data?.name ||
              opponentDeck.auth_user?.raw_user_meta_data?.full_name ||
              opponentDeck.auth_user?.raw_user_meta_data?.user_name ||
              "Opponent";
            
            setOpponent({
              id: opponentDeck.user_id,
              name: opponentName,
              deck: opponentDeck,
            });
            
            setMatchmakingState("setup");
          }
        }
      )
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [matchmakingState, queueEntryId, supabase]);
  
  // Handle game setup completion
  const handleSetupComplete = (
    player1Cards: CardWithEffects[],
    player2Cards: CardWithEffects[],
    player1Ready: boolean,
    player2Ready: boolean
  ) => {
    if (player1Ready && player2Ready) {
      setGameCards({
        player1Cards,
        player2Cards,
      });
      setMatchmakingState("playing");
    }
  };
  
  // Handle game end
  const handleGameEnd = async (winner: 1 | 2 | "draw", stats: any) => {
    try {
      // Update match stats
      await fetch("/api/game/stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opponentId: opponent?.id,
          result: winner === 1 ? "win" : winner === 2 ? "loss" : "draw",
          stats,
          mode: "ranked" // Explicitly set mode to ranked
        }),
      });
      
      setMatchmakingState("completed");
    } catch (error) {
      console.error("Error saving game stats:", error);
    }
  };
  
  // Return to deck selection
  const returnToSelection = () => {
    setMatchmakingState("selecting");
    setQueueEntryId(null);
    setOpponent(null);
    setGameCards({
      player1Cards: [],
      player2Cards: [],
    });
  };
  
  // Render based on current state
  if (matchmakingState === "selecting") {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Ranked Multiplayer</CardTitle>
              <CardDescription>Compete against other players to climb the ranks</CardDescription>
            </div>
            {playerRank && (
              <RankBadge 
                tier={playerRank.rank_tier} 
                points={playerRank.rank_points}
                size="lg"
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <SimpleDeckSelector
            key="deck-selector-multiplayer" // Use a stable key
            label="Select Your Deck"
            selectedDeck={selectedDeck}
            onDeckSelect={setSelectedDeck}
          />
          
          <div className="flex justify-center">
            <Button
              onClick={joinQueue}
              disabled={!selectedDeck || isLoading}
              className="w-full max-w-md"
            >
              {isLoading ? "Finding Match..." : "Find Match"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (matchmakingState === "queuing") {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Finding Opponent</CardTitle>
              <CardDescription>Searching for a player with similar rank</CardDescription>
            </div>
            {playerRank && (
              <RankBadge 
                tier={playerRank.rank_tier} 
                points={playerRank.rank_points}
                size="lg"
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="text-center">
            <p className="mb-4">Searching for an opponent with a similar rank...</p>
            <MatchmakingQueue />
          </div>
          
          <div className="flex justify-center">
            <Button
              onClick={leaveQueue}
              variant="destructive"
              disabled={isLoading}
              className="w-full max-w-md"
            >
              {isLoading ? "Leaving..." : "Leave Queue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Convert DeckWithCards to Deck type
  const convertToDeck = (deckWithCards: DeckWithCards): Deck => {
    return {
      ...deckWithCards,
      card_list: JSON.stringify(deckWithCards.cards.map(card => ({ id: card.id })))
    };
  };
  
  if (matchmakingState === "setup" && selectedDeck && opponent) {
    // Fetch opponent's rank if not already included
    useEffect(() => {
      const fetchOpponentRank = async () => {
        if (opponent && !opponent.rank) {
          try {
            const { data, error } = await supabase
              .from("ranked_stats")
              .select("rank_points, rank_tier")
              .eq("user_id", opponent.id)
              .single();
            
            if (!error && data) {
              setOpponent({
                ...opponent,
                rank: data
              });
            }
          } catch (error) {
            console.error("Error fetching opponent rank:", error);
          }
        }
      };
      
      fetchOpponentRank();
    }, [opponent, supabase]);
    
    return (
      <div className="w-full">
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span>Your Rank:</span>
            {playerRank && (
              <RankBadge 
                tier={playerRank.rank_tier} 
                points={playerRank.rank_points}
                size="md"
              />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span>Opponent Rank:</span>
            {opponent.rank ? (
              <RankBadge 
                tier={opponent.rank.rank_tier} 
                points={opponent.rank.rank_points}
                size="md"
              />
            ) : (
              <Skeleton className="h-6 w-24" />
            )}
          </div>
        </div>
        
        <MultiplayerGameSetupManager
          deck1={convertToDeck(selectedDeck)}
          deck2={convertToDeck(opponent.deck)}
          mode="ranked"
          onSetupComplete={handleSetupComplete}
        />
      </div>
    );
  }
  
  if (matchmakingState === "playing" && selectedDeck && opponent) {
    return (
      <div className="w-full">
        <GamePlay
          player1Cards={gameCards.player1Cards.map(card => convertToGameCard(card))}
          player2Cards={gameCards.player2Cards.map(card => convertToGameCard(card))}
          player1DeckId={selectedDeck.id}
          player2DeckId={opponent.deck.id}
          onGameEnd={handleGameEnd}
          mode="ranked"
          isOnlineMatch={true}
          opponentId={opponent.id}
        />
      </div>
    );
  }
  
  if (matchmakingState === "completed") {
    // Refresh player rank after match completion
    useEffect(() => {
      const refreshRank = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            const { data, error } = await supabase
              .from("ranked_stats")
              .select("rank_points, rank_tier")
              .eq("user_id", user.id)
              .single();
            
            if (!error && data) {
              setPlayerRank(data);
            }
          }
        } catch (error) {
          console.error("Error refreshing rank:", error);
        }
      };
      
      refreshRank();
    }, [matchmakingState, supabase]);
    
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Match Completed</CardTitle>
            {playerRank && (
              <RankBadge 
                tier={playerRank.rank_tier} 
                points={playerRank.rank_points}
                size="lg"
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="mb-4">Your match has been completed and stats have been recorded.</p>
          </div>
          
          <div className="flex justify-center">
            <Button
              onClick={returnToSelection}
              className="w-full max-w-md"
            >
              Play Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Fallback loading state
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-8 w-48" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
