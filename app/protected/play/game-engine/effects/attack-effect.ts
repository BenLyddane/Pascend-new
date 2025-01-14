import { CardState, BattleEffect, CardEffect, SpecialEffect, EffectModifier } from '../types';
import { EffectProcessor, createBattleEffect } from './base-effect';

export class AttackEffect implements EffectProcessor {
  processEffect(
    card: CardState,
    effect: CardEffect,
    specialEffect: SpecialEffect | null,
    isAttacker: boolean,
    opposingCard: CardState
  ) {
    if (effect.effect_type !== 'on_attack') return {};

    const modifiedValue = Math.round(effect.value * (card.card.modifier || 1));
    const effectName = specialEffect?.name || effect.effect_type;
    const result: {
      battleEffect?: BattleEffect;
      attackerEffects?: EffectModifier[];
      defenderEffects?: EffectModifier[];
    } = {};

    switch (effect.effect_icon) {
      case 'Sword':
        result.attackerEffects = [{ type: 'power_boost', value: modifiedValue }];
        result.battleEffect = createBattleEffect(
          'Sword',
          'pre_combat',
          `${effectName}: ${card.card.name}'s attack power increased by ${modifiedValue}`
        );
        break;

      case 'Shield':
        result.defenderEffects = [{ type: 'power_reduction', value: modifiedValue }];
        result.battleEffect = createBattleEffect(
          'Shield',
          'pre_combat',
          `${effectName}: ${card.card.name} reduces incoming damage by ${modifiedValue}`
        );
        break;
    }

    return result;
  }
}
