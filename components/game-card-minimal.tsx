import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { GameCard } from "@/components/game-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Database } from "@/types/database.types";
import type { CardWithEffects } from "@/app/actions/fetchDecks";

interface SpecialEffect {
  effect_type: string;
  effect_icon: string;
  name: string;
  description: string;
  value?: number;
}

interface GameCardMinimalProps {
  card: CardWithEffects;
  onRemove?: (card: CardWithEffects) => void;
  className?: string;
  disableModal?: boolean;
  onClick?: () => void;
}

function isSpecialEffect(obj: unknown): obj is SpecialEffect {
  if (!obj || typeof obj !== "object") return false;

  const effect = obj as Partial<SpecialEffect>;
  return (
    typeof effect.effect_type === "string" &&
    typeof effect.effect_icon === "string" &&
    typeof effect.name === "string" &&
    typeof effect.description === "string"
  );
}

export function GameCardMinimal({
  card,
  onRemove,
  className,
  disableModal,
  onClick,
}: GameCardMinimalProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const effects: SpecialEffect[] = (() => {
    if (!card.special_effects) return [];

    try {
      const effectsData =
        typeof card.special_effects === "string"
          ? JSON.parse(card.special_effects)
          : card.special_effects;

      if (Array.isArray(effectsData)) {
        return effectsData.filter(isSpecialEffect);
      }

      return [];
    } catch (error) {
      console.error("Error parsing special effects:", error);
      return [];
    }
  })();

  return (
    <div className={className}>
      {/* Card Image and Name */}
      {disableModal ? (
        <div
          className="cursor-pointer bg-white dark:bg-neutral-900 rounded-md border shadow-md p-1 hover:shadow-lg transition-all relative group w-full max-w-[160px] mx-auto"
          onClick={onClick}
        >
          <div className="relative aspect-[16/9] w-full mb-1 rounded-md overflow-hidden border">
            {/* Hover overlay with card details */}
            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-1 z-10">
              <div className="flex items-center gap-2">
                <span className="text-white text-xs">P: {card.power}</span>
                <span className="text-white text-xs">H: {card.health}</span>
              </div>
            </div>
            {card.image_url ? (
              <img
                src={card.image_url}
                alt={card.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-200 dark:bg-neutral-800 text-gray-500 text-sm">
                No Image
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-medium truncate">{card.name}</h2>
          </div>
        </div>
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <div
              className="cursor-pointer bg-white dark:bg-neutral-900 rounded-md border shadow-md p-1 hover:shadow-lg transition-all relative group w-full max-w-[160px] mx-auto"
              onClick={(e) => {
                if (onRemove) {
                  e.stopPropagation();
                  onRemove(card);
                } else {
                  setIsDialogOpen(true);
                }
              }}
            >
              <div className="relative aspect-[16/9] w-full mb-1 rounded-md overflow-hidden border">
                {/* Hover overlay with card details */}
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-1 z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs">P: {card.power}</span>
                    <span className="text-white text-xs">H: {card.health}</span>
                  </div>
                </div>
                {card.image_url ? (
                  <img
                    src={card.image_url}
                    alt={card.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-200 dark:bg-neutral-800 text-gray-500 text-sm">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-medium">{card.name}</h2>
              </div>
            </div>
          </DialogTrigger>

          {/* Modal Content: Full GameCard */}
          <DialogContent className="max-w-2xl">
            <GameCard card={card} />
            <Button
              onClick={() => setIsDialogOpen(false)}
              className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white"
            >
              Close
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
