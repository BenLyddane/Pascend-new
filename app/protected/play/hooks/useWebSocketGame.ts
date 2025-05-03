import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState } from '../game-engine/types';
import { GameActionType, ActionPayload } from '@/app/api/game/engine/game-actions';
import { GameMessage, GameResponse } from '@/app/api/game/ws/types';

interface UseWebSocketGameProps {
  gameId: string | null;
  initialGameState: GameState | null;
  onGameEnd?: (winner: 1 | 2 | "draw", stats: any) => void;
}

interface UseWebSocketGameResult {
  gameState: GameState | null;
  error: string | null;
  isConnected: boolean;
  sendGameAction: (action: GameActionType, payload: any) => void;
}

const WS_RECONNECT_DELAY = 1000;

// Define WebSocket readyState values
const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export function useWebSocketGame({
  gameId,
  initialGameState,
  onGameEnd,
}: UseWebSocketGameProps): UseWebSocketGameResult {
  const [gameState, setGameState] = useState<GameState | null>(initialGameState);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocketState.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setError(null);

        // Start sending heartbeat messages
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocketState.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
          }
        }, 30000); // Send heartbeat every 30 seconds
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Clear heartbeat interval
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt to reconnect after delay if not a normal closure
        if (event.code !== 1000) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            if (gameState && !gameState.winner) {
              connect();
            }
          }, WS_RECONNECT_DELAY);
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        setError('Connection error');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as GameResponse;

          switch (message.type) {
            case 'state_update': {
              const newState = message.payload;
              setGameState((prevState) => {
                // Always update if we receive a new state to ensure UI is in sync
                // But check for version to prevent race conditions
                if (!prevState || 
                    (newState.version ?? 0) >= (prevState?.version ?? 0)) {
                  console.log("[WebSocket] Updating game state:", newState);
                  
                  // Check if the game has ended
                  if (newState.winner && !prevState?.winner) {
                    onGameEnd?.(newState.winner, newState.stats);
                  }
                  
                  return newState;
                }
                
                console.log("[WebSocket] Ignoring outdated state update");
                return prevState;
              });
              break;
            }

            case 'error': {
              console.error('[WebSocket] Game error:', message.error);
              setError(message.error || 'Unknown error');
              break;
            }

            case 'action': {
              // Action responses are handled by the game state updates
              break;
            }

            case 'heartbeat': {
              // Received heartbeat from server, connection is alive
              break;
            }
          }
        } catch (error) {
          console.error('[WebSocket] Message parsing error:', error);
          setError('Failed to process game update');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setError('Failed to establish connection');
    }
  }, [gameState, onGameEnd]);

  useEffect(() => {
    if (gameId && !gameState?.winner) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [gameId, gameState?.winner, connect]);

  const sendGameAction = useCallback(<T extends GameActionType>(action: T, payload: ActionPayload<T>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocketState.OPEN) {
      setError('Not connected to game server');
      return;
    }

    const message: GameMessage = {
      type: 'action',
      action,
      gameId: gameId ?? undefined,
      payload,
    };

    wsRef.current.send(JSON.stringify(message));
  }, [gameId]);

  return {
    gameState,
    error,
    isConnected,
    sendGameAction,
  };
}
