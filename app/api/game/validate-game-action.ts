import { GameAction, GameState, CardState } from "@/app/protected/play/game-engine/types";

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateGameAction(
  action: GameAction,
  gameState: GameState,
  isPlayer1: boolean
): ValidationResult {
  // Validate basic game state
  if (gameState.winner !== null) {
    return {
      isValid: false,
      error: "Game is already finished",
    };
  }

  // Determine if it's the player's turn
  const isPlayerTurn =
    (isPlayer1 && gameState.currentTurn % 2 === (gameState.player1GoesFirst ? 1 : 0)) ||
    (!isPlayer1 && gameState.currentTurn % 2 === (gameState.player1GoesFirst ? 0 : 1));

  if (!isPlayerTurn) {
    return {
      isValid: false,
      error: "Not your turn",
    };
  }

  // Validate specific action types
  switch (action.type) {
    case "PLAY_CARD":
      return validatePlayCard(action, gameState, isPlayer1);
    case "USE_EFFECT":
      return validateUseEffect(action, gameState, isPlayer1);
    case "END_TURN":
      return validateEndTurn(gameState);
    default:
      return {
        isValid: false,
        error: "Invalid action type",
      };
  }
}

function validatePlayCard(
  action: GameAction,
  gameState: GameState,
  isPlayer1: boolean
): ValidationResult {
  const { cardId } = action.payload;
  if (!cardId) {
    return {
      isValid: false,
      error: "Card ID is required",
    };
  }

  // Get the player's cards
  const playerCards = isPlayer1 ? gameState.player1Cards : gameState.player2Cards;
  const cardIndex = playerCards.findIndex((c) => c.card.id === cardId);

  if (cardIndex === -1) {
    return {
      isValid: false,
      error: "Card not found in player's deck",
    };
  }

  const card = playerCards[cardIndex];

  // Check if card is already defeated
  if (card.isDefeated) {
    return {
      isValid: false,
      error: "Cannot play defeated card",
    };
  }

  // Check if it's the correct card's turn
  const currentIndex = isPlayer1
    ? gameState.currentBattle.card1Index
    : gameState.currentBattle.card2Index;
  if (cardIndex !== currentIndex) {
    return {
      isValid: false,
      error: "Not this card's turn",
    };
  }

  return { isValid: true };
}

function validateUseEffect(
  action: GameAction,
  gameState: GameState,
  isPlayer1: boolean
): ValidationResult {
  const { cardId, effectIndex } = action.payload;
  if (!cardId || typeof effectIndex !== "number") {
    return {
      isValid: false,
      error: "Card ID and effect index are required",
    };
  }

  // Get the player's cards
  const playerCards = isPlayer1 ? gameState.player1Cards : gameState.player2Cards;
  const card = playerCards.find((c) => c.card.id === cardId);

  if (!card) {
    return {
      isValid: false,
      error: "Card not found in player's deck",
    };
  }

  // Check if effect exists
  if (!card.effects || !card.effects[effectIndex]) {
    return {
      isValid: false,
      error: "Effect not found",
    };
  }

  // Check if card is active
  if (card.isDefeated) {
    return {
      isValid: false,
      error: "Cannot use effect of defeated card",
    };
  }

  // Validate effect timing
  const effect = card.effects[effectIndex];
  const validTiming = validateEffectTiming(effect.effect_type, gameState);
  if (!validTiming.isValid) {
    return validTiming;
  }

  return { isValid: true };
}

function validateEndTurn(gameState: GameState): ValidationResult {
  // Basic validation for turn end
  // Could add more complex validation based on game rules
  return { isValid: true };
}

function validateEffectTiming(effectType: string, gameState: GameState): ValidationResult {
  // Validate effect timing based on current game phase
  // This would need to be expanded based on your game's specific rules
  return { isValid: true };
}

export function validateGameState(gameState: GameState): ValidationResult {
  // Validate overall game state integrity
  try {
    // Check for valid card counts
    if (gameState.player1Cards.length !== 5 || gameState.player2Cards.length !== 5) {
      return {
        isValid: false,
        error: "Invalid deck size",
      };
    }

    // Validate card properties
    const allCards = [...gameState.player1Cards, ...gameState.player2Cards];
    for (const card of allCards) {
      if (!validateCardState(card).isValid) {
        return {
          isValid: false,
          error: "Invalid card state detected",
        };
      }
    }

    // Validate turn counter
    if (gameState.currentTurn < 1) {
      return {
        isValid: false,
        error: "Invalid turn counter",
      };
    }

    // Validate battle indices
    if (
      gameState.currentBattle.card1Index < 0 ||
      gameState.currentBattle.card1Index >= 5 ||
      gameState.currentBattle.card2Index < 0 ||
      gameState.currentBattle.card2Index >= 5
    ) {
      return {
        isValid: false,
        error: "Invalid battle indices",
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: "Game state validation failed",
    };
  }
}

function validateCardState(cardState: CardState): ValidationResult {
  // Validate individual card state
  if (
    cardState.health < 0 ||
    cardState.health > 999 ||
    cardState.power < 0 ||
    cardState.power > 999 ||
    cardState.maxHealth < 1 ||
    cardState.maxHealth > 999
  ) {
    return {
      isValid: false,
      error: "Invalid card properties",
    };
  }

  // Validate effects array
  if (!Array.isArray(cardState.effects)) {
    return {
      isValid: false,
      error: "Invalid effects array",
    };
  }

  return { isValid: true };
}
