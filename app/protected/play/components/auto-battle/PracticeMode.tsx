"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/types/game.types";
import AutoBattleUI from "./AutoBattleUI";
import { fetchDecks, FetchDecksResult } from "@/app/actions/fetchDecks";

export default function PracticeMode() {
  const router = useRouter();
  const [decks, setDecks] = useState<FetchDecksResult["decks"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeck1, setSelectedDeck1] = useState<string | null>(null);
  const [selectedDeck2, setSelectedDeck2] = useState<string | null>(null);
  const [deck1Cards, setDeck1Cards] = useState<Card[]>([]);
  const [deck2Cards, setDeck2Cards] = useState<Card[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

  // Fetch user decks
  useEffect(() => {
    const loadDecks = async () => {
      try {
        setLoading(true);
        // Get the current user ID - in a real implementation, you would get this from auth context
        // For now, we'll use a placeholder
        const userId = "current-user"; // Replace with actual user ID in production
        const result = await fetchDecks(userId);
        setDecks(result.decks);
      } catch (error) {
        setError("Failed to load decks");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadDecks();
  }, []);

  // Handle deck selection
  const handleDeckSelect = (deckId: string, player: 1 | 2) => {
    if (player === 1) {
      setSelectedDeck1(deckId);
    } else {
      setSelectedDeck2(deckId);
    }
  };

  // Start the game
  const handleStartGame = () => {
    if (!selectedDeck1 || !selectedDeck2) {
      setError("Please select decks for both players");
      return;
    }

    // Find the selected decks
    const deck1 = decks.find(deck => deck.id === selectedDeck1);
    const deck2 = decks.find(deck => deck.id === selectedDeck2);

    if (!deck1 || !deck2) {
      setError("Selected decks not found");
      return;
    }

    // Set the cards for each deck
    setDeck1Cards(deck1.cards);
    setDeck2Cards(deck2.cards);
    setGameStarted(true);
  };

  // Handle game end
  const handleGameEnd = (winner: 1 | 2 | "draw", stats: any) => {
    console.log(`Game ended. Winner: ${winner}`, stats);
    // You could save stats or show a modal here
  };

  // Reset the game
  const handleReset = () => {
    setGameStarted(false);
    setSelectedDeck1(null);
    setSelectedDeck2(null);
    setDeck1Cards([]);
    setDeck2Cards([]);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading decks...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (gameStarted) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Practice Mode</h1>
          <Button onClick={handleReset}>New Game</Button>
        </div>
        
        <AutoBattleUI
          player1Cards={deck1Cards}
          player2Cards={deck2Cards}
          player1DeckId={selectedDeck1!}
          player2DeckId={selectedDeck2!}
          onGameEnd={handleGameEnd}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Practice Mode</h1>
      <p>Select two decks to battle against each other</p>
      
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Player 1 Deck</h2>
          <div className="grid grid-cols-2 gap-4">
            {decks.map(deck => (
              <div
                key={deck.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedDeck1 === deck.id ? "border-primary bg-primary/10" : "hover:bg-gray-100"
                }`}
                onClick={() => handleDeckSelect(deck.id, 1)}
              >
                <h3 className="font-semibold">{deck.name}</h3>
                <p className="text-sm text-gray-500">{deck.cards.length} cards</p>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Player 2 Deck</h2>
          <div className="grid grid-cols-2 gap-4">
            {decks.map(deck => (
              <div
                key={deck.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedDeck2 === deck.id ? "border-primary bg-primary/10" : "hover:bg-gray-100"
                }`}
                onClick={() => handleDeckSelect(deck.id, 2)}
              >
                <h3 className="font-semibold">{deck.name}</h3>
                <p className="text-sm text-gray-500">{deck.cards.length} cards</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button 
          onClick={handleStartGame}
          disabled={!selectedDeck1 || !selectedDeck2}
          size="lg"
        >
          Start Battle
        </Button>
      </div>
    </div>
  );
}
