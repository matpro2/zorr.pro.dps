const petals = [
    { name: "Basic", reload: 1.0,  health: 10, damage: 10, armor: 0, },
    { name: "Leaf", reload: 1.0,  health: 12, damage: 15, armor: 0, },
    { name: "Trident", reload: 3.75,  health: 15, damage: 1000, armor: 5, },
    { name: "Zodiac", reload: 2.0,  health: 100, damage: 200, armor: 5, },
    {name: "Dice",
        reload: 1.0,
        health: 10,
        damage: 40,
        armor: 0, 
        special: {
            type: "luckMultiplier",
            chance: 0.08,
            multiplier: 69
        }},
    { name: "Heavy", reload: 7.0,  health: 1000, damage: 35, armor: 1, },
    { name: "Rock", reload: 2.0,  health: 250, damage: 30, armor: 0, },
    { name: "Dollar", reload: 1.0,  health: 10, damage: 30, armor: 0, },
    { name: "Bitcoin", reload: 1.0,  health: 15, damage: 40, armor: 2, },
    { name: "Yuan", reload: 1.0,  health: 10, damage: 20, armor: 0, },
];