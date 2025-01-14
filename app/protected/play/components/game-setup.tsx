"use client";

import { GameMode } from "../game-modes/types";
import { PracticeGameSetupManager } from "./game-setup/PracticeGameSetupManager";
import { MultiplayerGameSetupManager } from "./game-setup/MultiplayerGameSetupManager";
import { CardWithEffects, DeckWithCards } from "@/app/actions/fetchDecks";
import { Database } from "@/types/database.types";
import { Card, GameCard } from "@/app/protected/play/game-engine/types";

type Deck = Database["public"]["Tables"]["player_decks"]["Row"] & {
  cards: Card[];
};

// Helper function to convert DeckWithCards to Deck
function convertToDeck(deck: DeckWithCards): Deck {
  return {
    ...deck,
    card_list: deck.cards.map(card => ({ id: card.id })),
    cards: deck.cards.map(card => ({
      ...card,
      gameplay_effects: card.special_effects.map(effect => ({
        name: effect.name,
        description: effect.description,
        effect_type: effect.effect_type,
        effect_icon: effect.effect_icon,
        value: effect.value
      }))
    }))
  };
}

type GameSetupProps = {
  deck1: DeckWithCards | Deck;
  deck2: DeckWithCards | Deck;
  onSetupComplete: (
    deck1Cards: CardWithEffects[],
    deck2Cards: CardWithEffects[],
    player1Ready: boolean,
    player2Redy: boolean
  ) => void;
  mode: GameMode;
};

export default function GameSetup({ mode, deck1, deck2, ...props }: GameSetupProps) {
  // Convert decks if needed
  const convertedDeck1 = 'card_list' in deck1 ? deck1 : convertToDeck(deck1);
  const convertedDeck2 = 'card_list' in deck2 ? deck2 : convertToDeck(deck2);
  return mode === 'practice' ? (
    <PracticeGameSetupManager {...props} deck1={convertedDeck1} deck2={convertedDeck2} mode={mode} />
  ) : (
    <MultiplayerGameSetupManager {...props} deck1={convertedDeck1} deck2={convertedDeck2} mode={mode} />
  );
}
