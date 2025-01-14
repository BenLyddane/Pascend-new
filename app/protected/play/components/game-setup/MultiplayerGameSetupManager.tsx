"use client";

import { useState } from "react";
import { Card } from "@/app/protected/play/game-engine/types";
import { Database } from "@/types/database.types";
import { GAME_MODES, GameMode } from "../../game-modes/types";
import { SetupPhase } from "../../game-modes/base/types";
import { GameSetupInstructions } from "./GameSetupInstructions";
import { GameSetupTimer } from "./GameSetupTimer";
import { PlayerDeckSetup } from "./PlayerDeckSetup";

type Deck = Database["public"]["Tables"]["player_decks"]["Row"] & {
  cards: Card[];
};

type MultiplayerGameSetupManagerProps = {
  deck1: Deck;
  deck2: Deck;
  mode: Exclude<GameMode, "practice">;
  onSetupComplete: (
    deck1Cards: Card[],
    deck2Cards: Card[],
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
  // Track banned cards (2 per deck)
  const [bannedCards1, setBannedCards1] = useState<Card[]>([]);
  const [bannedCards2, setBannedCards2] = useState<Card[]>([]);

  // Track remaining cards order
  const [remainingCards1, setRemainingCards1] = useState<Card[]>(() => deck1.cards || []);
  const [remainingCards2, setRemainingCards2] = useState<Card[]>(() => deck2.cards || []);

  // Track if players are ready
  const [player1Ready, setPlayer1Ready] = useState(false);
  const [player2Ready, setPlayer2Ready] = useState(false);

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

    // Complete setup when both players ready
    if (player1Ready && player2Ready) {
      onSetupComplete(remainingCards1, remainingCards2, true, true);
    }
  };

  return (
    <div className="relative">
      <GameSetupTimer 
        timeRemaining={GAME_MODES[mode].setup.banTimeLimit || 0} 
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
      </div>
    </div>
  );
}
