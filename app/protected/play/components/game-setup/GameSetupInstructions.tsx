"use client";

type GameSetupInstructionsProps = {
  phase: "ban" | "reorder";
};

export function GameSetupInstructions({ phase }: GameSetupInstructionsProps) {
  return (
    <div className="bg-card p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">
        {phase === "ban" 
          ? "Phase 1: Ban Cards" 
          : "Phase 2: Order Cards"}
      </h3>
      <p className="text-muted-foreground">
        {phase === "ban"
          ? "Select 2 cards from your opponent's deck to ban. Choose wisely!"
          : "Drag and drop your remaining cards to set their battle order."}
      </p>
    </div>
  );
}
