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
        console.error(
          `[GamePlay] Error fetching current state (attempt ${retryCount + 1}/3):`,
          error
        );

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
          console.log("[GamePlay] Updating to current state after gap");
          setGameState(currentState);
          lastKnownState = currentState;
        }

        console.log(`[GamePlay] Setting up subscription for game ${gameId}`);
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
                  console.error("[GamePlay] Received update with no game state");
                  return;
                }

                const newGameState = validateAndConvertGameState(
                  payload.new.game_state
                );
                console.log("[GamePlay] Received new game state:", {
                  turn: newGameState.currentTurn,
                  battleLogLength: newGameState.battleLog.length,
                });

                if (
                  lastKnownState.currentTurn > 1 &&
                  newGameState.currentTurn !== lastKnownState.currentTurn + 1
                ) {
                  console.log("[GamePlay] State discontinuity detected, syncing state");
                  fetchCurrentState()
                    .then((currentState) => {
                      if (mounted) {
                        console.log(
                          "[GamePlay] Synced to current state:",
                          currentState.currentTurn
                        );
                        setGameState(currentState);
                        lastKnownState = currentState;
                      }
                    })
                    .catch((error) => {
                      console.error("[GamePlay] Error syncing state:", error);
                      setError("Error syncing game state");
                    });
                  return;
                }

                setGameState(newGameState);
                lastKnownState = newGameState;

                if (newGameState.winner) {
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
            if (status === "SUBSCRIBED") {
              console.log(`[GamePlay] Successfully subscribed to game ${gameId}`);
              setIsReconnecting(false);
              setReconnectAttempts(0);
              setError(null);
            } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
              if (lastKnownState.winner) {
                console.log("[GamePlay] Game ended, ignoring connection close");
                return;
              }

              if (!isReconnecting) {
                console.log(`[GamePlay] Subscription ${status} for game ${gameId}`);
                setIsReconnecting(true);

                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 5000);
                  console.log(
                    `[GamePlay] Attempting to reconnect in ${delay}ms (attempt ${
                      reconnectAttempts + 1
                    })`
                  );
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
                        console.error(
                          "[GamePlay] Failed to fetch state during reconnect:",
                          error
                        );
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
        console.error("[GamePlay] Error setting up subscription:", error);
        throw error;
      }
    };

    setupSubscription().catch((error) => {
      console.error("[GamePlay] Fatal error in subscription setup:", error);
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
