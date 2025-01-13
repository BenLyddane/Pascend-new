"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/app/protected/play/game-engine/types";
import { Database } from "@/types/database.types";
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
  isPracticeMode?: boolean;
};

export function GameSetupPhaseManager({
  deck1,
  deck2,
  onSetupComplete,
  isPracticeMode = false,
}: GameSetupPhaseManagerProps) {
  const [phase, setPhase] = useState<"ban" | "reorder">("ban");
  const [timeRemaining, setTimeRemaining] = useState(20); // Start with 20s for ban phase
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
    if (isPracticeMode) return; // No timer in practice mode

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      const timeLimit = phase === "ban" ? 20 : 10;
      const remaining = Math.max(timeLimit - elapsed, 0);
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(timerRef.current!);
        if (phase === "ban") {
          setPhase("reorder");
          setTimeRemaining(10);
          startTimeRef.current = Date.now();
        } else {
          onSetupComplete([], [], false, false);
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase, isPracticeMode]);

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
    if (phase === "ban") {
      // Handle ban phase completion
      if (isPlayer1) {
        setPlayer1Ready(true);
      } else {
        setPlayer2Ready(true);
      }

      // In practice mode, transition to reorder when both players are ready
      if (isPracticeMode) {
        const newPlayer1Ready = isPlayer1 ? true : player1Ready;
        const newPlayer2Ready = isPlayer1 ? player2Ready : true;
        if (newPlayer1Ready && newPlayer2Ready) {
          setPhase("reorder");
          setPlayer1Ready(false);
          setPlayer2Ready(false);
        }
      } else if (!isPracticeMode) {
        // In non-practice mode, transition immediately for player 1
        setPhase("reorder");
      }
    } else {
      // Handle reorder phase completion
      if (isPlayer1) {
        setPlayer1Ready(true);
      } else {
        setPlayer2Ready(true);
      }

      // Complete setup when both players are ready in practice mode
      if (isPracticeMode) {
        const newPlayer1Ready = isPlayer1 ? true : player1Ready;
        const newPlayer2Ready = isPlayer1 ? player2Ready : true;
        if (newPlayer1Ready && newPlayer2Ready) {
          onSetupComplete(remainingCards1, remainingCards2, true, true);
        }
      } else if (!isPracticeMode) {
        // In non-practice mode, complete immediately
        onSetupComplete(remainingCards1, remainingCards2, isPlayer1, !isPlayer1);
      }
    }
  };

  return (
    <div className="relative">
      <GameSetupTimer 
        timeRemaining={timeRemaining} 
        phase={phase}
        isPracticeMode={isPracticeMode}
      />

      <div className="space-y-4">
        <GameSetupInstructions phase={phase} />

        <div className="grid grid-cols-2 gap-8">
          <PlayerDeckSetup
            cards={remainingCards1}
            bannedCards={bannedCards1}
            onCardBan={(card) => handleCardBan(card, true)}
            onCardReorder={(dragIndex, dropIndex) => handleCardReorder(dragIndex, dropIndex, true)}
            onPhaseComplete={() => handlePhaseComplete(true)}
            isReady={player1Ready}
            phase={phase}
            isPracticeMode={isPracticeMode}
            playerName={isPracticeMode ? "Player 1's Deck" : "Your Deck"}
          />

          {isPracticeMode && (
            <PlayerDeckSetup
              cards={remainingCards2}
              bannedCards={bannedCards2}
              onCardBan={(card) => handleCardBan(card, false)}
              onCardReorder={(dragIndex, dropIndex) => handleCardReorder(dragIndex, dropIndex, false)}
              onPhaseComplete={() => handlePhaseComplete(false)}
              isReady={player2Ready}
              phase={phase}
              isPracticeMode={isPracticeMode}
              playerName="Player 2's Deck"
            />
          )}
        </div>
      </div>
    </div>
  );
}
