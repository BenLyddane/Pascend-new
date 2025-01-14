"use client";

import { useState } from "react";
import { Card, convertToGameCard } from "@/app/protected/play/game-engine/types";
import { Database } from "@/types/database.types";
import { GameSetupInstructions } from "../../components/game-setup/GameSetupInstructions";
import { GameSetupTimer } from "../../components/game-setup/GameSetupTimer";
import { PlayerDeckSetup } from "../../components/game-setup/PlayerDeckSetup";
import { BaseSetupManagerProps } from "../base/types";
import { GAME_MODES, GameMode } from "../types";

type Deck = Database["public"]["Tables"]["player_decks"]["Row"] & {
  cards: Card[];
};

interface PracticeSetupManagerProps extends BaseSetupManagerProps {
  deck1: Deck;
  deck2: Deck;
  mode: GameMode;
}

export function PracticeSetupManager({
  mode,
  deck1,
  deck2,
  onSetupComplete,
}: PracticeSetupManagerProps) {
  // Track banned cards (2 per deck) and remaining cards order
  const [bannedCards1, setBannedCards1] = useState<Card[]>([]);
  const [bannedCards2, setBannedCards2] = useState<Card[]>([]);
  const [remainingCards1, setRemainingCards1] = useState<Card[]>(() => deck1.cards || []);
  const [remainingCards2, setRemainingCards2] = useState<Card[]>(() => deck2.cards || []);
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

    const newPlayer1Ready = isPlayer1 ? true : player1Ready;
    const newPlayer2Ready = isPlayer1 ? player2Ready : true;

    // Complete setup when both players are ready
    if (newPlayer1Ready && newPlayer2Ready) {
      const initialState = {
        currentTurn: 1,
        player1GoesFirst: true, // In practice mode, player 1 always goes first
        player1Cards: remainingCards1.map(card => ({
          card: convertToGameCard(card),
          health: card.health,
          maxHealth: card.health,
          power: card.power,
          isDefeated: false,
          effects: []
        })),
        player2Cards: remainingCards2.map(card => ({
          card: convertToGameCard(card),
          health: card.health,
          maxHealth: card.health,
          power: card.power,
          isDefeated: false,
          effects: []
        })),
        player1VisibleCards: [], // Will be populated by game engine
        player2VisibleCards: [], // Will be populated by game engine
        currentBattle: {
          card1Index: 0,
          card2Index: 0
        },
        winner: null,
        battleLog: [],
        stats: {
          totalDamageDealt: 0,
          cardsDefeated: 0,
          turnsPlayed: 0,
          specialAbilitiesUsed: 0
        }
      };
      onSetupComplete(initialState);
    }
  };

  const modeConfig = GAME_MODES[mode];

  return (
    <div className="relative">
      <GameSetupTimer 
        timeRemaining={0} // Practice mode has no time limits
        phase="setup"
        mode={modeConfig}
      />

      <div className="space-y-4">
        <GameSetupInstructions phase="setup" mode={modeConfig} />

        <div className="grid grid-cols-2 gap-8">
          <PlayerDeckSetup
            cards={remainingCards1}
            bannedCards={bannedCards1}
            onCardBan={(card) => handleCardBan(card, true)}
            onCardReorder={(dragIndex, dropIndex) => handleCardReorder(dragIndex, dropIndex, true)}
            onPhaseComplete={() => handlePhaseComplete(true)}
            isReady={player1Ready}
            phase="setup"
            mode={modeConfig}
            playerName="Player 1's Deck"
          />

          <PlayerDeckSetup
            cards={remainingCards2}
            bannedCards={bannedCards2}
            onCardBan={(card) => handleCardBan(card, false)}
            onCardReorder={(dragIndex, dropIndex) => handleCardReorder(dragIndex, dropIndex, false)}
            onPhaseComplete={() => handlePhaseComplete(false)}
            isReady={player2Ready}
            phase="setup"
            mode={modeConfig}
            playerName="Player 2's Deck"
          />
        </div>
      </div>
    </div>
  );
}
