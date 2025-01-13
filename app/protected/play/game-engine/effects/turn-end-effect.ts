import { CardState, BattleEffect, CardEffect, SpecialEffect } from '../types';
import { EffectProcessor, createBattleEffect } from './base-effect';

export class TurnEndEffect implements EffectProcessor {
  processEffect(
    card: CardState,
    effect: CardEffect,
    specialEffect: SpecialEffect | null,
    isAttacker: boolean,
    opposingCard: CardState
  ) {
    if (effect.effect_type !== 'on_turn_end') return {};

    if (effect.effect_icon === 'RefreshCw') {
      const effectName = specialEffect?.name || effect.effect_type;
      return {
        battleEffect: createBattleEffect(
          'RefreshCw',
          'turn_end',
          `${effectName}: ${card.card.name} refreshes at turn end`
        )
      };
    }

    return {};
  }
}
