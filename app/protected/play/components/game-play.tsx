"use client";

import { useState, useEffect } from "react";
import { CardModal } from "@/components/card-modal";
import { GameCard, CardState, GameState } from "@/app/protected/play/game-engine/types";
import { GameMode, GAME_MODES } from "../game-modes/types";
import BattleLog from "./battle-log";
import CardZone from "./card-zone";
import GameResults from "./game-results";
import { createClient } from "@/utils/supabase/client";
import { updateMatchStats } from "@/app/actions/updateMatchStats";

type GamePlayProps = {
  player1Cards: GameCard[];
  player2Cards: GameCard[];
  player1DeckId: string;
  player2DeckId: string;
  onGameEnd?: (winner: 1 | 2 | "draw", stats: any) => void;
  isOnlineMatch?: boolean;
  mode: GameMode;
  opponentId?: string;
  onReturnToMatchmaking?: () => void;
};

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
  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  const supabase = createClient();

  // Initialize game
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
              mode
            }
          })
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
          setError(null); // Clear any previous errors
        }
      } catch (error) {
        console.error("Error initializing game:", error);
        if (mounted) {
          setError(error instanceof Error ? error.message : "Failed to start game");
        }
      }
    }

    initializeGame();
    return () => {
      mounted = false;
    };
  }, [player1Cards, player2Cards, mode]);

  // Subscribe to game updates
  useEffect(() => {
    if (!gameId || !gameState || gameState.winner) return;

    let mounted = true;

    // Subscribe to game state changes
    const setupSubscription = () => {
      console.log(`[GamePlay] Setting up subscription for game ${gameId}`);
      return supabase
        .channel(`game:${gameId}`)
        .on<{ game_state: GameState }>(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'active_games',
            filter: `id=eq.${gameId}`,
          },
          (payload) => {
          if (!mounted) return;
          
          try {
            const newGameState = payload.new.game_state;
            if (!newGameState) {
              console.error("[GamePlay] Received update with no game state");
              return;
            }

            setGameState(newGameState);
            
            if (newGameState.winner) {
              if (isOnlineMatch) {
                saveMatchStats(newGameState.winner, newGameState.stats);
              }
              onGameEnd?.(newGameState.winner, newGameState.stats);
            }
          } catch (error) {
            console.error("[GamePlay] Error processing game state update:", error);
            setError("Error updating game state");
          }
        }
      )
      .subscribe(async (status) => {
        console.log(`[GamePlay] Subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`[GamePlay] Successfully subscribed to game ${gameId}`);
          setIsReconnecting(false);
          setReconnectAttempts(0);
          setError(null);
        } else if (status === 'CLOSED') {
          console.log(`[GamePlay] Subscription closed for game ${gameId}`);
          setIsReconnecting(true);
          
          // Only attempt to reconnect if we haven't exceeded max attempts
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log(`[GamePlay] Attempting to reconnect (attempt ${reconnectAttempts + 1})`);
            setReconnectAttempts(prev => prev + 1);
            
            // Wait a bit before attempting to reconnect
            await new Promise(resolve => setTimeout(resolve, 2000));
            const newChannel = setupSubscription();
            
            // If this attempt fails, the status will be CLOSED again
            if (mounted) {
              channel.current = newChannel;
            }
          } else {
            setError("Lost connection to game server - please refresh the page");
            setIsReconnecting(false);
          }
        }
      });
    };

    let channel = { current: setupSubscription() };

    // Start automatic turn processing on the server
    fetch("/api/game/engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "START_AUTO_PROCESSING",
        gameId,
        payload: { mode }
      })
    }).catch(error => {
      console.error("[GamePlay] Error starting auto processing:", error);
      if (mounted) {
        setError("Failed to start game processing");
      }
    });

    return () => {
      mounted = false;
      channel.current.unsubscribe();
      
      // Cleanup game on unmount
      if (gameId) {
        console.log("Cleaning up game:", gameId);
        fetch("/api/game/engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "END_GAME",
            gameId
          })
        }).catch(console.error);
      }
    };
  }, [gameId, gameState?.winner, mode, isOnlineMatch, onGameEnd]);

  // Get user's display name
  useEffect(() => {
    async function getUserName() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("player_profiles")
          .select("settings")
          .eq("user_id", user.id)
          .single();

        if (profile?.settings?.display_name) {
          setUserName(profile.settings.display_name);
        } else {
          setUserName(user.email?.split("@")[0] || "Player");
        }
      }
    }
    getUserName();
  }, []);

  const saveMatchStats = async (winner: 1 | 2 | "draw", stats: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isOnlineMatch || !opponentId) return;

      await updateMatchStats(user.id, opponentId, winner, stats);
    } catch (error) {
      console.error("Error saving match stats:", error);
    }
  };

  if (!gameState) {
    return <div>Loading game...</div>;
  }

  // Show reconnecting state but keep the battle log visible
  const connectionStatus = isReconnecting ? (
    <div className="fixed top-4 right-4 bg-yellow-500/90 text-black px-4 py-2 rounded-md shadow-lg z-50">
      Reconnecting to game server...
    </div>
  ) : error ? (
    <div className="fixed top-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-md shadow-lg z-50">
      {error}
    </div>
  ) : null;

  return (
    <div className="grid grid-cols-2 gap-8 relative">
      {connectionStatus}
      {/* Left Column: Card Zones and Results */}
      <div className="flex flex-col gap-4 relative">
        <div className="space-y-4 relative">
          {/* Game Results Overlay */}
          {gameState.winner && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <GameResults
                winner={gameState.winner}
                survivingCards={[
                  ...gameState.player1Cards,
                  ...gameState.player2Cards,
                ]}
                onReturnToMatchmaking={onReturnToMatchmaking}
                isMatchmaking={isOnlineMatch}
                drawReason={gameState.drawReason}
              />
            </div>
          )}
          {/* Player's Cards */}
          <CardZone
            playerNumber={1}
            playerName={userName}
            cards={gameState.player1Cards}
            currentBattleIndex={gameState.currentBattle.card1Index}
            onCardClick={(cardState: CardState) => {
              setSelectedCard(cardState.card);
              setIsModalOpen(true);
            }}
          />

          {/* AI's Cards */}
          <CardZone
            playerNumber={2}
            playerName={mode === 'practice' ? "Player 2" : "AI Opponent"}
            cards={gameState.player2Cards}
            currentBattleIndex={gameState.currentBattle.card2Index}
            onCardClick={(cardState: CardState) => {
              setSelectedCard(cardState.card);
              setIsModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* Right Column: Battle Log */}
      <div className="h-[calc(100vh-100px)]">
        <BattleLog
          entries={gameState.battleLog}
          player1GoesFirst={gameState.player1GoesFirst}
          player1Name={userName}
          player2Name={mode === 'practice' ? "Player 2" : "AI Opponent"}
        />
      </div>

      {/* Single Card Modal */}
      <CardModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCard(null);
        }}
      />
    </div>
  );
}
