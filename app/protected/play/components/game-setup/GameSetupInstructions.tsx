"use client";

type GameSetupInstructionsProps = {
  phase: "cancel" | "reorder";
};

export function GameSetupInstructions({ phase }: GameSetupInstructionsProps) {
  return (
    <div className="bg-card p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">
        {phase === "cancel" 
          ? "Phase 1: Cancel Cards" 
          : "Phase 2: Order Cards"}
      </h3>
      <p className="text-muted-foreground">
        {phase === "cancel"
          ? "Select 2 cards from your opponent's deck to cancel. Choose wisely! (20 seconds)"
          : "Drag and drop your remaining cards to set their battle order. (10 seconds)"}
      </p>
    </div>
  );
}
