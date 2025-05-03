// Battle log types for the new auto-battle system

export interface BattleEffect {
  type: "hit" | "special" | "stat" | "defeat" | "game_end" | "error" | "state_change";
  description: string;
  sourceCard?: string;
  value?: number;
}

export interface CardBattleLogEntry {
  entryId: string;
  turn: number;
  timestamp: number;
  attacker: {
    card: {
      id: string;
      name: string;
    };
    damage: number;
    startHealth: number;
    endHealth: number;
  };
  defender: {
    card: {
      id: string;
      name: string;
    };
    damage: number;
    startHealth: number;
    endHealth: number;
  };
  effects: BattleEffect[];
}

export interface StateChangeLogEntry {
  entryId: string;
  turn: number;
  timestamp: number;
  description: string;
  effects: BattleEffect[];
}

export type BattleLogEntry = CardBattleLogEntry | StateChangeLogEntry;

// Type guards
export function isBattleLogEntry(entry: BattleLogEntry): entry is CardBattleLogEntry {
  return 'attacker' in entry && 'defender' in entry;
}

export function isStateChangeLogEntry(entry: BattleLogEntry): entry is StateChangeLogEntry {
  return !('attacker' in entry) && 'description' in entry;
}
