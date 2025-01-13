import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { GameCard } from "@/components/game-card";
import type { Database } from "@/types/database.types";
import type { CardWithEffects } from "@/app/actions/fetchDecks";

interface GameCardMinimalProps {
  card: CardWithEffects;
}

export function GameCardMinimal({ card }: GameCardMinimalProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // No need to transform the card since we're using database types
  const transformedCard = card;

  return (
    <div>
      {/* Card Image and Name */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <div
            className="cursor-pointer bg-white dark:bg-neutral-900 rounded-md border shadow-md p-2 hover:shadow-lg transition-all"
            onClick={() => setIsDialogOpen(true)}
          >
            <div className="relative h-32 w-full mb-2 rounded-md overflow-hidden border">
              {transformedCard.image_url ? (
                <img
                  src={transformedCard.image_url}
                  alt={transformedCard.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-200 dark:bg-neutral-800 text-gray-500 text-sm">
                  No Image
                </div>
              )}
            </div>
            <div className="space-y-1">
              <h2 className="text-center text-sm font-medium truncate">
                {transformedCard.name}
              </h2>
              {transformedCard.special_effects && (
                <div className="flex justify-center gap-1">
                  {JSON.parse(transformedCard.special_effects as string).map(
                    (
                      [effectType, iconName]: [string, string],
                      index: number
                    ) => (
                      <div
                        key={index}
                        className="w-5 h-5 flex items-center justify-center bg-gray-800 rounded-full"
                      >
                        <img
                          src={`/icons/${iconName}.svg`}
                          alt={iconName}
                          className="w-3 h-3"
                        />
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogTrigger>

        {/* Modal Content: Full GameCard */}
        <DialogContent className="max-w-2xl">
          <GameCard card={transformedCard} />
          <Button
            onClick={() => setIsDialogOpen(false)}
            className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
