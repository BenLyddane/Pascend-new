"use client";

import { useState, useEffect } from "react";
import { GameState } from "@/app/protected/play/game-engine/types";
import { processAutoBattleRound } from "@/app/protected/play/game-engine/auto-battle";
import { GameCardPractice } from "@/components/game-card-practice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Play, Pause, SkipForward } from "lucide-react";

interface BattleVisualizerProps {
  initialState: GameState;
  onComplete: (finalState: GameState, battleLog: string[]) => void;
  onReset: () => void;
}

// Helper function to create a visual health bar
const createHealthBar = (currentHealth: number, maxHealth: number): string => {
  // If health is 0, return all empty blocks
  if (currentHealth <= 0) {
    return "⬜".repeat(maxHealth);
  }

  // Calculate percentage of health remaining
  const percentage = (currentHealth / maxHealth) * 100;

  // Calculate number of full blocks (1 block = 1 health point)
  const fullBlocks = currentHealth;
  const emptyBlocks = maxHealth - fullBlocks;

  // Use different colors based on health percentage
  let color = "🟩"; // Green for high health
  if (percentage <= 30) {
    color = "🟥"; // Red for low health
  } else if (percentage <= 70) {
    color = "🟨"; // Yellow for medium health
  }

  // Create the health bar
  return color.repeat(fullBlocks) + "⬜".repeat(emptyBlocks);
};

// Helper function to get emoji for card type/effect
const getEffectEmoji = (effectType: string): string => {
  switch (effectType.toLowerCase()) {
    case "damage":
      return "⚔️";
    case "heal":
      return "💚";
    case "shield":
      return "🛡️";
    case "buff":
      return "💪";
    case "debuff":
      return "🔽";
    case "stun":
      return "⚡";
    case "poison":
      return "☠️";
    case "fire":
      return "🔥";
    case "ice":
      return "❄️";
    case "lightning":
      return "⚡";
    case "water":
      return "💧";
    case "earth":
      return "🌍";
    case "wind":
      return "🌪️";
    default:
      return "✨";
  }
};

// Helper function to generate dramatic battle descriptions
const generateAttackDescription = (
  attackerName: string,
  defenderName: string,
  damage: number
): string => {
  // Array of dramatic attack verbs
  const attackVerbs = [
    "strikes",
    "slashes",
    "blasts",
    "assaults",
    "hammers",
    "smashes",
    "lunges at",
    "bombards",
    "devastates",
  ];

  // Array of dramatic damage descriptions
  const damageDescriptions = [
    "dealing a crushing",
    "inflicting a devastating",
    "landing a powerful",
    "delivering a mighty",
  ];

  // Get random elements
  const attackVerb =
    attackVerbs[Math.floor(Math.random() * attackVerbs.length)];
  const damageDesc =
    damageDescriptions[Math.floor(Math.random() * damageDescriptions.length)];

  // Build the description
  return `${attackerName} ${attackVerb} ${defenderName}, ${damageDesc} ${damage} damage!`;
};

