import { GameMode } from '../types';
import { GameState } from '../../game-engine/types';

export type SetupPhase = "setup";

export interface BaseSetupManagerProps {
  mode: GameMode;
  onSetupComplete: (initialState: GameState) => void;
}

export interface BaseGameManagerProps {
  mode: GameMode;
  gameState: GameState;
  onGameEnd: (winner: number) => void;
}
