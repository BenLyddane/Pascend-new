"use client";

import React, { useState } from "react";
import { Card } from "@/app/protected/play/game-engine/types";
import { Database } from "@/types/database.types";
import { GAME_MODES } from "../../game-modes/types";
import { GameSetupInstructions } from "./GameSetupInstructions";
import { GameSetupTimer } from "./GameSetupTimer";
import { PlayerDeckSetup } from "./PlayerDeckSetup";

type Deck = Database["public"]["Tables"]["player_decks"]["Row"] & {
  cards: Card[];
};

type PracticeGameSetupManagerProps = {
  deck1: Deck;
  deck2: Deck;
  mode: "practice";
  onSetupComplete: (
    deck1Cards: Card[],
    deck2Cards: Card[],
    player1Ready: boolean,
    player2Ready: boolean
  ) => void;
};

export function PracticeGameSetupManager({
  mode,
  deck1,
  deck2,
  onSetupComplete,
}: PracticeGameSetupManagerProps): React.ReactElement {
  // Track banned cards (2 per deck) and remaining cards order
  const [bannedCards1, setBannedCards1] = useState<Card[]>([]);
  const [bannedCards2, setBannedCards2] = useState<Card[]>([]);
  const [remainingCards1, setRemainingCards1] = useState<Card[]>(
    () => deck1.cards || []
  );
  const [remainingCards2, setRemainingCards2] = useState<Card[]>(
    () => deck2.cards || []
  );

  // Track if players are ready
  const [readyStates, setReadyStates] = useState({
    player1: false,
    player2: false
  });

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

  const handleCardReorder = (
    dragIndex: number,
    dropIndex: number,
    isDeck1: boolean
  ) => {
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
    console.log(`Player ${isPlayer1 ? '1' : '2'} ready`);
    
    setReadyStates(prev => {
      const newReadyStates = {
        ...prev,
        [isPlayer1 ? 'player1' : 'player2']: true
      };

      // If both players are ready, complete setup
      if (newReadyStates.player1 && newReadyStates.player2) {
        console.log('Both players ready, completing setup');
        onSetupComplete(remainingCards1, remainingCards2, true, true);
      }

      return newReadyStates;
    });
  };

  return (
    <div className="relative">
      <GameSetupTimer
        timeRemaining={0}
        phase="setup"
        mode={GAME_MODES.practice}
      />

      <div className="space-y-4">
        <GameSetupInstructions phase="setup" mode={GAME_MODES.practice} />

        <div className="grid grid-cols-2 gap-8">
          <PlayerDeckSetup
            cards={remainingCards1}
            bannedCards={bannedCards1}
            onCardBan={(card) => handleCardBan(card, true)}
            onCardReorder={(dragIndex, dropIndex) =>
              handleCardReorder(dragIndex, dropIndex, true)
            }
            onPhaseComplete={() => handlePhaseComplete(true)}
            isReady={readyStates.player1}
            phase="setup"
            mode={GAME_MODES.practice}
            playerName="Player 1's Deck"
          />

          <PlayerDeckSetup
            cards={remainingCards2}
            bannedCards={bannedCards2}
            onCardBan={(card) => handleCardBan(card, false)}
            onCardReorder={(dragIndex, dropIndex) =>
              handleCardReorder(dragIndex, dropIndex, false)
            }
            onPhaseComplete={() => handlePhaseComplete(false)}
            isReady={readyStates.player2}
            phase="setup"
            mode={GAME_MODES.practice}
            playerName="Player 2's Deck"
          />
        </div>
      </div>
    </div>
  );
}
