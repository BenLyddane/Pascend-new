"use client";

import { Card } from "@/app/protected/play/game-engine/types";
import { GameCardPractice } from "@/components/game-card-practice";
import { GameCard } from "@/components/game-card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type PlayerDeckSetupProps = {
  cards: Card[];
  cancelledCards: Card[];
  onCardCancel: (card: Card) => void;
  onCardReorder: (dragIndex: number, dropIndex: number) => void;
  onPhaseComplete: () => void;
  isReady: boolean;
  phase: "cancel" | "reorder";
  isPracticeMode: boolean;
  playerName: string;
};

export function PlayerDeckSetup({
  cards,
  cancelledCards,
  onCardCancel,
  onCardReorder,
  onPhaseComplete,
  isReady,
  phase,
  isPracticeMode,
  playerName,
}: PlayerDeckSetupProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{playerName}</h3>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">
            Cancel Cards (Select 2)
          </h4>
          <div className="grid grid-cols-3 gap-4">
            {cards.map((card, index) => (
              <div key={card.id} className="space-y-2">
                <GameCardPractice card={card} />
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <GameCard card={card} />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => onCardCancel(card)}
                    disabled={cancelledCards.length >= 2 || (!isPracticeMode && phase !== "cancel")}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {(phase === "reorder" || cancelledCards.length === 2) && (
          <div>
            <h4 className="text-sm font-medium mb-2">
              Order Remaining Cards
            </h4>
            <div className="flex flex-wrap gap-4">
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  draggable={phase === "reorder"}
                  onDragStart={(e) => {
                    if (phase === "reorder") {
                      e.dataTransfer.setData("text/plain", index.toString());
                    }
                  }}
                  onDragOver={(e) => phase === "reorder" && e.preventDefault()}
                  onDrop={(e) => {
                    if (phase === "reorder") {
                      e.preventDefault();
                      const dragIndex = parseInt(
                        e.dataTransfer.getData("text/plain")
                      );
                      onCardReorder(dragIndex, index);
                    }
                  }}
                  className={phase === "reorder" ? "cursor-move" : ""}
                >
                  <GameCardPractice card={card} />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onPhaseComplete}
          disabled={
            isReady ||
            (phase === "cancel" && cancelledCards.length !== 2) ||
            (phase === "reorder" && isReady)
          }
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
        >
          {isReady 
            ? "Ready!" 
            : phase === "cancel" 
              ? "Confirm Cancellations" 
              : "Confirm Order"}
        </button>
      </div>
    </div>
  );
}
