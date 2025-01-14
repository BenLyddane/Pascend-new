'use client';

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { TradingCardData } from "../types";

interface TradingCardProps {
  card: TradingCardData;
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

export function TradingCard({ card, className }: TradingCardProps) {
  const rarityIcon = card.rarity
    ? rarityIcons[card.rarity.toLowerCase() as keyof typeof rarityIcons]
    : "";
  const borderColor = card.rarity
    ? rarityBorderColors[card.rarity.toLowerCase() as keyof typeof rarityBorderColors] ||
      "border-gray-300"
    : "border-gray-300";

  return (
    <div
      className={cn(
        "w-[280px] bg-white dark:bg-neutral-900 rounded-lg shadow-lg",
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
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
          {card.description}
        </p>

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
      </div>
    </div>
  );
}
