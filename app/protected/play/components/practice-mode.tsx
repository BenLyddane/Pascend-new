"use client";

import { useState, useEffect } from "react";
import CoinFlip from "./coin-flip";
import { updateMatchStats } from "@/app/actions/updateMatchStats";
import { createClient } from "@/utils/supabase/client";
import { DeckWithCards, CardWithEffects } from "@/app/actions/fetchDecks";
import DeckSelector from "./deck-selector";
import BattleVisualizer from "./battle-visualizer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameCardPractice } from "@/components/game-card-practice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Ban,
  Check,
  MoveHorizontal,
  Play,
  RotateCcw,
  Shield,
} from "lucide-react";
import { GameState as BattleGameState } from "../game-engine/types";

type GamePhase =
  | "selecting"
  | "banning"
  | "reordering"
  | "battling"
  | "completed";

export default function PracticeMode() {
  const [gameState, setGameState] = useState<GamePhase>("selecting");
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [player1GoesFirst, setPlayer1GoesFirst] = useState(false);
  const [selectedDecks, setSelectedDecks] = useState<{
    deck1: DeckWithCards | null;
    deck2: DeckWithCards | null;
  }>({
    deck1: null,
    deck2: null,
  });

  const [bannedCards, setBannedCards] = useState<{
    player1Bans: number[];
    player2Bans: number[];
  }>({
    player1Bans: [],
    player2Bans: [],
  });

  const [cardOrder, setCardOrder] = useState<{
    player1Order: number[];
    player2Order: number[];
  }>({
    player1Order: [0, 1, 2],
    player2Order: [0, 1, 2],
  });

  const [battleResult, setBattleResult] = useState<any>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get the current user ID
  useEffect(() => {
    const fetchUserId = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    
    fetchUserId();
  }, []);

  const handleDeckSelect = (deck: DeckWithCards, isFirstDeck: boolean) => {
    setSelectedDecks((prev) => ({
      ...prev,
      [isFirstDeck ? "deck1" : "deck2"]: deck,
    }));
  };

  const handleStartGame = () => {
    if (!selectedDecks.deck1 || !selectedDecks.deck2) return;
    setGameState("banning");

    // Reset bans and order
    setBannedCards({
      player1Bans: [],
      player2Bans: [],
    });

    setCardOrder({
      player1Order: [0, 1, 2],
      player2Order: [0, 1, 2],
    });
  };

  const handleBanCard = (deckIndex: number, cardIndex: number) => {
    if (gameState !== "banning") return;

    // Player 1 bans cards from deck 2, and player 2 bans cards from deck 1
    const banKey = deckIndex === 1 ? "player1Bans" : "player2Bans";

    setBannedCards((prev) => {
      // Check if already banned 2 cards
      if (prev[banKey].length >= 2) {
        return prev;
      }

      // Check if card is already banned
      if (prev[banKey].includes(cardIndex)) {
        return prev;
      }

      // Create a new array with the updated bans
      const newBans = [...prev[banKey], cardIndex];

      // Return a new object to ensure React detects the state change
      return {
        ...prev,
        [banKey]: newBans,
      };
    });
  };

  const handleUnbanCard = (deckIndex: number, cardIndex: number) => {
    if (gameState !== "banning") return;

    // Player 1 bans cards from deck 2, and player 2 bans cards from deck 1
    const banKey = deckIndex === 1 ? "player1Bans" : "player2Bans";

    setBannedCards((prev) => ({
      ...prev,
      [banKey]: prev[banKey].filter((index) => index !== cardIndex),
    }));
  };

  const handleCompleteBanning = () => {
    if (
      bannedCards.player1Bans.length !== 2 ||
      bannedCards.player2Bans.length !== 2
    ) {
      setError("Each player must ban exactly 2 cards");
      return;
    }

    setError(null);
    setGameState("reordering");

    // Get the indices of cards that weren't banned
    const player1RemainingIndices = [];
    const player2RemainingIndices = [];

    // For player 1, we need to find the indices that weren't banned by player 2
    for (let i = 0; i < 5; i++) {
      if (!bannedCards.player2Bans.includes(i)) {
        player1RemainingIndices.push(player1RemainingIndices.length);
      }
    }

    // For player 2, we need to find the indices that weren't banned by player 1
    for (let i = 0; i < 5; i++) {
      if (!bannedCards.player1Bans.includes(i)) {
        player2RemainingIndices.push(player2RemainingIndices.length);
      }
    }

    console.log("Player 1 remaining indices:", player1RemainingIndices);
    console.log("Player 2 remaining indices:", player2RemainingIndices);

    setCardOrder({
      player1Order: player1RemainingIndices,
      player2Order: player2RemainingIndices,
    });
  };

  const handleMoveCard = (
    playerIndex: number,
    cardIndex: number,
    direction: "up" | "down"
  ) => {
    if (gameState !== "reordering") return;

    const orderKey = playerIndex === 0 ? "player1Order" : "player2Order";
    const currentOrder = [...cardOrder[orderKey]];
    const currentPosition = currentOrder.indexOf(cardIndex);

    if (direction === "up" && currentPosition > 0) {
      // Swap with the card above
      [currentOrder[currentPosition], currentOrder[currentPosition - 1]] = [
        currentOrder[currentPosition - 1],
        currentOrder[currentPosition],
      ];
    } else if (
      direction === "down" &&
      currentPosition < currentOrder.length - 1
    ) {
      // Swap with the card below
      [currentOrder[currentPosition], currentOrder[currentPosition + 1]] = [
        currentOrder[currentPosition + 1],
        currentOrder[currentPosition],
      ];
    }

    setCardOrder((prev) => ({
      ...prev,
      [orderKey]: currentOrder,
    }));
  };

  const handleCompleteReordering = () => {
    // Show coin flip animation to determine who goes first
    setShowCoinFlip(true);
  };
  
  const handleCoinFlipComplete = (result: boolean) => {
    setPlayer1GoesFirst(result);
    setShowCoinFlip(false);
    setGameState("battling");
    runBattle(result);
  };

  const runBattle = async (player1First: boolean = Math.random() > 0.5) => {
    if (!selectedDecks.deck1 || !selectedDecks.deck2) return;

    setIsLoading(true);
    setError(null);

    try {
      // First, setup the game
      const setupResponse = await fetch("/api/game/auto-battle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "SETUP_GAME",
          payload: {
            player1Cards: selectedDecks.deck1.cards,
            player2Cards: selectedDecks.deck2.cards,
            player1Bans: bannedCards.player1Bans,
            player2Bans: bannedCards.player2Bans,
            player1Order: cardOrder.player1Order,
            player2Order: cardOrder.player2Order,
            player1GoesFirst: player1First,
            mode: "practice",
            player1DeckId: selectedDecks.deck1.id,
            player2DeckId: selectedDecks.deck2.id,
          },
        }),
      });

      if (!setupResponse.ok) {
        const errorData = await setupResponse.json();
        throw new Error(errorData.error || "Failed to setup game");
      }

      const setupData = await setupResponse.json();
      const gameId = setupData.gameId;

      // Store the initial game state for the battle visualizer
      setBattleResult(setupData.gameState);

      // We'll let the BattleVisualizer component handle the battle visualization
      // instead of immediately running the battle to completion
      setIsLoading(false);
    } catch (error) {
      console.error("Error running battle:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setGameState("selecting");
    setBattleResult(null);
    setError(null);
  };

  // Show coin flip if needed
  if (showCoinFlip) {
    return <CoinFlip onComplete={handleCoinFlipComplete} />;
  }

  // Render different UI based on game state
  if (gameState === "selecting") {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-8">
          <DeckSelector
            label="Player 1's Deck"
            selectedDeck={selectedDecks.deck1}
            onDeckSelect={(deck) => handleDeckSelect(deck, true)}
          />
          <DeckSelector
            label="Player 2's Deck"
            selectedDeck={selectedDecks.deck2}
            onDeckSelect={(deck) => handleDeckSelect(deck, false)}
          />
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleStartGame}
            disabled={!selectedDecks.deck1 || !selectedDecks.deck2}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            Start Practice Game
          </Button>
        </div>
      </div>
    );
  }

  if (gameState === "banning") {
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-center">Ban Phase</h2>
        <p className="text-center">
          Each player must ban 2 cards from the opponent's deck
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Tabs defaultValue="player1" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="player1">Player 1 Bans</TabsTrigger>
            <TabsTrigger value="player2">Player 2 Bans</TabsTrigger>
          </TabsList>

          <TabsContent value="player1" className="space-y-4">
            <h3 className="text-lg font-semibold">
              Player 1 bans from Player 2's deck (
              {bannedCards.player1Bans.length}/2)
            </h3>
            <div className="flex flex-wrap justify-center gap-6">
              {selectedDecks.deck2?.cards.map((card, index) => (
                <div key={card.id} className="relative w-[180px]">
                  <GameCardPractice card={card} />
                  {bannedCards.player1Bans.includes(index) ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 rounded-full p-1"
                      onClick={() => handleUnbanCard(1, index)}
                    >
                      <RotateCcw size={16} />
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 rounded-full p-1"
                      onClick={() => handleBanCard(1, index)}
                      disabled={bannedCards.player1Bans.length >= 2}
                    >
                      <Ban size={16} />
                    </Button>
                  )}
                  {bannedCards.player1Bans.includes(index) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <Ban size={48} className="text-red-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="player2" className="space-y-4">
            <h3 className="text-lg font-semibold">
              Player 2 bans from Player 1's deck (
              {bannedCards.player2Bans.length}/2)
            </h3>
            <div className="flex flex-wrap justify-center gap-6">
              {selectedDecks.deck1?.cards.map((card, index) => (
                <div key={card.id} className="relative w-[180px]">
                  <GameCardPractice card={card} />
                  {bannedCards.player2Bans.includes(index) ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 rounded-full p-1"
                      onClick={() => handleUnbanCard(0, index)}
                    >
                      <RotateCcw size={16} />
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 rounded-full p-1"
                      onClick={() => handleBanCard(0, index)}
                      disabled={bannedCards.player2Bans.length >= 2}
                    >
                      <Ban size={16} />
                    </Button>
                  )}
                  {bannedCards.player2Bans.includes(index) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <Ban size={48} className="text-red-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-center">
          <Button
            onClick={handleCompleteBanning}
            disabled={
              bannedCards.player1Bans.length !== 2 ||
              bannedCards.player2Bans.length !== 2
            }
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            Continue to Reordering <ArrowRight className="ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (gameState === "reordering") {
    // Filter out banned cards
    const player1RemainingCards =
      selectedDecks.deck1?.cards.filter(
        (_, index) => !bannedCards.player2Bans.includes(index)
      ) || [];

    const player2RemainingCards =
      selectedDecks.deck2?.cards.filter(
        (_, index) => !bannedCards.player1Bans.includes(index)
      ) || [];

    // Reorder cards based on current order - handle potential undefined values
    const player1OrderedCards = cardOrder.player1Order
      .map((index) => player1RemainingCards[index])
      .filter((card) => card !== undefined); // Filter out any undefined cards

    const player2OrderedCards = cardOrder.player2Order
      .map((index) => player2RemainingCards[index])
      .filter((card) => card !== undefined); // Filter out any undefined cards

    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-center">Reordering Phase</h2>
        <p className="text-center">
          Reorder your remaining cards (first card will be played first)
        </p>

        <Tabs defaultValue="player1" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="player1">Player 1's Cards</TabsTrigger>
            <TabsTrigger value="player2">Player 2's Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="player1" className="space-y-4">
            <h3 className="text-lg font-semibold">Player 1's Cards</h3>
            <div className="space-y-4">
              {player1OrderedCards.map((card, displayIndex) => {
                const originalIndex = cardOrder.player1Order[displayIndex];
                return (
                  <div key={card.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      {displayIndex + 1}
                    </div>
                    <div className="flex-grow">
                      <GameCardPractice card={card} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveCard(0, originalIndex, "up")}
                        disabled={displayIndex === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveCard(0, originalIndex, "down")}
                        disabled={
                          displayIndex === player1OrderedCards.length - 1
                        }
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="player2" className="space-y-4">
            <h3 className="text-lg font-semibold">Player 2's Cards</h3>
            <div className="space-y-4">
              {player2OrderedCards.map((card, displayIndex) => {
                const originalIndex = cardOrder.player2Order[displayIndex];
                return (
                  <div key={card.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      {displayIndex + 1}
                    </div>
                    <div className="flex-grow">
                      <GameCardPractice card={card} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveCard(1, originalIndex, "up")}
                        disabled={displayIndex === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveCard(1, originalIndex, "down")}
                        disabled={
                          displayIndex === player2OrderedCards.length - 1
                        }
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-center">
          <Button
            onClick={handleCompleteReordering}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg"
          >
            Start Battle <Play className="ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (gameState === "battling") {
    // If we have a setup response but no battle result yet, show the battle visualizer
    if (battleResult && !battleResult.winner) {
      return (
        <BattleVisualizer
          initialState={battleResult}
          onComplete={async (finalState, log) => {
            setBattleResult(finalState);
            setBattleLog(log);
            setGameState("completed");
            
            // Save match stats to the database
            try {
              // Add deck IDs to the game state for stats tracking
              const gameStateWithDecks = {
                ...finalState,
                player1DeckId: selectedDecks.deck1?.id,
                player2DeckId: selectedDecks.deck2?.id
              };
              
              // Save match stats
              await updateMatchStats(gameStateWithDecks, userId);
            } catch (error) {
              console.error("Error saving match stats:", error);
            }
          }}
          onReset={handleReset}
        />
      );
    }

    // Otherwise, show a loading state
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4"></div>
        <h2 className="text-2xl font-bold">Setting Up Battle</h2>
        <p className="text-muted-foreground">
          Preparing the cards for battle...
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (gameState === "completed" && battleResult) {
    const winner =
      battleResult.winner === 1
        ? "Player 1"
        : battleResult.winner === 2
          ? "Player 2"
          : "Draw";

    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-center">Battle Completed</h2>

        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="text-4xl font-bold mb-2">
              {winner === "Draw" ? "It's a Draw!" : `${winner} Wins!`}
            </div>
            <div className="text-muted-foreground">
              {battleResult.drawReason ||
                (battleResult.winner === 1
                  ? "Player 1 defeated all of Player 2's cards"
                  : "Player 2 defeated all of Player 1's cards")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Player 1's Cards</h3>
              <div className="space-y-4">
                {battleResult.player1Cards.map((card: any) => (
                  <div key={card.id} className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        card.isDefeated
                          ? "bg-red-100 text-red-500"
                          : "bg-green-100 text-green-500"
                      }`}
                    >
                      {card.isDefeated ? "✗" : "✓"}
                    </div>
                    <div className="flex-grow">
                      <GameCardPractice
                        card={{
                          ...card,
                          health: card.health,
                          power: card.power,
                        }}
                      />
                    </div>
                    <div className="text-sm">
                      <div>
                        HP: {card.health}/{card.maxHealth}
                      </div>
                      <div>PWR: {card.power}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">Player 2's Cards</h3>
              <div className="space-y-4">
                {battleResult.player2Cards.map((card: any) => (
                  <div key={card.id} className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        card.isDefeated
                          ? "bg-red-100 text-red-500"
                          : "bg-green-100 text-green-500"
                      }`}
                    >
                      {card.isDefeated ? "✗" : "✓"}
                    </div>
                    <div className="flex-grow">
                      <GameCardPractice
                        card={{
                          ...card,
                          health: card.health,
                          power: card.power,
                        }}
                      />
                    </div>
                    <div className="text-sm">
                      <div>
                        HP: {card.health}/{card.maxHealth}
                      </div>
                      <div>PWR: {card.power}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Battle Log */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Battle Log</h3>
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Player 1 Battle Log */}
                <div>
                  <h4 className="text-md font-medium mb-1 text-center">
                    Player 1
                  </h4>
                  <div className="h-60 overflow-y-auto bg-muted/20 p-2 rounded">
                    {battleLog.map((log, index) => {
                      // Calculate the actual round number
                      const actualRound =
                        index === 0 ? 0 : Math.ceil(index / 2);

                      // Only show logs related to Player 1 or general battle logs
                      if (
                        log.includes("Player 1") ||
                        index === 0 || // Battle started
                        log.includes("Battle ended") ||
                        log.includes("wins the battle")
                      ) {
                        return (
                          <div key={index} className="mb-1">
                            <span className="text-muted-foreground text-xs">
                              [Round {actualRound}]
                            </span>{" "}
                            {log}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>

                {/* Player 2 Battle Log */}
                <div>
                  <h4 className="text-md font-medium mb-1 text-center">
                    Player 2
                  </h4>
                  <div className="h-60 overflow-y-auto bg-muted/20 p-2 rounded">
                    {battleLog.map((log, index) => {
                      // Calculate the actual round number
                      const actualRound =
                        index === 0 ? 0 : Math.ceil(index / 2);

                      // Only show logs related to Player 2 or general battle logs
                      if (
                        log.includes("Player 2") ||
                        index === 0 || // Battle started
                        log.includes("Battle ended") ||
                        log.includes("wins the battle")
                      ) {
                        return (
                          <div key={index} className="mb-1">
                            <span className="text-muted-foreground text-xs">
                              [Round {actualRound}]
                            </span>{" "}
                            {log}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleReset}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg"
            >
              Play Again <RotateCcw className="ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
