"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/app/protected/play/game-engine/types";
import { Database } from "@/types/database.types";
import { GameMode, GameModeConfig, GAME_MODES } from "../../game-modes/types";
import { SetupPhase } from "../../game-modes/base/types";
import { GameSetupInstructions } from "./GameSetupInstructions";
import { GameSetupTimer } from "./GameSetupTimer";
import { PlayerDeckSetup } from "./PlayerDeckSetup";

type Deck = Database["public"]["Tables"]["player_decks"]["Row"] & {
  cards: Card[];
};

type GameSetupPhaseManagerProps = {
  deck1: Deck;
  deck2: Deck;
  onSetupComplete: (
    deck1Cards: Card[],
    deck2Cards: Card[],
    player1Ready: boolean,
    player2Ready: boolean
  ) => void;
  mode: GameMode;
};

export function GameSetupPhaseManager({
  deck1,
  deck2,
  onSetupComplete,
  mode,
}: GameSetupPhaseManagerProps) {
  const [timeRemaining, setTimeRemaining] = useState(20);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Track banned cards (2 per deck)
  const [bannedCards1, setBannedCards1] = useState<Card[]>([]);
  const [bannedCards2, setBannedCards2] = useState<Card[]>([]);

  // Track remaining cards order
  const [remainingCards1, setRemainingCards1] = useState<Card[]>(() => deck1.cards || []);
  const [remainingCards2, setRemainingCards2] = useState<Card[]>(() => deck2.cards || []);

  // Track if players are ready
  const [player1Ready, setPlayer1Ready] = useState(false);
  const [player2Ready, setPlayer2Ready] = useState(false);

  useEffect(() => {
    const modeConfig = GAME_MODES[mode];
    if (!modeConfig.setup.banTimeLimit) return;

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      const timeLimit = modeConfig.setup.banTimeLimit || 0;
      const remaining = Math.max(timeLimit - elapsed, 0);
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(timerRef.current!);
        onSetupComplete(remainingCards1, remainingCards2, false, false);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [mode]);

  const handleCardBan = (card: Card, isDeck1: boolean) => {
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

  const handlePhaseComplete = (isPlayer1: boolean) => {
    if (isPlayer1) {
      setPlayer1Ready(true);
    } else {
      setPlayer2Ready(true);
    }

    const modeConfig = GAME_MODES[mode];
    // Complete setup when both players ready if required
    if (modeConfig.setup.requireBothPlayersReady) {
      const newPlayer1Ready = isPlayer1 ? true : player1Ready;
      const newPlayer2Ready = isPlayer1 ? player2Ready : true;
      if (newPlayer1Ready && newPlayer2Ready) {
        onSetupComplete(remainingCards1, remainingCards2, true, true);
      }
    } else {
      // In non-practice mode, complete immediately
      onSetupComplete(remainingCards1, remainingCards2, isPlayer1, !isPlayer1);
    }
  };

  return (
    <div className="relative">
      <GameSetupTimer 
        timeRemaining={timeRemaining} 
        phase="setup"
        mode={GAME_MODES[mode]}
      />

      <div className="space-y-4">
        <GameSetupInstructions phase="setup" mode={GAME_MODES[mode]} />

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
            playerName={GAME_MODES[mode].setup.requireBothPlayersReady ? "Player 1's Deck" : "Your Deck"}
          />

          {GAME_MODES[mode].setup.requireBothPlayersReady && (
            <PlayerDeckSetup
              cards={remainingCards2}
              bannedCards={bannedCards2}
              onCardBan={(card) => handleCardBan(card, false)}
              onCardReorder={(dragIndex, dropIndex) => handleCardReorder(dragIndex, dropIndex, false)}
              onPhaseComplete={() => handlePhaseComplete(false)}
              isReady={player2Ready}
              phase="setup"
              mode={GAME_MODES[mode]}
              playerName="Player 2's Deck"
            />
          )}
        </div>
      </div>
    </div>
  );
}
