"use client";

import { useState } from "react";
import PracticeMode from "./components/practice-mode";
import Matchmaking from "./components/matchmaking";
import TestMatchmaking from "./components/test-matchmaking";

type GameMode = "practice" | "matchmaking" | "test-matchmaking";

export default function PlayClient() {
  const [gameMode, setGameMode] = useState<GameMode>("practice");

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Play Mode</h1>

        <div className="grid grid-cols-3 gap-4">
          <button
            className={`p-4 rounded-lg border-2 ${
              gameMode === "practice"
                ? "border-primary bg-primary/10"
                : "border-muted"
            }`}
            onClick={() => setGameMode("practice")}
          >
            <div className="font-semibold">Practice Mode</div>
            <p className="text-sm text-muted-foreground">
              Play against yourself to test deck combinations
            </p>
          </button>

          <button
            className={`p-4 rounded-lg border-2 ${
              gameMode === "matchmaking"
                ? "border-primary bg-primary/10"
                : "border-muted"
            }`}
            onClick={() => setGameMode("matchmaking")}
          >
            <div className="font-semibold">Matchmaking</div>
            <p className="text-sm text-muted-foreground">
              Battle against other players
            </p>
          </button>
          <button
            className={`p-4 rounded-lg border-2 ${
              gameMode === "test-matchmaking"
                ? "border-primary bg-primary/10"
                : "border-muted"
            }`}
            onClick={() => setGameMode("test-matchmaking")}
          >
            <div className="font-semibold">Test Matchmaking</div>
            <p className="text-sm text-muted-foreground">
              Test matchmaking with simulated opponents
            </p>
          </button>
        </div>

        {/* Game mode components */}
        <div className="mt-4">
          {gameMode === "practice" ? (
            <PracticeMode />
          ) : gameMode === "matchmaking" ? (
            <Matchmaking />
          ) : (
            <TestMatchmaking />
          )}
        </div>
      </div>
    </div>
  );
}
