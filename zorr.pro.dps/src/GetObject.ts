import petals from "../src/data/petals.json";
import mobs from "../src/data/mobs.json";
import spills from "../src/data/spills.json";
import eggs from "../src/data/eggs.json";
import utilities from "../src/data/utilities.json";
import radiation from "../src/data/radiation.json";

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

// NOUVELLE FONCTION : Calcule le multiplicateur spécial de PV pour les mobs et familiers
function getMobHpMultiplier(tier: number): number {
    const factors = [3.75, 3.6, 4, 7.5, 6, 15, 12];
    let hMult = 1;
    for (let i = 0; i < tier; i++) {
        hMult *= (factors[i] || 1);
    }
    return hMult;
}

export function getObject(name: string, tier: number) {
  const key = Object.keys(allData).find(p => p.toLowerCase() === name.toLowerCase());

  if (!key) return null;

  const rawObject = allData[key];
  const object = resolveTiers(rawObject, tier);

  const role = object.object === "mob" ? "target" : (object.object || "none");

  const tierMulti = 3 ** tier;

  // --- MODIFICATION ICI ---
  if (typeof object.health === "number") {
    let applyTierMulti = 1;

    if (!Array.isArray(rawObject.health)) {
        if (role === "target" || role === "pet") {
            applyTierMulti = getMobHpMultiplier(tier);
        } else {
            applyTierMulti = tierMulti;
        }
    }
    
    object.health *= applyTierMulti;
    
    if (role === "petal") {
        object.health *= PlayerValue.petal.healthMulti;
    }
  }
  
  if (typeof object.damage === "number") {
    const applyTierMulti = Array.isArray(rawObject.damage) ? 1 : tierMulti;
    object.damage *= applyTierMulti;
    
    if (role === "petal") {
        object.damage *= PlayerValue.petal.damageMulti * PlayerValue.target.damageMulti;
    } else if (role === "pet") {
        object.damage *= PlayerValue.pet.damageMulti * PlayerValue.target.damageMulti;
    }
  }
  
  if (typeof object.armor === "number") {
    const applyTierMulti = Array.isArray(rawObject.armor) ? 1 : tierMulti;
    
    object.armor *= applyTierMulti;

    if (role === "petal") {
        object.armor = (object.armor + PlayerValue.petal.armor) * PlayerValue.petal.armorMulti;
    } else if (role === "pet") {
        object.armor = (object.armor + PlayerValue.pet.armor);
    } else if (role === "target") {
        object.armor = (object.armor + PlayerValue.target.armor) * PlayerValue.target.armorMulti;
    }
  }

  if (typeof object.reload === "number" && (role === "petal" || role === "pet")) {
    object.reload /= Math.max(0.01, PlayerValue.petal.reloadFactor);
  }

  if (typeof object.secondReload === "number" && (role === "petal" || role === "pet")) {
    object.secondReload /= Math.max(0.01, PlayerValue.petal.secondReloadFactor);
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

      if (typeof effect.duration === "number" && (role === "petal" || role === "pet")) {
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