"use client";

import { Card } from "@/app/protected/play/game-engine/types";
import { Database } from "@/types/database.types";
import { GameSetupPhaseManager } from "./game-setup/GameSetupPhaseManager";

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
  isPracticeMode?: boolean;
};

export default function GameSetup(props: GameSetupProps) {
  return <GameSetupPhaseManager {...props} />;
}
