import Image from "next/image";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Database } from "@/types/database.types";
import { cn } from "@/lib/utils";

type DbCard = Database["public"]["Tables"]["cards"]["Row"];
type SpecialEffect = Database["public"]["Tables"]["special_properties"]["Row"];

interface Card extends DbCard {
  effects?: ("Explosive" | "Offensive" | "Defensive")[];
}

interface GameCardProps {
  card: Card;
  onClick?: () => void;
  className?: string;
}

const rarityIcons = {
  common: "⭐",
  rare: "💎",
  epic: "🔥",
  legendary: "👑",
} as const;

const rarityBorderColors = {
  common: "border-gray-400",
  rare: "border-blue-500",
  epic: "border-purple-600",
  legendary: "border-red-500 shadow-red-500/20",
} as const;

const getGradientColor = (value: number): string => {
  if (value <= 3) return "text-rose-400";
  if (value <= 6) return "text-amber-400";
  if (value <= 9) return "text-lime-500";
  return "text-teal-500";
};

const getModifierStyle = (value: number | null): string => {
  if (!value) return "text-gray-400";
  if (value === 1) return "text-gray-400";
  if (value === 2) return "text-sky-400";
  if (value === 3) return "text-indigo-400 font-bold animate-pulse";
  return "text-gray-400";
};

const effectIcons = {
  defensive: "🛡️",
  offensive: "⚔️",
  utility: "🔧",
  passive: "✨",
  special: "⭐",
  heal: "💚",
  damage: "💥",
  buff: "⬆️",
  debuff: "⬇️",
  draw: "🎴",
  discard: "🗑️",
} as const;

const effectColors = {
  defensive: "text-blue-500",
  offensive: "text-red-500",
  utility: "text-green-500",
  passive: "text-purple-500",
  special: "text-yellow-500",
} as const;

type EffectType = keyof typeof effectIcons;

