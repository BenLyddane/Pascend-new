import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { GameState } from "../game-engine/types";
import { validateAndConvertGameState } from "@/app/api/game/engine/utils/state-converter";
import { Database } from "@/types/database.types";
import { RealtimeChannel } from "@supabase/supabase-js";
import { MAX_RECONNECT_ATTEMPTS } from "../types";

type ActiveGame = Database["public"]["Tables"]["active_games"]["Row"];

interface UseGameSubscriptionProps {
  gameId: string | null;
  initialGameState: GameState | null;
  onGameEnd?: (winner: 1 | 2 | "draw", stats: any) => void;
  isOnlineMatch?: boolean;
}

interface UseGameSubscriptionResult {
  gameState: GameState | null;
  error: string | null;
  isReconnecting: boolean;
  reconnectAttempts: number;
}

export function useGameSubscription({
  gameId,
  initialGameState,
  onGameEnd,
  isOnlineMatch = false,
}: UseGameSubscriptionProps): UseGameSubscriptionResult {
  const [gameState, setGameState] = useState<GameState | null>(initialGameState);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (!gameId || !gameState || gameState.winner) return;

    let mounted = true;
    let currentChannel: RealtimeChannel | null = null;
    let lastKnownState = gameState;

    const fetchCurrentState = async (retryCount = 0): Promise<GameState> => {
      try {
        const { data: game, error } = await supabase
          .from("active_games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (error) {
          throw new Error(`Failed to fetch game state: ${error.message}`);
        }

        if (!game || !game.game_state) {
          throw new Error("Game not found");
        }

        return validateAndConvertGameState(game.game_state);
      } catch (error) {
        if (retryCount < 2) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, retryCount))
          );
          return fetchCurrentState(retryCount + 1);
        }
        throw error;
      }
    };

    const setupSubscription = async () => {
      try {
        const currentState = await fetchCurrentState();

        if (currentState.currentTurn > lastKnownState.currentTurn) {
          setGameState(currentState);
          lastKnownState = currentState;
        }

        const channel = supabase
          .channel(`game_${gameId}`, {
            config: {
              broadcast: { ack: true },
              presence: { key: "game" },
            },
          })
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "active_games",
              filter: `id=eq.${gameId}`,
            },
            (payload: any) => {
              if (!mounted) return;

              try {
                if (!payload.new?.game_state) {
                  return;
                }

                const newGameState = validateAndConvertGameState(
                  payload.new.game_state
                );

                // Log the realtime payload and state update
                console.log("[GamePlay] Received realtime update:", {
                  turn: newGameState.currentTurn,
                  battleLogLength: newGameState.battleLog.length,
                  lastEntry: newGameState.battleLog[newGameState.battleLog.length - 1]
                });

                // Force a UI update by creating a new object reference
                const updatedState = {
                  ...newGameState,
                  // Add a timestamp to ensure React detects the change
                  _lastUpdated: new Date().getTime()
                };

                // Always update the game state to ensure UI is in sync
                setGameState(updatedState);
                lastKnownState = newGameState;

                if (newGameState.winner) {
                  onGameEnd?.(newGameState.winner, newGameState.stats);
                }
              } catch (error) {
                setError("Error updating game state");
              }
            }
          )
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              setIsReconnecting(false);
              setReconnectAttempts(0);
              setError(null);
            } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
              if (lastKnownState.winner) {
                return;
              }

              if (!isReconnecting) {
                setIsReconnecting(true);

                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 5000);
                  setReconnectAttempts((prev) => prev + 1);

                  setTimeout(async () => {
                    if (mounted && !lastKnownState.winner) {
                      try {
                        if (currentChannel) {
                          await currentChannel.unsubscribe();
                          currentChannel = null;
                        }

                        const currentState = await fetchCurrentState();
                        if (mounted && !currentState.winner) {
                          setGameState(currentState);
                          lastKnownState = currentState;
                          setupSubscription().catch(console.error);
                        } else {
                          setIsReconnecting(false);
                        }
                      } catch (error) {
                        if (mounted && !lastKnownState.winner) {
                          setError("Error reconnecting to game");
                        }
                        setIsReconnecting(false);
                      }
                    } else {
                      setIsReconnecting(false);
                    }
                  }, delay);
                } else {
                  setError("Lost connection to game server - please refresh the page");
                  setIsReconnecting(false);
                }
              }
            }
          });

        currentChannel = channel;
        return channel;
      } catch (error) {
        throw error;
      }
    };

    setupSubscription().catch((error) => {
      if (mounted) {
        setError("Failed to connect to game server");
      }
    });

    return () => {
      mounted = false;
      if (currentChannel) {
        currentChannel.unsubscribe().catch(console.error);
      }
    };
  }, [gameId, gameState?.winner, onGameEnd, isOnlineMatch]);

  return {
    gameState,
    error,
    isReconnecting,
    reconnectAttempts,
  };
}
