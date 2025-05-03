"use client";

import { useState, useEffect, useRef } from "react";
import { DeckWithCards } from "@/app/actions/fetchDecks";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameCardPractice } from "@/components/game-card-practice";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, X, Check, AlertCircle } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [decks, setDecks] = useState<DeckWithCards[]>([]);
  const [filteredDecks, setFilteredDecks] = useState<DeckWithCards[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeckList, setShowDeckList] = useState(!selectedDeck);
  
  // Ref to track if component is mounted
  const isMounted = useRef(true);

  useEffect(() => {
    // Set isMounted to false when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadDecks() {
      try {
        setLoading(true);
        
        // Fetch decks using a dedicated API endpoint
        const response = await fetch('/api/decks');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch decks: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Only update state if component is still mounted
        if (isMounted.current) {
          // Filter decks to only include those with exactly 5 cards
          const validDecks = (result.decks || []).filter(
            (deck: DeckWithCards) => deck.cards && deck.cards.length === 5
          );
          
          setDecks(validDecks);
          setFilteredDecks(validDecks);
        }
      } catch (err) {
        console.error("Error loading decks:", err);
        if (isMounted.current) {
          setError("Failed to load decks");
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }

    loadDecks();
  }, []);

  // Filter decks based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDecks(decks);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = decks.filter(deck => 
        deck.name.toLowerCase().includes(query) ||
        deck.description?.toLowerCase().includes(query) ||
        deck.cards.some(card => 
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
            <span>{label}: {selectedDeck.name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleChangeDeck}
            >
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{label}</span>
          {selectedDeck && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeckList(false)}
            >
              <X size={16} className="mr-1" /> Cancel
            </Button>
          )}
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
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
            {filteredDecks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {decks.length === 0 ? (
                  <p>
                    No decks found with exactly 5 cards. Create a deck in the Collection section.
                  </p>
                ) : (
                  <p>No decks match your search criteria.</p>
                )}
              </div>
            ) : (
              filteredDecks.map((deck) => (
                <HoverCard key={deck.id} openDelay={300} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => handleSelectDeck(deck)}
                    >
                      <span>{deck.name}</span>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center text-green-600">
                                <Check size={16} className="mr-1" />
                                <span>5 cards</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              This deck has exactly 5 cards and is ready for battle
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-96 p-0" align="end">
                    <div className="p-4 bg-muted/50">
                      <h4 className="font-semibold">{deck.name}</h4>
                      <p className="text-sm text-muted-foreground">{deck.description}</p>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap justify-center gap-4">
                        {deck.cards.map((card) => (
                          <div key={card.id} className="transform transition-transform hover:scale-105 w-[150px]">
                            <GameCardPractice card={card} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