export function GameCard({ card, onClick, className }: GameCardProps) {
  const replaceModifiers = (
    description: string,
    modifier: number | null,
    value: number | null
  ): string => {
    if (!modifier && !value) return description;

    return description.replace(
      /{(modifier|value)(\s*[\+\-\*\/]\s*\d+)?}/g,
      (match) => {
        try {
          const baseValue = match.includes("value") ? value : modifier;
          const result = eval(
            match
              .replace(/{(modifier|value)/, baseValue?.toString() || "0")
              .replace("}", "")
          );
          return `${result}`;
        } catch {
          return match;
        }
      }
    );
  };

  const rarityIcon = card.rarity
    ? rarityIcons[card.rarity as keyof typeof rarityIcons]
    : "";
  const borderColor = card.rarity
    ? rarityBorderColors[card.rarity as keyof typeof rarityBorderColors] ||
      "border-gray-300"
    : "border-gray-300";

  type EffectTuple = [string, string, string, number];

  const effects = (() => {
    if (!card.special_effects) return [] as EffectTuple[];

    try {
      if (typeof card.special_effects === "string") {
        const parsed = JSON.parse(card.special_effects);
        return Array.isArray(parsed)
          ? parsed
              .map((effect) => {
                if (!effect || typeof effect !== "object") return null;
                const effectType = inferEffectType(
                  effect.name,
                  effect.description
                );
                return [
                  effectType,
                  effect.name,
                  effect.description,
                  effect.value || 0,
                ] as EffectTuple;
              })
              .filter((effect): effect is EffectTuple => effect !== null)
          : [];
      }

      if (Array.isArray(card.special_effects)) {
        return card.special_effects
          .map((effect: any) => {
            if (!effect || typeof effect !== "object") return null;

            if (Array.isArray(effect) && effect.length === 4) {
              const [type, name, desc, val] = effect;
              if (
                typeof type === "string" &&
                typeof name === "string" &&
                typeof desc === "string" &&
                (typeof val === "number" || val === null)
              ) {
                return [type, name, desc, val || 0] as EffectTuple;
              }
            }

            if ("name" in effect && "description" in effect) {
              const effectType = inferEffectType(
                effect.name,
                effect.description
              );
              return [
                effectType,
                effect.name,
                effect.description,
                effect.value || 0,
              ] as EffectTuple;
            }

            return null;
          })
          .filter((effect): effect is EffectTuple => effect !== null);
      }

      return [] as EffectTuple[];
    } catch (error) {
      console.error("Error processing special effects:", error);
      return [] as EffectTuple[];
    }
  })();

  function inferEffectType(name: string, description: string): EffectType {
    const text = (name + " " + description).toLowerCase();

    if (
      text.includes("shield") ||
      text.includes("armor") ||
      text.includes("protect")
    )
      return "defensive";
    if (
      text.includes("attack") ||
      text.includes("strike") ||
      text.includes("slash")
    )
      return "offensive";
    if (text.includes("heal") || text.includes("restore")) return "heal";
    if (text.includes("damage")) return "damage";
    if (text.includes("buff") || text.includes("boost")) return "buff";
    if (text.includes("debuff") || text.includes("weaken")) return "debuff";
    if (text.includes("draw") || text.includes("card")) return "draw";
    if (text.includes("discard")) return "discard";
    if (text.includes("passive")) return "passive";
    if (text.includes("utility") || text.includes("tool")) return "utility";

    return "special";
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "w-[280px] bg-white dark:bg-neutral-900 rounded-lg overflow-hidden cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-all duration-300 shadow-lg",
        className
      )}
    >
      {/* Image Section */}
      <div className={`relative w-full h-[200px] border-4 ${borderColor}`}>
        {card.image_url ? (
          <Image
            src={card.image_url}
            alt={card.name}
            fill
            className="object-cover"
            sizes="280px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-neutral-800 text-gray-500 text-sm">
            No Image
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-2">
        {/* Title and Rarity */}
        <div>
          <h2 className="text-lg font-semibold leading-tight line-clamp-1">
            {card.name}
          </h2>
          {card.rarity && (
            <div className="flex items-center gap-1 text-sm">
              <span>{rarityIcon}</span>
              <span className="capitalize">{card.rarity}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 cursor-pointer">
                {card.description}
              </p>
            </TooltipTrigger>
            <TooltipContent 
              side="right" 
              align="start" 
              className="max-w-[300px] p-4 z-[100]"
            >
              <p className="text-sm whitespace-normal">{card.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="font-medium">
            Power:{" "}
            <span className={getGradientColor(card.power)}>{card.power}</span>
          </div>
          <div className="font-medium text-right">
            Health:{" "}
            <span className={getGradientColor(card.health)}>{card.health}</span>
          </div>
          <div className="col-span-2 flex justify-between font-medium">
            <span>Modifier:</span>
            <span className={getModifierStyle(card.modifier)}>
              {card.modifier}
            </span>
          </div>
        </div>

        {/* Effects */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Effects</h3>
          <div className="flex flex-wrap gap-2">
            {card.effects?.map((effect, index) => (
              <TooltipProvider key={`legacy-${index}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-8 h-8 rounded-full bg-[#1a1b26] flex items-center justify-center cursor-pointer hover:bg-[#2a2b36] transition-colors">
                      {effect === "Explosive" && (
                        <Image
                          src="/effects/explosion.svg"
                          alt="Explosive"
                          width={20}
                          height={20}
                        />
                      )}
                      {effect === "Offensive" && (
                        <Image
                          src="/effects/sword.svg"
                          alt="Offensive"
                          width={20}
                          height={20}
                        />
                      )}
                      {effect === "Defensive" && (
                        <Image
                          src="/effects/shield.svg"
                          alt="Defensive"
                          width={20}
                          height={20}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="center"
                    className="bg-[#1a1b26] text-white z-[100]"
                    sideOffset={8}
                  >
                    <p>{effect}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}

            {effects.map(([type, name, description, value], index) => (
              <TooltipProvider key={`special-${index}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-8 h-8 rounded-full bg-[#1a1b26] flex items-center justify-center cursor-pointer hover:bg-[#2a2b36] transition-colors ${effectColors[type as keyof typeof effectColors] || "text-gray-400"}`}
                    >
                      <span className="text-lg">
                        {effectIcons[type as keyof typeof effectIcons]}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="center"
                    className="bg-[#1a1b26] text-white z-[100]"
                    sideOffset={8}
                  >
                    <p className="font-semibold">{name}</p>
                    <p className="text-sm">
                      {replaceModifiers(description, card.modifier, value)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
