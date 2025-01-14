"use client";

import { GameModeConfig } from "../../game-modes/types";
import { SetupPhase } from "../../game-modes/base/types";

type GameSetupTimerProps = {
  timeRemaining: number;
  phase: SetupPhase;
  mode: GameModeConfig;
};

export function GameSetupTimer({ timeRemaining, phase, mode }: GameSetupTimerProps) {
  // Don't show timer if mode doesn't have time limits
  if (!mode.setup.banTimeLimit) return null;

  return (
    <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-background border-4 border-primary flex items-center justify-center">
      <div className="text-center">
        <span className={`text-3xl font-bold ${timeRemaining <= 5 ? 'text-red-500' : ''}`}>
          {timeRemaining}
        </span>
        <div className="text-xs mt-1">Setup</div>
      </div>
    </div>
  );
}
