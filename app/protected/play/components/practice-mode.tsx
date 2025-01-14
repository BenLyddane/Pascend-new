"use client";

import { useState } from "react";
import {
  GameCard,
  convertToGameCard,
} from "@/app/protected/play/game-engine/types";
import { GameMode } from "../game-modes/types";
import { DeckWithCards, CardWithEffects } from "@/app/actions/fetchDecks";
import DeckSelector from "./deck-selector";
import GameSetup from "./game-setup";
import GamePlay from "./game-play";

type GameState = "selecting" | "setup" | "playing";

export default function PracticeMode() {
  const [gameState, setGameState] = useState<GameState>("selecting");
  const [selectedDecks, setSelectedDecks] = useState<{
    deck1: DeckWithCards | null;
    deck2: DeckWithCards | null;
  }>({
    deck1: null,
    deck2: null,
  });
  const [gameCards, setGameCards] = useState<{
    player1Cards: GameCard[];
    player2Cards: GameCard[];
  }>({
    player1Cards: [],
    player2Cards: [],
  });

  const handleDeckSelect = (deck: DeckWithCards, isFirstDeck: boolean) => {
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
    deck1Cards: CardWithEffects[],
    deck2Cards: CardWithEffects[],
    player1Ready: boolean,
    player2Ready: boolean
  ) => {
    if (player1Ready && player2Ready && selectedDecks.deck1 && selectedDecks.deck2) {
      try {
        // Convert UI cards to game cards and include deck IDs
        const gameCards1 = deck1Cards.map(card => ({
          ...convertToGameCard(card),
          deck_id: selectedDecks.deck1!.id
        }));
        const gameCards2 = deck2Cards.map(card => ({
          ...convertToGameCard(card),
          deck_id: selectedDecks.deck2!.id
        }));

        setGameCards({
          player1Cards: gameCards1,
          player2Cards: gameCards2,
        });
        setGameState("playing");
      } catch (error) {
        console.error("Error converting cards:", error);
      }
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
        mode="practice"
      />
    );
  }

  if (gameState === "playing" && selectedDecks.deck1 && selectedDecks.deck2) {
    return (
      <GamePlay
        player1Cards={gameCards.player1Cards}
        player2Cards={gameCards.player2Cards}
        player1DeckId={selectedDecks.deck1.id}
        player2DeckId={selectedDecks.deck2.id}
        onGameEnd={handleGameEnd}
        mode="practice"
        isOnlineMatch={false}
      />
    );
  }

  return null;
}
