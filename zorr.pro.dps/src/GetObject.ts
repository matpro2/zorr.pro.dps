import petals from "../src/data/petals.json";
import mobs from "../src/data/mobs.json";
import spills from "../src/data/spills.json";
import eggs from "../src/data/eggs.json";
import utilities from "../src/data/utilities.json";

import { PlayerValue } from "./PlayerValue";

const allData: Record<string, any> = {
  ...petals,
  ...mobs,
  ...spills,
  ...eggs,
  ...utilities
};

// On ajoute un paramètre optionnel "keyName" pour savoir quelle clé on analyse
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

export function getObject(name: string, tier: number) {
  const key = Object.keys(allData).find(p => p.toLowerCase() === name.toLowerCase());

  if (!key) return null;

  const rawObject = allData[key];
  const object = resolveTiers(rawObject, tier);

  const tierMulti = tier ** 3;

  if (typeof object.health === "number") {
    const applyTierMulti = Array.isArray(rawObject.health) ? 1 : tierMulti;
    object.health *= applyTierMulti * PlayerValue.petal.healthMulti;
  }
  
  if (typeof object.damage === "number") {
    const applyTierMulti = Array.isArray(rawObject.damage) ? 1 : tierMulti;
    object.damage *= applyTierMulti * PlayerValue.petal.damageMulti;
  }
  
  if (typeof object.armor === "number") {
    const applyTierMulti = Array.isArray(rawObject.armor) ? 1 : tierMulti;
    object.armor = (object.armor + PlayerValue.petal.armor) * PlayerValue.petal.armorMulti * applyTierMulti;
  }

  if (Array.isArray(object.effects) && Array.isArray(rawObject.effects)) {
    for (let i = 0; i < object.effects.length; i++) {
      const effect = object.effects[i];
      const rawEffect = rawObject.effects[i];
      
      if (typeof effect.value === "number") {
         if (!Array.isArray(rawEffect.value)) {
           effect.value *= tierMulti;
         }
      }

      if (typeof effect.duration === "number") {
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

  return object;
}