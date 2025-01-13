import { CardState, EffectModifier } from "./types";

export class DamageCalculator {
  calculateDamage(
    attacker: CardState,
    defender: CardState,
    abilities: {
      attackerEffects: EffectModifier[];
      defenderEffects: EffectModifier[];
    }
  ): number {
    console.log("\n=== Damage Calculation ===");
    console.log(`Base power from ${attacker.card.name}: ${attacker.power}`);

    // Start with base power
    let damage = attacker.power;

    // First apply attacker's power boosts
    console.log("\nAttacker Effects:");
    if (abilities.attackerEffects.length === 0) {
      console.log("No attacker effects");
    }
    abilities.attackerEffects.forEach((effect) => {
      if (effect.type === "power_boost") {
        console.log(
          `Power boost: +${effect.value} (${damage} → ${damage + effect.value})`
        );
        damage += effect.value;
      }
    });

    // Then apply defender's damage reduction
    console.log("\nDefender Effects:");
    if (abilities.defenderEffects.length === 0) {
      console.log("No defender effects");
    }
    let totalReduction = 0;
    abilities.defenderEffects.forEach((effect) => {
      if (effect.type === "power_reduction") {
        totalReduction += effect.value;
      }
    });
    
    if (totalReduction > 0) {
      const reducedDamage = Math.max(0, damage - totalReduction);
      console.log(
        `Total damage reduction: -${totalReduction} (${damage} → ${reducedDamage})`
      );
      damage = reducedDamage;
    }

    console.log(`\nFinal damage: ${damage}`);
    console.log("=====================");

    return Math.max(0, damage);
  }

  applyDamage(target: CardState, amount: number): void {
    const newHealth = Math.max(0, target.health - amount);
    console.log(`\nApplying damage to ${target.card.name}:`);
    console.log(`Health: ${target.health} → ${newHealth} (-${amount})`);
    target.health = newHealth;
  }

  applyHealing(target: CardState, amount: number): number {
    const healAmount = Math.min(amount, target.maxHealth - target.health);
    const newHealth = target.health + healAmount;
    console.log(`\nApplying healing to ${target.card.name}:`);
    console.log(`Health: ${target.health} → ${newHealth} (+${healAmount})`);
    target.health = newHealth;
    return healAmount;
  }

  checkDefeat(card: CardState): boolean {
    return card.health <= 0;
  }
}
