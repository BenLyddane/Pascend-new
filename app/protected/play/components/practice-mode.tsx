"use client";

import { useState } from "react";
import { Card } from "@/app/protected/play/game-engine/types";
import { Database } from "@/types/database.types";

type Deck = Database["public"]["Tables"]["player_decks"]["Row"] & {
  cards: Card[];
};
import DeckSelector from "./deck-selector";
import GameSetup from "./game-setup";
import GamePlay from "./game-play";

type GameState = "selecting" | "setup" | "playing";

export default function PracticeMode() {
  const [gameState, setGameState] = useState<GameState>("selecting");
  const [selectedDecks, setSelectedDecks] = useState<{
    deck1: Deck | null;
    deck2: Deck | null;
  }>({
    deck1: null,
    deck2: null,
  });
  const [gameCards, setGameCards] = useState<{
    player1Cards: Card[];
    player2Cards: Card[];
  }>({
    player1Cards: [],
    player2Cards: [],
  });

  const handleDeckSelect = (deck: Deck, isFirstDeck: boolean) => {
    setSelectedDecks((prev) => ({
      ...prev,
      [isFirstDeck ? "deck1" : "deck2"]: deck,
    }));
  };

  const handleStartGame = () => {
    if (!selectedDecks.deck1 || !selectedDecks.deck2) return;
    setGameState("setup");
  };

  const handleSetupComplete = (
    deck1Cards: Card[],
    deck2Cards: Card[],
    player1Ready: boolean,
    player2Ready: boolean
  ) => {
    if (player1Ready && player2Ready) {
      setGameCards({
        player1Cards: deck1Cards,
        player2Cards: deck2Cards,
      });
      setGameState("playing");
    }
  };

  const handleGameEnd = (winner: 1 | 2 | "draw") => {
    // TODO: Handle game end, maybe show stats or offer to play again
    console.log("Game ended with winner:", winner);
  };

  if (gameState === "selecting") {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-8">
          <DeckSelector
            label="Player 1's Deck"
            selectedDeck={selectedDecks.deck1}
            onDeckSelect={(deck) => handleDeckSelect(deck, true)}
          />
          <DeckSelector
            label="Player 2's Deck"
            selectedDeck={selectedDecks.deck2}
            onDeckSelect={(deck) => handleDeckSelect(deck, false)}
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleStartGame}
            disabled={!selectedDecks.deck1 || !selectedDecks.deck2}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            Start Practice Game
          </button>
        </div>
      </div>
    );
  }

  if (gameState === "setup") {
    return (
      <GameSetup
        deck1={selectedDecks.deck1!}
        deck2={selectedDecks.deck2!}
        onSetupComplete={handleSetupComplete}
        isPracticeMode
      />
    );
  }

  if (gameState === "playing") {
    return (
      <GamePlay
        player1Cards={gameCards.player1Cards}
        player2Cards={gameCards.player2Cards}
        onGameEnd={handleGameEnd}
      />
    );
  }

  return null;
}
