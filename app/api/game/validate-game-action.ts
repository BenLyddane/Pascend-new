import { GameAction } from "@/app/api/game/engine/game-actions";

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a game action against the current game state
 * @param action The action to validate
 * @param state The current game state
 * @param isPlayer1 Whether the action is being performed by player 1
 * @returns Validation result
 */
export function validateGameAction(
  action: GameAction,
  state: any,
  isPlayer1: boolean
): ValidationResult {
  // If the game is already completed, no actions are allowed
  if (state.status === "completed") {
    return {
      isValid: false,
      error: "Game is already completed"
    };
  }
  
  // Validate based on action type
  switch (action.type) {
    case "ATTACK":
      return validateAttackAction(action.payload, state, isPlayer1);
    
    case "END_TURN":
      return validateEndTurnAction(action.payload, state, isPlayer1);
    
    case "GET_STATE":
      // Always allow getting the state
      return { isValid: true };
    
    default:
      return {
        isValid: false,
        error: `Unknown action type: ${action.type}`
      };
  }
}

/**
 * Validates an attack action
 * @param payload The attack payload
 * @param state The current game state
 * @param isPlayer1 Whether the action is being performed by player 1
 * @returns Validation result
 */
function validateAttackAction(
  payload: any,
  state: any,
  isPlayer1: boolean
): ValidationResult {
  // Check if it's the player's turn
  const isPlayer1Turn = state.currentTurn % 2 === (state.player1GoesFirst ? 1 : 0);
  if (isPlayer1Turn !== isPlayer1) {
    return {
      isValid: false,
      error: "Not your turn"
    };
  }
  
  // Check if the attacker index is valid
  const attackerCards = isPlayer1 ? state.player1Cards : state.player2Cards;
  if (
    payload.attackerIndex < 0 ||
    payload.attackerIndex >= attackerCards.length
  ) {
    return {
      isValid: false,
      error: "Invalid attacker index"
    };
  }
  
  // Check if the target index is valid
  const defenderCards = isPlayer1 ? state.player2Cards : state.player1Cards;
  if (
    payload.targetIndex < 0 ||
    payload.targetIndex >= defenderCards.length
  ) {
    return {
      isValid: false,
      error: "Invalid target index"
    };
  }
  
  // Check if the attacker is defeated
  if (attackerCards[payload.attackerIndex].isDefeated) {
    return {
      isValid: false,
      error: "Attacker is defeated"
    };
  }
  
  // Check if the target is defeated
  if (defenderCards[payload.targetIndex].isDefeated) {
    return {
      isValid: false,
      error: "Target is defeated"
    };
  }
  
  return { isValid: true };
}

/**
 * Validates an end turn action
 * @param payload The end turn payload
 * @param state The current game state
 * @param isPlayer1 Whether the action is being performed by player 1
 * @returns Validation result
 */
function validateEndTurnAction(
  payload: any,
  state: any,
  isPlayer1: boolean
): ValidationResult {
  // Check if it's the player's turn
  const isPlayer1Turn = state.currentTurn % 2 === (state.player1GoesFirst ? 1 : 0);
  if (isPlayer1Turn !== isPlayer1) {
    return {
      isValid: false,
      error: "Not your turn"
    };
  }
  
  return { isValid: true };
}
