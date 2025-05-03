"use client";

import { useEffect, useRef } from "react";
import type { BattleEffect, BattleLogEntry, CardBattleLogEntry, StateChangeLogEntry } from "./battle-log-types";
import { cn } from "@/lib/utils";
import { isBattleLogEntry, isStateChangeLogEntry } from "./battle-log-types";

interface BattleLogProps {
  entries: BattleLogEntry[];
  player1GoesFirst: boolean;
  player1Name: string;
  player2Name: string;
}

const EffectIcon = ({ type }: { type: BattleEffect["type"] }) => {
  const iconMap: Record<BattleEffect["type"], string> = {
    hit: "⚔️",
    special: "✨",
    stat: "📊",
    defeat: "💀",
    game_end: "🏆",
    error: "⚠️",
    state_change: "🔄",
  };

  return <span className="mr-2">{iconMap[type]}</span>;
};

const BattleEffectDisplay = ({ effect }: { effect: BattleEffect }) => {
  const effectClasses = {
    hit: "text-red-500",
    special: "text-purple-500",
    stat: "text-blue-500",
    defeat: "text-gray-500",
    game_end: "text-yellow-500 font-bold",
    error: "text-red-600",
    state_change: "text-green-500",
  };

  return (
    <div className={cn("flex items-center py-1", effectClasses[effect.type])}>
      <EffectIcon type={effect.type} />
      <span>{effect.description}</span>
      {effect.sourceCard && (
        <span className="ml-1 text-sm opacity-75">({effect.sourceCard})</span>
      )}
    </div>
  );
};

const CardBattleEntry = ({ entry }: { entry: CardBattleLogEntry }) => {
  return (
    <div className="mb-4 border-b border-gray-200 pb-2">
      <div className="font-semibold mb-2">
        Turn {entry.turn}: {entry.attacker.card.name} ({entry.attacker.startHealth} HP) vs {entry.defender.card.name} ({entry.defender.startHealth} HP)
      </div>
      
      {/* Simple Combat Summary */}
      <div className="text-sm space-y-1">
        <div>
          {entry.attacker.card.name} dealt {entry.attacker.damage} damage
          {entry.attacker.startHealth !== entry.attacker.endHealth && 
            ` (HP: ${entry.attacker.startHealth} → ${entry.attacker.endHealth})`}
        </div>
        <div>
          {entry.defender.card.name} dealt {entry.defender.damage} damage
          {entry.defender.startHealth !== entry.defender.endHealth && 
            ` (HP: ${entry.defender.startHealth} → ${entry.defender.endHealth})`}
        </div>
      </div>

      {/* Effects */}
      {entry.effects.length > 0 && (
        <div className="mt-2 text-sm text-gray-600">
          {entry.effects.map((effect, index) => (
            <BattleEffectDisplay key={index} effect={effect} />
          ))}
        </div>
      )}
    </div>
  );
};

const StateChangeEntry = ({ entry }: { entry: StateChangeLogEntry }) => {
  return (
    <div className="mb-4 border-b border-gray-200 pb-2">
      <div className="text-sm text-gray-600">
        <div className="flex items-center">
          <EffectIcon type="state_change" />
          <span>Turn {entry.turn}: {entry.description}</span>
        </div>
        {entry.effects.length > 0 && (
          <div className="mt-2 ml-6">
            {entry.effects.map((effect, index) => (
              <BattleEffectDisplay key={index} effect={effect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const LogEntry = ({ entry }: { entry: BattleLogEntry }) => {
  if (isBattleLogEntry(entry)) {
    return <CardBattleEntry entry={entry} />;
  }
  if (isStateChangeLogEntry(entry)) {
    return <StateChangeEntry entry={entry} />;
  }
  return null;
};

export default function BattleLog({ entries, player1GoesFirst, player1Name, player2Name }: BattleLogProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Debug logging for entry updates
  useEffect(() => {
    console.log("[BattleLog] Entries updated:", {
      count: entries.length,
      lastEntry: entries[entries.length - 1],
      timestamp: new Date().toISOString()
    });
  }, [entries]);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Battle Log</h2>
      
      {/* Initial turn order display */}
      <div className="text-center text-sm text-gray-600 mb-4 bg-gray-100 p-2 rounded">
        {player1GoesFirst ? player1Name : player2Name} goes first
      </div>

      {/* Scrollable log container */}
      <div 
        ref={logContainerRef}
        className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-[400px]"
      >
        {entries.length === 0 ? (
          <div className="text-center text-gray-500 mt-4">
            Waiting for first turn...
          </div>
        ) : (
          entries.map((entry) => (
            <LogEntry 
              key={entry.entryId || `entry-${entry.turn}-${entry.timestamp || Date.now()}`} 
              entry={entry} 
            />
          ))
        )}
      </div>
    </div>
  );
}
