import { GameState } from "@/app/protected/play/game-engine/types";

// Define the action types more explicitly
export type AttackPayload = {
  attackerIndex: number;
  targetIndex: number;
  timestamp: number;
};

export type EndTurnPayload = {
  timestamp: number;
};

export type GetStatePayload = {
  timestamp: number;
};

export type GameAction = 
  | { type: "ATTACK"; payload: AttackPayload }
  | { type: "END_TURN"; payload: EndTurnPayload }
  | { type: "GET_STATE"; payload: GetStatePayload }
  | { type: "USE_ABILITY"; payload: any };
import { processAttack } from "@/app/protected/play/game-engine/actions/attack";
import { endTurn } from "@/app/protected/play/game-engine/actions/end-turn";
import { getState } from "@/app/protected/play/game-engine/actions/game-state";

/**
 * Process a game action
 * @param state The current game state
 * @param action The action to process
 * @returns The new game state
 */
export function processGameAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ATTACK":
      return processAttack(state, action.payload);
    
    case "END_TURN":
      return endTurn(state, action.payload);
    
    case "GET_STATE":
      return getState(state, action.payload);
    
    default:
      throw new Error(`Unknown action type: ${(action as any).type}`);
  }
}

/**
 * Create a game action
 * @param type The action type
 * @param payload The action payload
 * @returns The game action
 */
export function createGameAction<T extends GameAction["type"]>(
  type: T,
  payload: any
): GameAction {
  return {
    type,
    payload
  } as GameAction;
}

/**
 * Create an attack action
 * @param attackerIndex The index of the attacking card
 * @param targetIndex The index of the target card
 * @returns The attack action
 */
export function createAttackAction(attackerIndex: number, targetIndex: number): GameAction {
  return createGameAction("ATTACK", {
    attackerIndex,
    targetIndex,
    timestamp: Date.now()
  });
}

/**
 * Create an end turn action
 * @returns The end turn action
 */
export function createEndTurnAction(): GameAction {
  return createGameAction("END_TURN", {
    timestamp: Date.now()
  });
}

/**
 * Create a get state action
 * @returns The get state action
 */
export function createGetStateAction(): GameAction {
  return createGameAction("GET_STATE", {
    timestamp: Date.now()
  });
}
