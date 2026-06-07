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
    removeOneItemByNameAndTier, unequipAllSlots, applySlotConfiguration
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
            if (lvl > 0 && !isNaN(lvl)) {
                if (Array.isArray(def.basePrice)) {
                    for (let i = 0; i < lvl; i++) {
                        spent += def.basePrice[i] || 0;
                    }
                } else {
                    spent += def.basePrice * (lvl * (lvl + 1)) / 2;
                }
            }
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

                    const statData = currCat[stat];
                    if (statData && Array.isArray(statData.boosts) && statData.boosts.length > 0) {
                        for (const mod of statData.boosts) {
                            diffs.push({
                                category,
                                stat,
                                source: mod.source,
                                tierReq: mod.tierReq === Infinity ? undefined : mod.tierReq,
                                value: mod.value,
                                op: statData.op 
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
                op: "add",
                isJoystickFlag: true
            });
        }
        
        return { diffs };
    },

    getSlotsData(targetName: string, targetTier: number, customSlots?: (number | null)[], customTalents?: Record<string, number>) {
        if (customSlots || customTalents) {
            PlayerValue.updateFromSlots(customSlots, customTalents);
        }
        
        const effectiveBuild = getEffectiveBuild(customSlots);
        const currentMaxSlots = getMaxSlots(); 
        
        const rawResults: any[] = [];
        let maxPoisonIdx = -1;
        let maxPoisonVal = -1;
        let maxFireIdx = -1;
        let maxFireVal = -1;

        for (let i = 0; i < currentMaxSlots; i++) {
            const item = effectiveBuild[i];

            if (!item || item.inactive) {
                rawResults.push(null);
                continue;
            }

            const effectiveName = item.transformed ? item.transformed.name : item.name;
            const statTier = item.transformed ? item.transformed.statTier : item.tier;
            
            const result = DpsCalculator.calculateDps(effectiveName, statTier, targetName, targetTier);
            
            if (result.dpsCategory) {
                result.dpsCategory.forEach(cat => {
                    if (cat.type === "Poison (No Stack)" && cat.dps > maxPoisonVal) {
                        maxPoisonVal = cat.dps;
                        maxPoisonIdx = i;
                    }
                    if (cat.type === "Fire (No Stack)" && cat.dps > maxFireVal) {
                        maxFireVal = cat.dps;
                        maxFireIdx = i;
                    }
                });
            }
            rawResults.push(result);
        }

        let totalDps = 0;
        const slots = [];

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

            let result = rawResults[i];
            
            if (isInactive || !result) {
                result = { dps: 0, dpsCategory: [], reloadTime: 0, survivedTicks: 0 };
            } else {
                let slotDps = 0;
                if (result.dpsCategory && result.dpsCategory.length > 0) {
                    result.dpsCategory.forEach((cat: any) => {
                        if (cat.type === "Poison (No Stack)") {
                            if (i !== maxPoisonIdx) {
                                cat.dps = 0;
                                cat.totalDamage = 0;
                                cat.ignored = true; 
                            } else {
                                slotDps += cat.dps;
                            }
                        } else if (cat.type === "Fire (No Stack)") {
                            if (i !== maxFireIdx) {
                                cat.dps = 0;
                                cat.totalDamage = 0;
                                cat.ignored = true;
                            } else {
                                slotDps += cat.dps;
                            }
                        } else {
                            cat.dps *= entityMulti;
                            if (cat.totalDamage) cat.totalDamage *= entityMulti;
                            slotDps += cat.dps;
                        }
                    });
                    
                    result.dpsCategory = result.dpsCategory.filter((cat: any) => !cat.ignored);
                }
                
                result.dps = slotDps;
                totalDps += slotDps;
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

    getInventoryData(targetName: string, targetTier: number, filterType: string, searchQuery: string = "", applyNoStackRule: boolean = false) {
        let inventoryItems = getProcessedInventory(targetName, targetTier, applyNoStackRule);
        
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

    applyBuild(slots: (number | null)[], talents?: Record<string, number>) {
        applySlotConfiguration(slots);
        if (talents) {
            for (const [id, lvl] of Object.entries(talents)) {
                this.setTalentLevel(id, lvl);
            }
        }
    },

    addItem, removeOneItem, removeAllItems, equipItem, unequipSlot, getEquippedCount, getEquippedSlots,
    clearInventory, exportInventoryData, importInventoryData, removeOneItemByNameAndTier, unequipAllSlots,
    getMaxSlots
};