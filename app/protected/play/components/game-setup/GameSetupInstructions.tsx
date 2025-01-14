"use client";

import { GameModeConfig } from "../../game-modes/types";
import { SetupPhase } from "../../game-modes/base/types";

type GameSetupInstructionsProps = {
  phase: SetupPhase;
  mode: GameModeConfig;
};

export function GameSetupInstructions({ phase, mode }: GameSetupInstructionsProps) {
  return (
    <div className="bg-card p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">
        Game Setup
      </h3>
      <p className="text-muted-foreground">
        {mode.setup.requireBothPlayersReady
          ? "First, select 2 cards from each deck to ban. Then drag and drop the remaining cards to set their battle order. Both players must be ready to start."
          : "Select 2 cards from your opponent's deck to ban, then drag and drop your remaining cards to set their battle order."}
      </p>
      {mode.setup.banTimeLimit && (
        <p className="text-sm text-red-500 mt-2">
          You have {mode.setup.banTimeLimit} seconds to complete setup!
        </p>
      )}
    </div>
  );
}
