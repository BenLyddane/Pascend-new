import { useState, useEffect } from "react";
import { CardModal } from "@/components/card-modal";
import { GameState } from "./game-state-types";
import { CardState } from "./battlefield-types";
import { CardWithEffects } from "@/app/actions/fetchDecks";
import { GameMode } from "../game-modes/types";
import BattleLog from "@/app/protected/play/components/battle-log";
import Battlefield from "@/app/protected/play/components/battlefield";
import GameResults from "@/app/protected/play/components/game-results";

interface GamePlayUIProps {
  gameState: GameState | null;
  userName: string;
  mode: GameMode;
  error: string | null;
  isReconnecting: boolean;
  onReturnToMatchmaking?: () => void;
  isOnlineMatch?: boolean;
}

export default function GamePlayUI({
  gameState,
  userName,
  mode,
  error,
  isReconnecting,
  onReturnToMatchmaking,
  isOnlineMatch = false,
}: GamePlayUIProps) {
  const [selectedCard, setSelectedCard] = useState<CardWithEffects | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Add a state to force re-render when game state changes
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Force re-render when game state changes
  useEffect(() => {
    if (gameState) {
      setLastUpdate(Date.now());
    }
  }, [gameState]);

  if (!gameState) {
    return <div>Loading game...</div>;
  }

  // Show reconnecting state but keep the battle log visible
  const connectionStatus = isReconnecting ? (
    <div className="fixed top-4 right-4 bg-yellow-500/90 text-black px-4 py-2 rounded-md shadow-lg z-50">
      Reconnecting to game server...
    </div>
  ) : error ? (
    <div className="fixed top-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-md shadow-lg z-50">
      {error}
    </div>
  ) : null;

  return (
    <div className="grid grid-cols-2 gap-8 relative">
      {connectionStatus}
      {/* Left Column: Battlefield and Results */}
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
          
          {/* Battlefield - Add key to force re-render when game state changes */}
          <Battlefield
            key={`battlefield-${gameState.currentTurn}-${gameState.battleLog.length}`}
            player1Cards={gameState.player1Cards}
            player2Cards={gameState.player2Cards}
            currentBattle={gameState.currentBattle}
            onCardClick={(cardState: CardState) => {
              setSelectedCard(cardState.card);
              setIsModalOpen(true);
            }}
            battleLog={gameState.battleLog}
            player1GoesFirst={gameState.player1GoesFirst}
            isPlayer1Turn={gameState.currentTurn % 2 === (gameState.player1GoesFirst ? 1 : 0)}
          />
        </div>
      </div>

      {/* Right Column: Battle Log */}
      <div className="h-[calc(100vh-100px)]">
        <BattleLog
          key={`battle-log-${gameState.currentTurn}-${gameState.battleLog.length}`}
          entries={gameState.battleLog}
          player1GoesFirst={gameState.player1GoesFirst}
          player1Name={userName}
          player2Name={mode === "practice" ? "AI Opponent" : "Opponent"}
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
