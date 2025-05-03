import { WebSocket } from "ws";
import { ConnectionManagers, ExtendedGameState, GameStateUpdate } from "./types";

export const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export class ConnectionManager {
  private gameConnections: Map<string, Set<WebSocket>>;
  private userConnections: Map<string, Set<WebSocket>>;
  private gameStates: Map<string, ExtendedGameState>;

  constructor() {
    this.gameConnections = new Map();
    this.userConnections = new Map();
    this.gameStates = new Map();
  }

  getManagers(): ConnectionManagers {
    return {
      gameConnections: this.gameConnections,
      userConnections: this.userConnections,
      gameStates: this.gameStates
    };
  }

  addUserConnection(userId: string, ws: WebSocket): void {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)?.add(ws);
  }

  addGameConnection(gameId: string, ws: WebSocket): void {
    if (!this.gameConnections.has(gameId)) {
      this.gameConnections.set(gameId, new Set());
    }
    this.gameConnections.get(gameId)?.add(ws);
  }

  setGameState(gameId: string, state: ExtendedGameState): void {
    this.gameStates.set(gameId, state);
  }

  getGameState(gameId: string): ExtendedGameState | undefined {
    return this.gameStates.get(gameId);
  }

  broadcastGameState(gameId: string, state: ExtendedGameState): void {
    const connections = this.gameConnections.get(gameId);
    if (connections) {
      const update: GameStateUpdate = {
        type: 'state_update',
        gameId,
        payload: state,
        timestamp: Date.now()
      };

      connections.forEach(conn => {
        if (conn.readyState === WebSocket.OPEN) {
          conn.send(JSON.stringify(update));
        }
      });
    }
  }

  setupHeartbeat(ws: WebSocket): NodeJS.Timeout {
    return setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
          type: 'heartbeat',
          timestamp: Date.now()
        }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  removeConnection(ws: WebSocket, userId: string): void {
    // Clean up user connection
    const userConns = this.userConnections.get(userId);
    if (userConns) {
      userConns.delete(ws);
      if (userConns.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    // Clean up game connections
    this.gameConnections.forEach((connections, gameId) => {
      connections.delete(ws);
      if (connections.size === 0) {
        this.gameConnections.delete(gameId);
        this.gameStates.delete(gameId);
      }
    });
  }

  cleanupGame(gameId: string): void {
    const connections = this.gameConnections.get(gameId);
    if (connections) {
      this.gameConnections.delete(gameId);
      this.gameStates.delete(gameId);
    }
  }
}

export const connectionManager = new ConnectionManager();
