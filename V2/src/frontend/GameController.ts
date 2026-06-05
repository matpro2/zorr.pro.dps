import petals from "../data/petals.json";
import mobs from "../data/mobs.json";
import spills from "../data/spills.json";
import eggs from "../data/eggs.json";
import utilities from "../data/utilities.json";
import radiation from "../data/radiation.json";

import { getObject } from "../GetObject";
import { DpsCalculator } from "../DpsCalculator";
import { PlayerValue, TALENTS_DEF } from "../PlayerValue";
import { 
    addItem, removeOneItem, removeAllItems, equipItem, unequipSlot, 
    getProcessedInventory, getEquippedSlots, getEquippedCount,
    getEffectiveBuild, getMaxSlots, enforceSlotLimit,
    clearInventory, exportInventoryData, importInventoryData,
    removeOneItemByNameAndTier 
} from "../inventory";

import { TIERS } from "../constants"; 

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

    setPlayerLevel(lvl: number) {
        PlayerValue.setLevel(lvl);
        enforceSlotLimit(); 
    },
    getPlayerLevel() {
        return PlayerValue.level;
    },

    getTalents() { return PlayerValue.talents; },
    getTalentDefs() { return TALENTS_DEF; },
    setTalentLevel(id: string, lvl: number) { PlayerValue.setTalent(id, lvl); },

    getTPInfo() {
        const talents = PlayerValue.talents;
        let spent = 0;
        for (const [id, def] of Object.entries(TALENTS_DEF)) {
            const lvl = talents[id] || 0;
            // Somme de 1 à N = N * (N + 1) / 2
            spent += def.basePrice * (lvl * (lvl + 1)) / 2;
        }
        const total = Math.max(0, PlayerValue.level - 1);
        const available = total - spent;
        return { total, spent, available };
    },

    refreshPlayerStats() {
        PlayerValue.reset();
        PlayerValue.updateFromSlots();
    },

    getPlayerStatsDiff() {
        const diffs: any[] = [];
        const categories = ["petal", "player", "pet", "mob", "status", "mana"];

        for (const category of categories) {
            const currCat = (PlayerValue as any)[category];
            if (typeof currCat === "object" && currCat !== null) {
                for (const stat of Object.keys(currCat)) {
                    if (stat === "hasJoystick") continue;

                    const boostArray = currCat[stat];
                    if (Array.isArray(boostArray) && boostArray.length > 0) {
                        for (const mod of boostArray) {
                            const isMultiplier = stat.toLowerCase().includes("multi") || stat.toLowerCase().includes("factor");
                            diffs.push({
                                category,
                                stat,
                                source: mod.source,
                                tierReq: mod.tierReq === Infinity ? undefined : mod.tierReq,
                                value: mod.value,
                                isMultiplier
                            });
                        }
                    }
                }
            }
        }
        
        const hasJoystick = (PlayerValue as any).petal?.hasJoystick?.active || false;
        if (hasJoystick) {
            diffs.push({
                category: "Special",
                stat: "Joystick Synergy",
                source: "Joystick",
                tierReq: (PlayerValue as any).petal?.hasJoystick?.tier || 0,
                value: "Active",
                isMultiplier: false,
                isJoystickFlag: true
            });
        }
        
        return { diffs };
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

    addItem, removeOneItem, removeAllItems, equipItem, unequipSlot, getEquippedCount, getEquippedSlots,
    clearInventory, exportInventoryData, importInventoryData, removeOneItemByNameAndTier
};