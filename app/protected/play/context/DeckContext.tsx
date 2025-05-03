"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { DeckWithCards } from "@/app/actions/fetchDecks";
import { fetchDecks } from "@/app/actions/deckActions";

interface DeckContextType {
  decks: DeckWithCards[];
  loading: boolean;
  error: string | null;
  refreshDecks: () => Promise<void>;
}

const DeckContext = createContext<DeckContextType>({
  decks: [],
  loading: true,
  error: null,
  refreshDecks: async () => {},
});

export const useDeckContext = () => useContext(DeckContext);

export function DeckProvider({ children }: { children: React.ReactNode }) {
  const [decks, setDecks] = useState<DeckWithCards[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDecks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the server action to fetch decks
      const validDecks = await fetchDecks();
      
      setDecks(validDecks);
    } catch (err) {
      console.error("Error loading decks:", err);
      setError("Failed to load decks");
    } finally {
      setLoading(false);
    }
  };

  // Load decks when the provider mounts
  useEffect(() => {
    loadDecks();
  }, []);

  return (
    <DeckContext.Provider
      value={{
        decks,
        loading,
        error,
        refreshDecks: loadDecks,
      }}
    >
      {children}
    </DeckContext.Provider>
  );
}
