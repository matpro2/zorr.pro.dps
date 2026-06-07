import { getEffectiveBuild } from "./inventory";
import { getObject } from "./GetObject";

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

export const TALENTS_DEF: Record<string, { label: string, step: number, isMulti: boolean, basePrice: number | number[], maxLevel: number, requires?: { id: string, lvl: number } }> = {
    "player.healMulti": { label: "Player Heal Multi", step: 0.1, isMulti: true, basePrice: 1, maxLevel: 6 },
    "player.manaGenerationMulti": { label: "Player Mana Gen Multi", step: 0.1, isMulti: true, basePrice: 1, maxLevel: 3, requires: { id: "player.healMulti", lvl: 3 } },
    "petal.damageMulti": { label: "Petal Damage Multi", step: 0.03, isMulti: true, basePrice: 1, maxLevel: 7 },
    "petal.reloadFactor": { label: "Petal Reload Speed", step: 0.03, isMulti: true, basePrice: 1, maxLevel: 7 },
    "petal.secondReloadFactor": { label: "Petal Second Reload Speed", step: 0.075, isMulti: true, basePrice: [39, 24], maxLevel: 2, requires: { id: "petal.reloadFactor", lvl: 5 } },
    "petal.luck": { label: "Petal Luck", step: 0.0045, isMulti: false, basePrice: 1, maxLevel: 5 },
    "petal.healthMulti": { label: "Petal Health Multi", step: 0.05, isMulti: true, basePrice: 1, maxLevel: 5 },
    "pet.healthMulti": { label: "Pet Health Multi", step: 0.03, isMulti: true, basePrice: 1, maxLevel: 5 },
    "pet.damageMulti": { label: "Pet Damage Multi", step: 0.03, isMulti: true, basePrice: 1, maxLevel: 5 }
};

const loadTalents = () => {
    const raw = JSON.parse(localStorage.getItem("zorr_talents") || "{}");
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
  level: Number(localStorage.getItem("zorr_player_level")) || 45,
  talents: loadTalents(),
  
  setLevel(lvl: number) {
      if(!isNaN(lvl)) {
          this.level = lvl;
          localStorage.setItem("zorr_player_level", lvl.toString());
      }
  },

  setTalent(id: string, lvl: number) {
      const def = TALENTS_DEF[id];
      if (def && !isNaN(lvl)) {
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

  // NOUVEAU : Récupère TOUTES les statistiques du jeu pour remplir le menu déroulant
  getAllStatKeys() {
    const state = getInitialState();
    const keys: { id: string, label: string }[] = [];
    
    for (const [category, stats] of Object.entries(state)) {
        for (const stat of Object.keys(stats)) {
            if (stat === 'hasJoystick') continue;
            
            // Formatage propre du nom (ex: "petal.damageMulti" -> "Petal Damage Multi")
            let formattedStat = stat.replace(/([A-Z])/g, ' $1');
            formattedStat = formattedStat.charAt(0).toUpperCase() + formattedStat.slice(1);
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            
            keys.push({ id: `${category}.${stat}`, label: `${categoryName} ${formattedStat.trim()}` });
        }
    }
    // Tri alphabétique pour faciliter la recherche
    return keys.sort((a, b) => a.label.localeCompare(b.label));
  }
};