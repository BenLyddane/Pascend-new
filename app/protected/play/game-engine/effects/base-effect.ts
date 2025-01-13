import { CardState, BattleEffect, EffectModifier, CardEffect, SpecialEffect, BattleEffectTiming } from '../types';

export interface EffectResult {
  battleEffect?: BattleEffect;
  attackerEffects?: EffectModifier[];
  defenderEffects?: EffectModifier[];
}

export interface EffectProcessor {
  processEffect(
    card: CardState,
    effect: CardEffect,
    specialEffect: SpecialEffect | null,
    isAttacker: boolean,
    opposingCard: CardState
  ): EffectResult;
}

export function createBattleEffect(
  icon: string,
  timing: BattleEffectTiming,
  description: string
): BattleEffect {
  return {
    type: 'special',
    description,
    icon,
    timing
  };
}
