import { CardState, BattleEffect, BattleLogEntry, CardEffect, EffectType, EffectIcon } from "./types";
import { EffectsProcessor } from "./effects-processor";
import { DamageCalculator } from "./damage-calculator";

export class CombatProcessor {
  constructor(
    private effectsProcessor: EffectsProcessor,
    private damageCalculator: DamageCalculator
  ) {}

  processCombat(
    attacker: CardState,
    defender: CardState,
    logEntry: BattleLogEntry,
    isCounterAttack: boolean = false
  ): void {
    console.log("\n--- Processing Combat Phase ---");
    console.log(`${isCounterAttack ? "Counter-attack" : "Attack"} by ${attacker.card.name}`);

    // Get pre-combat and combat effects for damage calculation
    const preCombatEffects = this.effectsProcessor.processSpecialAbilities(
      attacker,
      defender,
      "pre_combat"
    );
    const combatEffects = this.effectsProcessor.processSpecialAbilities(
      attacker,
      defender,
      "combat"
    );
    console.log("Pre-combat Effects:", preCombatEffects);
    console.log("Combat Effects:", combatEffects);

    // Combine all effects
    const allEffects = {
      attackerEffects: [...preCombatEffects.attackerEffects, ...combatEffects.attackerEffects],
      defenderEffects: [...preCombatEffects.defenderEffects, ...combatEffects.defenderEffects],
    };

    // Calculate damage using effects without modifying base power
    console.log("\nPre-combat power values:");
    console.log(`${attacker.card.name} power: ${attacker.power}`);
    console.log(`${defender.card.name} power: ${defender.power}`);
    const damage = this.damageCalculator.calculateDamage(
      attacker,
      defender,
      allEffects
    );
    console.log("Calculated Damage:", damage);
    this.damageCalculator.applyDamage(defender, damage);

    // Update damage values based on whether this is a counter-attack
    if (isCounterAttack) {
      logEntry.attacker.damage = damage;
    } else {
      logEntry.defender.damage = damage;
    }

    // Update power values in log entry - use calculated values
    const attackerFinalPower = attacker.card.power + 
      allEffects.attackerEffects.reduce((total, effect) => 
        effect.type === "power_boost" ? total + effect.value : total, 0);
    
    const defenderFinalPower = Math.max(0, defender.card.power - 
      allEffects.defenderEffects.reduce((total, effect) => 
        effect.type === "power_reduction" ? total + effect.value : total, 0));

    if (isCounterAttack) {
      logEntry.defender.endPower = attackerFinalPower;
      logEntry.attacker.endPower = defenderFinalPower;
    } else {
      logEntry.attacker.endPower = attackerFinalPower;
      logEntry.defender.endPower = defenderFinalPower;
    }

    // Reset power values to their base values after combat
    attacker.power = attacker.card.power;
    defender.power = defender.card.power;
    
    console.log("\nPost-combat power values (reset to base):");
    console.log(`${attacker.card.name} power: ${attacker.power}`);
    console.log(`${defender.card.name} power: ${defender.power}`);

    // Add combat effect to log with modifier info
    const attackerModifier = attacker.card.modifier || 0;
    const modifierText =
      attackerModifier !== 0
        ? ` (${attackerModifier > 0 ? "+" : ""}${attackerModifier} modifier)`
        : "";
    logEntry.effects.push({
      type: "hit",
      description: `${attacker.card.name} dealt ${damage} damage to ${defender.card.name}${modifierText}`,
      timing: "combat",
      icon: "Sword"
    });

    // If damage was dealt, add or update Life Drain effect
    if (damage > 0) {
      // Initialize effects array if it doesn't exist
      attacker.effects = attacker.effects || [];
      
      // Find existing Life Drain effect
      const existingEffect = attacker.effects.find(
        (effect: CardEffect) => effect.effect_type === "on_damage_dealt" && effect.effect_icon === "Heart"
      );
      
      if (existingEffect) {
        // Update existing effect value
        existingEffect.value += 1;
      } else {
        // Add new effect if none exists
        const newEffect: CardEffect = {
          name: "Life Drain",
          description: "Gains power from dealing damage",
          effect_type: "on_damage_dealt" as EffectType,
          effect_icon: "Heart" as EffectIcon,
          value: 1
        };
        attacker.effects.push(newEffect);
      }
    }
  }

  processDefeat(
    defeated: CardState,
    victor: CardState,
    logEntry: BattleLogEntry
  ): void {
    console.log("\n--- Processing Defeat ---");
    console.log(`${defeated.card.name} was defeated by ${victor.card.name}`);

    defeated.isDefeated = true;

    const deathEffects = this.effectsProcessor.processSpecialAbilities(
      victor,
      defeated,
      "on_death"
    );
    if (deathEffects.specialEffects.length > 0) {
      console.log("Death Effects:", deathEffects.specialEffects);
    }
    logEntry.effects.push(...deathEffects.specialEffects);

    logEntry.effects.push({
      type: "defeat",
      description: `${defeated.card.name} was defeated!`,
      timing: "on_death",
      icon: "Sword"
    });
  }
}
