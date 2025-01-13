import { CardState, BattleEffect, CardEffect, SpecialEffect, EffectModifier } from '../types';
import { EffectProcessor, createBattleEffect } from './base-effect';

export class DamageReceivedEffect implements EffectProcessor {
  processEffect(
    card: CardState,
    effect: CardEffect,
    specialEffect: SpecialEffect | null,
    isAttacker: boolean,
    opposingCard: CardState
  ) {
    if (effect.effect_type !== 'on_damage_received') return {};

    const modifiedValue = Math.round(effect.value * (card.card.modifier || 1));
    const effectName = specialEffect?.name || effect.effect_type;
    const result: {
      battleEffect?: BattleEffect;
      defenderEffects?: EffectModifier[];
    } = {};

    switch (effect.effect_icon) {
      case 'ShieldCheck':
        result.defenderEffects = [{ type: 'power_reduction', value: modifiedValue }];
        result.battleEffect = createBattleEffect(
          'ShieldCheck',
          'combat',
          `${effectName}: ${card.card.name} reduced incoming damage by ${modifiedValue} (${effect.value} × ${card.card.modifier || 1} modifier)`
        );
        break;

      case 'Shield':
        result.defenderEffects = [{ type: 'power_reduction', value: modifiedValue }];
        result.battleEffect = createBattleEffect(
          'Shield',
          'combat',
          `${effectName}: ${card.card.name} blocked ${modifiedValue} damage (${effect.value} × ${card.card.modifier || 1} modifier)`
        );
        break;
    }

    return result;
  }
}
