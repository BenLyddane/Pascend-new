"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { DeckWithCards } from "@/app/actions/fetchDecks";
import { useDeckContext } from "../context/DeckContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameCardPractice } from "@/components/game-card-practice";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, X, AlertCircle } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface DeckSelectorProps {
  label: string;
  selectedDeck: DeckWithCards | null;
  onDeckSelect: (deck: DeckWithCards) => void;
}

export default function DeckSelector({
  label,
  selectedDeck,
  onDeckSelect,
}: DeckSelectorProps) {
  // Use the shared deck context
  const { decks, loading, error, refreshDecks } = useDeckContext();
  
  const [filteredDecks, setFilteredDecks] = useState<DeckWithCards[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeckList, setShowDeckList] = useState(!selectedDeck);

  // Update filtered decks when decks or search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDecks(decks);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = decks.filter(
        (deck) =>
          deck.name.toLowerCase().includes(query) ||
          deck.description?.toLowerCase().includes(query) ||
          deck.cards.some(
            (card) =>
              card.name.toLowerCase().includes(query) ||
              card.description?.toLowerCase().includes(query)
          )
      );
      setFilteredDecks(filtered);
    }
  }, [searchQuery, decks]);

  const handleChangeDeck = () => {
    setShowDeckList(true);
  };

  const handleSelectDeck = (deck: DeckWithCards) => {
    onDeckSelect(deck);
    setShowDeckList(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-100 text-red-700 rounded-md flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedDeck && !showDeckList) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>
              {label}: {selectedDeck.name}
            </span>
            <Button variant="outline" size="sm" onClick={handleChangeDeck}>
              Change
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-4">
            {selectedDeck.cards.map((card) => (
              <div key={card.id} className="w-[150px]">
                <GameCardPractice card={card} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Use decks as a fallback if filteredDecks is empty
  const displayDecks = filteredDecks.length > 0 ? filteredDecks : decks;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{label}</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshDecks}
              disabled={loading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`mr-1 ${loading ? "animate-spin" : ""}`}
              >
                <path d="M21 12a9 9 0 0 1-9 9c-4.97 0-9-4.03-9-9s4.03-9 9-9h3"></path>
                <path d="M21 3v6h-6"></path>
              </svg>
              Refresh
            </Button>
            {selectedDeck && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeckList(false)}
              >
                <X size={16} className="mr-1" /> Cancel
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Input
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X size={14} />
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {displayDecks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {decks.length === 0 ? (
                  <p>
                    No decks found with exactly 5 cards. Create a deck in the
                    Collection section.
                  </p>
                ) : (
                  <p>No decks match your search criteria.</p>
                )}
              </div>
            ) : (
              displayDecks.map((deck) => (
                <div key={deck.id} className="relative">
                  <Button
                    variant="outline"
                    className="w-full flex justify-between items-center"
                    onClick={() => handleSelectDeck(deck)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{deck.name}</span>
                    </div>

                    {/* Show all five mini card pictures in the same row as the deck name */}
                    <div className="flex gap-1">
                      {deck.cards.map((card) => (
                        <HoverCard
                          key={card.id}
                          openDelay={200}
                          closeDelay={100}
                        >
                          <HoverCardTrigger asChild>
                            <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                              <Image
                                src={card.image_url || ""}
                                alt={card.name || ""}
                                fill
                                className="object-cover"
                                sizes="32px"
                              />
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent
                            className="w-[200px] p-2"
                            align="center"
                          >
                            <GameCardPractice card={card} />
                          </HoverCardContent>
                        </HoverCard>
                      ))}
                    </div>
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
