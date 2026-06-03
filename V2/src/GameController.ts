// GameController.ts

import petals from "./data/petals.json";
import mobs from "./data/mobs.json";
import spills from "./data/spills.json";
import eggs from "./data/eggs.json";
import utilities from "./data/utilities.json";
import radiation from "./data/radiation.json";

import { getObject } from "./GetObject";
import { DpsCalculator } from "./DpsCalculator";
import { PlayerValue } from "./PlayerValue";
import { 
    addItem, removeOneItem, removeAllItems, equipItem, unequipSlot, 
    getProcessedInventory, getEquippedSlots, getEquippedCount,
    getEffectiveBuild, getMaxSlots, enforceSlotLimit
} from "./inventory";

import { TIERS } from "./constants"; 

export const allData: Record<string, any> = {
    ...petals,
    ...mobs,
    ...spills,
    ...eggs,
    ...utilities,
    ...radiation
};

export const GameController = {
    getAllItemNames() { return Object.keys(allData).sort(); },
    getAllMobNames() { return Object.keys(mobs).sort(); },

    // --- ACCESSEURS POUR LE LEVEL DU JOUEUR ---
    setPlayerLevel(lvl: number) {
        PlayerValue.setLevel(lvl);
        // APPEL DE LA SÉCURITÉ : Déséquipe les objets dans les slots inaccessibles
        enforceSlotLimit(); 
    },
    getPlayerLevel() {
        return PlayerValue.level;
    },
    // ------------------------------------------

    refreshPlayerStats() {
        PlayerValue.reset();
        const baseState = JSON.parse(JSON.stringify(PlayerValue));
        PlayerValue.updateFromSlots();
        return baseState; 
    },

    getPlayerStatsDiff(baseState: any) {
        const diffs = [];
        for (const category of Object.keys(baseState)) {
            const baseCat = baseState[category];
            const currCat = (PlayerValue as any)[category];
            
            if (typeof baseCat === "object" && baseCat !== null) {
                for (const stat of Object.keys(baseCat)) {
                    if (stat === "hasJoystick") continue;

                    if (stat.endsWith("Tiered")) {
                        const tieredArray = currCat[stat];
                        if (Array.isArray(tieredArray) && tieredArray.length > 0) {
                            const baseStatName = stat.replace("Tiered", "");
                            const baseValue = baseCat[baseStatName];
                            for (const mod of tieredArray) {
                                diffs.push({ category, stat: baseStatName, tierReq: mod.tier, value: mod.value, baseValue });
                            }
                        }
                        continue;
                    }

                    if (typeof baseCat[stat] === "number") {
                        if (currCat[stat] !== baseCat[stat]) {
                            diffs.push({ category, stat, value: currCat[stat], baseValue: baseCat[stat] });
                        }
                    } else if (typeof baseCat[stat] === "object" && baseCat[stat] !== null && !Array.isArray(baseCat[stat])) {
                        for (const sub of Object.keys(baseCat[stat])) {
                            if (currCat[stat][sub] !== baseCat[stat][sub]) {
                                diffs.push({ category, stat: `${stat}.${sub}`, value: currCat[stat][sub], baseValue: baseCat[stat][sub] });
                            }
                        }
                    }
                }
            }
        }
        const hasJoystick = (PlayerValue as any).petal?.hasJoystick?.active || false;
        return { diffs, hasJoystick };
    },

    getSlotsData(targetName: string, targetTier: number) {
        const effectiveBuild = getEffectiveBuild();
        let totalDps = 0;
        const slots = [];
        const currentMaxSlots = getMaxSlots(); 

        for (let i = 0; i < currentMaxSlots; i++) {
            const item = effectiveBuild[i];

            if (!item) {
                slots.push({ isEmpty: true, index: i });
                continue;
            }

            const effectiveName = item.transformed ? item.transformed.name : item.name;
            const displayTier = item.transformed ? item.transformed.displayTier : item.tier;
            const statTier = item.transformed ? item.transformed.statTier : item.tier;
            const entityMulti = item.transformed?.entityMultiplier || 1;
            
            const isInactive = item.inactive || false;
            const inactiveReason = item.inactiveReason || "fusion";

            const isMimic = item.transformed?.synergy?.includes("mimic") || false;
            const isFission = item.transformed?.synergy?.includes("fission") || false;
            const isFusion = item.transformed?.synergy?.includes("fusion") || false;
            const isJoystick = item.transformed?.synergy?.includes("joystick") || false;

            const result = DpsCalculator.calculateDps(effectiveName, statTier, targetName, targetTier);
            
            if (isInactive) {
                result.dps = 0;
                if (result.dpsCategory) result.dpsCategory = [];
            } else {
                result.dps *= entityMulti;
                if (result.dpsCategory && result.dpsCategory.length > 0) {
                    result.dpsCategory.forEach((cat: any) => cat.dps *= entityMulti);
                }
                totalDps += result.dps;
            }
            
            const obj = getObject(effectiveName, statTier);
            let itemReload = 0, itemSecondReload = 0, itemHealth = 0, itemDamage = 0, itemArmor = 0;
            
            if (obj) {
                itemReload = obj.reload || 0;
                itemSecondReload = obj.secondReload || 0;

                if (obj.type === "egg" && obj.petName) {
                    const petTier = obj.petTier !== undefined ? obj.petTier : statTier;
                    const petObj = getObject(obj.petName, petTier, true);
                    if (petObj) {
                        itemHealth = petObj.health;
                        itemDamage = petObj.damage;
                        itemArmor = petObj.armor;
                    }
                } else {
                    itemHealth = obj.health;
                    itemDamage = obj.damage;
                    itemArmor = obj.armor;
                }
            } else {
                itemHealth = item.health || 0;
                itemDamage = item.damage || 0;
                itemArmor = item.armor || 0;
            }

            slots.push({
                isEmpty: false, index: i, item,
                effectiveName, displayTier, statTier, entityMulti,
                isInactive, inactiveReason,
                isMimic, isFission, isFusion, isJoystick,
                result, obj, itemReload, itemSecondReload, itemHealth, itemDamage, itemArmor
            });
        }

        return { slots, totalDps };
    },

    getTargetData(targetName: string, targetTier: number) {
        return getObject(targetName, targetTier);
    },

    getInventoryData(targetName: string, targetTier: number, filterType: string, searchQuery: string = "") {
        let inventoryItems = getProcessedInventory(targetName, targetTier);
        
        if (searchQuery && searchQuery.trim() !== "") {
            const queryWords = searchQuery.toLowerCase().trim().split(/\s+/);
            
            inventoryItems = inventoryItems.filter(item => {
                const tierName = TIERS[item.tier]?.Name?.toLowerCase() || `t${item.tier}`;
                const itemName = item.isJoystickSynergy ? "joystick" : item.name.toLowerCase();
                const targetText = `${tierName} ${itemName}`; 
                
                return queryWords.every(word => targetText.includes(word));
            });
        }

        if (filterType && filterType !== "all") {
            inventoryItems = inventoryItems.filter(item => {
                const obj = getObject(item.name, item.tier);
                if (!obj) return false;

                switch (filterType) {
                    case "basic": 
                        return (obj.health || 0) > 0 && (obj.damage || 0) > 0 && (obj.reload || 0) > 0;
                    
                    case "effects":
                        return Array.isArray(obj.effects) && obj.effects.length > 0;
                    
                    case "boosting":
                        if (!Array.isArray(obj.effects)) return false;
                        const boostKeywords = ["rate", "factor", "multi", "evasion", "bounce", "duration", "mutation", "luck"];
                        return obj.effects.some((e: any) => {
                            if (!e.type) return false;
                            const effectType = e.type.toLowerCase();
                            return boostKeywords.some(keyword => effectType.includes(keyword));
                        });
                    
                    case "egg": 
                        return obj.type === "egg";
                    case "spill": 
                        return obj.type === "spill";
                    case "radiation": 
                        return obj.type === "radiation";
                    
                    default: 
                        return true;
                }
            });
        }
        return inventoryItems;
    },

    addItem, removeOneItem, removeAllItems, equipItem, unequipSlot, getEquippedCount, getEquippedSlots
};