import { getEffectiveBuild } from "./inventory";
import { getObject } from "./GetObject";

const getInitialState = () => ({
  petal: {
    damageMulti: 1,
    healthMulti: 1,
    armor: 0,
    armorMulti: 1,
    heal: 0,
    shield: 0,
    reloadFactor: 1,
    secondReloadFactor: 1,
    reloadSkipRate: 0,
    secondReloadSkipRate: 0,
    manaCostFactor: 1,
    luck: 0,
    
    hasJoystick: { active: false, tier: 0 } 
  },
  player: {
    heal: 0,
    healMulti: 1,
    manaGeneration: 0,
    manaGenerationMulti: 1,
    manaDrain: 0,
    shield: 0,
    armor: 0,
    armorMulti: 1,
    bodyDamage: 0,
    bodyDamageMulti: 1,
    evasion: 0,
    damageReduction: 0,
    damageReflection: 0,
  },
  pet: {
    damageMulti: 1,
    heal: 0,
    shield: 0,
    armor: 0,
    mutation: 0,
    variantMutation: 0,
    paranormalRate: 0,
    fullRegenRate: 0,
    dupeRate: 0,
  },
  mob: {
    damageMulti: 1,
    armor: 0,
    armorMulti: 1,
  },
  status: {
    fireDuration: 0,
    poisonDuration: 0,
    lightningBounce: 0,
    lightningMultiRate: 0,
  },
  mana: {
    generation: 0,
    drain: 0,
    capacityMulti: 1,
  },
});

export const PlayerValue = {
  ...getInitialState(),

  reset() {
    Object.assign(this, getInitialState());
  },

  updateFromSlots() {
    this.reset();
    const baseState = getInitialState();

    // 1. On lit le build qui a déjà résolu les Mimics
    const effectiveBuild = getEffectiveBuild();

    // 2. Détection du Joystick maximum dans le build
    for (const item of effectiveBuild) {
      if (!item) continue;
      
      const itemName = item.transformed ? item.transformed.name : item.name;
      const itemTier = item.transformed ? item.transformed.tier : item.tier;

      if (itemName.toLowerCase() === "joystick") {
        this.petal.hasJoystick.active = true;
        this.petal.hasJoystick.tier = Math.max(this.petal.hasJoystick.tier, itemTier);
      }
    }

    for (const item of effectiveBuild) {
      if (!item) continue;

      let finalName = item.transformed ? item.transformed.name : item.name;
      let finalTier = item.transformed ? item.transformed.tier : item.tier;

      // Le Stick se transforme s'il est de tier inférieur ou égal, et il garde son PROPRE tier !
      if (this.petal.hasJoystick.active && finalName.toLowerCase() === "stick" && finalTier <= this.petal.hasJoystick.tier) {
        finalName = "joystick";
      }

      const obj = getObject(finalName, finalTier);
      if (!obj || !obj.effects) continue;

      for (const effect of obj.effects) {
        if (effect.type && effect.type.includes(".")) {
          const parts = effect.type.split(".");

          let effectValue = effect.value;
          
          if (typeof effectValue === "object" && effectValue !== null && typeof effectValue.chance === "number" && typeof effectValue.multiplier === "number") {
            effectValue = effectValue.chance * (effectValue.multiplier - 1);
          }

          if (parts.length === 2) {
            const [category, stat] = parts;
            if ((this as any)[category] && typeof (this as any)[category][stat] !== "undefined") {
              const baseValue = (baseState as any)[category][stat];
              
              if (stat.includes("Factor")) {
                (this as any)[category][stat] *= Math.max(0.01, 1 + (effectValue / 100));
              } else if (baseValue === 1) {
                (this as any)[category][stat] += effectValue / 100;
              } else {
                (this as any)[category][stat] += effectValue;
              }
            }
          } else if (parts.length === 3) {
            const [category, sub, stat] = parts;
            if ((this as any)[category] && (this as any)[category][sub] && typeof (this as any)[category][sub][stat] !== "undefined") {
              const baseValue = (baseState as any)[category][sub][stat];
              
              if (stat.includes("Factor")) {
                (this as any)[category][sub][stat] *= Math.max(0.01, 1 + (effectValue / 100));
              } else if (baseValue === 1) {
                (this as any)[category][sub][stat] += effectValue / 100;
              } else {
                (this as any)[category][sub][stat] += effectValue;
              }
            }
          }
        }
      }
    }
  },
};