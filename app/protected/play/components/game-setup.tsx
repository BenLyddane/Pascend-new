"use client";

import { Card } from "@/app/protected/play/game-engine/types";
import { Database } from "@/types/database.types";
import { GameMode } from "../game-modes/types";
import { PracticeGameSetupManager } from "./game-setup/PracticeGameSetupManager";
import { MultiplayerGameSetupManager } from "./game-setup/MultiplayerGameSetupManager";

type Deck = Database["public"]["Tables"]["player_decks"]["Row"] & {
  cards: Card[];
};

type GameSetupProps = {
  deck1: Deck;
  deck2: Deck;
  onSetupComplete: (
    deck1Cards: Card[],
    deck2Cards: Card[],
    player1Ready: boolean,
    player2Ready: boolean
  ) => void;
  mode: GameMode;
};

export default function GameSetup({ mode, ...props }: GameSetupProps) {
  return mode === 'practice' ? (
    <PracticeGameSetupManager {...props} mode={mode} />
  ) : (
    <MultiplayerGameSetupManager {...props} mode={mode} />
  );
}
