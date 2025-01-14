import type { Json } from "@/types/database.types";
import type { BaseCardEffect } from "@/types/game.types";

export function convertToBaseCardEffects(effects: Json | null): BaseCardEffect[] {
  if (!effects || !Array.isArray(effects)) return [];
  return effects
    .map(effect => {
      if (!effect || typeof effect !== 'object') return null;
      const obj = effect as Record<string, unknown>;
      if (
        typeof obj.name === 'string' &&
        typeof obj.description === 'string' &&
        typeof obj.effect_type === 'string' &&
        typeof obj.effect_icon === 'string' &&
        (typeof obj.value === 'number' || obj.value === null)
      ) {
        return {
          name: obj.name,
          description: obj.description,
          effect_type: obj.effect_type,
          effect_icon: obj.effect_icon,
          value: obj.value ?? 0
        };
      }
      return null;
    })
    .filter((effect): effect is BaseCardEffect => effect !== null);
}
