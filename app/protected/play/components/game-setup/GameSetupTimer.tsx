"use client";

type GameSetupTimerProps = {
  timeRemaining: number;
  phase: "cancel" | "reorder";
  isPracticeMode: boolean;
};

export function GameSetupTimer({ timeRemaining, phase, isPracticeMode }: GameSetupTimerProps) {
  if (isPracticeMode) return null;

  return (
    <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-background border-4 border-primary flex items-center justify-center">
      <div className="text-center">
        <span className={`text-3xl font-bold ${timeRemaining <= 5 ? 'text-red-500' : ''}`}>
          {timeRemaining}
        </span>
        <div className="text-xs mt-1">{phase === "cancel" ? "Cancel" : "Order"}</div>
      </div>
    </div>
  );
}
