import { CardState, BattleEffect, CardEffect, SpecialEffect } from '../types';
import { EffectProcessor, createBattleEffect } from './base-effect';

export class DeathEffect implements EffectProcessor {
  processEffect(
    card: CardState,
    effect: CardEffect,
    specialEffect: SpecialEffect | null,
    isAttacker: boolean,
    opposingCard: CardState
  ) {
    if (effect.effect_type !== 'on_death' || card.health > 0) return {};

    if (effect.effect_icon === 'Bomb') {
      const modifiedValue = Math.round(effect.value * (card.card.modifier || 1));
      const target = opposingCard;  // Always target the opposing card for Explosive Demise
      target.health = Math.max(0, target.health - modifiedValue);
      
      const effectName = specialEffect?.name || effect.effect_type;
      return {
        battleEffect: createBattleEffect(
          'Bomb',
          'on_death',
          `${effectName}: ${card.card.name} dealt ${modifiedValue} explosion damage`
        )
      };
    }

    return {};
  }
}
