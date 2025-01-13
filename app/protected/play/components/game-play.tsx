"use client";

import { useState, useEffect } from "react";
import { CardModal } from "@/components/card-modal";
import { GameEngine } from "@/app/protected/play/game-engine/game-engine";
import {
  GameCard,
  CardState,
  GameState,
} from "@/app/protected/play/game-engine/types";
import BattleLog from "./battle-log";
import CardZone from "./card-zone";
import GameResults from "./game-results";
import { createClient } from "@/utils/supabase/client";
import { updateMatchStats } from "@/app/actions/updateMatchStats";

type GamePlayProps = {
  player1Cards: GameCard[];
  player2Cards: GameCard[];
  onGameEnd?: (winner: 1 | 2 | "draw", stats: any) => void;
  isOnlineMatch?: boolean;
  opponentId?: string;
  onReturnToMatchmaking?: () => void;
};

export default function GamePlay({
  player1Cards,
  player2Cards,
  onGameEnd,
  isOnlineMatch = false,
  opponentId,
  onReturnToMatchmaking,
}: GamePlayProps) {
  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gameEngine] = useState(() => {
    console.log("\n=== Initializing Game Engine ===");
    console.log(
      "Player 1 Cards:",
      player1Cards.map((card) => ({
        name: card.name,
        gameplay_effects: card.gameplay_effects,
        special_effects: card.special_effects,
      }))
    );
    console.log(
      "Player 2 Cards:",
      player2Cards.map((card) => ({
        name: card.name,
        gameplay_effects: card.gameplay_effects,
        special_effects: card.special_effects,
      }))
    );

    const engine = new GameEngine(player1Cards, player2Cards);
    console.log("Game Engine Created");
    return engine;
  });

  const [gameState, setGameState] = useState(() => {
    const state = gameEngine.getGameState();
    console.log("\n=== Initial Game State ===");
    console.log("Player 1 Cards:", state.player1Cards);
    console.log("Player 2 Cards:", state.player2Cards);
    console.log("Player 1 Goes First:", state.player1GoesFirst);
    return state;
  });
  const [autoPlayInterval, setAutoPlayInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [userName, setUserName] = useState<string>("");

  const supabase = createClient();

  // Get user's display name
  useEffect(() => {
    async function getUserName() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("player_profiles")
          .select("settings")
          .eq("user_id", user.id)
          .single();

        if (profile?.settings?.display_name) {
          setUserName(profile.settings.display_name);
        } else {
          setUserName(user.email?.split("@")[0] || "Player");
        }
      }
    }
    getUserName();
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Start auto-play
    const interval = setInterval(() => {
      if (!isMounted) return;

      console.log("\n=== Processing Turn ===");
      const logEntry = gameEngine.processTurn();
      if (!isMounted) return;

      // Update game state immediately after each turn
      const currentState = gameEngine.getGameState();
      console.log("Turn:", currentState.currentTurn);
      console.log("Battle Log Entry:", logEntry);
      setGameState((prevState: GameState) => ({
        ...currentState,
        battleLog: [...currentState.battleLog], // Create new array reference to ensure re-render
      }));

      if (currentState.winner !== null) {
        clearInterval(interval);
        const stats = gameEngine.getGameStats();

        if (isOnlineMatch) {
          // Save stats for online matches
          saveMatchStats(currentState.winner, stats);
        }

        onGameEnd?.(currentState.winner, stats);
      }
    }, 1000); // Process a turn every second for smoother gameplay

    setAutoPlayInterval(interval);

    // Cleanup
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  const saveMatchStats = async (winner: 1 | 2 | "draw", stats: any) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !isOnlineMatch || !opponentId) return;

      await updateMatchStats(user.id, opponentId, winner, stats);
    } catch (error) {
      console.error("Error saving match stats:", error);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left Column: Card Zones and Results */}
      <div className="flex flex-col gap-4 relative">
        <div className="space-y-4 relative">
          {/* Game Results Overlay */}
          {gameState.winner && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <GameResults
                winner={gameState.winner}
                survivingCards={[
                  ...gameState.player1Cards,
                  ...gameState.player2Cards,
                ]}
                onReturnToMatchmaking={onReturnToMatchmaking}
                isMatchmaking={isOnlineMatch}
                drawReason={gameState.drawReason}
              />
            </div>
          )}
          {/* Player's Cards */}
          <CardZone
            playerNumber={1}
            playerName={userName}
            cards={gameState.player1Cards}
            currentBattleIndex={gameState.currentBattle.card1Index}
            onCardClick={(cardState: CardState) => {
              setSelectedCard(cardState.card);
              setIsModalOpen(true);
            }}
          />

          {/* AI's Cards */}
          <CardZone
            playerNumber={2}
            playerName="AI Opponent"
            cards={gameState.player2Cards}
            currentBattleIndex={gameState.currentBattle.card2Index}
            onCardClick={(cardState: CardState) => {
              setSelectedCard(cardState.card);
              setIsModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* Right Column: Battle Log */}
      <div className="h-[calc(100vh-100px)]">
        <BattleLog
          entries={gameState.battleLog}
          player1GoesFirst={gameState.player1GoesFirst}
          player1Name={userName}
          player2Name="AI Opponent"
        />
      </div>

      {/* Single Card Modal */}
      <CardModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCard(null);
        }}
      />
    </div>
  );
}
