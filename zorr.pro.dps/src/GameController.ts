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
    getProcessedInventory, getEquippedSlots, getEquippedCount, MAX_SLOTS,
    getEffectiveBuild
} from "./inventory";

// 1. Assemblage des données brutes
export const allData: Record<string, any> = {
    ...petals,
    ...mobs,
    ...spills,
    ...eggs,
    ...utilities,
    ...radiation
};

export const GameController = {
    // --- LISTES POUR LES MENUS DÉROULANTS ---
    getAllItemNames() { return Object.keys(allData).sort(); },
    getAllMobNames() { return Object.keys(mobs).sort(); },

    // --- GESTION DU JOUEUR ---
    refreshPlayerStats() {
        PlayerValue.reset();
        const baseState = JSON.parse(JSON.stringify(PlayerValue));
        
        PlayerValue.updateFromSlots();
        
        return baseState; // Retourné au front pour calculer la différence
    },

    getPlayerStatsDiff(baseState: any) {
        const diffs = [];
        for (const category of Object.keys(baseState)) {
            const baseCat = baseState[category];
            const currCat = (PlayerValue as any)[category];
            
            if (typeof baseCat === "object" && baseCat !== null) {
                for (const stat of Object.keys(baseCat)) {
                    if (stat === "hasJoystick") continue;

                    // Gestion des stats restreintes par tier (Tableaux)
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

                    // Gestion des stats globales
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

        for (let i = 0; i < MAX_SLOTS; i++) {
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
            
            // PLUS DE LOGIQUE JOYSTICK COMPLEXE ! On lit juste la synergie pour la couleur dorée
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
            const itemReload = obj ? ((obj.reload || 0) + (obj.secondReload || 0)) : 0;
            const itemHealth = obj ? obj.health : item.health;
            const itemDamage = obj ? obj.damage : item.damage;
            const itemArmor = obj ? obj.armor : item.armor;

            slots.push({
                isEmpty: false, index: i, item,
                effectiveName, displayTier, statTier, entityMulti,
                isInactive, inactiveReason,
                isMimic, isFission, isFusion, isJoystick,
                result, obj, itemReload, itemHealth, itemDamage, itemArmor
            });
        }

        return { slots, totalDps };
    },

    getTargetData(targetName: string, targetTier: number) {
        return getObject(targetName, targetTier);
    },

    getInventoryData(targetName: string, targetTier: number, filterType: string) {
        // PLUS BESOIN de récupérer hasJoystickActive et joystickTier !
        let inventoryItems = getProcessedInventory(targetName, targetTier);
        
        if (filterType && filterType !== "all") {
            inventoryItems = inventoryItems.filter(item => {
                const obj = getObject(item.name, item.tier);
                if (!obj) return false;

                switch (filterType) {
                    case "default": return (item.dps || 0) > 0;
                    case "special":
                        if (!obj.effects) return false;
                        return obj.effects.some((e: any) => {
                            if (!e.type) return false;
                            const t = e.type.toLowerCase();
                            return t === "poison" || t === "fire" || t === "lightning";
                        });
                    case "utility":
                        if (!obj.effects) return false;
                        return obj.effects.some((e: any) => e.type && e.type.includes("."));
                    case "egg": return obj.type === "egg";
                    case "spill": return obj.type === "spill";
                    default: return true;
                }
            });
        }
        return inventoryItems;
    },

    addItem, removeOneItem, removeAllItems, equipItem, unequipSlot, getEquippedCount, getEquippedSlots
};