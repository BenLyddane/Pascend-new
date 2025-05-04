"use client";

import { useState, useEffect, useCallback } from "react";
import { Database } from "@/types/database.types";
import { GAME_MODES, GameMode } from "../../game-modes/types";
import { SetupPhase } from "../../game-modes/base/types";
import { GameSetupInstructions } from "./GameSetupInstructions";
import { GameSetupTimer } from "./GameSetupTimer";
import { PlayerDeckSetup } from "./PlayerDeckSetup";
import { createClient } from "@/utils/supabase/client";
import CoinFlip from "../coin-flip";
import { CardWithEffects } from "@/app/actions/fetchDecks";
import { toast } from "sonner";

type Deck = Database["public"]["Tables"]["player_decks"]["Row"] & {
  cards: CardWithEffects[];
};

type MultiplayerGameSetupManagerProps = {
  deck1: Deck;
  deck2: Deck;
  mode: Exclude<GameMode, "practice">;
  onSetupComplete: (
    deck1Cards: CardWithEffects[],
    deck2Cards: CardWithEffects[],
    player1Ready: boolean,
    player2Ready: boolean
  ) => void;
};

export function MultiplayerGameSetupManager({
  deck1,
  deck2,
  mode,
  onSetupComplete,
}: MultiplayerGameSetupManagerProps) {
  // Supabase client for realtime updates
  const supabase = createClient();
  
  // Check if opponent is a simulated opponent
  const [isSimulatedOpponent, setIsSimulatedOpponent] = useState(false);
  
  // Check if this is a simulated opponent
  useEffect(() => {
    // Check if the deck ID starts with "sim_deck_" (client-side simulated deck)
    if (deck2.id && deck2.id.startsWith("sim_deck_")) {
      console.log("Detected client-side simulated deck:", deck2.id);
      setIsSimulatedOpponent(true);
      return;
    }
    
    // Check if the deck exists in the simulated_decks table
    const checkIfSimulated = async () => {
      try {
        // Check if the deck exists in the simulated_decks table
        const { data, error } = await supabase
          .from("simulated_decks")
          .select("id")
          .eq("id", deck2.id)
          .single();
        
        if (!error && data) {
          console.log("Found deck in simulated_decks table:", data.id);
          setIsSimulatedOpponent(true);
        } else {
          // Fallback to checking the user_id
          setIsSimulatedOpponent(deck2.user_id === "00000000-0000-0000-0000-000000000000");
        }
      } catch (error) {
        console.error("Error checking if deck is simulated:", error);
        // Fallback to checking the user_id
        setIsSimulatedOpponent(deck2.user_id === "00000000-0000-0000-0000-000000000000");
      }
    };
    
    checkIfSimulated();
  }, [deck2.id, deck2.user_id, supabase]);
  // Track current setup phase
  const [phase, setPhase] = useState<"banning" | "reordering" | "coin-flip">("banning");
  
  // Track banned cards (2 per deck)
  const [bannedCards1, setBannedCards1] = useState<CardWithEffects[]>([]);
  const [bannedCards2, setBannedCards2] = useState<CardWithEffects[]>([]);

  // Track remaining cards order
  const [remainingCards1, setRemainingCards1] = useState<CardWithEffects[]>(() => deck1.cards || []);
  const [remainingCards2, setRemainingCards2] = useState<CardWithEffects[]>(() => deck2.cards || []);

  // Track if players are ready
  const [player1Ready, setPlayer1Ready] = useState(false);
  const [player2Ready, setPlayer2Ready] = useState(false);
  
  // Track simulated opponent choices
  const [simulatedChoices, setSimulatedChoices] = useState<{
    bans: number[];
    order: number[];
  } | null>(null);
  
  // Track timers
  const [banTimeRemaining, setBanTimeRemaining] = useState(GAME_MODES[mode].setup.banTimeLimit || 30);
  const [reorderTimeRemaining, setReorderTimeRemaining] = useState(GAME_MODES[mode].setup.reorderTimeLimit || 15);
  
  // Track coin flip result
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [player1GoesFirst, setPlayer1GoesFirst] = useState(false);
  
  // Fetch simulated opponent choices if needed
  useEffect(() => {
    if (!isSimulatedOpponent) return;
    
    const fetchSimulatedChoices = async () => {
      try {
        // First try to get choices from the new simulated_choices table
        const { data: simData, error: simError } = await supabase
          .from("simulated_choices")
          .select("choices")
          .eq("deck_id", deck2.id)
          .single();
        
        if (!simError && simData && simData.choices) {
          console.log("Found choices in simulated_choices table:", simData.choices);
          setSimulatedChoices(simData.choices);
          return;
        }
        
        // If not found in simulated_choices, try the old table as fallback
        const { data, error } = await supabase
          .from("simulated_opponent_choices")
          .select("choices")
          .eq("deck_id", deck2.id)
          .single();
        
        if (!error && data && data.choices) {
          console.log("Found choices in simulated_opponent_choices table:", data.choices);
          setSimulatedChoices(data.choices);
          return;
        }
        
        // If no choices found in either table, generate random ones
        console.log("No choices found, generating random ones");
        generateRandomChoices();
      } catch (error) {
        console.error("Error in fetchSimulatedChoices:", error);
        // If error, generate random choices
        generateRandomChoices();
      }
    };
    
    fetchSimulatedChoices();
  }, [isSimulatedOpponent, deck2.id, supabase]);
  
  // Generate random choices for the simulated opponent
  const generateRandomChoices = useCallback(() => {
    // Generate random bans (2 cards from player's deck)
    const playerDeckSize = deck1.cards.length;
    const randomBans: number[] = [];
    
    // Get 2 unique random indices
    while (randomBans.length < 2 && randomBans.length < playerDeckSize) {
      const randomIndex = Math.floor(Math.random() * playerDeckSize);
      if (!randomBans.includes(randomIndex)) {
        randomBans.push(randomIndex);
      }
    }
    
    // Generate random order for the opponent's deck
    const opponentDeckSize = deck2.cards.length;
    const indices = Array.from({ length: opponentDeckSize }, (_, i) => i);
    const randomOrder = indices.sort(() => 0.5 - Math.random());
    
    const choices = {
      bans: randomBans,
      order: randomOrder
    };
    
    setSimulatedChoices(choices);
    
    // Store the choices in the new simulated_choices table
    supabase
      .from("simulated_choices")
      .upsert({
        deck_id: deck2.id,
        choices,
        created_at: new Date().toISOString()
      })
      .then(({ error }) => {
        if (error) {
          console.warn("Error storing simulated choices in new table:", error);
          
          // Fallback to the old table if the new one fails
          supabase
            .from("simulated_opponent_choices")
            .upsert({
              deck_id: deck2.id,
              choices,
              created_at: new Date().toISOString()
            })
            .then(({ error: oldError }) => {
              if (oldError) {
                console.warn("Error storing simulated choices in old table:", oldError);
              } else {
                console.log("Successfully stored choices in old table as fallback");
              }
            });
        } else {
          console.log("Successfully stored choices in new simulated_choices table");
        }
      });
  }, [deck1.cards.length, deck2.cards.length, deck2.id, supabase]);

  // Timer for ban phase
  useEffect(() => {
    if (phase !== "banning" || banTimeRemaining <= 0) return;
    
    const timer = setTimeout(() => {
      setBanTimeRemaining(prev => prev - 1);
    }, 1000);
    
    // Auto-complete ban phase when time runs out
    if (banTimeRemaining === 0) {
      handleCompleteBanning();
    }
    
    return () => clearTimeout(timer);
  }, [phase, banTimeRemaining]);
  
  // Timer for reorder phase
  useEffect(() => {
    if (phase !== "reordering" || reorderTimeRemaining <= 0) return;
    
    const timer = setTimeout(() => {
      setReorderTimeRemaining(prev => prev - 1);
    }, 1000);
    
    // Auto-complete reorder phase when time runs out
    if (reorderTimeRemaining === 0) {
      handleCompleteReordering();
    }
    
    return () => clearTimeout(timer);
  }, [phase, reorderTimeRemaining]);

  // Apply simulated opponent choices when available
  useEffect(() => {
    if (!isSimulatedOpponent || phase !== "banning") return;
    
    // Apply the simulated opponent's bans with a delay to make it look natural
    const applyBans = async () => {
      // Prioritize banning higher rarity cards first
      const sortedCards = [...deck1.cards].sort((a, b) => {
        const rarityOrder: Record<string, number> = {
          legendary: 4,
          epic: 3,
          rare: 2,
          common: 1,
          unknown: 0
        };
        
        const rarityA = a.rarity?.toLowerCase() || 'unknown';
        const rarityB = b.rarity?.toLowerCase() || 'unknown';
        
        return (rarityOrder[rarityB] || 0) - (rarityOrder[rarityA] || 0);
      });
      
      // Ban up to 2 cards, prioritizing higher rarity
      for (let i = 0; i < Math.min(2, sortedCards.length); i++) {
        if (bannedCards1.length >= 2) break;
        
        // Random delay between 2-5 seconds
        const delay = 2000 + Math.random() * 3000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Ban the card
        const cardToBan = sortedCards[i];
        handleCardBan(cardToBan, true);
      }
      
      // Mark the simulated opponent as ready after banning
      setPlayer2Ready(true);
    };
    
    applyBans();
  }, [isSimulatedOpponent, phase, deck1.cards, bannedCards1.length]);
  
  // Apply simulated opponent's card reordering when phase changes to reordering
  useEffect(() => {
    if (!isSimulatedOpponent || !simulatedChoices || phase !== "reordering") return;
    
    // Apply the simulated opponent's card order
    const applyCardOrder = async () => {
      // Wait a random time between 2-4 seconds
      const delay = 2000 + Math.random() * 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Reorder the cards based on the simulated choices
      const newOrder: CardWithEffects[] = [];
      
      for (const orderIndex of simulatedChoices.order) {
        if (orderIndex < remainingCards2.length) {
          newOrder.push(remainingCards2[orderIndex]);
        }
      }
      
      // If we have all cards, update the order
      if (newOrder.length === remainingCards2.length) {
        setRemainingCards2(newOrder);
      }
      
      // Mark the simulated opponent as ready
      setPlayer2Ready(true);
    };
    
    applyCardOrder();
  }, [isSimulatedOpponent, simulatedChoices, phase, remainingCards2]);

  const handleCardBan = (card: CardWithEffects, isDeck1: boolean) => {
    if (phase !== "banning") return;
    
    if (isDeck1) {
      if (bannedCards1.length >= 2) return;
      setBannedCards1([...bannedCards1, card]);
      setRemainingCards1(remainingCards1.filter((c) => c.id !== card.id));
    } else {
      // Only allow player 1 to ban cards from deck 2
      if (isSimulatedOpponent) {
        toast.error("You cannot ban cards from a simulated opponent's deck");
        return;
      }
      
      if (bannedCards2.length >= 2) return;
      setBannedCards2([...bannedCards2, card]);
      setRemainingCards2(remainingCards2.filter((c) => c.id !== card.id));
    }
  };

  const handleCardReorder = (dragIndex: number, dropIndex: number, isDeck1: boolean) => {
    if (phase !== "reordering") return;
    
    if (isDeck1) {
      const newOrder = [...remainingCards1];
      const [draggedCard] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, draggedCard);
      setRemainingCards1(newOrder);
    } else {
      // Only allow player 1 to reorder their own deck
      if (isSimulatedOpponent) {
        toast.error("You cannot reorder a simulated opponent's deck");
        return;
      }
      
      const newOrder = [...remainingCards2];
      const [draggedCard] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, draggedCard);
      setRemainingCards2(newOrder);
    }
  };

  const handleCompleteBanning = () => {
    // Auto-ban if not enough cards are banned
    if (bannedCards1.length < 2) {
      // Auto-ban the last cards
      const cardsNeeded = 2 - bannedCards1.length;
      const cardsToBan = remainingCards1.slice(-cardsNeeded);
      
      setBannedCards1([...bannedCards1, ...cardsToBan]);
      setRemainingCards1(remainingCards1.filter(card => 
        !cardsToBan.some(c => c.id === card.id)
      ));
    }
    
    if (bannedCards2.length < 2) {
      // Auto-ban the last cards
      const cardsNeeded = 2 - bannedCards2.length;
      const cardsToBan = remainingCards2.slice(-cardsNeeded);
      
      setBannedCards2([...bannedCards2, ...cardsToBan]);
      setRemainingCards2(remainingCards2.filter(card => 
        !cardsToBan.some(c => c.id === card.id)
      ));
    }
    
    // Move to reordering phase
    setPhase("reordering");
  };
  
  const handleCompleteReordering = () => {
    // Move to coin flip phase
    setPhase("coin-flip");
    setShowCoinFlip(true);
  };

  const handlePhaseComplete = (isPlayer1: boolean) => {
    if (isPlayer1) {
      setPlayer1Ready(true);
    } else {
      setPlayer2Ready(true);
    }

    // Auto-complete phase if both players are ready
    if (phase === "banning" && player1Ready && player2Ready) {
      handleCompleteBanning();
    } else if (phase === "reordering" && player1Ready && player2Ready) {
      handleCompleteReordering();
    }
  };
  
  const handleCoinFlipComplete = (result: boolean) => {
    setPlayer1GoesFirst(result);
    setShowCoinFlip(false);
    
    // Complete setup when coin flip is done
    onSetupComplete(remainingCards1, remainingCards2, true, true);
  };
  
  // Show coin flip if needed
  if (showCoinFlip) {
    return <CoinFlip onComplete={handleCoinFlipComplete} />;
  }

  return (
    <div className="relative">
      {phase === "banning" && (
        <GameSetupTimer 
          timeRemaining={banTimeRemaining} 
          phase="setup"
          mode={GAME_MODES[mode]}
        />
      )}
      
      {phase === "reordering" && (
        <GameSetupTimer 
          timeRemaining={reorderTimeRemaining} 
          phase="setup"
          mode={GAME_MODES[mode]}
        />
      )}

      <div className="space-y-4">
        <GameSetupInstructions phase="setup" mode={GAME_MODES[mode]} />
        
        <div className="bg-accent/20 p-4 rounded-lg mb-4">
          <h2 className="text-xl font-bold text-center mb-2">
            {phase === "banning" ? "Ban Phase" : "Reordering Phase"}
          </h2>
          <p className="text-center text-muted-foreground">
            {phase === "banning" 
              ? "Each player must ban 2 cards from the opponent's deck" 
              : "Reorder your remaining cards (first card will be played first)"}
          </p>
          {phase === "banning" && (
            <p className="text-center text-sm text-muted-foreground mt-1">
              Time remaining: {banTimeRemaining} seconds
            </p>
          )}
          {phase === "reordering" && (
            <p className="text-center text-sm text-muted-foreground mt-1">
              Time remaining: {reorderTimeRemaining} seconds
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-8">
          <PlayerDeckSetup
            cards={remainingCards1}
            bannedCards={bannedCards1}
            onCardBan={(card) => handleCardBan(card, true)}
            onCardReorder={(dragIndex, dropIndex) => handleCardReorder(dragIndex, dropIndex, true)}
            onPhaseComplete={() => handlePhaseComplete(true)}
            isReady={player1Ready}
            phase="setup"
            mode={GAME_MODES[mode]}
            playerName="Your Deck"
          />

          <PlayerDeckSetup
            cards={remainingCards2}
            bannedCards={bannedCards2}
            onCardBan={(card) => handleCardBan(card, false)}
            onCardReorder={(dragIndex, dropIndex) => handleCardReorder(dragIndex, dropIndex, false)}
            onPhaseComplete={() => handlePhaseComplete(false)}
            isReady={player2Ready}
            phase="setup"
            mode={GAME_MODES[mode]}
            playerName="Opponent's Deck"
          />
        </div>
        
        {phase === "banning" && (
          <div className="flex justify-center mt-4">
            <button
              onClick={handleCompleteBanning}
              disabled={bannedCards1.length < 2 || bannedCards2.length < 2}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
            >
              Continue to Reordering
            </button>
          </div>
        )}
        
        {phase === "reordering" && (
          <div className="flex justify-center mt-4">
            <button
              onClick={handleCompleteReordering}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg"
            >
              Start Battle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
