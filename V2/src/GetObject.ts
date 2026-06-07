import petals from "./data/petals.json";
import mobs from "./data/mobs.json";
import spills from "./data/spills.json";
import eggs from "./data/eggs.json";
import utilities from "./data/utilities.json";
import radiation from "./data/radiation.json";

import { PlayerValue } from "./PlayerValue";
import { TIERS } from "./constants"; 

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

// LECTURE INTELLIGENTE ET SÉCURISÉE DES OBJETS DE STATISTIQUES
function getApplicableStat(statData: { op: string, boosts: { source?: string, tierReq: number, value: number }[] } | undefined, currentTier: number, baseValue: number): number {
    let finalValue = baseValue;
    
    if (statData && Array.isArray(statData.boosts)) {
        for (const mod of statData.boosts) {
            // Anti-NaN + Vérification de Tier
            if (mod.tierReq >= currentTier && typeof mod.value === 'number' && !isNaN(mod.value)) {
                
                if (statData.op === 'factor') {
                    if (mod.source === "Talents") {
                        // Les talents calculent déjà le facteur en décimal (ex: 1.075)
                        finalValue *= mod.value;
                    } else {
                        // Les objets appliquent le pourcentage (ex: 15 -> 1.15)
                        finalValue *= Math.max(0.01, 1 + (mod.value / 100));
                    }
                } else if (statData.op === 'multiply') {
                    finalValue *= mod.value;
                } else {
                    finalValue += mod.value;
                }
            }
        }
    }
    return isNaN(finalValue) ? baseValue : finalValue;
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
      let gap = object.petTier.gap;
      
      if (typeof gap === "string") {
        const foundIndex = TIERS.findIndex(t => t.Name.toLowerCase() === gap.toLowerCase());
        if (foundIndex !== -1) {
            gap = foundIndex;
        }
      }

      if (gap !== undefined && typeof gap === "number") {
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
        object.health *= getApplicableStat(PlayerValue.petal.healthMulti, tier, 1);
    } else if (isPet) {
        object.health *= getApplicableStat(PlayerValue.pet.healthMulti, tier, 1);
    }
  }
  
  if (typeof object.damage === "number") {
    const applyTierMulti = Array.isArray(rawObject.damage) ? 1 : tierMulti;
    object.damage *= applyTierMulti;
    
    if (object.object === "petal") {
        object.damage *= getApplicableStat(PlayerValue.petal.damageMulti, tier, 1);
    } else if (isPet) {
        object.damage *= getApplicableStat(PlayerValue.pet.damageMulti, tier, 1);
        if (object.spectrum === true) {
            object.damage *= 10;
        }
        if (object.bubble === true) {
            object.damage *= 100;
        }
    } else if (isMob) {
        object.damage *= getApplicableStat(PlayerValue.mob.damageMulti, tier, 1); 
    }
  }
  
  if (typeof object.armor === "number") {
    const applyTierMulti = Array.isArray(rawObject.armor) ? 1 : tierMulti;
    
    object.armor *= applyTierMulti;

    if (object.object === "petal") {
        const finalArmor = getApplicableStat(PlayerValue.petal.armor, tier, 0);
        const finalArmorMulti = getApplicableStat(PlayerValue.petal.armorMulti, tier, 1);
        object.armor = (object.armor + finalArmor) * finalArmorMulti;
    } else if (isPet) {
        object.armor = (object.armor + getApplicableStat(PlayerValue.pet.armor, tier, 0));
    } else if (isMob) {
        object.armor = (object.armor + getApplicableStat(PlayerValue.mob.armor, tier, 0)) * getApplicableStat(PlayerValue.mob.armorMulti, tier, 1);
    }
  }

  if (typeof object.reload === "number" && (object.object === "petal" || object.object === "pet")) {
    if (object.name && object.name.toLowerCase() === "flower") {
        object.reload = 10;
    }

    const finalReloadFactor = getApplicableStat(PlayerValue.petal.reloadFactor, tier, 1);
    const finalReloadSkipRate = getApplicableStat(PlayerValue.petal.reloadSkipRate, tier, 0);
    
    object.reload /= Math.max(0.01, finalReloadFactor);
    object.reload *= Math.max(0, 1 - (finalReloadSkipRate / 100));
  }

  if (typeof object.secondReload === "number" && (object.object === "petal" || object.object === "pet")) {
    const finalSecondReloadFactor = getApplicableStat(PlayerValue.petal.secondReloadFactor, tier, 1);
    const finalSecondReloadSkipRate = getApplicableStat(PlayerValue.petal.secondReloadSkipRate, tier, 0);
    
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
            effect.duration += getApplicableStat(PlayerValue.status.poisonDuration, tier, 0);
            break;
          case "Fire":
            effect.duration += getApplicableStat(PlayerValue.status.fireDuration, tier, 0);
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