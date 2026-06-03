import petals from "./data/petals.json";
import mobs from "./data/mobs.json";
import spills from "./data/spills.json";
import eggs from "./data/eggs.json";
import utilities from "./data/utilities.json";
import radiation from "./data/radiation.json";

import { PlayerValue } from "./PlayerValue";

const allData: Record<string, any> = {
  ...petals,
  ...mobs,
  ...spills,
  ...eggs,
  ...utilities,
  ...radiation
};

function resolveTiers(data: any, tier: number, keyName?: string): any {
  if (data === null || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return data;

    if (keyName === "effects") {
      return data.map(item => resolveTiers(item, tier));
    }

    const safeTierIndex = Math.min(tier, data.length - 1);
    
    return resolveTiers(data[safeTierIndex], tier);
  }

  const resolvedObject: any = {};
  for (const key in data) {
    resolvedObject[key] = resolveTiers(data[key], tier, key);
  }
  return resolvedObject;
}

function getMobHpMultiplier(tier: number): number {
    const factors = [3.75, 3.6, 4, 7.5, 6, 15, 12, 15];
    let hMult = 1;
    for (let i = 0; i < tier; i++) {
        hMult *= (factors[i] || 1);
    }
    return hMult;
}

function getApplicableStat(globalValue: number, tieredArray: { tier: number, value: number }[] | undefined, currentTier: number, isMultiplier: boolean = false, isFactor: boolean = false): number {
    let finalValue = globalValue;
    
    if (tieredArray && tieredArray.length > 0) {
        for (const mod of tieredArray) {
            if (mod.tier >= currentTier) {
                if (isFactor) {
                    finalValue *= Math.max(0.01, 1 + (mod.value / 100));
                } else if (isMultiplier) {
                    // CORRECTION : On multiplie directement la valeur (ex: finalValue *= 1.1)
                    finalValue *= mod.value;
                } else {
                    finalValue += mod.value;
                }
            }
        }
    }
    return finalValue;
}

