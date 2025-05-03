import { createClient } from "@/utils/supabase/server";
import { WebSocketServer } from "@/utils/websocket/server";
import { GameActionType, GameActionResult } from "../engine/game-actions";
import { validateGameAction } from "../validate-game-action";
import { ConnectionManager } from "./connection-manager";
import { GameActionHandler } from "./action-handlers";
import { WebSocket } from "ws";
import { GameMessage, GameErrorResponse, HeartbeatMessage } from "./types";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export async function GET(request: Request) {
  const wss = new WebSocketServer();
  const connectionManager = new ConnectionManager();

  wss.on('connection', async (ws: WebSocket) => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        error: 'Unauthorized',
        timestamp: Date.now()
      }));
      ws.close();
      return;
    }

    // Add user connection
    connectionManager.addUserConnection(user.id, ws);

    // Set up heartbeat
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const heartbeat: HeartbeatMessage = {
          type: 'heartbeat',
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(heartbeat));
      }
    }, HEARTBEAT_INTERVAL);

    // Initialize action handler
    const actionHandler = new GameActionHandler(supabase, connectionManager, ws, user.id);

    ws.on('message', async (data: string) => {
      try {
        const message: GameMessage = JSON.parse(data);

        // Handle heartbeat response
        if (message.type === 'heartbeat') {
          const heartbeat: HeartbeatMessage = {
            type: 'heartbeat',
            timestamp: Date.now()
          };
          ws.send(JSON.stringify(heartbeat));
          return;
        }

        if (message.type !== 'action') {
          throw new Error(`Invalid message type: ${message.type}`);
        }

        if (!message.action) {
          throw new Error('Missing action type');
        }

        // Validate action before processing
        if (message.gameId && message.action !== 'CREATE_GAME') {
          const currentState = connectionManager.getGameState(message.gameId);
          if (!currentState) {
            throw new Error('Game state not found');
          }

          const validationResult = validateGameAction(
            message.payload,
            currentState,
            user.id === currentState.player1_id
          );

          if (!validationResult.isValid) {
            throw new Error(validationResult.error || 'Invalid action');
          }
        }

        // Handle action based on type
        switch (message.action) {
          case 'CREATE_GAME':
            await actionHandler.handleCreateGame(message.payload);
            break;

          case 'PROCESS_TURN':
            if (!message.gameId) {
              throw new Error('Game ID required for process turn');
            }
            await actionHandler.handleProcessTurn(message.gameId, message.payload);
            break;

          case 'START_AUTO_PROCESSING':
            if (!message.gameId) {
              throw new Error('Game ID required for auto processing');
            }
            await actionHandler.handleAutoProcessing(message.gameId);
            break;

          case 'END_GAME':
            if (!message.gameId) {
              throw new Error('Game ID required for end game');
            }
            await actionHandler.handleEndGame(message.gameId, message.payload);
            break;

          default:
            throw new Error(`Invalid action: ${message.action}`);
        }
      } catch (error) {
        console.error('[WebSocket] Error:', error);
        const errorResponse: GameErrorResponse = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Internal server error',
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(errorResponse));
      }
    });

    ws.on('close', () => {
      // Clear heartbeat interval
      clearInterval(heartbeatInterval);

      // Clean up connections
      connectionManager.removeConnection(ws, user.id);
    });
  });

  return wss.handleRequest(request);
}
