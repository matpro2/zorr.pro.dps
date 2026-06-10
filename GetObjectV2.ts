import { allData } from "./V2/src/data";
import { PlayerValue } from "./V2/src/PlayerValue";
import { TIERS } from "./V2/src/constants";


const SIMPLE_STATS: Record<string, string[]> = {
  health: ["healthMulti"],
  damage: ["damageMulti"],
  armor:  ["armor", "armorMulti"],
};

// ─── Cas particuliers post-calcul ────────────────────────────────────────────

function applySpecialCases(object: any, isPet: boolean): void {
  if (typeof object.damage === "number") {
    if (isPet && object.spectrum === true) object.damage *= 10;
    if (isPet && object.bubble   === true) object.damage *= 100;

    if (Array.isArray(object.effects)) {
      for (const effect of object.effects) {
        if (effect.type === "Critical" && effect.value) {
          const critChance     = (effect.value.chance || 0) / 100;
          const critMultiplier = effect.value.multiplier || 1;
          if (critChance > 0) object.damage *= (1 - critChance) + critChance * critMultiplier;
          break;
        }
      }
    }
  }

  if (typeof object.reload === "number") {
    if (object.name?.toLowerCase() === "flower") object.reload = 10;
  }

  if (object.type === "egg" && object.name?.toLowerCase().includes("centipede")) {
    object.entity = (object.entity || 1) * 6.5;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveTiers(data: any, tier: number, keyName?: string): any {
  if (data === null || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    if (data.length === 0) return data;
    if (keyName === "effects") return data.map(item => resolveTiers(item, tier));
    return resolveTiers(data[Math.min(tier, data.length - 1)], tier);
  }

  const resolved: any = {};
  for (const key in data) resolved[key] = resolveTiers(data[key], tier, key);
  return resolved;
}

function getMobHpMultiplier(tier: number): number {
  const factors = [3.75, 3.6, 4, 7.5, 6, 15, 12, 15];
  let mult = 1;
  for (let i = 0; i < tier; i++) mult *= (factors[i] || 1);
  return mult;
}

function getApplicableStat(
  statData: { op: string; boosts: { source?: string; tierReq: number; value: number }[] } | undefined,
  currentTier: number,
  baseValue: number
): number {
  let value = baseValue;

  if (statData && Array.isArray(statData.boosts)) {
    for (const mod of statData.boosts) {
      if (mod.tierReq >= currentTier && typeof mod.value === "number" && !isNaN(mod.value)) {
        if      (statData.op === "factor")   value *= mod.source === "Talents" ? mod.value : Math.max(0.01, 1 + mod.value / 100);
        else if (statData.op === "multiply") value *= mod.value;
        else                                 value += mod.value;
      }
    }
  }

  return isNaN(value) ? baseValue : value;
}

// ─── Export principal ─────────────────────────────────────────────────────────

export function getObject(name: string, tier: number, forcePet: boolean = false) {
  const key = Object.keys(allData).find(p => p.toLowerCase() === name.toLowerCase());
  if (!key) return null;

  const rawObject = allData[key];
  const object    = resolveTiers(rawObject, tier);
  const tierMulti = 3 ** tier;

  // ── Egg ───────────────────────────────────────────────────────────────────
  if (object.type === "egg") {
    if (typeof object.entity === "object" && object.entity !== null) {
      const base  = object.entity.base  || 1;
      const multi = object.entity.multi || 1;
      object.entity = tier >= 8 ? Math.round(base * multi) : base;
    }

    if (typeof object.petTier === "object" && object.petTier !== null) {
      let gap = object.petTier.gap;
      if (typeof gap === "string") {
        const idx = TIERS.findIndex(t => t.Name.toLowerCase() === gap.toLowerCase());
        if (idx !== -1) gap = idx;
      }
      object.petTier = (gap !== undefined && typeof gap === "number")
        ? (tier <= gap ? tier : tier - 1)
        : tier;
    }
  }

  const isPet = forcePet || object.object === "pet";
  const isMob = !forcePet && object.object === "mob";
  const pv    = PlayerValue as any;
  const type  = isPet ? "pet" : isMob ? "mob" : object.object; 

  // ── Stats simples (health, damage, armor) ────────────────────────────────
  for (const [stat, boostKeys] of Object.entries(SIMPLE_STATS)) {
    if (typeof object[stat] !== "number") continue;

    if (!Array.isArray(rawObject[stat])) {
      object[stat] *= stat === "health" && (isPet || isMob)
        ? getMobHpMultiplier(tier)
        : tierMulti;
    }

    for (const boostKey of boostKeys) {
      const boostStat = pv[type]?.[boostKey];
      if (!boostStat) continue;

      if (boostStat.op === "multiply" || boostStat.op === "factor") {
        object[stat] *= getApplicableStat(boostStat, tier, 1);
      } else {
        object[stat] += getApplicableStat(boostStat, tier, 0);
      }
    }
  }

  // ── Reload ────────────────────────────────────────────────────────────────
  if (typeof object.reload === "number" && (object.object === "petal" || isPet)) {
    object.reload /= Math.max(0.01, getApplicableStat(PlayerValue.petal.reloadFactor, tier, 1));
    object.reload *= Math.max(0, 1 - getApplicableStat(PlayerValue.petal.reloadSkipRate, tier, 0) / 100);
  }

  // ── Second reload ─────────────────────────────────────────────────────────
  if (typeof object.secondReload === "number" && (object.object === "petal" || isPet)) {
    object.secondReload /= Math.max(0.01, getApplicableStat(PlayerValue.petal.secondReloadFactor, tier, 1));
    object.secondReload *= Math.max(0, 1 - getApplicableStat(PlayerValue.petal.secondReloadSkipRate, tier, 0) / 100);
  }

  // ── Effects ───────────────────────────────────────────────────────────────
  if (Array.isArray(object.effects) && Array.isArray(rawObject.effects)) {
    for (let i = 0; i < object.effects.length; i++) {
      const effect    = object.effects[i];
      const rawEffect = rawObject.effects[i];

      if (typeof effect.value === "number" && !Array.isArray(rawEffect.value) && rawEffect.scale !== false) {
        effect.value *= tierMulti;
      }

      if (typeof effect.duration === "number" && (object.object === "petal" || isPet)) {
        if (effect.type === "Poison") effect.duration += getApplicableStat(PlayerValue.status.poisonDuration, tier, 0);
        if (effect.type === "Fire")   effect.duration += getApplicableStat(PlayerValue.status.fireDuration,   tier, 0);
      }
    }
  }

  // ── Cas particuliers ──────────────────────────────────────────────────────
  applySpecialCases(object, isPet);

  return object;
}