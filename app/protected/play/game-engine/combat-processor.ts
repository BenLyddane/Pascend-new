import { CardState, BattleEffect, BattleLogEntry } from "./types";
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
    logEntry: BattleLogEntry
  ): void {
    console.log("\n--- Processing Combat Phase ---");

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

    // Apply attacker's power modifications
    let attackerPowerBoost = 0;
    allEffects.attackerEffects.forEach((effect) => {
      if (effect.type === "power_boost") {
        attackerPowerBoost += effect.value;
        console.log(
          `Applying power boost to ${attacker.card.name}: +${effect.value}`
        );
      }
    });
    attacker.power += attackerPowerBoost;

    // Apply defender's power modifications
    let defenderPowerReduction = 0;
    allEffects.defenderEffects.forEach((effect) => {
      if (effect.type === "power_reduction") {
        defenderPowerReduction += effect.value;
        console.log(
          `Applying power reduction to ${defender.card.name}: -${effect.value}`
        );
      }
    });
    defender.power = Math.max(0, defender.power - defenderPowerReduction);

    // Calculate and apply damage
    const damage = this.damageCalculator.calculateDamage(
      attacker,
      defender,
      allEffects
    );
    console.log("Calculated Damage:", damage);
    this.damageCalculator.applyDamage(defender, damage);
    logEntry.defender.damage = damage;

    // Update power values in log entry
    logEntry.attacker.endPower = attacker.power;
    logEntry.defender.endPower = defender.power;

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
    });

    // If damage was dealt, add a gameplay effect to trigger Life Drain
    if (damage > 0) {
      if (!attacker.effects) {
        attacker.effects = [];
      }
      attacker.effects.push({
        effect_type: 'on_damage_dealt',
        effect_icon: 'Heart',
        value: 1
      });
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
    });
  }
}
