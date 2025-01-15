import { useState } from "react";
import { CardModal } from "@/components/card-modal";
import { GameCard, CardState, GameState } from "../game-engine/types";
import { GameMode } from "../game-modes/types";
import BattleLog from "./battle-log";
import CardZone from "./card-zone";
import GameResults from "./game-results";

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
  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            playerName={mode === "practice" ? "Player 2" : "AI Opponent"}
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
          player2Name={mode === "practice" ? "Player 2" : "AI Opponent"}
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
