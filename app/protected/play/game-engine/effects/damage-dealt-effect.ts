import { CardState, BattleEffect, CardEffect, SpecialEffect } from '../types';
import { EffectProcessor, createBattleEffect } from './base-effect';

export class DamageDealtEffect implements EffectProcessor {
  processEffect(
    card: CardState,
    effect: CardEffect,
    specialEffect: SpecialEffect | null,
    isAttacker: boolean,
    opposingCard: CardState
  ) {
    if (effect.effect_type !== 'on_damage_dealt') return {};

    if (effect.effect_icon === 'Heart') {
      const modifiedValue = Math.round(effect.value * (card.card.modifier || 1));
      const healAmount = Math.min(modifiedValue, card.maxHealth - card.health);
      
      if (healAmount > 0) {
        card.health += healAmount;
        const effectName = specialEffect?.name || effect.effect_type;
        
        return {
          battleEffect: createBattleEffect(
            'Heart',
            'post_combat',
            `${effectName}: ${card.card.name} healed for ${healAmount} HP`
          )
        };
      }
    }

    return {};
  }
}
