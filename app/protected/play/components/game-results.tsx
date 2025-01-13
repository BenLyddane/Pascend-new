"use client";

import { CardState } from "@/app/protected/play/game-engine/types";

type GameResultsProps = {
  winner: 1 | 2 | "draw";
  survivingCards: CardState[];
  onReturnToMatchmaking?: () => void;
  isMatchmaking?: boolean;
};

export default function GameResults({
  winner,
  survivingCards,
  onReturnToMatchmaking,
  isMatchmaking = false,
}: GameResultsProps) {
  return (
    <div className="bg-card/50 p-4 rounded-lg text-center">
      <h2 className="text-xl font-bold mb-2">
        {winner === "draw" ? "It's a Draw!" : `Player ${winner} Wins!`}
      </h2>
      {winner !== "draw" && survivingCards.length > 0 && (
        <div className="mb-2">
          <h3 className="text-sm font-semibold mb-2">Surviving Cards:</h3>
          <div className="flex gap-2 justify-center">
            {survivingCards
              .filter((card: CardState) => !card.isDefeated)
              .map((cardState: CardState) => (
                <div key={cardState.card.id} className="relative w-16">
                  <img
                    src={cardState.card.image_url || "/placeholder.png"}
                    alt={cardState.card.name}
                    className="w-full h-20 object-cover rounded-lg"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 p-1 text-[10px] text-center truncate">
                    {cardState.card.name}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      <div className="flex gap-4 justify-center">
        {isMatchmaking && onReturnToMatchmaking && (
          <button
            onClick={onReturnToMatchmaking}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Return to Matchmaking
          </button>
        )}
        <button
          onClick={() => (window.location.href = "/protected/play")}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
        >
          Return to Start
        </button>
      </div>
    </div>
  );
}
