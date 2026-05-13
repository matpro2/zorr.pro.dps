const petals = [
    { name: "Basic", entity: 1, reload: 1.0, health: 10, damage: 10, armor: 0 },
    { name: "Bitcoin", entity: 1, reload: 1.0, health: 15, damage: 40, armor: 2 },
    { name: "Bone", entity: 1, reload: 1.0, health: 1, damage: 50, armor: 13 },
    { name: "Clover", entity: 1, reload: 2.5, health: 10, damage: 10, armor: 0 },
    { 
        name: "Dice", 
        entity: 1,
        reload: 1.0, 
        health: 10, 
        damage: 40, 
        armor: 0, 
        special: { type: "luckMultiplier", chance: 0.08, multiplier: 69 }
    },
    { name: "Dollar", entity: 1, reload: 1.0, health: 10, damage: 30, armor: 0 },
    { 
        name: "Glass", 
        entity: 1, 
        reload: 1.0,  
        health: 69420, 
        damage: 120, 
        armor: 69420,
        special: { type: "damageSeconds" }
     },
    { name: "Heavy", entity: 1, reload: 7.0, health: 1000, damage: 35, armor: 1 },
    { name: "Iris", entity: 1, reload: 2.0, health: 5, damage: 5, armor: 0,
        special: { type: "Poison", duration: 3, damage: 40, stack: false }
     },
    { name: "Leaf", entity: 1, reload: 1.0, health: 12, damage: 15, armor: 0,
        
     },
    { name: "Rock", entity: 1, reload: 2.0, health: 250, damage: 30, armor: 0 },
    { name: "Sad", entity: 1, reload: 4.0, health: 250, damage: 250, armor: 5 },
    { 
        name: "Sand", 
        entity: { 0: 4, 1: 4, 2: 4, 3: 5, 4: 5, 5: 5, 6: 6, 7: 6, 8: 6, 9: 7 }, 
        reload: 0.8,  
        health: 1, 
        damage: 80, 
        armor: -1 
    },
    { name: "Trident", entity: 1, reload: 3.75, health: 15, damage: 1000, armor: 5 },
    { name: "Wing", entity: 1, reload: 1.0, health: 10, damage: 45, armor: 3 },
    { name: "Yuan", entity: 1, reload: 1.0, health: 10, damage: 20, armor: 0 },
    { name: "Zodiac", entity: 1, reload: 2.0, health: 100, damage: 200, armor: 5 }
];