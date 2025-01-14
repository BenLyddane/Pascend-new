import Image from "next/image";
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
  trade_listings?: {
    id: string;
    token_price: number;
    status: "active" | "sold" | "cancelled";
  }[];
}

interface GameCardDeckBuilderProps {
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

export function GameCardDeckBuilder({ card, onClick, className }: GameCardDeckBuilderProps) {
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
        "w-[200px] bg-white dark:bg-neutral-900 rounded-lg overflow-hidden transition-all duration-300 shadow-lg",
        !card.trade_listings?.some(listing => listing.status === "active") && "cursor-pointer hover:scale-[1.02] hover:shadow-xl",
        className
      )}
    >
      {/* Image Section */}
      <div className={`relative w-full h-[120px] border-4 ${borderColor} ${card.trade_listings?.some(listing => listing.status === "active") ? 'opacity-75' : ''}`}>
        {card.trade_listings?.some(listing => listing.status === "active") && (
          <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground px-2 py-1 rounded-md flex items-center gap-1 text-xs">
            <span>Listed</span>
          </div>
        )}
        {card.image_url ? (
          <Image
            src={card.image_url}
            alt={card.name}
            fill
            className="object-cover"
            sizes="200px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-neutral-800 text-gray-500 text-sm">
            No Image
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-2 space-y-1">
        {/* Title and Rarity */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold leading-tight line-clamp-1">
            {card.name}
          </h2>
          {card.rarity && (
            <div className="flex items-center text-sm">
              <span>{rarityIcon}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 cursor-pointer">
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
        <div className="grid grid-cols-3 gap-1 text-xs">
          <div className="font-medium">
            P: <span className={getGradientColor(card.power)}>{card.power}</span>
          </div>
          <div className="font-medium text-center">
            H: <span className={getGradientColor(card.health)}>{card.health}</span>
          </div>
          <div className="font-medium text-right">
            M: <span className={getModifierStyle(card.modifier)}>{card.modifier}</span>
          </div>
        </div>

        {/* Effects */}
        <div className="flex flex-wrap gap-1">
          {card.effects?.map((effect, index) => (
            <TooltipProvider key={`legacy-${index}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-6 h-6 rounded-full bg-[#1a1b26] flex items-center justify-center cursor-pointer hover:bg-[#2a2b36] transition-colors">
                    {effect === "Explosive" && (
                      <Image
                        src="/effects/explosion.svg"
                        alt="Explosive"
                        width={16}
                        height={16}
                      />
                    )}
                    {effect === "Offensive" && (
                      <Image
                        src="/effects/sword.svg"
                        alt="Offensive"
                        width={16}
                        height={16}
                      />
                    )}
                    {effect === "Defensive" && (
                      <Image
                        src="/effects/shield.svg"
                        alt="Defensive"
                        width={16}
                        height={16}
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
  );
}
