import petals from "../public/data/petals.json";

import { PlayerValue } from "./PlayerValue";

export function getPetalStats(name: string, tier: number) {
  const key = Object.keys(petals).find(p => p.toLowerCase() === name.toLowerCase());
  if (!key) return null;

  const petal = structuredClone(petals[key as keyof typeof petals]) as any;
  const tierMulti = tier ** 3;

  if (typeof petal.health === "number") petal.health *= tierMulti * PlayerValue.petal.healthMulti;
  if (typeof petal.damage === "number") petal.damage *= tierMulti * PlayerValue.petal.damageMulti;
  if (typeof petal.armor === "number") petal.armor = (petal.armor + PlayerValue.petal.armor) * PlayerValue.petal.armorMulti * tierMulti;
  if (typeof petal.reload === "number") petal.reload *= PlayerValue.petal.reloadFactor;
  if (typeof petal.secondReload === "number") petal.secondReload *= PlayerValue.petal.secondReloadFactor;

  if (Array.isArray(petal.effects)) {
    for (const effect of petal.effects) {
      if (typeof effect.value === "number") effect.value *= tierMulti;

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

  return petal;
}