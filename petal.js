const petals = [
    { name: "Basic", entity: 1, reload: 1.0, health: 10, damage: 10, armor: 0 },
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
        name: "Dice", 
        entity: 1, reload: 1.0, health: 10, damage: 40, armor: 0, 
        special: { type: "luckMultiplier", chance: 0.08, multiplier: 69 }
    },
    { 
        name: "Dizzy", 
        stack: false,
        specials: [
            { 
                type: "Boost", 
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
                stats: "Damage", 
                value: {
                    0: {boost: 1.5, chance: 8.33},
                    1: {boost: 1.69, chance: 9.09},
                    2: {boost: 1.88, chance: 10},
                    3: {boost: 2.06, chance: 11.11},
                    4: {boost: 2.25, chance: 12.5},
                    5: {boost: 2.44, chance: 14.29},
                    6: {boost: 2.63, chance: 16.67},
                    7: {boost: 2.81, chance: 20},
                    8: {boost: 3, chance: 25},
                    9: {boost: 3.19, chance: 33.33} 
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
    { name: "Yuan", entity: 1, reload: 1.0, health: 10, damage: 20, armor: 0 },
    { name: "Zodiac", entity: 1, reload: 2.0, health: 100, damage: 200, armor: 5 }
];