export default function BattleVisualizer({
  initialState,
  onComplete,
  onReset,
}: BattleVisualizerProps) {
  const [currentState, setCurrentState] = useState<GameState>(initialState);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1000); // milliseconds between rounds
  const [round, setRound] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [activeCardIndices, setActiveCardIndices] = useState({
    player1: 0,
    player2: 0,
  });
  const [lastAttacker, setLastAttacker] = useState<1 | 2 | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([
    "⚔️ The epic battle begins! Warriors take your positions!",
  ]);

  // Process a single round of the battle
  const processRound = () => {
    if (isComplete) return;

    // Process the round
    const newState = processAutoBattleRound(currentState);

    // Update the state
    setCurrentState(newState);
    setRound(round + 1);

    // Check if the battle is complete
    if (newState.status === "completed") {
      setIsComplete(true);
      setIsPlaying(false);

      // Add battle end log with dramatic flair
      if (newState.winner === "draw") {
        addToBattleLog(
          "🏳️ The battle ends in a dramatic draw! Both sides fought valiantly!"
        );
      } else {
        const winnerMessages = [
          `🏆 Player ${newState.winner} emerges victorious in a glorious triumph!`,
          `🏆 Player ${newState.winner} conquers the battlefield with superior strategy!`,
          `🏆 Player ${newState.winner} claims victory after an epic showdown!`,
        ];
        const winMessage =
          winnerMessages[Math.floor(Math.random() * winnerMessages.length)];
        addToBattleLog(winMessage);
      }

      // Add battle statistics summary
      const player1DefeatedCards = newState.player2Cards.filter(
        (card) => card.isDefeated
      ).length;
      const player2DefeatedCards = newState.player1Cards.filter(
        (card) => card.isDefeated
      ).length;

      addToBattleLog(
        `📊 BATTLE SUMMARY - Player 1 defeated ${player1DefeatedCards} cards!`
      );
      addToBattleLog(
        `📊 BATTLE SUMMARY - Player 2 defeated ${player2DefeatedCards} cards!`
      );

      onComplete(newState, battleLog);
      return;
    }

    // Determine who attacked this round
    const isPlayer1Turn =
      currentState.currentTurn % 2 === (currentState.player1GoesFirst ? 1 : 0);
    const attacker = isPlayer1Turn ? 1 : 2;
    const defender = isPlayer1Turn ? 2 : 1;
    setLastAttacker(attacker);

    // Find the active cards
    const attackerCards = isPlayer1Turn
      ? currentState.player1Cards
      : currentState.player2Cards;
    const defenderCards = isPlayer1Turn
      ? currentState.player2Cards
      : currentState.player1Cards;

    const attackerIndex = attackerCards.findIndex((card) => !card.isDefeated);
    const defenderIndex = defenderCards.findIndex((card) => !card.isDefeated);

    // Update active card indices
    setActiveCardIndices({
      player1: isPlayer1Turn ? attackerIndex : defenderIndex,
      player2: isPlayer1Turn ? defenderIndex : attackerIndex,
    });

    // Add battle log
    if (attackerIndex !== -1 && defenderIndex !== -1) {
      const attackerCard = attackerCards[attackerIndex];
      const defenderCard = defenderCards[defenderIndex];

      // Compare the new state to see what happened
      const newAttackerCards = isPlayer1Turn
        ? newState.player1Cards
        : newState.player2Cards;
      const newDefenderCards = isPlayer1Turn
        ? newState.player2Cards
        : newState.player1Cards;

      const newAttackerCard = newAttackerCards[attackerIndex];
      const newDefenderCard = newDefenderCards[defenderIndex];

      // Calculate damage dealt
      const damageDealt = defenderCard.health - newDefenderCard.health;

      // Check for special effects
      const specialEffects = attackerCard.special_effects || [];
      const effectDescriptions = specialEffects.map((effect) => {
        // Replace all modifier expressions with calculated values
        let description = effect.description;

        // Replace {modifier} with the actual value
        description = description.replace(
          /\{modifier\}/g,
          effect.value.toString()
        );

        // Replace {modifier * X} expressions
        description = description.replace(
          /\{modifier \* (\d+)\}/g,
          (match, multiplier) => {
            const value = effect.value * parseInt(multiplier);
            return value.toString();
          }
        );

        // Replace {modifier / X} expressions
        description = description.replace(
          /\{modifier \/ (\d+)\}/g,
          (match, divisor) => {
            const value = Math.floor(effect.value / parseInt(divisor));
            return value.toString();
          }
        );

        // Replace {modifier + X} expressions
        description = description.replace(
          /\{modifier \+ (\d+)\}/g,
          (match, addend) => {
            const value = effect.value + parseInt(addend);
            return value.toString();
          }
        );

        return `${getEffectEmoji(effect.effect_type)} ${effect.name} (${description})`;
      });

      // Determine if this was a critical hit (random chance for dramatic effect)
      const isCriticalHit = Math.random() < 0.2 && damageDealt > 1;

      // Log the attack with special effects if any
      if (effectDescriptions.length > 0) {
        // Use the dramatic battle description generator
        const attackDesc = generateAttackDescription(
          `Player ${attacker}'s ${attackerCard.name}`,
          `Player ${defender}'s ${defenderCard.name}`,
          damageDealt
        );
        addToBattleLog(`⚔️ ${attackDesc}`);

        // Add individual effect descriptions for clarity
        effectDescriptions.forEach((effectDesc) => {
          addToBattleLog(`   ${effectDesc}`);
        });
      } else if (isCriticalHit) {
        // Critical hit description
        addToBattleLog(
          `💥 CRITICAL HIT! Player ${attacker}'s ${attackerCard.name} lands a devastating blow on Player ${defender}'s ${defenderCard.name} for ${damageDealt} massive damage!`
        );
      } else {
        // Normal attack with varied descriptions
        const attackDesc = generateAttackDescription(
          `Player ${attacker}'s ${attackerCard.name}`,
          `Player ${defender}'s ${defenderCard.name}`,
          damageDealt
        );
        addToBattleLog(`⚔️ ${attackDesc}`);
      }

      // Show defender's health status after attack with visual health bar
      const healthBar = createHealthBar(
        newDefenderCard.health,
        newDefenderCard.maxHealth
      );
      const healthPercentage = Math.round(
        (newDefenderCard.health / newDefenderCard.maxHealth) * 100
      );

      if (healthPercentage <= 25 && healthPercentage > 0) {
        addToBattleLog(
          `⚠️ Player ${defender}'s ${defenderCard.name} is critically wounded! ${healthBar} ${newDefenderCard.health}/${newDefenderCard.maxHealth} HP (${healthPercentage}%)`
        );
      } else {
        addToBattleLog(
          `🛡️ Player ${defender}'s ${defenderCard.name}: ${healthBar} ${newDefenderCard.health}/${newDefenderCard.maxHealth} HP (${healthPercentage}%)`
        );
      }

      // If defender is defeated, log it (only once)
      if (newDefenderCard.isDefeated) {
        // Dramatic defeat message
        const defeatMessages = [
          `💀 Player ${defender}'s ${defenderCard.name} falls in battle!`,
          `💀 Player ${defender}'s ${defenderCard.name} has been vanquished!`,
          `💀 Player ${defender}'s ${defenderCard.name} is defeated in glorious combat!`,
          `💀 Player ${defender}'s ${defenderCard.name} can fight no more!`,
        ];
        const defeatMessage =
          defeatMessages[Math.floor(Math.random() * defeatMessages.length)];
        addToBattleLog(defeatMessage);
      }
      // Otherwise, log the counter-attack if there was one
      else if (newAttackerCard.health < attackerCard.health) {
        // Calculate counter damage
        const counterDamage = attackerCard.health - newAttackerCard.health;

        // Log the counter-attack with varied descriptions
        const counterAttackVerbs = [
          "retaliates with a swift counter",
          "strikes back fiercely",
          "responds with a powerful counter-attack",
          "defends and counter-strikes",
          "turns the attack against its source",
        ];

        const counterVerb =
          counterAttackVerbs[
            Math.floor(Math.random() * counterAttackVerbs.length)
          ];
        addToBattleLog(
          `↩️ Player ${defender}'s ${defenderCard.name} ${counterVerb} for ${counterDamage} damage!`
        );

        // Show attacker's health status after counter-attack with visual health bar
        const attackerHealthBar = createHealthBar(
          newAttackerCard.health,
          newAttackerCard.maxHealth
        );
        const attackerHealthPercentage = Math.round(
          (newAttackerCard.health / newAttackerCard.maxHealth) * 100
        );

        if (attackerHealthPercentage <= 25 && attackerHealthPercentage > 0) {
          addToBattleLog(
            `⚠️ Player ${attacker}'s ${attackerCard.name} is critically wounded! ${attackerHealthBar} ${newAttackerCard.health}/${newAttackerCard.maxHealth} HP (${attackerHealthPercentage}%)`
          );
        } else {
          addToBattleLog(
            `🛡️ Player ${attacker}'s ${attackerCard.name}: ${attackerHealthBar} ${newAttackerCard.health}/${newAttackerCard.maxHealth} HP (${attackerHealthPercentage}%)`
          );
        }

        // If attacker is defeated by counter-attack, log it
        if (newAttackerCard.isDefeated) {
          const counterDefeatMessages = [
            `💀 In a stunning reversal, Player ${attacker}'s ${attackerCard.name} is defeated by counter-attack!`,
            `💀 The counter-attack proves fatal! Player ${attacker}'s ${attackerCard.name} falls!`,
            `💀 Player ${attacker}'s ${attackerCard.name} is overcome by the counter-attack!`,
          ];
          const counterDefeatMessage =
            counterDefeatMessages[
              Math.floor(Math.random() * counterDefeatMessages.length)
            ];
          addToBattleLog(counterDefeatMessage);
        }
      }

      // Check if any gameplay effects were applied
      if (newState.events.length > currentState.events.length) {
        // Get the new events
        const newEvents = newState.events.slice(currentState.events.length);

        // Log each new event
        newEvents.forEach((event) => {
          if (event.type === "effect_triggered") {
            const effectData = event.data as any;
            const effectEmoji = getEffectEmoji(effectData.effectType || "");

            // Create a more detailed effect message
            let effectMessage = `${effectEmoji} ${effectData.effectName || "An effect"}`;

            // Add effect description if available
            if (effectData.effectDescription) {
              // Replace any remaining {modifier} placeholders
              const description = effectData.effectDescription.replace(
                /\{modifier\}/g,
                effectData.effectValue || "?"
              );
              effectMessage += ` (${description})`;
            }

            // Add source and target information
            effectMessage += ` was triggered by ${effectData.sourcePlayerName || "Player"}'s ${effectData.cardName || "card"}`;

            // Add target information if different from source
            if (
              effectData.targetCardName &&
              effectData.targetCardName !== effectData.cardName
            ) {
              effectMessage += ` on ${effectData.targetPlayerName || "Player"}'s ${effectData.targetCardName}`;
            }

            addToBattleLog(effectMessage);
          }
        });
      }
    }
  };

  // Add a message to the battle log
  const addToBattleLog = (message: string) => {
    setBattleLog((prev) => [...prev, message]);
  };

  // Auto-play the battle
  useEffect(() => {
    if (!isPlaying || isComplete) return;

    const timer = setTimeout(() => {
      processRound();
    }, speed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentState, round, isComplete, speed]);

  // Handle play/pause
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle speed change
  const changeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
  };

  // Handle skip to end
  const skipToEnd = () => {
    let state = { ...currentState };
    let roundCount = round;

    // Process rounds until the battle is complete
    while (state.status !== "completed" && roundCount < 50) {
      state = processAutoBattleRound(state);
      roundCount++;
    }

    // Update the state
    setCurrentState(state);
    setRound(roundCount);
    setIsComplete(true);
    setIsPlaying(false);

    // Add battle end log with dramatic flair
    if (state.winner === "draw") {
      addToBattleLog(
        "🏳️ The battle ends in a dramatic draw! Both sides fought valiantly!"
      );
    } else {
      const winnerMessages = [
        `🏆 Player ${state.winner} emerges victorious in a glorious triumph!`,
        `🏆 Player ${state.winner} conquers the battlefield with superior strategy!`,
        `🏆 Player ${state.winner} claims victory after an epic showdown!`,
      ];
      const winMessage =
        winnerMessages[Math.floor(Math.random() * winnerMessages.length)];
      addToBattleLog(winMessage);
    }

    // Add battle statistics summary
    const player1DefeatedCards = state.player2Cards.filter(
      (card) => card.isDefeated
    ).length;
    const player2DefeatedCards = state.player1Cards.filter(
      (card) => card.isDefeated
    ).length;

    addToBattleLog(
      `📊 BATTLE SUMMARY - Player 1 defeated ${player1DefeatedCards} cards!`
    );
    addToBattleLog(
      `📊 BATTLE SUMMARY - Player 2 defeated ${player2DefeatedCards} cards!`
    );

    onComplete(state, battleLog);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Battle Arena</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlay}
            className="w-24"
          >
            {isPlaying ? (
              <>
                <Pause className="mr-2 h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" /> Play
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeSpeed(2000)}
            className={`${speed === 2000 ? "bg-primary text-primary-foreground" : ""}`}
          >
            Slow
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeSpeed(1000)}
            className={`${speed === 1000 ? "bg-primary text-primary-foreground" : ""}`}
          >
            Normal
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeSpeed(500)}
            className={`${speed === 500 ? "bg-primary text-primary-foreground" : ""}`}
          >
            Fast
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={skipToEnd}
            disabled={isComplete}
          >
            <SkipForward className="mr-2 h-4 w-4" /> Skip
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">Player 1's Cards</h3>
          <div className="space-y-4">
            {currentState.player1Cards.map((card, index) => (
              <div key={card.id} className="flex items-center gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    card.isDefeated
                      ? "bg-red-100 text-red-500"
                      : index === activeCardIndices.player1 &&
                          lastAttacker === 1
                        ? "bg-yellow-100 text-yellow-600 animate-pulse"
                        : index === activeCardIndices.player1
                          ? "bg-blue-100 text-blue-600"
                          : "bg-green-100 text-green-500"
                  }`}
                >
                  {card.isDefeated
                    ? "✗"
                    : index === activeCardIndices.player1
                      ? "⚔️"
                      : "✓"}
                </div>
                <div className="flex-grow">
                  <GameCardPractice
                    card={{
                      ...card,
                      health: card.health,
                      power: card.power,
                      created_at: new Date().toISOString(),
                      edition: "base",
                      generated_with_purchased_tokens: false,
                      is_active: true,
                      keywords: [],
                      modifier: 1,
                      user_id: "battle-user",
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
            {currentState.player2Cards.map((card, index) => (
              <div key={card.id} className="flex items-center gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    card.isDefeated
                      ? "bg-red-100 text-red-500"
                      : index === activeCardIndices.player2 &&
                          lastAttacker === 2
                        ? "bg-yellow-100 text-yellow-600 animate-pulse"
                        : index === activeCardIndices.player2
                          ? "bg-blue-100 text-blue-600"
                          : "bg-green-100 text-green-500"
                  }`}
                >
                  {card.isDefeated
                    ? "✗"
                    : index === activeCardIndices.player2
                      ? "⚔️"
                      : "✓"}
                </div>
                <div className="flex-grow">
                  <GameCardPractice
                    card={{
                      ...card,
                      health: card.health,
                      power: card.power,
                      created_at: new Date().toISOString(),
                      edition: "base",
                      generated_with_purchased_tokens: false,
                      is_active: true,
                      keywords: [],
                      modifier: 1,
                      user_id: "battle-user",
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

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-2">Battle Log</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Player 1 Battle Log */}
          <div>
            <h4 className="text-md font-medium mb-1 text-center">Player 1</h4>
            <div className="h-60 overflow-y-auto bg-muted/20 p-2 rounded border border-blue-200">
              {battleLog.map((log, index) => {
                // Use the current round number instead of calculating from index
                const actualRound = index === 0 ? 0 : round - (battleLog.length - index);

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
            <h4 className="text-md font-medium mb-1 text-center">Player 2</h4>
            <div className="h-60 overflow-y-auto bg-muted/20 p-2 rounded border border-red-200">
              {battleLog.map((log, index) => {
                // Use the current round number instead of calculating from index
                const actualRound = index === 0 ? 0 : round - (battleLog.length - index);

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

      <div className="flex justify-center">
        <Button
          onClick={onReset}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg"
        >
          New Battle <RotateCcw className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
