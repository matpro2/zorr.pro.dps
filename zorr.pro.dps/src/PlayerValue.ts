import { getEffectiveBuild } from "./inventory";
import { getObject } from "./GetObject";

const getInitialState = () => ({
  petal: {
    damageMulti: 1,
    damageMultiTiered: [] as { tier: number, value: number }[],
    healthMulti: 1,
    healthMultiTiered: [] as { tier: number, value: number }[],
    armor: 0,
    armorTiered: [] as { tier: number, value: number }[],
    armorMulti: 1,
    armorMultiTiered: [] as { tier: number, value: number }[],
    heal: 0,
    healTiered: [] as { tier: number, value: number }[],
    shield: 0,
    shieldTiered: [] as { tier: number, value: number }[],
    reloadFactor: 1,
    reloadFactorTiered: [] as { tier: number, value: number }[],
    secondReloadFactor: 1,
    secondReloadFactorTiered: [] as { tier: number, value: number }[],
    reloadSkipRate: 0,
    reloadSkipRateTiered: [] as { tier: number, value: number }[],
    secondReloadSkipRate: 0,
    secondReloadSkipRateTiered: [] as { tier: number, value: number }[],
    manaCostFactor: 1,
    manaCostFactorTiered: [] as { tier: number, value: number }[],
    luck: 0,
    luckTiered: [] as { tier: number, value: number }[],
    
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
    damageMultiTiered: [] as { tier: number, value: number }[],
    heal: 0,
    shield: 0,
    armor: 0,
    mutation: 0,
    mutationTiered: [] as { tier: number, value: number }[],
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

    const effectiveBuild = getEffectiveBuild();

    for (const item of effectiveBuild) {
      if (!item || item.inactive) continue; 
      const itemName = item.transformed ? item.transformed.name : item.name;
      const itemDisplayTier = item.transformed ? item.transformed.displayTier : item.tier;

      if (itemName.toLowerCase() === "joystick") {
        this.petal.hasJoystick.active = true;
        this.petal.hasJoystick.tier = Math.max(this.petal.hasJoystick.tier, itemDisplayTier);
      }
    }

    for (const item of effectiveBuild) {
      if (!item || item.inactive) continue;

      const finalName = item.transformed ? item.transformed.name : item.name;
      const finalStatTier = item.transformed ? item.transformed.statTier : item.tier;

      const obj = getObject(finalName, finalStatTier);
      if (!obj || !obj.effects) continue;

      for (const effect of obj.effects) {
        if (effect.type && effect.type.includes(".")) {
          const parts = effect.type.split(".");

          let effectValue = effect.value;
          
          // CORRECTION OPAL : Transformation de l'objet de critique en un multiplicateur mathématique direct (ex: 1.04)
          if (typeof effectValue === "object" && effectValue !== null && typeof effectValue.chance === "number" && typeof effectValue.multiplier === "number") {
            effectValue = 1 + ((effectValue.chance / 100) * (effectValue.multiplier - 1));
          }
          
          if (parts.length === 2) {
            const [category, stat] = parts;
            if ((this as any)[category] && typeof (this as any)[category][stat] !== "undefined") {
              const baseValue = (baseState as any)[category][stat];
              
              if (effect.tierRestricted) {
                 const targetArray = (this as any)[category][stat + "Tiered"];
                 if (targetArray) {
                    targetArray.push({ tier: finalStatTier, value: effectValue });
                 }
              } else {
                  if (stat.includes("Factor")) {
                    (this as any)[category][stat] *= Math.max(0.01, 1 + (effectValue / 100));
                  } else if (baseValue === 1) {
                    // CORRECTION : Multiplication directe pour les multiplicateurs
                    (this as any)[category][stat] *= effectValue;
                  } else {
                    (this as any)[category][stat] += effectValue;
                  }
              }
            }
          } else if (parts.length === 3) {
            const [category, sub, stat] = parts;
            if ((this as any)[category] && (this as any)[category][sub] && typeof (this as any)[category][sub][stat] !== "undefined") {
              const baseValue = (baseState as any)[category][sub][stat];
              
              if (effect.tierRestricted) {
                 const targetArray = (this as any)[category][sub][stat + "Tiered"];
                 if (targetArray) {
                    targetArray.push({ tier: finalStatTier, value: effectValue });
                 }
              } else {
                  if (stat.includes("Factor")) {
                    (this as any)[category][sub][stat] *= Math.max(0.01, 1 + (effectValue / 100));
                  } else if (baseValue === 1) {
                    // CORRECTION : Multiplication directe pour les multiplicateurs des sous-catégories
                    (this as any)[category][sub][stat] *= effectValue;
                  } else {
                    (this as any)[category][sub][stat] += effectValue;
                  }
              }
            }
          }
        }
      }
    }
  },
};