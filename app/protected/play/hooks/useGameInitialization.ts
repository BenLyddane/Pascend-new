import { useState, useEffect } from "react";
import { GameState, GameCard } from "../game-engine/types";
import { GameMode } from "../game-modes/types";

interface UseGameInitializationProps {
  player1Cards: GameCard[];
  player2Cards: GameCard[];
  player1DeckId: string;
  player2DeckId: string;
  mode: GameMode;
}

interface UseGameInitializationResult {
  gameId: string | null;
  gameState: GameState | null;
  error: string | null;
  isLoading: boolean;
}

export function useGameInitialization({
  player1Cards,
  player2Cards,
  player1DeckId,
  player2DeckId,
  mode,
}: UseGameInitializationProps): UseGameInitializationResult {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initializeGame() {
      try {
        console.log("Initializing game with mode:", mode);
        const response = await fetch("/api/game/engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CREATE_GAME",
            payload: {
              player1Cards,
              player2Cards,
              player1DeckId,
              player2DeckId,
              mode,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to initialize game");
        }

        const data = await response.json();
        console.log("Game initialized:", data);

        if (mounted) {
          setGameId(data.gameId);
          setGameState(data.state);
          setError(null);
        }
      } catch (error) {
        console.error("Error initializing game:", error);
        if (mounted) {
          setError(error instanceof Error ? error.message : "Failed to start game");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeGame();
    return () => {
      mounted = false;
    };
  }, [player1Cards, player2Cards, player1DeckId, player2DeckId, mode]);

  return { gameId, gameState, error, isLoading };
}
