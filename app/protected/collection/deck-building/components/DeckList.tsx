"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DeckWithCards } from "@/app/actions/fetchDecks";

interface DeckListProps {
  decks: DeckWithCards[];
  activeEditDeckId: string | null;
  onDeckSelect: (deck: DeckWithCards) => void;
}

export function DeckList({ decks, activeEditDeckId, onDeckSelect }: DeckListProps) {
  const [deckSearchTerm, setDeckSearchTerm] = useState<string>("");

  const filteredDecks = useMemo(() => {
    return decks.filter((deck: DeckWithCards) =>
      deck.name.toLowerCase().includes(deckSearchTerm.toLowerCase())
    );
  }, [decks, deckSearchTerm]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Decks</h2>
      <Input
        type="text"
        placeholder="Search decks..."
        value={deckSearchTerm}
        onChange={(e) => setDeckSearchTerm(e.target.value)}
      />
      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-2 pr-4">
          {filteredDecks.map((deck) => (
            <Card
              key={deck.id}
              className={`cursor-pointer transition-all duration-300 ${
                activeEditDeckId === deck.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => onDeckSelect(deck)}
            >
              <CardContent className="p-4">
                <h3 className="font-medium">{deck.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {deck.cards.length} cards
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
