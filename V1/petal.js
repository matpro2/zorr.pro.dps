const petals = [
    { name: "Coconut", stack: true, entity: 1, reload: 5.0, health: 10000, damage: 2500, armor: 0,
        specials: [
            { type: "finalDamage"}
        ]
     },
    { name: "Joystick", stack: true, entity: 1, reload: 0.9, health: 5, damage: 400, armor: -1,
        specials: [
            { type: "joyStick"}
        ]
    },
    { name: "Basic", stack: true, entity: 1, reload: 1.0, health: 10, damage: 10, armor: 0 },
    { name: "Neurotoxin", stack: false, entity: 1, reload: 2.0, health: 10, damage: 10, armor: 0,
        specials: [
            { type: "mobDamageFactor", global: true, value: { 0: 10, 1: 15, 2: 20, 3: 25, 4: 30, 5: 35, 6: 40, 7: 45, 8: 60, 9: 75 } }
        ]
    },
    { name: "Bitcoin", stack: true, entity: 1, reload: 1.0, health: 15, damage: 40, armor: 2 },
    { name: "Bone", stack: true, entity: 1, reload: 1.0, health: 1, damage: 50, armor: 13 },
    { name: "Clover", stack: true, entity: 1, reload: 2.5, health: 10, damage: 10, armor: 0,
        specials: [
            { type: "Luck", global: true, value: { 0: 0.1, 1: 0.2, 2: 0.3, 3: 0.4, 4: 0.5, 5: 0.6, 6: 0.7, 7: 0.8, 8: 1.3, 9: 1.8 } }
        ]
    },
    { 
        name: "Comb", stack: true, 
        entity: 1, reload: 3, health: 5, damage: 25, armor: 0, 
        specials: [
            { type: "Poison", duration: 5, damage: 125, stack: false },
            { type: "Fire", duration: 3, damage: 50, stack: false }
        ]
    },
    { name: "DNA", stack: false, specials: [{ type: "petMutation", global: true, tierRestricted: true, stats: "tier", affectedByClover: true, chance: 0.5 }] },
    { name: "DVD", stack: true, entity: 1, reload: 1, health: 300, damage: 5, armor: 5, specials: [{ type: "Fire", duration: 3, damage: 20, stack: true }] },
    { name: "Dice", stack: true, entity: 1, reload: 1.0, health: 10, damage: 40, armor: 0, special: { type: "Critical", value: { chance: 8, multiplier: 69 } } },
    { name: "Dizzy", stack: false, specials: [{ type: "Boost", global: true, tierRestricted: true, target: "Petal", stats: "Damage", value: { 0: 4, 1: 5, 2: 6, 3: 7, 4: 10, 5: 16, 6: 23, 7: 35, 8: 60, 9: 100 } }] },
    { name: "Dollar", stack: true, entity: 1, reload: 1.0, health: 10, damage: 30, armor: 0 },
    { name: "Elemental", stack: true, entity: 1, reload: 0.5, health: 30, damage: 135, armor: 3, specials: [{ type: "Heal", regen: 4 }, { type: "Shield", regen: 2.5 }, { type: "Poison", duration: 5, damage: 10, stack: true }, { type: "Fire", duration: 3, damage: 7, stack: true }, { type: "Magic", regen: 4 }] },
    { name: "Fang", stack: true, entity: 1, reload: 1.0, health: 10, damage: 15, armor: 0, special: { type: "Heal", onDamage: 8.5 } },
    { name: "Fission", stack: true, tierRestricted: true },
    { name: "Fusion", stack: true, tierRestricted: true },
    { name: "Root", stack: false },
    { name: "Glass", stack: true, entity: 1, reload: 1.0, health: 69420, damage: 120, armor: 69420, special: { type: "damageSeconds" } },
    { name: "Golden Cactus", stack: false, entity: 1, reload: 2.5, health: 5, damage: 50, armor: 0, specials: [{ type: "petalHealthBuff", global: true, value: { 0: 1, 1: 2, 2: 3, 3: 5, 4: 8, 5: 13, 6: 21, 7: 34, 8: 55, 9: 89 } }] },
    { name: "Golden Palm Leaf", stack: true, entity: 1, reload: 1.5, health: 20, damage: 20, armor: 0, specials: [{ type: "secondaryReloadFactor", global: true, value: { 0: 1.5, 1: 2.25, 2: 3, 3: 4.5, 4: 6, 5: 7.5, 6: 10, 7: 20, 8: 35, 9: 75 } }] },
    { name: "Golden Leaf", stack: true, entity: 1, reload: 1, health: 20, damage: 20, armor: 0, specials: [{ type: "reloadFactor", global: true, value: { 0: 4, 1: 6.5, 2: 9, 3: 11.5, 4: 14, 5: 16.5, 6: 19, 7: 21.5, 8: 29, 9: 36.5 } }] },
    { name: "Quartz", stack: false, entity: 1, specials: [{ type: "petalReloadSkipRate", global: true, tierRestricted: true, value: 20 }] },
    { name: "Heavy", stack: true, entity: 1, reload: 7.0, health: 1000, damage: 35, armor: 1 },
    { name: "Horn", stack: false, specials: [{ type: "Boost", global: true, tierRestricted: true, target: "Pet", stats: "Damage", value: { 0: 7.5, 1: 8.45, 2: 11.3, 3: 16.05, 4: 22.7, 5: 31.25, 6: 41.7, 7: 54.05, 8: 68.3, 9: 84.85 } }] },
    { name: "Iris", stack: true, entity: 1, reload: 2.0, health: 5, damage: 5, armor: 0, special: { type: "Poison", duration: 3, damage: 40, stack: false } },
    { name: "Latrine", isSpill: true, stack: true, entity: 1, reload: 2, secondReload: 1, specials: [{ type: "Poison", duration: 3, damage: 5, stack: true }] },
    { name: "Hot Water", isSpill: true, stack: true, entity: 1, reload: 3, secondReload: 1, damage: 15, specials: [{ type: "Fire", duration: 3, damage: 35, stack: false }] },
    { name: "Leaf", stack: true, entity: 1, reload: 1.0, health: 12, damage: 15, armor: 0, special: { type: "Heal", regen: 2 } },
    { name: "Chromosome", stack: true, entity: 1, reload: 1.0, health: 5, damage: 10, armor: 0, special: { type: "petalHeal", global:true, regen: 50 } },
    { name: "Magic Leaf", stack: true, entity: 1, reload: 1.0, health: 12, damage: 15, armor: 0, special: { type: "Magic", regen: 4 } },
    { name: "Magic Yuan", stack: true, entity: 1, reload: 0.75, health: 15, damage: 35, armor: 0, special: { type: "Magic", cost: 0.4 } },
    { name: "Magic Topaz", stack: true, entity: 1, reload: 0.75, health: 6, damage: 6, armor: 0, special: { type: "Magic", drain: 2, petArmor: 3.5 } },
    { name: "Mimic", stack: true, tierRestricted:false },
    { name: "Opal", stack: false, specials: [{ type: "Critical", global: true, tierRestricted: true, target: "Petal", stats: "Damage", value: { 0: {multiplier: 1.5, chance: 8.33}, 1: {multiplier: 1.69, chance: 9.09}, 2: {multiplier: 1.88, chance: 10}, 3: {multiplier: 2.06, chance: 11.11}, 4: {multiplier: 2.25, chance: 12.5}, 5: {multiplier: 2.44, chance: 14.29}, 6: {multiplier: 2.63, chance: 16.67}, 7: {multiplier: 2.81, chance: 20}, 8: {multiplier: 3, chance: 25}, 9: {multiplier: 3.19, chance: 33.33} } }] },
    { name: "Plasma", stack: true, entity: 1, reload: 3, health: 5, damage: 5, armor: 0, specials: [{ type: "Poison", duration: 5, damage: 100, stack: false }, { type: "Lightning", bounce: { 0: 3, 1: 3, 2: 4, 3: 4, 4: 5, 5: 5, 6: 6, 7: 6, 8: 7, 9: 7 }, damage: 40, multiHit: true }, { type: "Fire", duration: 3, damage: 100, stack: false }] },
    { name: "Rock", stack: true, entity: 1, reload: 2.0, health: 250, damage: 30, armor: 0 },
    { name: "Rose", stack: true, entity: 1, reload: 1.0, secondReload: 0.5, health: 12, damage: 15, armor: 0, special: { type: "Heal", value: 10 } },
    { name: "Sad", stack: true, entity: 1, reload: 4.0, health: 250, damage: 250, armor: 5 },
    { name: "Sand", stack: true, entity: { 0: 4, 1: 4, 2: 4, 3: 5, 4: 5, 5: 5, 6: 6, 7: 6, 8: 6, 9: 7 }, reload: 0.8, health: 1, damage: 80, armor: -1 },
    { name: "Trident", stack: true, entity: 1, reload: 3.75, health: 15, damage: 1000, armor: 5 },
    { name: "Wing", stack: true, entity: 1, reload: 1.0, health: 10, damage: 45, armor: 3 },
    { name: "Yuan", stack: true, entity: 1, reload: 1.0, health: 10, damage: 20, armor: 0 },
    { name: "Zodiac", stack: true, entity: 1, reload: 2.0, health: 100, damage: 200, armor: 5, specials: [{ type: "reloadFactor", global: true, value: { 0: -5, 1: -6.8, 2: -8.6, 3: -10.4, 4: -12.2, 5: -14, 6: -15.8, 7: -17.6, 8: -19.4, 9: -21.2 } }, { type: "Fire", duration: 3, damage: 150, stack: false }] }
];