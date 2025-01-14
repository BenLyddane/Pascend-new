"use client";

import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CardWithEffects } from "@/app/actions/fetchDecks";

type LegacyEffect = "Explosive" | "Offensive" | "Defensive";

interface GameCardPracticeProps {
  card: CardWithEffects & {
    effects?: LegacyEffect[];
  };
}

const rarityBorderColors = {
  common: "border-gray-400",
  rare: "border-blue-500",
  epic: "border-purple-600",
  legendary: "border-red-500",
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

export function GameCardPractice({ card }: GameCardPracticeProps) {
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

  const borderColor = card.rarity
    ? rarityBorderColors[card.rarity as keyof typeof rarityBorderColors] ||
      "border-gray-300"
    : "border-gray-300";

  type EffectTuple = [string, string, string, number];

  // Transform special effects into tuple format
  const effects: EffectTuple[] = (card.special_effects || []).map(effect => {
    const effectType = inferEffectType(effect.name, effect.description);
    return [
      effectType,
      effect.name,
      effect.description,
      effect.value
    ] as EffectTuple;
  });

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
    <div className="relative w-[200px]">
      <div
        className={`relative bg-white dark:bg-neutral-900 rounded-lg shadow-lg border-2 ${borderColor}`}
      >
        {/* Compact Header with Image and Stats */}
        <div className="flex items-start p-2 gap-2">
          {/* Small Image */}
          <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
            {card.image_url ? (
              <Image
                src={card.image_url}
                alt={card.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-neutral-800 text-gray-500 text-xs">
                No Image
              </div>
            )}
          </div>

          {/* Name and Stats */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-tight truncate">
              {card.name}
            </h2>
            <div className="grid grid-cols-2 gap-x-2 text-xs mt-1">
              <div>
                P:{" "}
                <span className={getGradientColor(card.power)}>
                  {card.power}
                </span>
              </div>
              <div>
                H:{" "}
                <span className={getGradientColor(card.health)}>
                  {card.health}
                </span>
              </div>
              <div className="col-span-2">
                M:{" "}
                <span className={getModifierStyle(card.modifier)}>
                  {card.modifier}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-2 pb-1">
          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
            {card.description}
          </p>
        </div>

        {/* Effects */}
        <div className="px-2 pb-2">
          <div className="flex flex-wrap gap-1">
            {/* Legacy Effects */}
            {card.effects?.map((effect: LegacyEffect, index: number) => {
              const effectMap: Record<LegacyEffect, { src: string; alt: string }> = {
                Explosive: { src: "/effects/explosion.svg", alt: "Explosive" },
                Offensive: { src: "/effects/sword.svg", alt: "Offensive" },
                Defensive: { src: "/effects/shield.svg", alt: "Defensive" }
              };
              const effectInfo = effectMap[effect];
              
              if (!effectInfo) return null;

              return (
                <TooltipProvider key={`legacy-${index}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-6 h-6 rounded-full bg-[#1a1b26] flex items-center justify-center cursor-pointer hover:bg-[#2a2b36] transition-colors">
                        <Image
                          src={effectInfo.src}
                          alt={effectInfo.alt}
                          width={16}
                          height={16}
                        />
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
              );
            })}

            {/* Special effects */}
            {effects.map(([type, name, description, value], index) => (
              <TooltipProvider key={`special-${index}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-6 h-6 rounded-full bg-[#1a1b26] flex items-center justify-center cursor-pointer hover:bg-[#2a2b36] transition-colors ${effectColors[type as keyof typeof effectColors] || "text-gray-400"}`}
                    >
                      <span className="text-sm">
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
                    <p className="text-xs">
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
