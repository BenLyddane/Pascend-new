import { createInitialGameState, GameState } from "@/app/protected/play/game-engine/types";
import { CardWithEffects } from "@/app/actions/fetchDecks";
import { processGameAction, createAttackAction, createEndTurnAction } from "./game-actions";

/**
 * Test the game engine with a simple scenario
 */
export function testGameEngine() {
  // Create some test cards
  const player1Cards: CardWithEffects[] = [
    {
      id: "card1",
      name: "Warrior",
      description: "A strong warrior",
      image_url: "",
      power: 5,
      health: 10,
      rarity: "common",
      special_effects: [
        {
          name: "Tough",
          description: "Reduces damage taken",
          effect_type: "damage_reduction",
          effect_icon: "shield",
          value: 1
        }
      ],
      created_at: new Date().toISOString(),
      edition: "base",
      generated_with_purchased_tokens: false,
      is_active: true,
      keywords: [],
      modifier: 0,
      user_id: "test-user"
    },
    {
      id: "card2",
      name: "Archer",
      description: "A skilled archer",
      image_url: "",
      power: 3,
      health: 7,
      rarity: "common",
      special_effects: [
        {
          name: "Precise",
          description: "Increases damage dealt",
          effect_type: "damage_boost",
          effect_icon: "target",
          value: 1
        }
      ],
      created_at: new Date().toISOString(),
      edition: "base",
      generated_with_purchased_tokens: false,
      is_active: true,
      keywords: [],
      modifier: 0,
      user_id: "test-user"
    }
  ];

  const player2Cards: CardWithEffects[] = [
    {
      id: "card3",
      name: "Mage",
      description: "A powerful mage",
      image_url: "",
      power: 7,
      health: 5,
      rarity: "common",
      special_effects: [
        {
          name: "Fireball",
          description: "Deals extra damage",
          effect_type: "damage_boost",
          effect_icon: "fire",
          value: 2
        }
      ],
      created_at: new Date().toISOString(),
      edition: "base",
      generated_with_purchased_tokens: false,
      is_active: true,
      keywords: [],
      modifier: 0,
      user_id: "test-user"
    },
    {
      id: "card4",
      name: "Healer",
      description: "A healing cleric",
      image_url: "",
      power: 2,
      health: 8,
      rarity: "common",
      special_effects: [
        {
          name: "Heal",
          description: "Heals damage",
          effect_type: "heal",
          effect_icon: "heart",
          value: 2
        }
      ],
      created_at: new Date().toISOString(),
      edition: "base",
      generated_with_purchased_tokens: false,
      is_active: true,
      keywords: [],
      modifier: 0,
      user_id: "test-user"
    }
  ];

  // Create the initial game state
  const initialState = createInitialGameState(player1Cards, player2Cards, true);
  console.log("Initial state:", initialState);

  // Process an attack action
  const attackAction = createAttackAction(0, 0);
  const stateAfterAttack = processGameAction(initialState, attackAction);
  console.log("State after attack:", stateAfterAttack);

  // Process an end turn action
  const endTurnAction = createEndTurnAction();
  const stateAfterEndTurn = processGameAction(stateAfterAttack, endTurnAction);
  console.log("State after end turn:", stateAfterEndTurn);

  // Process another attack action
  const attackAction2 = createAttackAction(0, 0);
  const stateAfterAttack2 = processGameAction(stateAfterEndTurn, attackAction2);
  console.log("State after second attack:", stateAfterAttack2);

  return {
    initialState,
    stateAfterAttack,
    stateAfterEndTurn,
    stateAfterAttack2
  };
}

// Run the test if this file is executed directly
if (typeof window === "undefined" && require.main === module) {
  testGameEngine();
}
