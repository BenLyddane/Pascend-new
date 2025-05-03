"use client";

import { GameCard } from "@/components/game-card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BattlefieldProps, BattleAnimation } from "./battlefield-types";
import { isBattleLogEntry } from "./battle-log-types";

export default function Battlefield({
  player1Cards,
  player2Cards,
  currentBattle,
  onCardClick,
  battleLog,
  player1GoesFirst,
  isPlayer1Turn,
}: BattlefieldProps) {
  const [animation, setAnimation] = useState<BattleAnimation | null>(null);
  const [lastLogEntry, setLastLogEntry] = useState<BattleLogEntry | null>(null);

  // Force component to update when props change
  useEffect(() => {
    // Reset animation state when props change
    setAnimation(null);
    
    // Force re-render by updating state
    setLastLogEntry(null);
    
    // Log the current state for debugging
    console.log("[Battlefield] Props updated:", {
      player1Cards: player1Cards.map(c => ({ 
        name: c.card.name, 
        health: c.health, 
        power: c.power,
        isDefeated: c.isDefeated
      })),
      player2Cards: player2Cards.map(c => ({ 
        name: c.card.name, 
        health: c.health, 
        power: c.power,
        isDefeated: c.isDefeated
      })),
      currentBattle,
      isPlayer1Turn
    });
  }, [player1Cards, player2Cards, currentBattle, isPlayer1Turn]);
  
  // Handle battle log updates
  useEffect(() => {
    if (battleLog.length === 0) return;
    
    // Get the latest log entry
    const newEntry = battleLog[battleLog.length - 1];
    
    // Skip if it's the same entry we already processed
    if (lastLogEntry && 
        JSON.stringify(lastLogEntry) === JSON.stringify(newEntry)) {
      return;
    }
    
    // Process the new entry
    if (isBattleLogEntry(newEntry)) {
      // Trigger attack animation
      setAnimation({
        type: 'attack',
        source: isPlayer1Turn ? 'player1' : 'player2',
        target: isPlayer1Turn ? 'player2' : 'player1'
      });
    } else {
      // Handle state change animations based on description
      if (newEntry.description.includes('damage')) {
        setAnimation({
          type: 'damage',
          source: isPlayer1Turn ? 'player2' : 'player1',
          target: isPlayer1Turn ? 'player1' : 'player2'
        });
      } else if (newEntry.description.includes('heal')) {
        setAnimation({
          type: 'heal',
          source: isPlayer1Turn ? 'player1' : 'player2',
          target: isPlayer1Turn ? 'player1' : 'player2'
        });
      } else if (newEntry.description.includes('effect')) {
        setAnimation({
          type: 'effect',
          source: isPlayer1Turn ? 'player1' : 'player2',
          target: isPlayer1Turn ? 'player2' : 'player1'
        });
      } else if (newEntry.description.includes('defeated')) {
        setAnimation({
          type: 'defeat',
          source: isPlayer1Turn ? 'player1' : 'player2',
          target: isPlayer1Turn ? 'player2' : 'player1'
        });
      } else if (newEntry.description.includes('Turn')) {
        // Turn change animation
        setAnimation({
          type: 'effect',
          source: isPlayer1Turn ? 'player1' : 'player2',
          target: isPlayer1Turn ? 'player1' : 'player2'
        });
      }
    }
    
    // Clear animation after delay
    const animationTimeout = setTimeout(() => setAnimation(null), 800);
    
    // Update last log entry
    setLastLogEntry(newEntry);
    
    // Clean up timeout
    return () => clearTimeout(animationTimeout);
  }, [battleLog, isPlayer1Turn, lastLogEntry]);

  // Safely get current cards
  const currentPlayer1Card = currentBattle.card1Index >= 0 ? player1Cards[currentBattle.card1Index] : null;
  const currentPlayer2Card = currentBattle.card2Index >= 0 ? player2Cards[currentBattle.card2Index] : null;

  return (
    <div className="relative flex flex-col h-full">
      {/* Battle Arena */}
      <div className="relative flex-1 flex items-center justify-center mb-8 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg p-8">
        {/* Turn Indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold">
          {isPlayer1Turn ? "Player 1's Turn" : "Player 2's Turn"}
        </div>

        {/* Current Battle */}
        <div className="flex items-center justify-between w-full max-w-4xl">
          {/* Player 1 Current Card */}
          <div className={cn(
            "transform transition-all duration-300",
            animation?.source === 'player1' && "translate-x-8",
            animation?.target === 'player1' && "-translate-x-8 animate-shake"
          )}>
            <div className="relative w-48 h-64 transform hover:scale-105 transition-transform">
              {currentPlayer1Card && (
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-xl cursor-pointer">
                      {currentPlayer1Card.card.image_url ? (
                        <Image
                          src={currentPlayer1Card.card.image_url}
                          alt={currentPlayer1Card.card.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          No Image
                        </div>
                      )}
                      {/* Health Bar */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                        <Progress
                          value={(currentPlayer1Card.health / currentPlayer1Card.maxHealth) * 100}
                          className="h-2"
                          style={{
                            backgroundColor: "rgba(255,255,255,0.2)",
                            ["--progress-background" as string]: `hsl(${Math.max((currentPlayer1Card.health / currentPlayer1Card.maxHealth) * 120, 0)}deg 80% 40%)`,
                          }}
                        />
                        <div className="flex justify-between text-xs text-white mt-1">
                          <span>❤️ {currentPlayer1Card.health}/{currentPlayer1Card.maxHealth}</span>
                          <span>⚔️ {currentPlayer1Card.power}</span>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent>
                    <GameCard card={currentPlayer1Card.card} />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* VS Badge */}
          <div className="relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-1 rounded-full text-sm font-bold">
              VS
            </div>
          </div>

          {/* Player 2 Current Card */}
          <div className={cn(
            "transform transition-all duration-300",
            animation?.source === 'player2' && "-translate-x-8",
            animation?.target === 'player2' && "translate-x-8 animate-shake"
          )}>
            <div className="relative w-48 h-64 transform hover:scale-105 transition-transform">
              {currentPlayer2Card && (
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-xl cursor-pointer">
                      {currentPlayer2Card.card.image_url ? (
                        <Image
                          src={currentPlayer2Card.card.image_url}
                          alt={currentPlayer2Card.card.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          No Image
                        </div>
                      )}
                      {/* Health Bar */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                        <Progress
                          value={(currentPlayer2Card.health / currentPlayer2Card.maxHealth) * 100}
                          className="h-2"
                          style={{
                            backgroundColor: "rgba(255,255,255,0.2)",
                            ["--progress-background" as string]: `hsl(${Math.max((currentPlayer2Card.health / currentPlayer2Card.maxHealth) * 120, 0)}deg 80% 40%)`,
                          }}
                        />
                        <div className="flex justify-between text-xs text-white mt-1">
                          <span>❤️ {currentPlayer2Card.health}/{currentPlayer2Card.maxHealth}</span>
                          <span>⚔️ {currentPlayer2Card.power}</span>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent>
                    <GameCard card={currentPlayer2Card.card} />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        {/* Battle Effects */}
        {animation && (
          <div className="absolute inset-0 pointer-events-none">
            {animation.type === 'attack' && (
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2",
                animation.source === 'player1' ? "left-1/3" : "right-1/3",
                "w-16 h-16 bg-yellow-500/50 rounded-full animate-ping"
              )} />
            )}
            {animation.type === 'damage' && (
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2",
                animation.target === 'player1' ? "left-1/4" : "right-1/4",
                "w-16 h-16 bg-red-500/50 rounded-full animate-pulse"
              )} />
            )}
            {animation.type === 'heal' && (
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2",
                animation.target === 'player1' ? "left-1/4" : "right-1/4",
                "w-16 h-16 bg-green-500/50 rounded-full animate-pulse"
              )} />
            )}
            {animation.type === 'effect' && (
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2",
                animation.target === 'player1' ? "left-1/4" : "right-1/4",
                "w-16 h-16 bg-blue-500/50 rounded-full animate-pulse"
              )} />
            )}
            {animation.type === 'defeat' && (
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2",
                animation.target === 'player1' ? "left-1/4" : "right-1/4",
                "w-20 h-20 bg-red-700/70 rounded-full animate-ping"
              )} />
            )}
          </div>
        )}

        {/* Game Result Display */}
        {currentBattle.winner && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background/95 border-2 border-primary rounded-lg px-8 py-4 text-center shadow-xl">
              <h2 className="text-4xl font-bold mb-2 animate-bounce">
                {currentBattle.winner === 'draw' ? 'Draw!' : 
                 `Player ${currentBattle.winner} Wins!`}
              </h2>
            </div>
          </div>
        )}
      </div>

      {/* Card Lists */}
      <div className="grid grid-cols-2 gap-8">
        {/* Player 1's field */}
        <div className="min-w-0">
          <h3 className="text-lg font-semibold mb-4">Player 1</h3>
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="grid grid-cols-3 gap-4 pr-4">
              {player1Cards.map((cardState: CardState, index: number) => (
                <Dialog key={cardState.card.id}>
                  <DialogTrigger asChild>
                    <div
                      className={`relative bg-background border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
                        index === currentBattle.card1Index
                          ? "ring-2 ring-primary"
                          : ""
                      } ${cardState.isDefeated ? "opacity-50" : ""}`}
                      onClick={() => onCardClick(cardState)}
                    >
                      {/* Compact Card Layout */}
                      <div className="flex h-24">
                        {/* Image */}
                        <div className="relative w-24 h-24 flex-shrink-0">
                          {cardState.card.image_url ? (
                            <Image
                              src={cardState.card.image_url}
                              alt={cardState.card.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 p-2 flex flex-col justify-between">
                          <div>
                            <h4 className="text-sm font-semibold truncate">
                              {cardState.card.name}
                            </h4>
                          </div>

                          {/* Stats */}
                          <div className="space-y-1">
                            <Progress
                              value={
                                (cardState.health / cardState.maxHealth) * 100
                              }
                              className="h-1.5"
                              style={{
                                backgroundColor: "rgba(255,255,255,0.1)",
                                ["--progress-background" as string]: `hsl(${Math.max((cardState.health / cardState.maxHealth) * 120, 0)}deg 80% 40%)`,
                              }}
                            />
                            <div className="flex justify-between text-xs">
                              <span>
                                ❤️ {cardState.health}/{cardState.maxHealth}
                              </span>
                              <span>⚔️ {cardState.power}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent>
                    <GameCard card={cardState.card} />
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Player 2's field */}
        <div className="min-w-0">
          <h3 className="text-lg font-semibold mb-4">Player 2</h3>
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="grid grid-cols-3 gap-4 pr-4">
              {player2Cards.map((cardState: CardState, index: number) => (
                <Dialog key={cardState.card.id}>
                  <DialogTrigger asChild>
                    <div
                      className={`relative bg-background border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
                        index === currentBattle.card2Index
                          ? "ring-2 ring-primary"
                          : ""
                      } ${cardState.isDefeated ? "opacity-50" : ""}`}
                      onClick={() => onCardClick(cardState)}
                    >
                      {/* Compact Card Layout */}
                      <div className="flex h-24">
                        {/* Image */}
                        <div className="relative w-24 h-24 flex-shrink-0">
                          {cardState.card.image_url ? (
                            <Image
                              src={cardState.card.image_url}
                              alt={cardState.card.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 p-2 flex flex-col justify-between">
                          <div>
                            <h4 className="text-sm font-semibold truncate">
                              {cardState.card.name}
                            </h4>
                          </div>

                          {/* Stats */}
                          <div className="space-y-1">
                            <Progress
                              value={
                                (cardState.health / cardState.maxHealth) * 100
                              }
                              className="h-1.5"
                              style={{
                                backgroundColor: "rgba(255,255,255,0.1)",
                                ["--progress-background" as string]: `hsl(${Math.max((cardState.health / cardState.maxHealth) * 120, 0)}deg 80% 40%)`,
                              }}
                            />
                            <div className="flex justify-between text-xs">
                              <span>
                                ❤️ {cardState.health}/{cardState.maxHealth}
                              </span>
                              <span>⚔️ {cardState.power}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent>
                    <GameCard card={cardState.card} />
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
