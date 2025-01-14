export type GameMode = 'practice' | 'ranked' | 'casual' | 'tournament';

export interface GameModeConfig {
  name: GameMode;
  displayName: string;
  description: string;
  // Setup phase configuration
  setup: {
    allowBans: boolean;
    banTimeLimit?: number;
    reorderTimeLimit?: number;
    requireBothPlayersReady: boolean;
    showOpponentDeck: boolean;
  };
  // Game rules configuration
  rules: {
    turnTimeLimit?: number;
    allowUndo: boolean;
    saveStats: boolean;
    affectsRating: boolean;
  };
}

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
  practice: {
    name: 'practice',
    displayName: 'Practice Mode',
    description: 'Practice against yourself with two decks. No time limits.',
    setup: {
      allowBans: true,
      requireBothPlayersReady: true,
      showOpponentDeck: true,
    },
    rules: {
      allowUndo: true,
      saveStats: false,
      affectsRating: false,
    }
  },
  ranked: {
    name: 'ranked',
    displayName: 'Ranked Match',
    description: 'Compete in ranked matches to climb the leaderboard.',
    setup: {
      allowBans: true,
      banTimeLimit: 20,
      reorderTimeLimit: 10,
      requireBothPlayersReady: false,
      showOpponentDeck: false,
    },
    rules: {
      turnTimeLimit: 30,
      allowUndo: false,
      saveStats: true,
      affectsRating: true,
    }
  },
  casual: {
    name: 'casual',
    displayName: 'Casual Match',
    description: 'Play casual matches without affecting your rank.',
    setup: {
      allowBans: true,
      banTimeLimit: 30,
      reorderTimeLimit: 15,
      requireBothPlayersReady: false,
      showOpponentDeck: false,
    },
    rules: {
      turnTimeLimit: 45,
      allowUndo: false,
      saveStats: true,
      affectsRating: false,
    }
  },
  tournament: {
    name: 'tournament',
    displayName: 'Tournament Match',
    description: 'Official tournament matches with strict rules.',
    setup: {
      allowBans: true,
      banTimeLimit: 60,
      reorderTimeLimit: 30,
      requireBothPlayersReady: true,
      showOpponentDeck: false,
    },
    rules: {
      turnTimeLimit: 60,
      allowUndo: false,
      saveStats: true,
      affectsRating: true,
    }
  }
};
