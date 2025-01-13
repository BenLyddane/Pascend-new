import { CardState, BattleLogEntry, BattleEffectTiming } from "./types";
import { EffectsProcessor } from "./effects-processor";

export class EffectPhaseProcessor {
  constructor(private effectsProcessor: EffectsProcessor) {}

  processPhase(
    timing: BattleEffectTiming,
    attacker: CardState,
    defender: CardState,
    logEntry: BattleLogEntry
  ): void {
    console.log(`\n--- Processing ${timing} Phase ---`);
    const effects = this.effectsProcessor.processSpecialAbilities(
      attacker,
      defender,
      timing
    );

    if (effects.specialEffects.length > 0) {
      console.log("Special Effects:", effects.specialEffects);
    }
    if (effects.attackerEffects.length > 0) {
      console.log("Attacker Effects:", effects.attackerEffects);
    }
    if (effects.defenderEffects.length > 0) {
      console.log("Defender Effects:", effects.defenderEffects);
    }

    logEntry.effects.push(...effects.specialEffects);
  }

  cleanupTemporaryEffects(attacker: CardState): void {
    // Clean up temporary gameplay effects like Life Drain
    if (attacker.effects) {
      attacker.effects = attacker.effects.filter(
        effect => effect.effect_type !== 'on_damage_dealt' || effect.effect_icon !== 'Heart'
      );
    }
  }
}
