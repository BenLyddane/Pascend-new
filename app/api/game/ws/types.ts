import { GameState } from "@/app/protected/play/game-engine/types";
import { GameActionType } from "../engine/game-actions";
import { WebSocket } from "ws";

export interface GameMessage {
  type: 'action' | 'error' | 'state_update' | 'heartbeat';
  action?: GameActionType;
  gameId?: string;
  payload?: any;
  error?: string;
  timestamp?: number;
}

export interface GameStateUpdate {
  type: 'state_update';
  gameId: string;
  payload: GameState;
  timestamp: number;
}

export interface GameActionResponse {
  type: 'action';
  action: GameActionType;
  gameId?: string;
  payload: any;
  timestamp: number;
}

export interface GameErrorResponse {
  type: 'error';
  error: string;
  timestamp: number;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
  timestamp: number;
}

export type GameResponse = GameStateUpdate | GameActionResponse | GameErrorResponse | HeartbeatMessage;

export interface ExtendedGameState extends GameState {
  player1_id: string;
  player2_id: string;
}

export interface ConnectionManagers {
  gameConnections: Map<string, Set<WebSocket>>;
  userConnections: Map<string, Set<WebSocket>>;
  gameStates: Map<string, ExtendedGameState>;
}
