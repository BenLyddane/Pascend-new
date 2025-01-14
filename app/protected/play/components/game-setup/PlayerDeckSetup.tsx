"use client";

import { CardWithEffects } from "@/app/actions/fetchDecks";
import { GameModeConfig } from "../../game-modes/types";
import { GameCardPractice } from "@/components/game-card-practice";
import { GameCard } from "@/components/game-card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type PlayerDeckSetupProps = {
  cards: CardWithEffects[];
  bannedCards: CardWithEffects[];
  onCardBan: (card: CardWithEffects) => void;
  onCardReorder: (dragIndex: number, dropIndex: number) => void;
  onPhaseComplete: () => void;
  isReady: boolean;
  phase: "setup";
  mode: GameModeConfig;
  playerName: string;
};

export function PlayerDeckSetup({
  cards,
  bannedCards,
  onCardBan,
  onCardReorder,
  onPhaseComplete,
  isReady,
  phase,
  mode,
  playerName,
}: PlayerDeckSetupProps) {
  // Determine if banning is allowed
  const canBan = bannedCards.length < 2;

  // Determine if ready button should be disabled
  const readyDisabled = bannedCards.length < 2 || // Need 2 bans before ready
    (!mode.setup.requireBothPlayersReady && isReady); // In multiplayer, disable after ready

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{playerName}</h3>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">
            {`Ban Cards (${bannedCards.length}/2)`}
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
                  {canBan && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => onCardBan(card)}
                    >
                      Ban
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {bannedCards.length === 2 && (
          <div>
            <h4 className="text-sm font-medium mb-2">
              Order Your Cards
            </h4>
            <div className="flex flex-wrap gap-4">
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", index.toString());
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragIndex = parseInt(
                      e.dataTransfer.getData("text/plain")
                    );
                    onCardReorder(dragIndex, index);
                  }}
                  className="cursor-move"
                >
                  <GameCardPractice card={card} />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onPhaseComplete}
          disabled={readyDisabled}
          className={`w-full px-4 py-2 ${
            isReady ? "bg-green-500" : "bg-primary"
          } text-primary-foreground rounded-lg disabled:opacity-50 transition-colors`}
        >
          {isReady ? "Ready!" : "Ready"}
        </button>
      </div>
    </div>
  );
}
