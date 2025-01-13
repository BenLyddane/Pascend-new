"use client";

import { CardState } from "@/app/protected/play/game-engine/types";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

type CardZoneProps = {
  playerNumber: 1 | 2;
  playerName: string;
  cards: CardState[];
  currentBattleIndex: number;
  onCardClick: (cardState: CardState) => void;
};

export default function CardZone({
  playerNumber,
  playerName,
  cards,
  currentBattleIndex,
  onCardClick,
}: CardZoneProps) {
  return (
    <div className="min-w-0 bg-card/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-2">{playerName}</h3>
      <ScrollArea className="h-[35vh]">
        <div className="grid grid-cols-3 gap-2 pr-4">
          {cards.map((cardState: CardState, index: number) => (
            <div
              key={cardState.card.id}
              className={`relative bg-background border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
                index === currentBattleIndex ? "ring-2 ring-primary" : ""
              } ${cardState.isDefeated ? "opacity-50" : ""}`}
              onClick={() => onCardClick(cardState)}
            >
              {/* Compact Card Layout */}
              <div className="flex h-20">
                {/* Image */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  {cardState.card.image_url ? (
                    <Image
                      src={cardState.card.image_url}
                      alt={cardState.card.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      No Image
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-2 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-semibold truncate">
                      {cardState.card.name}
                    </h4>
                  </div>

                  {/* Stats */}
                  <div className="space-y-1">
                    <Progress
                      value={(cardState.health / cardState.maxHealth) * 100}
                      className="h-1.5"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.1)",
                        ["--progress-background" as string]: `hsl(${Math.max((cardState.health / cardState.maxHealth) * 120, 0)}deg 80% 40%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs">
                      <span>
                        ❤️ {cardState.health}/{cardState.maxHealth}
                      </span>
                      <span>⚔️ {cardState.power}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
