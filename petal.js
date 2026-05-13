const petals = [
    { name: "Basic", entity: 1, reload: 1.0, health: 10, damage: 10, armor: 0 },
    { name: "Yin Yang", entity: 1, reload: 1.0, health: 30, damage: 30, armor: 0 },
    { name: "Faster", entity: 1, reload: 1.0, health: 5, damage: 40, armor: 0 },
    { name: "Orb", entity: 1, reload: 2.0, health: 25, damage: 175, armor: 10 },
    { name: "Corn", entity: 1, reload: 10, health: 10000, damage: 10, armor: 0 },
    { name: "Rice", entity: 1, reload: 0.05, health: 1, damage: 20, armor: 0 },
    { name: "Obsidian", entity: 2, reload: 2.0, health: 5, damage: 25, armor: 150 },
    { name: "Bitcoin", entity: 1, reload: 1.0, health: 15, damage: 40, armor: 2 },
    { name: "Bone", entity: 1, reload: 1.0, health: 1, damage: 50, armor: 13 },
    { name: "Clover", entity: 1, reload: 2.5, health: 10, damage: 10, armor: 0 },
    { 
        name: "Comb", 
        entity: 1, reload: 3, health: 5, damage: 25, armor: 0, 
        specials: [
            { type: "Poison", duration: 5, damage: 125, stack: false },
            { type: "Fire", duration: 3, damage: 50, stack: false }
        ]
    },
    { 
        name: "Triangle", 
        entity: 1, reload: 1, health: 75, damage: 50, armor: 8, 
        specials: [
            { type: "Poison", duration: 5, damage: 75, stack: false },
            { type: "Fire", duration: 3, damage: 75, stack: false }
        ]
    },
    { 
        name: "Dice", 
        entity: 1, reload: 1.0, health: 10, damage: 40, armor: 0, 
        special: { type: "Critical", value: { chance: 8, multiplier: 69 } }
    },
    { 
        name: "Dizzy", 
        stack: false,
        specials: [
            { 
                type: "Boost", 
                global: true,
                stats: "Damage", 
                value: { 0: 4, 1: 5, 2: 6, 3: 7, 4: 10, 5: 16, 6: 23, 7: 35, 8: 60, 9: 100 }
            }
        ] 
    },
    { name: "Dollar", entity: 1, reload: 1.0, health: 10, damage: 30, armor: 0 },
    { 
        name: "Glass", 
        entity: 1, reload: 1.0, health: 69420, damage: 120, armor: 69420,
        special: { type: "damageSeconds" }
    },
    { 
        name: "Golden Cactus", stack: false, entity: 1, reload: 2.5, health: 5, damage: 50, armor: 0,
        specials: [
            { type: "petalHealthBuff", 
              global: true,
              value: {
                    0: 1,
                    1: 2,
                    2: 3,
                    3: 5,
                    4: 8,
                    5: 13,
                    6: 21,
                    7: 34,
                    8: 55,
                    9: 89, 
                } 
            },
        ]
    },
    { name: "Heavy", entity: 1, reload: 7.0, health: 1000, damage: 35, armor: 1 },
    { 
        name: "Iris", 
        entity: 1, reload: 2.0, health: 5, damage: 5, armor: 0,
        special: { type: "Poison", duration: 3, damage: 40, stack: false }
    },
    { name: "Leaf", entity: 1, reload: 1.0, health: 12, damage: 15, armor: 0 },
    { 
        name: "Opal", 
        stack: false,
        specials: [
            { 
                type: "Critical", 
                global: true,
                stats: "Damage", 
                value: {
                    0: {multiplier: 1.5, chance: 8.33},
                    1: {multiplier: 1.69, chance: 9.09},
                    2: {multiplier: 1.88, chance: 10},
                    3: {multiplier: 2.06, chance: 11.11},
                    4: {multiplier: 2.25, chance: 12.5},
                    5: {multiplier: 2.44, chance: 14.29},
                    6: {multiplier: 2.63, chance: 16.67},
                    7: {multiplier: 2.81, chance: 20},
                    8: {multiplier: 3, chance: 25},
                    9: {multiplier: 3.19, chance: 33.33} 
                }
            }
        ] 
    },
    { 
        name: "Plasma", 
        entity: 1, reload: 3, health: 5, damage: 5, armor: 0, 
        specials: [
            { type: "Poison", duration: 5, damage: 100, stack: false },
            { 
                type: "Lightning", 
                bounce: { 0: 3, 1: 3, 2: 4, 3: 4, 4: 5, 5: 5, 6: 6, 7: 6, 8: 7, 9: 7 }, 
                damage: 40, multiHit: true 
            },
            { type: "Fire", duration: 3, damage: 100, stack: false }
        ]
    },
    { name: "Rock", entity: 1, reload: 2.0, health: 250, damage: 30, armor: 0 },
    { name: "Sad", entity: 1, reload: 4.0, health: 250, damage: 250, armor: 5 },
    { 
        name: "Sand", 
        entity: { 0: 4, 1: 4, 2: 4, 3: 5, 4: 5, 5: 5, 6: 6, 7: 6, 8: 6, 9: 7 }, 
        reload: 0.8, health: 1, damage: 80, armor: -1 
    },
    { name: "Trident", entity: 1, reload: 3.75, health: 15, damage: 1000, armor: 5 },
    { name: "Wing", entity: 1, reload: 1.0, health: 10, damage: 45, armor: 3 },
    { name: "Amethyst", entity: 1, reload: 20.0, health: 1, damage: 1250, armor: 6 },
    { name: "Yuan", entity: 1, reload: 1.0, health: 10, damage: 20, armor: 0 },
    { name: "Zodiac", entity: 1, reload: 2.0, health: 100, damage: 200, armor: 5,
        specials: [
            { type: "reloadFactor", 
              global: true,
              value: {
                    0: -5,
                    1: -6.8,
                    2: -8.6,
                    3: -10.4,
                    4: -12.2,
                    5: -14,
                    6: -15.8,
                    7: -17.6,
                    8: -19.4,
                    9: -21.2, 
                } 
            },
            { type: "Fire", duration: 3, damage: 150, stack: false },
        ]
    },
    { name: "Golden Leaf", entity: 1, reload: 1.0, health: 24, damage: 24, armor: 0,
        specials: [
            { type: "reloadFactor", 
              global: true,
              value: {
                    0: 4,
                    1: 6.5,
                    2: 9,
                    3: 11.5,
                    4: 14,
                    5: 16.5,
                    6: 19,
                    7: 21.5,
                    8: 29,
                    9: 36.5, 
                } 
            },
        ]
    },
];