export function getObject(name: string, tier: number, forcePet: boolean = false) {
  const key = Object.keys(allData).find(p => p.toLowerCase() === name.toLowerCase());

  if (!key) return null;

  const rawObject = allData[key];
  const object = resolveTiers(rawObject, tier);
  
  if (object.type === "egg") {
    
    if (typeof object.entity === "object" && object.entity !== null) {
      const base = object.entity.base || 1;
      const multi = object.entity.multi || 1;
      object.entity = (tier >= 8) ? Math.round(base * multi) : base;
    }

    if (typeof object.petTier === "object" && object.petTier !== null) {
      const gap = object.petTier.gap;
      if (gap !== undefined) {
        object.petTier = (tier <= gap) ? tier : (tier - 1);
      } else {
        object.petTier = tier; 
      }
    }

  if (object.name && object.name.toLowerCase().includes("centipede")) {
      const baseCount = object.entity || 1;
      
      object.entity = baseCount * 6.5;
    }
  }

  const isPet = forcePet || object.object === "pet";
  const isMob = !forcePet && object.object === "mob";

  const tierMulti = 3 ** tier;

  if (typeof object.health === "number") {
    let applyTierMulti = 1;

    if (!Array.isArray(rawObject.health)) {
        if (object.object === "mob" || object.object === "pet") {
            applyTierMulti = getMobHpMultiplier(tier);
        } else {
            applyTierMulti = tierMulti;
        }
    }
    
    object.health *= applyTierMulti;
    
    if (object.object === "petal") {
        const finalHealthMulti = getApplicableStat(PlayerValue.petal.healthMulti, PlayerValue.petal.healthMultiTiered, tier, true);
        object.health *= finalHealthMulti;
    }
  }
  
  if (typeof object.damage === "number") {
    const applyTierMulti = Array.isArray(rawObject.damage) ? 1 : tierMulti;
    object.damage *= applyTierMulti;
    
    if (object.object === "petal") {
        const finalDamageMulti = getApplicableStat(PlayerValue.petal.damageMulti, PlayerValue.petal.damageMultiTiered, tier, true);
        object.damage *= finalDamageMulti;
    } else if (isPet) {
        const finalDamageMulti = getApplicableStat(PlayerValue.pet.damageMulti, PlayerValue.pet.damageMultiTiered, tier, true);
        object.damage *= finalDamageMulti;
        if (object.spectrum === true) {
            object.damage *= 10;
        }
    } else if (isMob) {
        object.damage *= PlayerValue.mob.damageMulti; 
    }
  }
  
  if (typeof object.armor === "number") {
    const applyTierMulti = Array.isArray(rawObject.armor) ? 1 : tierMulti;
    
    object.armor *= applyTierMulti;

    if (object.object === "petal") {
        const finalArmor = getApplicableStat(PlayerValue.petal.armor, PlayerValue.petal.armorTiered, tier);
        const finalArmorMulti = getApplicableStat(PlayerValue.petal.armorMulti, PlayerValue.petal.armorMultiTiered, tier, true);
        object.armor = (object.armor + finalArmor) * finalArmorMulti;
    } else if (isPet) {
        object.armor = (object.armor + PlayerValue.pet.armor);
    } else if (isMob) {
        object.armor = (object.armor + PlayerValue.mob.armor) * PlayerValue.mob.armorMulti;
    }
  }

  if (typeof object.reload === "number" && (object.object === "petal" || object.object === "pet")) {
    const finalReloadFactor = getApplicableStat(PlayerValue.petal.reloadFactor, PlayerValue.petal.reloadFactorTiered, tier, false, true);
    const finalReloadSkipRate = getApplicableStat(PlayerValue.petal.reloadSkipRate, PlayerValue.petal.reloadSkipRateTiered, tier);
    
    object.reload /= Math.max(0.01, finalReloadFactor);
    object.reload *= Math.max(0, 1 - (finalReloadSkipRate / 100));
  }

  if (typeof object.secondReload === "number" && (object.object === "petal" || object.object === "pet")) {
    const finalSecondReloadFactor = getApplicableStat(PlayerValue.petal.secondReloadFactor, PlayerValue.petal.secondReloadFactorTiered, tier, false, true);
    const finalSecondReloadSkipRate = getApplicableStat(PlayerValue.petal.secondReloadSkipRate, PlayerValue.petal.secondReloadSkipRateTiered, tier);
    
    object.secondReload /= Math.max(0.01, finalSecondReloadFactor);
    object.secondReload *= Math.max(0, 1 - (finalSecondReloadSkipRate / 100));
  }

  if (Array.isArray(object.effects) && Array.isArray(rawObject.effects)) {
    for (let i = 0; i < object.effects.length; i++) {
      const effect = object.effects[i];
      const rawEffect = rawObject.effects[i];
      
      if (typeof effect.value === "number") {
         if (!Array.isArray(rawEffect.value) && rawEffect.scale !== false) {
           effect.value *= tierMulti;
         }
      }

      if (typeof effect.duration === "number" && (object.object === "petal" || object.object === "pet")) {
        switch (effect.type) {
          case "Poison":
            effect.duration += PlayerValue.status.poisonDuration;
            break;
          case "Fire":
            effect.duration += PlayerValue.status.fireDuration;
            break;
        }
      }
    }
  }

  if (typeof object.damage === "number" && Array.isArray(object.effects)) {
    let critChance = 0;
    let critMultiplier = 1;

    for (const effect of object.effects) {
        if (effect.type === "Critical" && effect.value) {
            critChance = (effect.value.chance || 0) / 100;
            critMultiplier = effect.value.multiplier || 1;
            break; 
        }
    }

    if (critChance > 0) {
        const expectedCritMultiplier = (1 - critChance) + (critChance * critMultiplier);
        object.damage *= expectedCritMultiplier;
    }
  }

  return object;
}