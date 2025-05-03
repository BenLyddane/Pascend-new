"use client";

import { useGameInitialization } from "../hooks/useGameInitialization";
import { useGameSubscription } from "../hooks/useGameSubscription";
import { useUserProfile } from "../hooks/useUserProfile";
import { GameCard } from "../game-engine/types";
import { GameMode } from "../game-modes/types";
import GamePlayUI from "./GamePlayUI";
import { saveMatchStats, getCurrentUserId } from "../services/matchStatsService";

interface GamePlayProps {
  player1Cards: GameCard[];
  player2Cards: GameCard[];
  player1DeckId: string;
  player2DeckId: string;
  onGameEnd?: (winner: 1 | 2 | "draw", stats: any) => void;
  isOnlineMatch?: boolean;
  mode: GameMode;
  opponentId?: string;
  onReturnToMatchmaking?: () => void;
}

export default function GamePlay({
  player1Cards,
  player2Cards,
  player1DeckId,
  player2DeckId,
  onGameEnd,
  isOnlineMatch = false,
  mode,
  opponentId,
  onReturnToMatchmaking,
}: GamePlayProps) {
  // Initialize game
  const { gameId, gameState, error: initError, isLoading } = useGameInitialization({
    player1Cards,
    player2Cards,
    player1DeckId,
    player2DeckId,
    mode,
  });

  // Subscribe to game updates
  const { gameState: currentGameState, error: subscriptionError, isReconnecting, reconnectAttempts } = 
    useGameSubscription({
      gameId,
      initialGameState: gameState,
      onGameEnd: async (winner, stats) => {
        if (isOnlineMatch && opponentId) {
          try {
            const userId = await getCurrentUserId();
            await saveMatchStats(userId, opponentId, winner, stats);
          } catch (error) {
            console.error("Error saving match stats:", error);
          }
        }
        onGameEnd?.(winner, stats);
      },
      isOnlineMatch,
    });

  // Get user profile
  const { userName, error: profileError } = useUserProfile();

  // Combine errors
  const error = initError || subscriptionError || profileError;

  if (isLoading || !gameState) {
    return <div>Loading game...</div>;
  }

  return (
    <GamePlayUI
      gameState={currentGameState || gameState}
      userName={userName}
      mode={mode}
      error={error}
      isReconnecting={isReconnecting}
      onReturnToMatchmaking={onReturnToMatchmaking}
      isOnlineMatch={isOnlineMatch}
    />
  );
}
