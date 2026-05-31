const eggs = [
    { 
        name: "Bee Egg",
        isEgg: true,
        mobSpawned: "Bee",
        entity: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 3, 9: 3 }, 
        reload: 1.0,
        secondReload: { 0: 2, 1: 3, 2: 4, 3: 5, 4: 6.5, 5: 1.5, 6: 3.5, 7: 5, 8: 7.5, 9: 25 }, 
        mobTier: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8 }
    },
    { 
        name: "Ladybug Egg", 
        isEgg: true,
        mobSpawned: "Ladybug",
        entity: {0:2,1:2,2:2,3:2,4:2,5:2,6:2,7:2,8:4,9:4}, 
        reload: 1, 
        secondReload: {0:2,1:3.5,2:5,3:9,4:2,5:4,6:5,7:7.5,8:10,9:21}, 
        mobTier: {0:0,1:1,2:2,3:3,4:3,5:4,6:5,7:6,8:7,9:8} 
    },
    { 
        name: "Soldier Fire Ant Egg", 
        isEgg: true,
        mobSpawned: "Soldier Fire Ant",
        entity: {0:4,1:4,2:4,3:4,4:4,5:4,6:4,7:4,8:6,9:6}, 
        reload: 1, 
        secondReload: {0:5.5,1:7,2:9,3:11,4:2,5:4,6:6,7:7.5,8:13.5,9:40}, 
        mobTier: {0:0,1:1,2:2,3:3,4:3,5:4,6:5,7:6,8:7,9:8} 
    },
    { 
        name: "Troll Egg", 
        isEgg: true,
        mobSpawned: "Troll",
        entity: {0:1,1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:2,9:2}, 
        reload: 1, 
        secondReload: {0:40,1:9,2:10,3:11,4:12,5:13,6:14.5,7:16,8:20,9:70}, 
        mobTier: {0:0,1:0,2:1,3:2,4:3,5:4,6:5,7:6,8:7,9:8} 
    },
    { 
        name: "Velociraptor Egg", 
        isEgg: true,
        mobSpawned: "Velociraptor",
        entity: {0:1,1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:2,9:2}, 
        reload: 1, 
        secondReload: {0:7.5,1:9,2:10.5,3:12,4:19,5:22,6:1.5,7:5,8:14,9:33}, 
        mobTier: {0:0,1:1,2:2,3:3,4:4,5:5,6:5,7:6,8:7,9:8} 
    },
    { 
        name: "Rat Egg",
        isEgg: true,
        mobSpawned: "Rat",
        entity: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 2 },
        reload: 1,
        secondReload: { 0: 11.9, 1: 13.2, 2: 14.4, 3: 15.7, 4: 16.1, 5: 13.6, 6: 14.4, 7: 15.3, 8: 17, 9: 40 },
        mobTier: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8 }
    },
    { 
        name: "Roach Egg",
        isEgg: true,
        mobSpawned: "Roach",
        entity: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 2 },
        reload: 1,
        secondReload: { 0: 14.4, 1: 15.3, 2: 16.6, 3: 17.4, 4: 18.6, 5: 12.8, 6: 13.6, 7: 14.4, 8: 16.1, 9: 45 },
        mobTier: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8 }
    },
    { 
        name: "Stick",
        isEgg: true,
        mobSpawned: "Sandstorm",
        entity: { 0: 3, 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 1, 8: 4, 9: 4 },
        reload: 1,
        secondReload: { 0: 7.5, 1: 8.5, 2: 10, 3: 13, 4: 17, 5: 1.5, 6: 4, 7: 6, 8: 20, 9: 55 },
        mobTier: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8 }
    }
];