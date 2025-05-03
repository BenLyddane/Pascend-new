"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/types/game.types";
import { 
  AutoBattleState, 
  AutoBattleCard, 
  BattleEvent 
} from "@/app/protected/play/auto-battle/engine";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AutoBattleUIProps {
  player1Cards: Card[];
  player2Cards: Card[];
  player1DeckId: string;
  player2DeckId: string;
  onGameEnd?: (winner: 1 | 2 | "draw", stats: any) => void;
  isOnlineMatch?: boolean;
  opponentId?: string;
}

export default function AutoBattleUI({
  player1Cards,
  player2Cards,
  player1DeckId,
  player2DeckId,
  onGameEnd,
  isOnlineMatch = false,
  opponentId,
}: AutoBattleUIProps) {
  const [gameState, setGameState] = useState<AutoBattleState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [player1BannedCards, setPlayer1BannedCards] = useState<string[]>([]);
  const [player2BannedCards, setPlayer2BannedCards] = useState<string[]>([]);
  const [player1Ready, setPlayer1Ready] = useState<boolean>(false);
  const [player2Ready, setPlayer2Ready] = useState<boolean>(false);
  const [player1CardOrder, setPlayer1CardOrder] = useState<string[]>([]);
  const [player2CardOrder, setPlayer2CardOrder] = useState<string[]>([]);
  const [battleSpeed, setBattleSpeed] = useState<"slow" | "medium" | "fast">("medium");
  const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(false);
  const [currentAnimation, setCurrentAnimation] = useState<{
    type: "attack" | "damage" | "heal" | "effect" | "defeat";
    sourceId?: string;
    targetId?: string;
  } | null>(null);

  // Initialize game
  useEffect(() => {
    const createGame = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/game/auto-battle", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "create_game",
            player1Cards,
            player2Cards,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create game");
        }

        const data = await response.json();
        setGameId(data.gameId);
        setGameState(data.gameState);
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    createGame();
  }, [player1Cards, player2Cards]);

  // Handle card banning
  const handleBanCard = async (cardId: string, playerId: 1 | 2) => {
    if (!gameId) return;

    try {
      const response = await fetch("/api/game/auto-battle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "ban_card",
          gameId,
          playerId,
          cardId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to ban card");
      }

      const data = await response.json();
      setGameState(data.gameState);

      // Update local state
      if (playerId === 1) {
        setPlayer1BannedCards([...player1BannedCards, cardId]);
      } else {
        setPlayer2BannedCards([...player2BannedCards, cardId]);
      }
    } catch (error) {
      setError((error as Error).message);
    }
  };

  // Handle card reordering
  const handleReorderCards = async (cardOrder: string[], playerId: 1 | 2) => {
    if (!gameId) return;

    try {
      const response = await fetch("/api/game/auto-battle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reorder_cards",
          gameId,
          playerId,
          cardOrder,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reorder cards");
      }

      const data = await response.json();
      setGameState(data.gameState);

      // Update local state
      if (playerId === 1) {
        setPlayer1CardOrder(cardOrder);
      } else {
        setPlayer2CardOrder(cardOrder);
      }
    } catch (error) {
      setError((error as Error).message);
    }
  };

  // Handle player ready
  const handlePlayerReady = async (playerId: 1 | 2) => {
    if (!gameId) return;

    try {
      const response = await fetch("/api/game/auto-battle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "set_ready",
          gameId,
          playerId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to set player ready");
      }

      const data = await response.json();
      setGameState(data.gameState);

      // Update local state
      if (playerId === 1) {
        setPlayer1Ready(true);
      } else {
        setPlayer2Ready(true);
      }
    } catch (error) {
      setError((error as Error).message);
    }
  };

  // Process a single round
  const handleProcessRound = async () => {
    if (!gameId || gameState?.status !== "battling") return;

    try {
      const response = await fetch("/api/game/auto-battle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "process_round",
          gameId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process round");
      }

      const data = await response.json();
      setGameState(data.gameState);

      // Animate the latest event
      if (data.gameState.events.length > 0) {
        const latestEvent = data.gameState.events[data.gameState.events.length - 1];
        animateEvent(latestEvent);
      }

      // Check if game is completed
      if (data.gameState.status === "completed" && onGameEnd && data.gameState.winner) {
        onGameEnd(data.gameState.winner, {
          rounds: data.gameState.currentRound,
          events: data.gameState.events,
        });
      }
    } catch (error) {
      setError((error as Error).message);
    }
  };

  // Auto-complete battle
  const handleAutoComplete = async () => {
    if (!gameId || gameState?.status !== "battling") return;

    try {
      const response = await fetch("/api/game/auto-battle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "auto_complete",
          gameId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to auto-complete battle");
      }

      const data = await response.json();
      setGameState(data.gameState);

      // Check if game is completed
      if (data.gameState.status === "completed" && onGameEnd && data.gameState.winner) {
        onGameEnd(data.gameState.winner, {
          rounds: data.gameState.currentRound,
          events: data.gameState.events,
        });
      }
    } catch (error) {
      setError((error as Error).message);
    }
  };

  // Animate battle event
  const animateEvent = (event: BattleEvent) => {
    if (event.type === "attack") {
      setCurrentAnimation({
        type: "attack",
        sourceId: event.sourceCardId,
        targetId: event.targetCardId,
      });
    } else if (event.type === "effect") {
      setCurrentAnimation({
        type: "effect",
        sourceId: event.sourceCardId,
        targetId: event.targetCardId,
      });
    } else if (event.type === "defeat") {
      setCurrentAnimation({
        type: "defeat",
        targetId: event.targetCardId,
      });
    }

    // Clear animation after delay
    setTimeout(() => {
      setCurrentAnimation(null);
    }, 1000);
  };

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlayEnabled || !gameState || gameState.status !== "battling") {
      return;
    }

    const delay = battleSpeed === "slow" ? 2000 : battleSpeed === "medium" ? 1000 : 500;
    
    const timer = setTimeout(() => {
      handleProcessRound();
    }, delay);

    return () => clearTimeout(timer);
  }, [autoPlayEnabled, gameState, battleSpeed]);

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading game...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!gameState) {
    return <div>No game state available</div>;
  }

  // Simplified UI rendering
  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {gameState.status === "completed" 
            ? `Battle Complete - ${gameState.winner === 1 ? "Player 1 Wins!" : gameState.winner === 2 ? "Player 2 Wins!" : "Draw!"}`
            : `Auto Battle - ${gameState.status.charAt(0).toUpperCase() + gameState.status.slice(1)} Phase`}
        </h2>
        
        {gameState.status === "battling" && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span>Speed:</span>
              <select 
                value={battleSpeed}
                onChange={(e) => setBattleSpeed(e.target.value as "slow" | "medium" | "fast")}
                className="border rounded p-1"
              >
                <option value="slow">Slow</option>
                <option value="medium">Medium</option>
                <option value="fast">Fast</option>
              </select>
            </div>
            
            <Button
              variant={autoPlayEnabled ? "destructive" : "default"}
              onClick={() => setAutoPlayEnabled(!autoPlayEnabled)}
            >
              {autoPlayEnabled ? "Stop Auto-Play" : "Auto-Play"}
            </Button>
            
            <Button
              onClick={handleProcessRound}
              disabled={autoPlayEnabled}
            >
              Next Round
            </Button>
            
            <Button
              variant="outline"
              onClick={handleAutoComplete}
              disabled={autoPlayEnabled}
            >
              Skip to End
            </Button>
          </div>
        )}
      </div>

      {gameState.status === "setup" && (
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Player 1</h3>
            <Button 
              onClick={() => handlePlayerReady(1)} 
              disabled={player1Ready}
              className="w-full mb-4"
            >
              {player1Ready ? "Ready!" : "Mark as Ready"}
            </Button>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4">Player 2</h3>
            <Button 
              onClick={() => handlePlayerReady(2)} 
              disabled={player2Ready}
              className="w-full mb-4"
            >
              {player2Ready ? "Ready!" : "Mark as Ready"}
            </Button>
          </div>
        </div>
      )}

      {gameState.status === "banning" && (
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Player 1 bans from Player 2's deck</h3>
            <div className="grid grid-cols-2 gap-4">
              {gameState.player2Cards.map((card) => (
                <div 
                  key={card.id} 
                  className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all ${
                    player1BannedCards.includes(card.cardId) ? "opacity-50 border-red-500" : "hover:shadow-lg"
                  }`}
                  onClick={() => {
                    if (player1BannedCards.length < 2 && !player1BannedCards.includes(card.cardId)) {
                      handleBanCard(card.cardId, 1);
                    }
                  }}
                >
                  <div className="p-2">
                    <h4 className="font-semibold truncate">{card.name}</h4>
                    <div className="flex justify-between text-sm">
                      <span>❤️ {card.health}</span>
                      <span>⚔️ {card.power}</span>
                    </div>
                  </div>
                  {player1BannedCards.includes(card.cardId) && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <Badge variant="destructive">Banned</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button 
              onClick={() => handlePlayerReady(1)} 
              disabled={player1BannedCards.length !== 2 || player1Ready}
              className="w-full mt-4"
            >
              {player1Ready ? "Ready!" : "Confirm Bans"}
            </Button>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4">Player 2 bans from Player 1's deck</h3>
            <div className="grid grid-cols-2 gap-4">
              {gameState.player1Cards.map((card) => (
                <div 
                  key={card.id} 
                  className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all ${
                    player2BannedCards.includes(card.cardId) ? "opacity-50 border-red-500" : "hover:shadow-lg"
                  }`}
                  onClick={() => {
                    if (player2BannedCards.length < 2 && !player2BannedCards.includes(card.cardId)) {
                      handleBanCard(card.cardId, 2);
                    }
                  }}
                >
                  <div className="p-2">
                    <h4 className="font-semibold truncate">{card.name}</h4>
                    <div className="flex justify-between text-sm">
                      <span>❤️ {card.health}</span>
                      <span>⚔️ {card.power}</span>
                    </div>
                  </div>
                  {player2BannedCards.includes(card.cardId) && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <Badge variant="destructive">Banned</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button 
              onClick={() => handlePlayerReady(2)} 
              disabled={player2BannedCards.length !== 2 || player2Ready}
              className="w-full mt-4"
            >
              {player2Ready ? "Ready!" : "Confirm Bans"}
            </Button>
          </div>
        </div>
      )}

      {gameState.status === "ordering" && (
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Player 1's Cards</h3>
            <div className="space-y-4">
              {gameState.player1Cards
                .filter(card => !gameState.player1BannedCards.includes(card.cardId))
                .sort((a, b) => a.position - b.position)
                .map((card, index) => (
                <div 
                  key={card.id} 
                  className="flex items-center border rounded-lg overflow-hidden"
                >
                  <div className="flex-1 p-2">
                    <h4 className="font-semibold">{card.name}</h4>
                    <div className="flex justify-between text-sm">
                      <span>❤️ {card.health}</span>
                      <span>⚔️ {card.power}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 p-2">
                    <Badge>{index + 1}</Badge>
                  </div>
                  <div className="flex-shrink-0 p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => {
                        const cards = gameState.player1Cards
                          .filter(c => !gameState.player1BannedCards.includes(c.cardId))
                          .sort((a, b) => a.position - b.position);
                        const newOrder = [...cards];
                        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                        handleReorderCards(newOrder.map(c => c.id), 1);
                      }}
                    >
                      ↑
                    </Button>
                  </div>
                  <div className="flex-shrink-0 p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={index === gameState.player1Cards.filter(c => !gameState.player1BannedCards.includes(c.cardId)).length - 1}
                      onClick={() => {
                        const cards = gameState.player1Cards
                          .filter(c => !gameState.player1BannedCards.includes(c.cardId))
                          .sort((a, b) => a.position - b.position);
                        const newOrder = [...cards];
                        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                        handleReorderCards(newOrder.map(c => c.id), 1);
                      }}
                    >
                      ↓
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              onClick={() => handlePlayerReady(1)} 
              disabled={player1Ready}
              className="w-full mt-4"
            >
              {player1Ready ? "Ready!" : "Confirm Order"}
            </Button>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4">Player 2's Cards</h3>
            <div className="space-y-4">
              {gameState.player2Cards
                .filter(card => !gameState.player2BannedCards.includes(card.cardId))
                .sort((a, b) => a.position - b.position)
                .map((card, index) => (
                <div 
                  key={card.id} 
                  className="flex items-center border rounded-lg overflow-hidden"
                >
                  <div className="flex-1 p-2">
                    <h4 className="font-semibold">{card.name}</h4>
                    <div className="flex justify-between text-sm">
                      <span>❤️ {card.health}</span>
                      <span>⚔️ {card.power}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 p-2">
                    <Badge>{index + 1}</Badge>
                  </div>
                  <div className="flex-shrink-0 p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => {
                        const cards = gameState.player2Cards
                          .filter(c => !gameState.player2BannedCards.includes(c.cardId))
                          .sort((a, b) => a.position - b.position);
                        const newOrder = [...cards];
                        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                        handleReorderCards(newOrder.map(c => c.id), 2);
                      }}
                    >
                      ↑
                    </Button>
                  </div>
                  <div className="flex-shrink-0 p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={index === gameState.player2Cards.filter(c => !gameState.player2BannedCards.includes(c.cardId)).length - 1}
                      onClick={() => {
                        const cards = gameState.player2Cards
                          .filter(c => !gameState.player2BannedCards.includes(c.cardId))
                          .sort((a, b) => a.position - b.position);
                        const newOrder = [...cards];
                        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                        handleReorderCards(newOrder.map(c => c.id), 2);
                      }}
                    >
                      ↓
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              onClick={() => handlePlayerReady(2)} 
              disabled={player2Ready}
              className="w-full mt-4"
            >
              {player2Ready ? "Ready!" : "Confirm Order"}
            </Button>
          </div>
        </div>
      )}

      {(gameState.status === "battling" || gameState.status === "completed") && (
        <div className="space-y-6">
          <Tabs defaultValue="battlefield">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="battlefield">Battlefield</TabsTrigger>
              <TabsTrigger value="battle-log">Battle Log</TabsTrigger>
            </TabsList>
            
            <TabsContent value="battlefield" className="p-4">
              <div className="grid grid-cols-2 gap-8">
                {/* Player 1 Cards */}
                <div>
                  <h3 className="text-xl font-semibold mb-4">Player 1</h3>
                  <div className="space-y-4">
                    {gameState.player1Cards
                      .filter(card => !gameState.player1BannedCards.includes(card.cardId))
                      .sort((a, b) => a.position - b.position)
                      .map((card) => {
                        const isActive = !card.isDefeated && 
                          gameState.player1Cards
                            .filter(c => !c.isDefeated && !gameState.player1BannedCards.includes(c.cardId))
                            .sort((a, b) => a.position - b.position)[0]?.id === card.id;
                        
                        return (
                          <div 
                            key={card.id} 
                            className={`relative flex items-center border rounded-lg overflow-hidden ${
                              card.isDefeated ? "opacity-50" : ""
                            } ${
                              isActive ? "ring-2 ring-primary" : ""
                            }`}
                          >
                            <div className="flex-1 p-2">
                              <h4 className="font-semibold">{card.name}</h4>
                              <Progress
                                value={(card.health / card.maxHealth) * 100}
                                className="h-2 mt-1"
                              />
                              <div className="flex justify-between text-sm mt-1">
                                <span>❤️ {card.health}/{card.maxHealth}</span>
                                <span>⚔️ {card.power}</span>
                              </div>
                            </div>
                            
                            {card.isDefeated && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Badge variant="destructive">Defeated</Badge>
                              </div>
                            )}
                            
                            {currentAnimation?.type === "attack" && currentAnimation.sourceId === card.id && (
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-500 rounded-full animate-ping" />
                            )}
                            
                            {currentAnimation?.type === "effect" && currentAnimation.sourceId === card.id && (
                              <div className="absolute inset-0 bg-blue-500/30 animate-pulse" />
                            )}
                            
                            {currentAnimation?.type === "defeat" && currentAnimation.targetId === card.id && (
                              <div className="absolute inset-0 bg-red-700/50 animate-pulse" />
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
                
                {/* Player 2 Cards */}
                <div>
                  <h3 className="text-xl font-semibold mb-4">Player 2</h3>
                  <div className="space-y-4">
                    {gameState.player2Cards
                      .filter(card => !gameState.player2BannedCards.includes(card.cardId))
                      .sort((a, b) => a.position - b.position)
                      .map((card) => {
                        const isActive = !card.isDefeated && 
                          gameState.player2Cards
                            .filter(c => !c.isDefeated && !gameState.player2BannedCards.includes(c.cardId))
                            .sort((a, b) => a.position - b.position)[0]?.id === card.id;
                        
                        return (
                          <div 
                            key={card.id} 
                            className={`relative flex items-center border rounded-lg overflow-hidden ${
                              card.isDefeated ? "opacity-50" : ""
                            } ${
                              isActive ? "ring-2 ring-primary" : ""
                            }`}
                          >
                            <div className="flex-1 p-2">
                              <h4 className="font-semibold">{card.name}</h4>
                              <Progress
                                value={(card.health / card.maxHealth) * 100}
                                className="h-2 mt-1"
                              />
                              <div className="flex justify-between text-sm mt-1">
                                <span>❤️ {card.health}/{card.maxHealth}</span>
                                <span>⚔️ {card.power}</span>
                              </div>
                            </div>
                            
                            {card.isDefeated && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Badge variant="destructive">Defeated</Badge>
                              </div>
                            )}
                            
                            {currentAnimation?.type === "attack" && currentAnimation.sourceId === card.id && (
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-500 rounded-full animate-ping" />
                            )}
                            
                            {currentAnimation?.type === "effect" && currentAnimation.sourceId === card.id && (
                              <div className="absolute inset-0 bg-blue-500/30 animate-pulse" />
                            )}
                            
                            {currentAnimation?.type === "defeat" && currentAnimation.targetId === card.id && (
                              <div className="absolute inset-0 bg-red-700/50 animate-pulse" />
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="battle-log" className="p-4">
              <ScrollArea className="h-80 w-full rounded-md border p-4">
                <div className="space-y-2">
                  {gameState.events.map((event, index) => (
                    <div 
                      key={index} 
                      className={`p-2 rounded ${
                        event.type === "attack" ? "bg-red-100" : 
                        event.type === "effect" ? "bg-blue-100" : 
                        event.type === "defeat" ? "bg-purple-100" : 
                        event.type === "round_start" ? "bg-green-100" : 
                        event.type === "round_end" ? "bg-yellow-100" : 
                        event.type === "game_end" ? "bg-orange-100" : ""
                      }`}
                    >
                      <p className="text-sm">{event.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
