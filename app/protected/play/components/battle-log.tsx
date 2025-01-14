"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  BattleLogEntry,
  BattleEffect,
} from "@/app/protected/play/game-engine/types";

type BattleLogProps = {
  entries: BattleLogEntry[];
  player1GoesFirst?: boolean;
  player1Name: string;
  player2Name: string;
};

const effectStyles = {
  turn_start: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    defaultIcon: "🔄",
  },
  pre_combat: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    defaultIcon: "⚡",
  },
  combat: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    defaultIcon: "⚔️",
  },
  post_combat: {
    bg: "bg-violet-500/10",
    text: "text-violet-500",
    defaultIcon: "🌟",
  },
  turn_end: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    defaultIcon: "🔄",
  },
  on_death: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    defaultIcon: "💀",
  },
  game_end: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    defaultIcon: "🏆",
  },
  error: {
    bg: "bg-red-700/10",
    text: "text-red-700",
    defaultIcon: "⚠️",
  },
} as const;

const effectIcons = {
  Flame: "🔥",
  Sword: "⚔️",
  Shield: "🛡️",
  ShieldCheck: "✅",
  Heart: "❤️",
  Bomb: "💣",
  TrendingUp: "📈",
  RefreshCw: "🔄",
  Snowflake: "❄️",
} as const;

export default function BattleLog({
  entries,
  player1GoesFirst,
  player1Name,
  player2Name,
}: BattleLogProps) {
  // Filter out transitional entries (those with "No Card")
  const combatEntries = entries.filter(
    (entry) =>
      entry.attacker.card.name !== "No Card" &&
      entry.defender.card.name !== "No Card"
  );
  const renderEffect = (effect: BattleEffect, index: number, entry: BattleLogEntry) => {
    const timing = effect.timing || "combat";
    const style =
      timing in effectStyles
        ? effectStyles[timing as keyof typeof effectStyles]
        : effectStyles.error;
    const icon = effect.icon
      ? effectIcons[effect.icon as keyof typeof effectIcons] || effect.icon
      : style.defaultIcon;

    let label = timing
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    if (effect.type === "hit") label = "Combat";
    if (effect.type === "defeat") label = "Defeat";

    // Process description to include card name and replace modifiers
    let description = effect.description;
    
    // Replace {modifier} with actual card modifier value
    if (description.includes("{modifier}")) {
      const sourceCard = entry.attacker.card.name === effect.sourceCard 
        ? entry.attacker.card 
        : entry.defender.card;
      description = description.replace(/{modifier}/g, sourceCard.modifier?.toString() || "0");
    }

    // Add source card name if not already present
    if (effect.sourceCard && !description.includes(effect.sourceCard)) {
      description = `[${effect.sourceCard}] ${description}`;
    }

    return (
      <div
        key={`${timing}-${index}`}
        className={cn(
          "flex items-center gap-2 text-sm p-2 rounded",
          style.bg,
          effect.type === "defeat" && "mt-1 text-base"
        )}
      >
        <span className={cn("font-semibold", style.text)}>
          {icon} {label}:
        </span>
        <span className="text-muted-foreground">{description}</span>
      </div>
    );
  };

  return (
    <Card className="p-4 h-[calc(100vh-2rem)] sticky top-4">
      <h4 className="font-semibold mb-4">Battle Log</h4>
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-4">
          {combatEntries.map((entry: BattleLogEntry, index: number) => (
            <Card
              key={index}
              className={cn(
                "p-4",
                "border-l-4",
                entry.attacker.damage > entry.defender.damage
                  ? "border-l-green-500"
                  : entry.defender.damage > entry.attacker.damage
                    ? "border-l-red-500"
                    : "border-l-yellow-500"
              )}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">Turn {entry.turn}</p>
                    <span className="text-xs text-muted-foreground">
                      {entry.turn === 1
                        ? `${player1GoesFirst ? player1Name : player2Name} goes first`
                        : `${entry.attacker.card.name} attacks`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={entry.attacker.card.image_url || "/placeholder.png"}
                      alt={entry.attacker.card.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {entry.attacker.card.name}
                      </p>
                      <Progress
                        value={
                          (entry.attacker.endHealth /
                            entry.attacker.card.health) *
                          100
                        }
                        className="h-2"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.1)",
                          ["--progress-background" as string]: `hsl(${Math.max((entry.attacker.endHealth / entry.attacker.card.health) * 120, 0)}deg 80% 40%)`,
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {entry.attacker.endHealth} /{" "}
                        {entry.attacker.card.health} HP
                        {entry.attacker.damage > 0 && (
                          <span className="text-red-500 ml-2">
                            (-{entry.attacker.damage})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <img
                      src={entry.defender.card.image_url || "/placeholder.png"}
                      alt={entry.defender.card.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {entry.defender.card.name}
                      </p>
                      <Progress
                        value={
                          (entry.defender.endHealth /
                            entry.defender.card.health) *
                          100
                        }
                        className="h-2"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.1)",
                          ["--progress-background" as string]: `hsl(${Math.max((entry.defender.endHealth / entry.defender.card.health) * 120, 0)}deg 80% 40%)`,
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {entry.defender.endHealth} /{" "}
                        {entry.defender.card.health} HP
                        {entry.defender.damage > 0 && (
                          <span className="text-red-500 ml-2">
                            (-{entry.defender.damage})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Power Display */}
              <div className="flex justify-between mt-2 mb-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Power: </span>
                  <span className="font-medium">
                    {entry.attacker.startPower}
                  </span>
                  {entry.attacker.startPower !== entry.attacker.endPower && (
                    <span
                      className={cn(
                        "ml-1",
                        entry.attacker.endPower > entry.attacker.startPower
                          ? "text-green-500"
                          : "text-red-500"
                      )}
                    >
                      → {entry.attacker.endPower}
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Power: </span>
                  <span className="font-medium">
                    {entry.defender.startPower}
                  </span>
                  {entry.defender.startPower !== entry.defender.endPower && (
                    <span
                      className={cn(
                        "ml-1",
                        entry.defender.endPower > entry.defender.startPower
                          ? "text-green-500"
                          : "text-red-500"
                      )}
                    >
                      → {entry.defender.endPower}
                    </span>
                  )}
                </div>
              </div>

              {/* Effects Section */}
              <div className="mt-2 space-y-2">
                {/* Group and sort effects by timing */}
                {[
                  ...entry.effects.filter((e) => e.timing === "turn_start"),
                  ...entry.effects.filter((e) => e.timing === "pre_combat"),
                  ...entry.effects.filter((e) => e.timing === "combat"),
                  ...entry.effects.filter((e) => e.timing === "post_combat"),
                  ...entry.effects.filter((e) => e.timing === "turn_end"),
                  ...entry.effects.filter((e) => e.timing === "on_death"),
                  ...entry.effects.filter((e) => e.timing === "game_end"),
                ].map((effect, i) => renderEffect(effect, i, entry))}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
