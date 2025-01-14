import { CardEffect, GameCard } from "@/types/game.types";

import {
  CardState,
  BattleEffect,
  EffectModifier,
  BattleEffectTiming,
  isValidEffectType,
  isValidEffectIcon,
  EffectType,
  EffectIcon,
  SpecialEffect,
} from "./types";
import {
  TurnStartEffect,
  AttackEffect,
  DamageDealtEffect,
  DamageReceivedEffect,
  DeathEffect,
  TurnEndEffect,
} from "./effects";
import { EffectResult } from "./effects/base-effect";

export class EffectsProcessor {
  private gameStats: { specialAbilitiesUsed: number };
  private processors = [
    new TurnStartEffect(),
    new AttackEffect(),
    new DamageDealtEffect(),
    new DamageReceivedEffect(),
    new DeathEffect(),
    new TurnEndEffect(),
  ];

  constructor(gameStats: { specialAbilitiesUsed: number }) {
    this.gameStats = gameStats;
  }

  private getEffectTiming(effectType: EffectType): BattleEffectTiming {
    switch (effectType) {
      case "on_turn_start":
        return "turn_start";
      case "on_attack":
      case "on_battle_start":  // Map battle start effects to pre-combat phase
        return "pre_combat";
      case "on_damage_received":
        return "combat";
      case "on_damage_dealt":
        return "post_combat";
      case "on_turn_end":
        return "turn_end";
      case "on_death":
        return "on_death";
      default:
        return "combat";
    }
  }

  private getSpecialEffects(card: CardState): SpecialEffect[] {
    if (!card.card.special_effects || !Array.isArray(card.card.special_effects)) {
      return [];
    }

    return card.card.special_effects
      .filter((effect): effect is SpecialEffect => {
        if (!effect || typeof effect !== 'object') return false;
        const effectObj = effect as Partial<SpecialEffect>;
        return (
          'name' in effectObj &&
          'description' in effectObj &&
          'effect_type' in effectObj &&
          'effect_icon' in effectObj &&
          'value' in effectObj &&
          typeof effectObj.name === 'string' &&
          typeof effectObj.description === 'string' &&
          isValidEffectType(effectObj.effect_type as string) &&
          isValidEffectIcon(effectObj.effect_icon as string) &&
          typeof effectObj.value === 'number'
        );
      });
  }

  processSpecialAbilities(
    attacker: CardState,
    defender: CardState,
    timing: BattleEffectTiming
  ): {
    attackerEffects: EffectModifier[];
    defenderEffects: EffectModifier[];
    specialEffects: BattleEffect[];
  } {
    const effects = {
      attackerEffects: [] as EffectModifier[],
      defenderEffects: [] as EffectModifier[],
      specialEffects: [] as BattleEffect[],
    };

    console.log(`\n=== Processing ${timing} phase effects ===`);
    console.log("Attacker:", {
      name: attacker.card.name,
      gameplay_effects: attacker.card.gameplay_effects,
      special_effects: attacker.card.special_effects,
      modifier: attacker.card.modifier,
    });
    console.log("Defender:", {
      name: defender.card.name,
      gameplay_effects: defender.card.gameplay_effects,
      special_effects: defender.card.special_effects,
      modifier: defender.card.modifier,
    });

    // Helper function to process effects for a card
    const processCardEffects = (card: CardState, isAttacker: boolean) => {
      const cardEffects = card.card.gameplay_effects;
      if (!cardEffects || cardEffects.length === 0) {
        console.log(`No effects found for ${card.card.name}`);
        return;
      }
      console.log(
        `Processing effects for ${card.card.name}:`,
        cardEffects
      );

      cardEffects.forEach((effect: CardEffect) => {
        this.gameStats.specialAbilitiesUsed++;

        // Get effect details from card's special_effects
        const specialEffects = this.getSpecialEffects(card);
        console.log("Special effects found:", specialEffects);
        const specialEffect =
          specialEffects.find((se) => se.effect_type === effect.effect_type) ||
          null;
        if (specialEffect) {
          console.log("Matched special effect:", specialEffect);
        }

        if (!isValidEffectType(effect.effect_type)) {
          console.log(`Invalid effect type: ${effect.effect_type}`);
          return;
        }
        const expectedTiming = this.getEffectTiming(effect.effect_type);
        if (expectedTiming !== timing) {
          console.log(
            `Skipped effect ${effect.effect_type} (current phase: ${timing}, requires: ${expectedTiming})`
          );
          return;
        }

        console.log(`Processing ${effect.effect_type} effect during ${timing} phase`);

        // Process effect through appropriate processor
        for (const processor of this.processors) {
          const result: EffectResult = processor.processEffect(
            card,
            effect,
            specialEffect,
            isAttacker,
            isAttacker ? defender : attacker
          );

          console.log("Effect processor result:", result);
          if (result.battleEffect) {
            console.log(
              `Processing ${effect.effect_type} effect with icon ${effect.effect_icon}`
            );
            console.log("Card modifier:", card.card.modifier);
            // If we have a custom description from the card's special effects, use it
            if (specialEffect?.description) {
              let finalDescription = specialEffect.description;
              // Replace {value} with effect value
              finalDescription = finalDescription.replace(
                /{value}/g,
                effect.value.toString()
              );
              // Replace {modifier} with card's modifier
              finalDescription = finalDescription.replace(
                /{modifier}/g,
                card.card.modifier?.toString() || "0"
              );
              result.battleEffect.description = `${specialEffect.name}: ${finalDescription}`;
              // Add source card information
              result.battleEffect.sourceCard = card.card.name;
            }

            // Ensure we have source card info even for non-special effects
            if (!result.battleEffect.sourceCard) {
              result.battleEffect.sourceCard = card.card.name;
            }

            effects.specialEffects.push(result.battleEffect);
          }

          if (result.attackerEffects?.length) {
            effects.attackerEffects.push(...result.attackerEffects);
          }

          if (result.defenderEffects?.length) {
            effects.defenderEffects.push(...result.defenderEffects);
          }
        }
      });
    };

    processCardEffects(attacker, true);
    processCardEffects(defender, false);

    return effects;
  }
}
