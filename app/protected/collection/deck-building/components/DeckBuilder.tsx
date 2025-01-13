"use client";

import { useState } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { DeckList } from "./DeckList";
import { CardGrid } from "./CardGrid";
import { DeckEditor } from "./DeckEditor";
import { createDeck } from "@/app/actions/createDecks";
import { updateDeck } from "@/app/actions/updateDeck";
import type { CardWithEffects, DeckWithCards } from "@/app/actions/fetchDecks";

interface DeckBuilderProps {
  initialCards: CardWithEffects[];
  initialDecks: DeckWithCards[];
  userId: string;
}

export function DeckBuilder({
  initialCards,
  initialDecks,
  userId,
}: DeckBuilderProps) {
  // State for cards and decks
  const [userCards] = useState<CardWithEffects[]>(initialCards);
  const [decks, setDecks] = useState<DeckWithCards[]>(initialDecks);
  const [selectedCards, setSelectedCards] = useState<CardWithEffects[]>([]);
  const [activeEditDeck, setActiveEditDeck] = useState<DeckWithCards | null>(null);

  // UI state
  const [deckName, setDeckName] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Handle selecting a card for the deck
  const handleCardSelect = (card: CardWithEffects) => {
    if (selectedCards.some((c) => c.id === card.id)) {
      setSelectedCards(selectedCards.filter((c) => c.id !== card.id));
    } else if (selectedCards.length < 5) {
      setSelectedCards([...selectedCards, card]);
    }
  };

  // Load an existing deck for editing
  const handleLoadDeck = (deck: DeckWithCards) => {
    setActiveEditDeck(deck);
    setDeckName(deck.name);
    setSelectedCards(deck.cards);
  };

  // Clear the current deck editing state
  const handleClearDeck = () => {
    setActiveEditDeck(null);
    setDeckName("");
    setSelectedCards([]);
  };

  // Save the current deck
  const handleSaveDeck = async () => {
    if (selectedCards.length !== 5) {
      setNotification({
        type: "error",
        message: "You must select exactly 5 cards to create a deck.",
      });
      return;
    }

    if (!deckName.trim()) {
      setNotification({
        type: "error",
        message: "Please provide a name for your deck.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const cardList = selectedCards.map(({ id, name, power, health }) => ({
        id,
        name,
        power,
        health,
      }));

      if (activeEditDeck) {
        // Update existing deck
        const updateResponse = await updateDeck({
          id: activeEditDeck.id,
          name: deckName,
          description: `A custom deck named ${deckName}`,
          card_list: cardList,
          user_id: userId,
        });

        if (updateResponse.success) {
          setDecks(
            decks.map((deck) =>
              deck.id === activeEditDeck.id
                ? {
                    ...deck,
                    name: deckName,
                    description: `A custom deck named ${deckName}`,
                    updated_at: new Date().toISOString(),
                    cards: selectedCards,
                  }
                : deck
            )
          );
          setNotification({
            type: "success",
            message: "Deck updated successfully!",
          });
          handleClearDeck();
        } else {
          setNotification({
            type: "error",
            message: updateResponse.message || "Failed to update deck",
          });
        }
      } else {
        // Create new deck
        const createResponse = await createDeck({
          name: deckName,
          description: `A custom deck named ${deckName}`,
          card_list: cardList,
          user_id: userId,
          deck_type: "custom",
        });

        if (createResponse.success) {
          const newDeck: DeckWithCards = {
            id: createResponse.id,
            name: deckName,
            description: `A custom deck named ${deckName}`,
            user_id: userId,
            deck_type: "custom",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true,
            template_id: null,
            last_used_at: null,
            losses: 0,
            wins: 0,
            total_matches: 0,
            cards: selectedCards,
          };
          setDecks([...decks, newDeck]);
          setNotification({
            type: "success",
            message: "Deck created successfully!",
          });
          handleClearDeck();
        } else {
          setNotification({
            type: "error",
            message: createResponse.message || "Failed to create deck",
          });
        }
      }
    } catch (error) {
      console.error("Error saving deck:", error);
      setNotification({
        type: "error",
        message: "Failed to save deck. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)] max-w-[1920px] mx-auto px-4">
      {/* Deck List Section (Left Side) */}
      <div className="col-span-2 bg-card rounded-lg p-4">
        <DeckList
          decks={decks}
          activeEditDeckId={activeEditDeck?.id || null}
          onDeckSelect={handleLoadDeck}
        />
      </div>

      {/* Card Selection Area (Middle) */}
      <div className="col-span-7 space-y-6">
        <CardGrid
          cards={userCards}
          selectedCardIds={selectedCards.map((card) => card.id)}
          onCardSelect={handleCardSelect}
        />
      </div>

      {/* Active Deck Editing (Right Side) */}
      <div className="col-span-3 bg-card rounded-lg p-4">
        <DeckEditor
          selectedCards={selectedCards}
          deckName={deckName}
          isEditing={!!activeEditDeck}
          isSaving={isSaving}
          onDeckNameChange={setDeckName}
          onCardRemove={(card) =>
            setSelectedCards(selectedCards.filter((c) => c.id !== card.id))
          }
          onSave={handleSaveDeck}
          onClear={handleClearDeck}
        />
      </div>

      {/* Notification */}
      {notification && (
        <Alert
          variant={notification.type === "error" ? "destructive" : "default"}
          className="fixed bottom-4 right-4 w-96 shadow-lg z-50"
        >
          <AlertTitle>
            {notification.type === "error" ? "Error" : "Success"}
          </AlertTitle>
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
