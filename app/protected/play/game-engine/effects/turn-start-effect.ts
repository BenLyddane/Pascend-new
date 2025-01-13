import { CardState, BattleEffect, CardEffect, SpecialEffect } from '../types';
import { EffectProcessor, createBattleEffect } from './base-effect';

export class TurnStartEffect implements EffectProcessor {
  processEffect(
    card: CardState,
    effect: CardEffect,
    specialEffect: SpecialEffect | null,
    isAttacker: boolean,
    opposingCard: CardState
  ) {
    if (effect.effect_type !== 'on_turn_start') return {};

    if (effect.effect_icon === 'Flame') {
      // Apply card's modifier to the effect value
      const modifiedValue = effect.value * (card.card.modifier || 1);
      const damage = Math.round(modifiedValue);
      card.health = Math.max(0, card.health - damage);
      
      const effectName = specialEffect?.name || effect.effect_type;
      return {
        battleEffect: createBattleEffect(
          'Flame',
          'turn_start',
          `${effectName}: ${card.card.name} takes ${damage} burn damage (${effect.value} × ${card.card.modifier || 1} modifier)`
        )
      };
    }

    return {};
  }
}
