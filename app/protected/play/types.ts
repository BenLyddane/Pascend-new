import { GameCard, GameState } from "./game-engine/types";
import { GameMode } from "./game-modes/types";

export interface GamePlayProps {
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

export interface ConnectionState {
  isProcessing: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  error: string | null;
}

export interface GamePlayState {
  gameId: string | null;
  gameState: GameState | null;
  selectedCard: GameCard | null;
  isModalOpen: boolean;
  userName: string;
}

export const MAX_RECONNECT_ATTEMPTS = 3;
