import { getEffectiveBuild } from "./inventory";
import { getObject } from "./GetObject";

const getInitialState = () => {
  const createEmptyArray = () => [] as { source: string, value: number, tierReq: number }[];
  return {
    petal: {
      damageMulti: createEmptyArray(),
      healthMulti: createEmptyArray(),
      armor: createEmptyArray(),
      armorMulti: createEmptyArray(),
      heal: createEmptyArray(),
      shield: createEmptyArray(),
      reloadFactor: createEmptyArray(),
      secondReloadFactor: createEmptyArray(),
      reloadSkipRate: createEmptyArray(),
      secondReloadSkipRate: createEmptyArray(),
      manaCostFactor: createEmptyArray(),
      luck: createEmptyArray(),
      hasJoystick: { active: false, tier: 0 } 
    },
    player: {
      heal: createEmptyArray(),
      healMulti: createEmptyArray(),
      manaGeneration: createEmptyArray(),
      manaGenerationMulti: createEmptyArray(),
      manaDrain: createEmptyArray(),
      shield: createEmptyArray(),
      armor: createEmptyArray(),
      armorMulti: createEmptyArray(),
      bodyDamage: createEmptyArray(),
      bodyDamageMulti: createEmptyArray(),
      evasion: createEmptyArray(),
      damageReduction: createEmptyArray(),
      damageReflection: createEmptyArray(),
    },
    pet: {
      damageMulti: createEmptyArray(),
      healthMulti: createEmptyArray(),
      heal: createEmptyArray(),
      shield: createEmptyArray(),
      armor: createEmptyArray(),
      mutation: createEmptyArray(),
      variantMutation: createEmptyArray(),
      paranormalRate: createEmptyArray(),
      fullRegenRate: createEmptyArray(),
      dupeRate: createEmptyArray(),
    },
    mob: {
      damageMulti: createEmptyArray(),
      armor: createEmptyArray(),
      armorMulti: createEmptyArray(),
    },
    status: {
      fireDuration: createEmptyArray(),
      poisonDuration: createEmptyArray(),
      lightningBounce: createEmptyArray(),
      lightningMultiRate: createEmptyArray(),
    },
    mana: {
      generation: createEmptyArray(),
      drain: createEmptyArray(),
      capacityMulti: createEmptyArray(),
    },
  };
};

export const TALENTS_DEF: Record<string, { label: string, step: number, isMulti: boolean, basePrice: number, maxLevel: number, requires?: { id: string, lvl: number } }> = {
    "player.healMulti": { label: "Player Heal Multi", step: 0.1, isMulti: true, basePrice: 1, maxLevel: 50 },
    "player.manaGenerationMulti": { label: "Player Mana Gen Multi", step: 0.1, isMulti: true, basePrice: 1, maxLevel: 50, requires: { id: "player.healMulti", lvl: 3 } },
    "petal.damageMulti": { label: "Petal Damage Multi", step: 0.03, isMulti: true, basePrice: 1, maxLevel: 50 },
    "petal.reloadFactor": { label: "Petal Reload Speed", step: 0.03, isMulti: true, basePrice: 1, maxLevel: 50 },
    "petal.luck": { label: "Petal Luck", step: 0.0045, isMulti: false, basePrice: 1, maxLevel: 50 },
    "petal.healthMulti": { label: "Petal Health Multi", step: 0.05, isMulti: true, basePrice: 1, maxLevel: 50 },
    "pet.healthMulti": { label: "Pet Health Multi", step: 0.03, isMulti: true, basePrice: 1, maxLevel: 50 },
    "pet.damageMulti": { label: "Pet Damage Multi", step: 0.03, isMulti: true, basePrice: 1, maxLevel: 50 }
};

export const PlayerValue = {
  level: Number(localStorage.getItem("zorr_player_level")) || 45,
  talents: JSON.parse(localStorage.getItem("zorr_talents") || "{}") as Record<string, number>,
  
  setLevel(lvl: number) {
      this.level = lvl;
      localStorage.setItem("zorr_player_level", lvl.toString());
  },

  setTalent(id: string, lvl: number) {
      const def = TALENTS_DEF[id];
      if (def) {
          this.talents[id] = Math.min(Math.max(0, lvl), def.maxLevel);
          localStorage.setItem("zorr_talents", JSON.stringify(this.talents));
      }
  },
  
  getMaxSlots() {
      if (this.level < 15) return 5;
      return 6 + Math.floor((this.level - 15) / 20);
  },

  ...getInitialState(),

  reset() {
    const savedLevel = this.level; 
    const savedTalents = this.talents;
    Object.assign(this, getInitialState());
    this.level = savedLevel; 
    this.talents = savedTalents;
  },

  updateFromSlots() {
    this.reset();

    for (const [id, def] of Object.entries(TALENTS_DEF)) {
        const lvl = this.talents[id] || 0;
        if (lvl > 0) {
            const val = def.isMulti ? 1 + (lvl * def.step) : (lvl * def.step);
            const parts = id.split(".");
            if (parts.length === 2 && (this as any)[parts[0]] && (this as any)[parts[0]][parts[1]]) {
                (this as any)[parts[0]][parts[1]].push({
                    source: "Talents",
                    value: val,
                    tierReq: Infinity
                });
            }
        }
    }

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
          
          if (typeof effectValue === "object" && effectValue !== null && typeof effectValue.chance === "number" && typeof effectValue.multiplier === "number") {
            effectValue = 1 + ((effectValue.chance / 100) * (effectValue.multiplier - 1));
          }
          
          const tierReqValue = effect.tierRestricted ? finalStatTier : Infinity;

          if (parts.length === 2) {
            const [category, stat] = parts;
            if ((this as any)[category] && typeof (this as any)[category][stat] !== "undefined") {
               (this as any)[category][stat].push({
                  source: finalName,
                  value: effectValue,
                  tierReq: tierReqValue
               });
            }
          } else if (parts.length === 3) {
            const [category, sub, stat] = parts;
            if ((this as any)[category] && (this as any)[category][sub] && typeof (this as any)[category][sub][stat] !== "undefined") {
               (this as any)[category][sub][stat].push({
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