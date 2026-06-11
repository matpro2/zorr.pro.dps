// constants.ts

export const TIERS = [
    { "Name": "Common",    "Background": "#7eef6d", "Border": "#65bf57" }, // 0
    { "Name": "Unusual",   "Background": "#ffe65d", "Border": "#ccb84a" }, // 1
    { "Name": "Rare",      "Background": "#4d52e3", "Border": "#3e42b6" }, // 2
    { "Name": "Epic",      "Background": "#861fde", "Border": "#6b19b2" }, // 3
    { "Name": "Legendary", "Background": "#de1f1f", "Border": "#b21919" }, // 4
    { "Name": "Mythic",    "Background": "#1fdbde", "Border": "#19afb2" }, // 5
    { "Name": "Ultra",     "Background": "#ff2b75", "Border": "#cc225e" }, // 6
    { "Name": "Super",     "Background": "#2bffa3", "Border": "#22cc82" }, // 7
    { "Name": "Omega",     "Background": "#f329d9", "Border": "#c221ae" }, // 8
    { "Name": "Unique",    "Background": "#444444", "Border": "#363636" }  // 9
];

export const GENERAL_COLORS = [
    { 1: "#f65555"},
    { 2: "#4cb1de"},
    { 3: "#f2b853"},
    { 4: "#555df6"},
    { 5: "#c7f153"},
    { 6: "#a950e9"},
    { 7: "#60ea50"},
    { 8: "#ec51cb"},
    { 9: "#52efa6"},
    { 10: "#ed526a"},
    { 11: "#51d2ec"},
];

export const PLAYER_CONFIG = {
  DEFAULT_LEVEL: 0,
  BASE_SLOTS: 5,
  EXTRA_SLOTS_BASE: 6,
  SLOT_LEVEL_THRESHOLD: 5,
  SLOT_LEVEL_STEP: 30,

  STORAGE_KEYS: {
    LEVEL: "zorr_player_level",
    TALENTS: "zorr_talents",
  }
} as const;

export const TALENTS_DEF: Record<string, { label: string, step: number, isMulti: boolean, basePrice: number | number[], maxLevel: number, requires?: { id: string, lvl: number } }> = {
    "player.healthMulti":         { label: "Health",         step: 0.8,    isMulti: true,  basePrice: 4,        maxLevel: 6 },
    "player.healMulti":         { label: "Medic",         step: 0.1,    isMulti: true,  basePrice: 4,        maxLevel: 6 },
    "player.manaGenerationMulti":{ label: "Wizard",    step: 0.1,    isMulti: true,  basePrice: [16,20,24],maxLevel: 3, requires: { id: "player.healMulti", lvl: 3 } },
    "player.extraVision":       { label: "Vision",                    step: 0.15,   isMulti: true,  basePrice: 3,        maxLevel: 5 },
    "player.extraSpillRange":       { label: "Laminer",                    step: 0.06,   isMulti: true,  basePrice: 6,        maxLevel: 5 },
    "player.pickRange":         { label: "Magnetism",                      step: 100,    isMulti: false, basePrice: 4,        maxLevel: 5 },
    "player.poisonMulti":         { label: "Toxicity",                      step: 0.075,    isMulti: true, basePrice: [35,40], maxLevel: 2, requires: { id: "petal.damageMulti", lvl: 5 }  },
    "player.fireMulti":         { label: "BURN!",                      step: 0.075,    isMulti: true, basePrice: [35,40], maxLevel: 2, requires: { id: "petal.damageMulti", lvl: 5 }  },
    "player.lightningMulti":         { label: "Thunder",                      step: 0.075,    isMulti: true, basePrice: [35,40], maxLevel: 2, requires: { id: "petal.damageMulti", lvl: 5 }  },

    
    "petal.damageMulti":        { label: "Penetration",        step: 0.03,   isMulti: true,  basePrice: [5,10,15,25,30,35,40],        maxLevel: 7 },
    "petal.reloadFactor":       { label: "Reload",        step: 0.03,   isMulti: true,  basePrice: 3,        maxLevel: 7 },
    "petal.secondReloadFactor": { label: "Secondary Reload", step: 0.075,  isMulti: true,  basePrice: [39,24],  maxLevel: 2, requires: { id: "petal.reloadFactor", lvl: 5 } },
    "petal.luck":               { label: "Luck",                step: 0.45, isMulti: false, basePrice: 4,        maxLevel: 5 },
    "petal.healthMulti":        { label: "Petal Health",        step: 0.05,   isMulti: true,  basePrice: 4,        maxLevel: 5 },
    "pet.healthMulti":          { label: "Pet Health",          step: 0.03,   isMulti: true,  basePrice: 5,        maxLevel: 5 },
    "pet.damageMulti":          { label: "Pet Damage",          step: 0.03,   isMulti: true,  basePrice: 5,        maxLevel: 5 }
};