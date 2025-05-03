"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import PracticeMode from "./components/practice-mode";
import MultiplayerMode from "./components/multiplayer-mode";
import { DeckProvider } from "./context/DeckContext";

type GameMode = "practice" | "multiplayer";

export default function PlayClient() {
  const [gameMode, setGameMode] = useState<GameMode>("practice");

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Play Mode</h1>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-green-500 to-teal-500
                     hover:from-green-600 hover:to-teal-600
                     text-white shadow-lg transition-all hover:scale-105"
          >
            <a href="/protected/collection/deck-building">
              <PlusCircle className="mr-2 h-5 w-5" />
              My Decks
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <button
            className={`p-6 rounded-lg border-2 ${
              gameMode === "practice"
                ? "border-primary bg-primary/10"
                : "border-muted"
            }`}
            onClick={() => setGameMode("practice")}
          >
            <div className="font-semibold text-xl mb-2">Practice Mode</div>
            <p className="text-muted-foreground">
              Play against yourself to test deck combinations. Ban cards, reorder your deck, and watch the auto-battle unfold!
            </p>
          </button>

          <button
            className={`p-6 rounded-lg border-2 ${
              gameMode === "multiplayer"
                ? "border-primary bg-primary/10"
                : "border-muted"
            }`}
            onClick={() => setGameMode("multiplayer")}
          >
            <div className="font-semibold text-xl mb-2">Multiplayer</div>
            <p className="text-muted-foreground">
              Battle against other players online. Ban cards, reorder your deck, and compete for glory!
            </p>
          </button>
        </div>

        {/* Wrap game mode components with DeckProvider */}
        <DeckProvider>
          <div className="mt-8">
            {gameMode === "practice" ? (
              <PracticeMode />
            ) : (
              <MultiplayerMode />
            )}
          </div>
        </DeckProvider>
      </div>
    </div>
  );
}
