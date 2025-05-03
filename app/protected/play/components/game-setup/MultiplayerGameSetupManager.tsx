"use client";

import { useState, useEffect } from "react";
import { Database } from "@/types/database.types";
import { GAME_MODES, GameMode } from "../../game-modes/types";
import { SetupPhase } from "../../game-modes/base/types";
import { GameSetupInstructions } from "./GameSetupInstructions";
import { GameSetupTimer } from "./GameSetupTimer";
import { PlayerDeckSetup } from "./PlayerDeckSetup";
import { createClient } from "@/utils/supabase/client";
import CoinFlip from "../coin-flip";
import { CardWithEffects } from "@/app/actions/fetchDecks";

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
  
  // Track timers
  const [banTimeRemaining, setBanTimeRemaining] = useState(GAME_MODES[mode].setup.banTimeLimit || 30);
  const [reorderTimeRemaining, setReorderTimeRemaining] = useState(GAME_MODES[mode].setup.reorderTimeLimit || 15);
  
  // Track coin flip result
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [player1GoesFirst, setPlayer1GoesFirst] = useState(false);
  
  // Supabase client for realtime updates
  const supabase = createClient();

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

  const handleCardBan = (card: CardWithEffects, isDeck1: boolean) => {
    if (phase !== "banning") return;
    
    if (isDeck1) {
      if (bannedCards1.length >= 2) return;
      setBannedCards1([...bannedCards1, card]);
      setRemainingCards1(remainingCards1.filter((c) => c.id !== card.id));
    } else {
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
