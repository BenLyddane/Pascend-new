import { CardState, CardEffect, SpecialEffect } from "../types";
import { EffectProcessor } from "./base-effect";

export class TurnEndEffect implements EffectProcessor {
  processEffect(
    card: CardState,
    effect: CardEffect,
    specialEffect: SpecialEffect | null,
    isAttacker: boolean,
    opposingCard: CardState
  ) {
    // We don't currently have any cards that use on_turn_end effects
    return {};
  }
}
