import { useState, useEffect, useRef } from "react";
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

  const initializationInProgress = useRef(false);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    // Reset state when dependencies change
    setGameId(null);
    setGameState(null);
    setError(null);
    setIsLoading(true);
    initializationInProgress.current = false;

    // Cancel any in-flight requests
    if (abortController.current) {
      abortController.current.abort();
    }

    async function initializeGame(retryCount = 0) {
      const maxRetries = 3;
      const retryDelay = 500; // 500ms between retries

      // Add synchronization check
      if (initializationInProgress.current) {
        console.log("[GameInit] Initialization already in progress, skipping");
        return;
      }

      // Add additional check for existing game
      if (gameId) {
        console.log("[GameInit] Game already initialized, skipping");
        return;
      }

      try {
        console.log("[GameInit] Starting initialization attempt", retryCount + 1, "of", maxRetries);
        initializationInProgress.current = true;

        // Create new abort controller for this request
        abortController.current = new AbortController();

        console.log("[GameInit] Starting game initialization", {
          mode,
          player1DeckId,
          player2DeckId,
          cardsCount: {
            player1: player1Cards.length,
            player2: player2Cards.length
          }
        });

        const payload = {
          action: "CREATE_GAME",
          payload: {
            player1Cards,
            player2Cards,
            player1DeckId,
            player2DeckId,
            mode,
            initialVersion: 1, // Explicitly set initial version
          },
        };
        console.log("[GameInit] Sending payload:", payload);

        const response = await fetch("/api/game/engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abortController.current.signal
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.error === "version_conflict" && retryCount < maxRetries - 1) {
            console.log("[GameInit] Version conflict, retrying after delay...");
            if (mounted) {
              retryTimeout = setTimeout(() => {
                initializationInProgress.current = false;
                initializeGame(retryCount + 1);
              }, retryDelay * (retryCount + 1)); // Exponential backoff
            }
            return;
          }
          const errorMessage = data.error === "version_conflict" 
            ? "Game state conflict detected. Please try again." 
            : (data.error || "Failed to initialize game");
          throw new Error(errorMessage);
        }

        console.log("[GameInit] Game initialized successfully:", {
          gameId: data.gameId,
          player1GoesFirst: data.state.player1GoesFirst,
          mode
        });

        if (mounted) {
          setGameId(data.gameId);
          setGameState(data.state);
          setError(null);

          // For practice mode, we need to handle auto-processing
          if (mode === "practice" && data.gameId) {
            console.log("[GameInit] Setting up practice mode auto-processing");
            
            // Set up a more controlled timer to process turns with proper UI updates
            let turnCount = 0;
            const maxTurns = 20; // Limit the number of auto-turns to prevent infinite loops
            
            const processTurnInterval = setInterval(async () => {
              try {
                if (!mounted) {
                  clearInterval(processTurnInterval);
                  return;
                }
                
                // Increment turn count and check if we've reached the limit
                turnCount++;
                if (turnCount > maxTurns) {
                  console.log("[GameInit] Reached maximum auto-turns limit, stopping auto-processing");
                  clearInterval(processTurnInterval);
                  return;
                }
                
                console.log("[GameInit] Auto-processing practice turn", turnCount);
                
                try {
                  // First, get the current game state to determine which cards are active
                  const gameStateResponse = await fetch("/api/game/engine", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "PROCESS_TURN",
                      gameId: data.gameId,
                      payload: {
                        action: { 
                          type: "GET_STATE",
                          payload: {
                            timestamp: Date.now()
                          }
                        },
                        mode: "practice"
                      }
                    })
                  });
                  
                  if (gameStateResponse.ok) {
                    const gameStateData = await gameStateResponse.json();
                    console.log("[GameInit] Current game state:", gameStateData);
                    
                    let currentState = gameStateData.data?.state;
                    if (!currentState) {
                      console.warn("[GameInit] Failed to get current game state");
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      // Skip the rest of this iteration
                      return;
                    }
                    
                    // Determine which player's turn it is
                    const isPlayer1Turn = currentState.currentTurn % 2 === (currentState.player1GoesFirst ? 1 : 0);
                    const attackerCards = isPlayer1Turn ? currentState.player1Cards : currentState.player2Cards;
                    const defenderCards = isPlayer1Turn ? currentState.player2Cards : currentState.player1Cards;
                    
                    // Find the first non-defeated attacker and defender
                    const attackerIndex = attackerCards.findIndex((c: any) => !c.isDefeated);
                    const defenderIndex = defenderCards.findIndex((c: any) => !c.isDefeated);
                    
                    if (attackerIndex === -1 || defenderIndex === -1) {
                      console.log("[GameInit] No valid attackers or defenders found, ending turn");
                      // Just end the turn if no valid attackers or defenders
                      const endTurnResponse = await fetch("/api/game/engine", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "PROCESS_TURN",
                          gameId: data.gameId,
                          payload: {
                            action: { 
                              type: "END_TURN", 
                              payload: {
                                timestamp: Date.now()
                              }
                            },
                            mode: "practice"
                          }
                        })
                      });
                      
                      if (endTurnResponse.ok) {
                        const endTurnData = await endTurnResponse.json();
                        console.log("[GameInit] Turn ended:", endTurnData);
                        
                        // Update the local game state to force UI refresh
                        if (endTurnData.data?.state) {
                          setGameState(endTurnData.data.state);
                        }
                      }
                      
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      return;
                    }
                    
                    // Process the attack
                    console.log(`[GameInit] Processing attack: Card ${attackerIndex} attacking Card ${defenderIndex}`);
                    
                    const attackResponse = await fetch("/api/game/engine", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "PROCESS_TURN",
                        gameId: data.gameId,
                        payload: {
                          action: { 
                            type: "ATTACK", 
                            payload: {
                              attackerIndex: attackerIndex,
                              targetIndex: defenderIndex,
                              timestamp: Date.now()
                            }
                          },
                          mode: "practice"
                        }
                      })
                    });
                    
                    if (attackResponse.ok) {
                      const attackData = await attackResponse.json();
                      console.log("[GameInit] Attack processed:", attackData);
                      
                      // Update the local game state to force UI refresh
                      if (attackData.data?.state) {
                        setGameState(attackData.data.state);
                        
                        // Show the attack animation
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // Now end the turn
                        const endTurnResponse = await fetch("/api/game/engine", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "PROCESS_TURN",
                            gameId: data.gameId,
                            payload: {
                              action: { 
                                type: "END_TURN", 
                                payload: {
                                  timestamp: Date.now()
                                }
                              },
                              mode: "practice"
                            }
                          })
                        });
                        
                        if (endTurnResponse.ok) {
                          const endTurnData = await endTurnResponse.json();
                          console.log("[GameInit] Turn ended:", endTurnData);
                          
                          // Update the local game state to force UI refresh
                          if (endTurnData.data?.state) {
                            setGameState(endTurnData.data.state);
                          }
                        }
                      }
                    } else {
                      console.warn("[GameInit] Failed to process attack:", await attackResponse.text());
                      
                      // Fallback to just ending the turn
                      const fallbackResponse = await fetch("/api/game/engine", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "PROCESS_TURN",
                          gameId: data.gameId,
                          payload: {
                            action: { 
                              type: "END_TURN", 
                              payload: {
                                timestamp: Date.now()
                              }
                            },
                            mode: "practice"
                          }
                        })
                      });
                      
                      if (fallbackResponse.ok) {
                        const fallbackData = await fallbackResponse.json();
                        console.log("[GameInit] Fallback turn ended:", fallbackData);
                        
                        // Update the local game state to force UI refresh
                        if (fallbackData.data?.state) {
                          setGameState(fallbackData.data.state);
                        }
                      }
                    }
                  } else {
                    console.warn("[GameInit] Failed to get game state:", await gameStateResponse.text());
                    
                    // Fallback to just ending the turn
                    const fallbackResponse = await fetch("/api/game/engine", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "PROCESS_TURN",
                        gameId: data.gameId,
                        payload: {
                          action: { 
                            type: "END_TURN", 
                            payload: {
                              timestamp: Date.now()
                            }
                          },
                          mode: "practice"
                        }
                      })
                    });
                    
                    if (fallbackResponse.ok) {
                      const fallbackData = await fallbackResponse.json();
                      console.log("[GameInit] Fallback turn ended:", fallbackData);
                      
                      // Update the local game state to force UI refresh
                      if (fallbackData.data?.state) {
                        setGameState(fallbackData.data.state);
                      }
                    }
                  }
                  
                  // Add a longer delay between turns to allow UI to update
                  await new Promise(resolve => setTimeout(resolve, 3000));
                } catch (error) {
                  console.error("[GameInit] Error in practice mode turn processing:", error);
                  // If we get an error, wait longer before trying again
                  await new Promise(resolve => setTimeout(resolve, 3000));
                }
              } catch (error) {
                console.error("[GameInit] Error in practice mode turn processing:", error);
                // If we get an error, wait longer before trying again
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }, 3000); // Start with a 3 second delay before first auto-turn
            
            // Clean up the interval when component unmounts
            return () => {
              clearInterval(processTurnInterval);
            };
          }
        }
      } catch (error) {
        // Ignore aborted request errors
        if (error instanceof Error && error.name === 'AbortError') {
          console.log("[GameInit] Request aborted");
          return;
        }

        console.error("[GameInit] Error initializing game:", {
          error: error instanceof Error ? error.message : "Unknown error",
          mode,
          player1DeckId,
          player2DeckId
        });
        if (mounted) {
          setError(error instanceof Error ? error.message : "Failed to start game");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          initializationInProgress.current = false;
          abortController.current = null;
        }
      }
    }

    initializeGame();

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
      initializationInProgress.current = false;
    };
  }, [player1Cards, player2Cards, player1DeckId, player2DeckId, mode]); // Run when game setup props change

  return { gameId, gameState, error, isLoading };
}
