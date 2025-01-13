"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GameCardMinimal } from "@/components/game-card-minimal";
import type { CardWithEffects, DeckWithCards } from "@/app/actions/fetchDecks";

interface DeckEditorProps {
  selectedCards: CardWithEffects[];
  deckName: string;
  isEditing: boolean;
  isSaving: boolean;
  onDeckNameChange: (name: string) => void;
  onCardRemove: (card: CardWithEffects) => void;
  onSave: () => void;
  onClear: () => void;
}

export function DeckEditor({
  selectedCards,
  deckName,
  isEditing,
  isSaving,
  onDeckNameChange,
  onCardRemove,
  onSave,
  onClear,
}: DeckEditorProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        {isEditing ? "Edit Deck" : "Create New Deck"}
      </h2>
      <Input
        type="text"
        placeholder="Deck Name"
        value={deckName}
        onChange={(e) => onDeckNameChange(e.target.value)}
      />

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={isSaving} className="flex-1">
          {isSaving ? "Saving..." : "Save Deck"}
        </Button>
        <Button variant="outline" onClick={onClear} className="flex-1">
          Clear
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-24rem)]">
        <div className="space-y-4 pr-4">
          {selectedCards.map((card) => (
            <GameCardMinimal
              key={card.id}
              card={card}
              onRemove={() => onCardRemove(card)}
            />
          ))}
          {Array.from({ length: 5 - selectedCards.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="h-[70px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm"
            >
              Empty Slot
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
