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
import { createSimulatedOpponent } from "@/app/actions/matchmaking";

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
  
  // Set default player rank instead of fetching
  useEffect(() => {
    // Use default rank values instead of fetching from the database
    setPlayerRank({
      rank_points: 1000,
      rank_tier: "Bronze"
    });
  }, []);
  
  // Join the matchmaking queue
  const joinQueue = async () => {
    if (!selectedDeck) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Joining queue with deck:", selectedDeck.id);
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
      
      console.log("Successfully joined queue:", data);
      setQueueEntryId(data.queueEntry.id);
      setMatchmakingState("queuing");
      
      // If already matched, move to setup
      if (data.matched && data.opponent) {
        setOpponent(data.opponent);
        setMatchmakingState("setup");
      }
    } catch (error) {
      console.error("Error joining queue:", error);
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
      // For simulated queue entries, we don't need to call the API
      if (queueEntryId.startsWith("sim_")) {
        console.log("Skipping API call for simulated queue entry:", queueEntryId);
        setQueueEntryId(null);
        setMatchmakingState("selecting");
        return;
      }
      
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
  
  // Create a simulated opponent directly after waiting too long
  useEffect(() => {
    if (matchmakingState !== "queuing" || !queueEntryId || !selectedDeck || !playerRank) return;
    
    // Set a timeout to create a simulated opponent after 5 seconds
    const timeoutId = setTimeout(async () => {
      console.log("Creating fully client-side simulated opponent with rank:", playerRank);
      
      try {
        // Get cards of different rarities
        const { data: legendaryCards, error: legendaryError } = await supabase
          .from('cards')
          .select('*')
          .eq('is_active', true)
          .eq('rarity', 'legendary')
          .order('created_at', { ascending: false })
          .limit(20);
        
        const { data: epicCards, error: epicError } = await supabase
          .from('cards')
          .select('*')
          .eq('is_active', true)
          .eq('rarity', 'epic')
          .order('created_at', { ascending: false })
          .limit(50);
        
        const { data: rareCards, error: rareError } = await supabase
          .from('cards')
          .select('*')
          .eq('is_active', true)
          .eq('rarity', 'rare')
          .order('created_at', { ascending: false })
          .limit(50);
        
        const { data: commonCards, error: commonError } = await supabase
          .from('cards')
          .select('*')
          .eq('is_active', true)
          .eq('rarity', 'common')
          .order('created_at', { ascending: false })
          .limit(50);
        
        // Fallback to random cards if we can't get specific rarities
        if ((!legendaryCards || !epicCards || !rareCards || !commonCards) ||
            (legendaryCards.length === 0 && epicCards.length === 0 && rareCards.length === 0 && commonCards.length === 0)) {
          console.log("Couldn't get cards by rarity, falling back to random cards");
          
          const { data: randomCards, error: cardsError } = await supabase
            .from('cards')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(100);
          
          if (cardsError || !randomCards || randomCards.length < 5) {
            console.error("Error fetching random cards:", cardsError);
            return;
          }
          
          // Shuffle the cards and pick 5
          const shuffledCards = randomCards.sort(() => 0.5 - Math.random());
          const selectedCards = shuffledCards.slice(0, 5);
          
          // Create a client-side simulated deck
          const simulatedDeck = {
            id: `sim_deck_${Date.now()}`,
            name: `Simulated Deck ${Date.now()}`,
            description: 'A balanced deck with random cards',
            card_list: selectedCards.map(card => ({ id: card.id })),
            cards: selectedCards,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            isSimulated: true
          };
          
          console.log("Created client-side simulated deck with random cards:", simulatedDeck);
          
          // Generate a fake queue entry ID
          const simQueueEntryId = `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          
          // Set the opponent and move to setup phase
          setOpponent({
            id: "00000000-0000-0000-0000-000000000000",
            name: "Simulated Opponent",
            deck: simulatedDeck,
            rank: playerRank, // Use the same rank as the player
            isSimulated: true
          });
          
          // Set the queue entry ID to the simulated one
          setQueueEntryId(simQueueEntryId);
          
          // Move to setup phase
          setMatchmakingState("setup");
          return;
        }
        
        // Shuffle each rarity group
        const shuffledLegendary = legendaryCards?.sort(() => 0.5 - Math.random()) || [];
        const shuffledEpic = epicCards?.sort(() => 0.5 - Math.random()) || [];
        const shuffledRare = rareCards?.sort(() => 0.5 - Math.random()) || [];
        const shuffledCommon = commonCards?.sort(() => 0.5 - Math.random()) || [];
        
        // Adjust card distribution based on player rank
        let legendaryCount = 0;
        let epicCount = 0;
        let rareCount = 0;
        let commonCount = 0;
        
        // Higher rank = more rare cards
        if (playerRank.rank_tier === "Diamond" || playerRank.rank_tier === "Platinum") {
          legendaryCount = 2;
          epicCount = 2;
          rareCount = 1;
          commonCount = 0;
        } else if (playerRank.rank_tier === "Gold") {
          legendaryCount = 1;
          epicCount = 2;
          rareCount = 2;
          commonCount = 0;
        } else if (playerRank.rank_tier === "Silver") {
          legendaryCount = 1;
          epicCount = 1;
          rareCount = 2;
          commonCount = 1;
        } else {
          // Bronze or default
          legendaryCount = 0;
          epicCount = 1;
          rareCount = 2;
          commonCount = 2;
        }
        
        console.log(`Creating deck with ${legendaryCount} legendary, ${epicCount} epic, ${rareCount} rare, ${commonCount} common cards`);
        
        // Select cards according to the desired distribution
        const selectedCards = [
          ...shuffledLegendary.slice(0, legendaryCount),
          ...shuffledEpic.slice(0, epicCount),
          ...shuffledRare.slice(0, rareCount),
          ...shuffledCommon.slice(0, commonCount)
        ];
        
        // If we couldn't get enough cards, fill with random cards
        if (selectedCards.length < 5) {
          console.log(`Only got ${selectedCards.length} cards, filling with random cards`);
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
        
        // Create a client-side simulated deck
        const simulatedDeck = {
          id: `sim_deck_${Date.now()}`,
          name: `Simulated Deck ${Date.now()}`,
          description: 'A balanced deck with cards matching your rank',
          card_list: selectedCards.map(card => ({ id: card.id })),
          cards: selectedCards,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          isSimulated: true
        };
        
        console.log("Created client-side simulated deck with rank-appropriate cards:", simulatedDeck);
        
        // Generate a fake queue entry ID
        const simQueueEntryId = `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Set the opponent and move to setup phase
        setOpponent({
          id: "00000000-0000-0000-0000-000000000000",
          name: "Simulated Opponent",
          deck: simulatedDeck,
          rank: playerRank, // Use the same rank as the player
          isSimulated: true
        });
        
        // Set the queue entry ID to the simulated one
        setQueueEntryId(simQueueEntryId);
        
        // Move to setup phase
        setMatchmakingState("setup");
      } catch (error) {
        console.error("Error creating client-side simulated opponent:", error);
      }
    }, 5000); // 5 seconds (reduced for testing)
    
    return () => clearTimeout(timeoutId);
  }, [matchmakingState, queueEntryId, selectedDeck, supabase]);
  
  // Check queue status periodically (keep this for real opponents)
  useEffect(() => {
    if (matchmakingState !== "queuing" || !queueEntryId) return;
    
    const checkStatus = async () => {
      try {
        // Skip API call for simulated queue entries
        if (queueEntryId.startsWith("sim_")) {
          console.log("Skipping queue status check for simulated entry:", queueEntryId);
          return;
        }
        
        console.log("Checking queue status for entry:", queueEntryId);
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
        
        console.log("Queue status response:", data);
        
        if (data.matched && data.opponent) {
          // Check if this is a simulated opponent by checking if the deck exists in the simulated_decks table
          let isSimulatedOpponent = false;
          
          try {
            // Check if the deck exists in the simulated_decks table
            const { data: simDeck, error: simError } = await supabase
              .from("simulated_decks")
              .select("id")
              .eq("id", data.opponent.deck.id)
              .single();
            
            if (!simError && simDeck) {
              console.log("Found deck in simulated_decks table:", simDeck.id);
              isSimulatedOpponent = true;
            }
          } catch (error) {
            console.error("Error checking if deck is simulated:", error);
          }
          
          if (isSimulatedOpponent) {
            console.log("Matched with simulated opponent via status check");
          }
          
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
    
    // Skip subscription for simulated queue entries
    if (queueEntryId.startsWith("sim_")) {
      console.log("Skipping realtime subscription for simulated entry:", queueEntryId);
      return;
    }
    
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
            console.log("Matched with opponent, deck ID:", updatedEntry.opponent_deck_id);
            
            // Fetch opponent deck details - AVOID joining with auth.users table
            const { data: opponentDeck, error } = await supabase
              .from("player_decks")
              .select("*")
              .eq("id", updatedEntry.opponent_deck_id)
              .single();
            
            if (error || !opponentDeck) {
              console.error("Error fetching opponent deck:", error);
              return;
            }
            
            // Check if this is a simulated opponent
            const isSimulatedOpponent = opponentDeck.user_id === "00000000-0000-0000-0000-000000000000";
            
            if (isSimulatedOpponent) {
              console.log("Matched with simulated opponent");
              setOpponent({
                id: opponentDeck.user_id,
                name: "Simulated Opponent",
                deck: opponentDeck,
                rank: {
                  rank_tier: "Bronze",
                  rank_points: 500
                },
                isSimulated: true
              });
            } else {
              // Regular opponent - try to get name from player_profiles instead of auth.users
              let opponentName = "Opponent";
              
              try {
                // Try to get profile from player_profiles
                const { data: profile, error: profileError } = await supabase
                  .from("player_profiles")
                  .select("display_name")
                  .eq("user_id", opponentDeck.user_id)
                  .maybeSingle();
                
                if (!profileError && profile && profile.display_name) {
                  opponentName = profile.display_name;
                  console.log("Found opponent name from player_profiles:", opponentName);
                }
              } catch (profileErr) {
                console.error("Error fetching opponent profile:", profileErr);
              }
              
              setOpponent({
                id: opponentDeck.user_id,
                name: opponentName,
                deck: opponentDeck,
              });
            }
            
            setMatchmakingState("setup");
          }
        }
      )
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [matchmakingState, queueEntryId, supabase]);
  
  // Fetch opponent's rank if not already included
  useEffect(() => {
    const fetchOpponentRank = async () => {
      if (matchmakingState === "setup" && selectedDeck && opponent && !opponent.rank) {
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
  }, [matchmakingState, opponent, selectedDeck, supabase]);
  
  // Update rank after game completion
  useEffect(() => {
    if (matchmakingState === "completed") {
      // Simulate rank increase after a win
      setPlayerRank({
        rank_points: 1050, // Slightly increased from default 1000
        rank_tier: "Bronze"
      });
    }
  }, [matchmakingState]);
  
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
