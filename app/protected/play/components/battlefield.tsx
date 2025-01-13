"use client";

import { GameCard } from "@/components/game-card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardState } from "@/app/protected/play/game-engine/types";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";

type BattlefieldProps = {
  player1Cards: CardState[];
  player2Cards: CardState[];
  currentBattle: {
    card1Index: number;
    card2Index: number;
    winner?: number | 'draw';
  };
  onCardClick: (card: CardState) => void;
};

export default function Battlefield({
  player1Cards,
  player2Cards,
  currentBattle,
  onCardClick,
}: BattlefieldProps) {
  return (
    <div className="relative grid grid-cols-2 gap-8">
      {/* Game Result Display */}
      {currentBattle.winner && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-background/95 backdrop-blur-sm border-2 border-primary rounded-lg px-8 py-4 text-center shadow-xl">
            <h2 className="text-2xl font-bold mb-2">
              {currentBattle.winner === 'draw' ? 'Draw!' : 
               `Player ${currentBattle.winner} Wins!`}
            </h2>
          </div>
        </div>
      )}
      {/* Player 1's field */}
      <div className="min-w-0">
        <h3 className="text-lg font-semibold mb-4">Player 1</h3>
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="grid grid-cols-3 gap-4 pr-4">
            {player1Cards.map((cardState: CardState, index: number) => (
              <Dialog key={cardState.card.id}>
                <DialogTrigger asChild>
                  <div
                    className={`relative bg-background border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
                      index === currentBattle.card1Index
                        ? "ring-2 ring-primary"
                        : ""
                    } ${cardState.isDefeated ? "opacity-50" : ""}`}
                    onClick={() => onCardClick(cardState)}
                  >
                    {/* Compact Card Layout */}
                    <div className="flex h-24">
                      {/* Image */}
                      <div className="relative w-24 h-24 flex-shrink-0">
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
                            value={
                              (cardState.health / cardState.maxHealth) * 100
                            }
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
                </DialogTrigger>
                <DialogContent>
                  <GameCard card={cardState.card} />
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Player 2's field */}
      <div className="min-w-0">
        <h3 className="text-lg font-semibold mb-4">Player 2</h3>
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="grid grid-cols-3 gap-4 pr-4">
            {player2Cards.map((cardState: CardState, index: number) => (
              <Dialog key={cardState.card.id}>
                <DialogTrigger asChild>
                  <div
                    className={`relative bg-background border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
                      index === currentBattle.card2Index
                        ? "ring-2 ring-primary"
                        : ""
                    } ${cardState.isDefeated ? "opacity-50" : ""}`}
                    onClick={() => onCardClick(cardState)}
                  >
                    {/* Compact Card Layout */}
                    <div className="flex h-24">
                      {/* Image */}
                      <div className="relative w-24 h-24 flex-shrink-0">
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
                            value={
                              (cardState.health / cardState.maxHealth) * 100
                            }
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
                </DialogTrigger>
                <DialogContent>
                  <GameCard card={cardState.card} />
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
