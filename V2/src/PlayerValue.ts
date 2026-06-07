import { getEffectiveBuild } from "./inventory";
import { getObject } from "./GetObject";
import { PLAYER_CONFIG, TALENTS_DEF } from "./constants";

const createStat = (op: 'add' | 'multiply' | 'factor' = 'add') => ({
  op,
  boosts: [] as { source: string, value: number, tierReq: number }[]
});

const getInitialState = () => {
  return {
    petal: {
      damageMulti: createStat('multiply'),
      healthMulti: createStat('multiply'),
      armor: createStat('add'),
      armorMulti: createStat('multiply'),
      heal: createStat('add'),
      shield: createStat('add'),
      reloadFactor: createStat('factor'),
      secondReloadFactor: createStat('factor'),
      reloadSkipRate: createStat('add'),
      secondReloadSkipRate: createStat('add'),
      manaCostFactor: createStat('factor'),
      luck: createStat('add'),
      hasJoystick: { active: false, tier: 0 } 
    },
    player: {
      heal: createStat('add'),
      healMulti: createStat('multiply'),
      manaGeneration: createStat('add'),
      manaGenerationMulti: createStat('multiply'),
      manaDrain: createStat('add'),
      shield: createStat('add'),
      armor: createStat('add'),
      armorMulti: createStat('multiply'),
      bodyDamage: createStat('add'),
      bodyDamageMulti: createStat('multiply'),
      evasion: createStat('add'),
      pickRange: createStat('add'),
      extraVision: createStat('add'),
      damageReduction: createStat('add'),
      damageReflection: createStat('add'),
    },
    pet: {
      damageMulti: createStat('multiply'),
      healthMulti: createStat('multiply'),
      size: createStat('multiply'),
      heal: createStat('add'),
      shield: createStat('add'),
      armor: createStat('add'),
      mutation: createStat('add'),
      variantMutation: createStat('add'),
      paranormalRate: createStat('add'),
      fullRegenRate: createStat('add'),
      dupeRate: createStat('add'),
    },
    mob: {
      damageMulti: createStat('multiply'),
      armor: createStat('add'),
      armorMulti: createStat('multiply'),
    },
    status: {
      fireDuration: createStat('add'),
      poisonDuration: createStat('add'),
      lightningBounce: createStat('add'),
      lightningMultiRate: createStat('add'),
    },
    mana: {
      generation: createStat('add'),
      drain: createStat('add'),
      capacityMulti: createStat('multiply'),
    },
  };
};

// --- SANITIZER --- 
// Nettoie les valeurs "NaN" corrompues qui ont pu être sauvegardées dans le navigateur
const loadTalents = () => {
    const raw = JSON.parse(localStorage.getItem(PLAYER_CONFIG.STORAGE_KEYS.TALENTS) || "{}");
    const safe: Record<string, number> = {};
    for (const key in raw) {
        if (typeof raw[key] === "number" && !isNaN(raw[key])) {
            safe[key] = raw[key];
        } else {
            safe[key] = 0;
        }
    }
    return safe;
};

export const PlayerValue = {
  level: Number(localStorage.getItem(PLAYER_CONFIG.STORAGE_KEYS.LEVEL)) || PLAYER_CONFIG.DEFAULT_LEVEL,
  talents: loadTalents(),
  
  setLevel(lvl: number) {
      if(!isNaN(lvl)) {
          this.level = lvl;
          localStorage.setItem(PLAYER_CONFIG.STORAGE_KEYS.LEVEL, lvl.toString());
      }
  },

  setTalent(id: string, lvl: number) {
      const def = TALENTS_DEF[id];
      if (def && !isNaN(lvl)) {
          this.talents[id] = Math.min(Math.max(0, lvl), def.maxLevel);
          localStorage.setItem(PLAYER_CONFIG.STORAGE_KEYS.TALENTS, JSON.stringify(this.talents));
      }
  },

  getMaxSlots() {
      if (this.level < PLAYER_CONFIG.SLOT_LEVEL_THRESHOLD) return PLAYER_CONFIG.BASE_SLOTS;
      return PLAYER_CONFIG.EXTRA_SLOTS_BASE + Math.floor((this.level - PLAYER_CONFIG.SLOT_LEVEL_THRESHOLD) / PLAYER_CONFIG.SLOT_LEVEL_STEP);
  },

  ...getInitialState(),

  reset() {
    const savedLevel = this.level; 
    const savedTalents = this.talents;
    Object.assign(this, getInitialState());
    this.level = savedLevel; 
    this.talents = savedTalents;
  },

  updateFromSlots(customSlots?: (number | null)[], customTalents?: Record<string, number>) {
    this.reset();

    const talentsToUse = customTalents || this.talents;

    for (const [id, def] of Object.entries(TALENTS_DEF)) {
        const lvl = talentsToUse[id] || 0;
        if (lvl > 0 && !isNaN(lvl)) {
            const val = def.isMulti ? 1 + (lvl * def.step) : (lvl * def.step);
            const parts = id.split(".");
            if (parts.length === 2 && (this as any)[parts[0]] && (this as any)[parts[0]][parts[1]]) {
                (this as any)[parts[0]][parts[1]].boosts.push({ 
                    source: "Talents",
                    value: val,
                    tierReq: Infinity
                });
            }
        }
    }

    const effectiveBuild = getEffectiveBuild(customSlots);

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
          
          if (typeof effectValue === "object" && effectValue !== null && typeof effectValue.chance === "number" && typeof effectValue.multiplier === "number") {
            effectValue = 1 + ((effectValue.chance / 100) * (effectValue.multiplier - 1));
          }
          
          const tierReqValue = effect.tierRestricted ? finalStatTier : Infinity;

          if (parts.length === 2) {
            const [category, stat] = parts;
            if ((this as any)[category] && typeof (this as any)[category][stat] !== "undefined") {
               (this as any)[category][stat].boosts.push({ 
                  source: finalName,
                  value: effectValue,
                  tierReq: tierReqValue
               });
            }
          } else if (parts.length === 3) {
            const [category, sub, stat] = parts;
            if ((this as any)[category] && (this as any)[category][sub] && typeof (this as any)[category][sub][stat] !== "undefined") {
               (this as any)[category][sub][stat].boosts.push({ 
                  source: finalName,
                  value: effectValue,
                  tierReq: tierReqValue
               });
            }
          }
        }
      }
    }
  },
};