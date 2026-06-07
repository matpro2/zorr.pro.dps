import { DpsCalculator } from "./DpsCalculator";
import { getObject } from "./GetObject";
import { PlayerValue } from "./PlayerValue";

export interface IInventoryItem {
    id: number;
    name: string;
    tier: number;
    quantity: number; 
    dps?: number;
    dpsCategory?: any[];
    health?: number;
    damage?: number;
    armor?: number;
    reload?: number;     
    secondReload?: number; 
    itemType?: string;   
    isJoystickSynergy?: boolean; 
}

export interface ITransformedState {
    name: string;
    displayTier: number; 
    statTier: number;    
    synergy: string;
    entityMultiplier?: number; 
}

export interface IEffectiveItem extends IInventoryItem {
    transformed?: ITransformedState;
    inactive?: boolean; 
    inactiveReason?: string;
}

let inventory: IInventoryItem[] = [];
let nextId = 0;

let equippedSlots: (number | null)[] = Array(30).fill(null);

export function getMaxSlots(): number {
    return PlayerValue ? PlayerValue.getMaxSlots() : 5;
}

function saveState() {
    localStorage.setItem("zorr_inventory", JSON.stringify(inventory));
    localStorage.setItem("zorr_nextId", nextId.toString());
    localStorage.setItem("zorr_equippedSlots", JSON.stringify(equippedSlots)); 
}

function loadState() {
    const savedInv = localStorage.getItem("zorr_inventory");
    const savedId = localStorage.getItem("zorr_nextId");
    const savedSlots = localStorage.getItem("zorr_equippedSlots"); 

    if (savedInv) inventory = JSON.parse(savedInv);
    if (savedId) nextId = parseInt(savedId, 10);
    
    if (savedSlots) {
        const parsedSlots = JSON.parse(savedSlots);
        if (Array.isArray(parsedSlots)) {
            for (let i = 0; i < 30; i++) {
                equippedSlots[i] = i < parsedSlots.length ? parsedSlots[i] : null;
            }
        }
    }
}

loadState();

export function enforceSlotLimit() {
    const max = getMaxSlots();
    let changed = false;
    for (let i = max; i < equippedSlots.length; i++) {
        if (equippedSlots[i] !== null) {
            equippedSlots[i] = null; 
            changed = true;
        }
    }
    if (changed) saveState(); 
}

export function getEquippedCount(id: number): number {
    return equippedSlots.filter(slotId => slotId === id).length;
}

export function getEquippedSlots(): (number | null)[] {
    return equippedSlots.slice(0, getMaxSlots());
}

export function getEffectiveBuild(customSlots?: (number | null)[]): (IEffectiveItem | null)[] {
    const activeSlots = customSlots || getEquippedSlots();
    const build: (IEffectiveItem | null)[] = activeSlots.map(slotId => {
        if (slotId === null) return null;
        const item = getItemById(slotId);
        return item ? { ...item } : null; 
    });

    const getEffectiveName = (item: IEffectiveItem) => item.transformed ? item.transformed.name : item.name;
    const getDisplayTier = (item: IEffectiveItem) => item.transformed ? item.transformed.displayTier : item.tier;
    const getStatTier = (item: IEffectiveItem) => item.transformed ? item.transformed.statTier : item.tier;

    for (let i = 0; i < build.length - 1; i++) {
        const current = build[i];
        if (current && getEffectiveName(current).toLowerCase() === "mimic") {
            const next = build[i + 1];
            if (next && getEffectiveName(next).toLowerCase() !== "mimic") {
                current.transformed = {
                    name: getEffectiveName(next),
                    displayTier: current.tier,
                    statTier: current.tier, 
                    synergy: "mimic",
                    entityMultiplier: 1
                };
            }
        }
    }

    for (let i = 0; i < build.length - 1; i++) {
        const current = build[i];
        if (current && getEffectiveName(current).toLowerCase() === "fission") {
            const next = build[i + 1];
            if (next) {
                const currentMulti = current.transformed?.entityMultiplier || 1;
                const nextName = getEffectiveName(next);
                const nextDisplayTier = getDisplayTier(next);
                const nextStatTier = getStatTier(next);
                const nextMulti = next.transformed?.entityMultiplier || 1;
                const prevSynergy = next.transformed?.synergy || "";
                
                next.transformed = {
                    name: nextName,
                    displayTier: nextDisplayTier,
                    statTier: Math.max(0, nextStatTier - 1), 
                    synergy: prevSynergy ? prevSynergy + ", fission" : "fission",
                    entityMultiplier: nextMulti * (3 * currentMulti) 
                };
            }
        }
    }

    for (let i = 0; i < build.length - 3; i++) {
        const current = build[i];
        if (current && !current.inactive && getEffectiveName(current).toLowerCase() === "fusion") {
            const n1 = build[i + 1];
            const n2 = build[i + 2];
            const n3 = build[i + 3];

            if (n1 && !n1.inactive && n2 && !n2.inactive && n3 && !n3.inactive) {
                const name1 = getEffectiveName(n1);
                const name2 = getEffectiveName(n2);
                const name3 = getEffectiveName(n3);
                const dt1 = getDisplayTier(n1);
                const dt2 = getDisplayTier(n2);
                const dt3 = getDisplayTier(n3);

                if (name1 === name2 && name2 === name3 && dt1 === dt2 && dt2 === dt3) {
                    current.transformed = {
                        name: name1,
                        displayTier: current.tier, 
                        statTier: current.tier + 1, 
                        synergy: "fusion",
                        entityMultiplier: current.transformed?.entityMultiplier || 1
                    };
                    
                    n1.inactive = true;
                    n1.inactiveReason = "fusion";
                    n2.inactive = true;
                    n2.inactiveReason = "fusion";
                    n3.inactive = true;
                    n3.inactiveReason = "fusion";
                }
            }
        }
    }

    const checkedNames = new Set<string>();
    for (let i = 0; i < build.length; i++) {
        const current = build[i];
        if (!current || current.inactive) continue;

        const name = getEffectiveName(current).toLowerCase();
        if (checkedNames.has(name)) continue;
        checkedNames.add(name);

        const statTier = getStatTier(current);
        const obj = getObject(name, statTier);
        
        if (obj && obj.stack === false) {
            const instances = [];
            for (let j = 0; j < build.length; j++) {
                const other = build[j];
                if (other && !other.inactive && getEffectiveName(other).toLowerCase() === name) {
                    instances.push({ index: j, item: other, tier: getDisplayTier(other) });
                }
            }
            
            if (instances.length > 1) {
                instances.sort((a, b) => b.tier - a.tier);
                for (let k = 1; k < instances.length; k++) {
                    const idx = instances[k].index;
                    if (build[idx]) {
                        build[idx]!.inactive = true;
                        build[idx]!.inactiveReason = "unstackable";
                    }
                }
            }
        }
    }

    for (let i = 0; i < build.length; i++) {
        const current = build[i];
        if (!current || current.inactive) continue;

        const name = getEffectiveName(current);
        const statTier = getStatTier(current);
        const displayTier = getDisplayTier(current);

        const obj = getObject(name, statTier);
        if (obj && obj.effects) {
            const amountReqEffect = obj.effects.find((e: any) => e.type === "amountRequirement");
            if (amountReqEffect) {
                const requiredAmount = amountReqEffect.value;
                let count = 0;
                for (let j = 0; j < build.length; j++) {
                    const other = build[j];
                    if (other && !other.inactive && getEffectiveName(other) === name && getDisplayTier(other) === displayTier) {
                        count++;
                    }
                }
                if (count < requiredAmount) {
                    current.inactive = true;
                    current.inactiveReason = "amount";
                }
            }
        }
    }

    let maxJoystickTier = -1;
    for (const item of build) {
        if (item && !item.inactive && getEffectiveName(item).toLowerCase() === "joystick") {
            maxJoystickTier = Math.max(maxJoystickTier, getDisplayTier(item));
        }
    }

    if (maxJoystickTier >= 0) {
        for (const item of build) {
            if (item && !item.inactive && getEffectiveName(item).toLowerCase().includes("stick") && getDisplayTier(item) <= maxJoystickTier) {
                const prevSynergy = item.transformed?.synergy || "";
                item.transformed = {
                    name: "Joystick",
                    displayTier: getDisplayTier(item),
                    statTier: getStatTier(item), 
                    synergy: prevSynergy ? prevSynergy + ", joystick" : "joystick",
                    entityMultiplier: item.transformed?.entityMultiplier || 1
                };
            }
        }
    }

    return build;
}

// ---- NOUVELLE FONCTION D'ÉVALUATION GLOBALE DES SLOTS ---- //
export function getSlotsData(targetName: string, targetTier: number, customSlots?: (number | null)[]) {
    if (customSlots) {
        PlayerValue.updateFromSlots(customSlots);
    }
    
    const effectiveBuild = getEffectiveBuild(customSlots);
    const currentMaxSlots = getMaxSlots(); 
    
    // PASSE 1 : Calculer tout les slots pour trouver le poison / feu Max
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

    // PASSE 2 : Appliquer les Multipliers finaux, et ignorer les poisons/feu qui ne sont pas le Max
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
                        }
                        slotDps += cat.dps;
                    } else if (cat.type === "Fire (No Stack)") {
                        if (i !== maxFireIdx) {
                            cat.dps = 0;
                            cat.totalDamage = 0;
                            cat.ignored = true;
                        }
                        slotDps += cat.dps;
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
}

// ---- NOUVELLE FONCTION D'ÉVALUATION DE L'INVENTAIRE ---- //
// ---- NOUVELLE FONCTION D'ÉVALUATION DE L'INVENTAIRE ---- //
export function getProcessedInventory(targetName: string, targetTier: number, applyNoStackRule: boolean = false): IInventoryItem[] {
    const build = getEffectiveBuild();
    let maxJoystickTier = -1;
    for (const item of build) {
        if (item && !item.inactive && (item.transformed ? item.transformed.name : item.name).toLowerCase() === "joystick") {
            maxJoystickTier = Math.max(maxJoystickTier, item.transformed ? item.transformed.displayTier : item.tier);
        }
    }

    // PASSE 1 : Calculer tout le monde pour trouver le plus gros Poison et Feu de l'inventaire
    const rawResults = new Map<number, any>();
    let maxPoisonVal = -1;
    let maxPoisonId = -1;
    let maxFireVal = -1;
    let maxFireId = -1;

    inventory.forEach(item => {
        let effectiveName = item.name;
        let statTier = item.tier;
        item.isJoystickSynergy = false; 
        
        if (maxJoystickTier >= 0 && item.name.toLowerCase().includes("stick") && item.tier <= maxJoystickTier) {
            effectiveName = "joystick";
            item.isJoystickSynergy = true; 
        }

        const result = DpsCalculator.calculateDps(effectiveName, statTier, targetName, targetTier);
        rawResults.set(item.id, result);

        if (result.dpsCategory) {
            result.dpsCategory.forEach((cat: any) => {
                if (cat.type === "Poison (No Stack)" && cat.dps > maxPoisonVal) {
                    maxPoisonVal = cat.dps;
                    maxPoisonId = item.id;
                }
                if (cat.type === "Fire (No Stack)" && cat.dps > maxFireVal) {
                    maxFireVal = cat.dps;
                    maxFireId = item.id;
                }
            });
        }
    });

    // PASSE 2 : Appliquer les pénalités si la règle "applyNoStackRule" est activée
    inventory.forEach(item => {
        const result = rawResults.get(item.id);
        let finalDps = 0;
        let updatedCategories: any[] = [];

        if (result && result.dpsCategory) {
            result.dpsCategory.forEach((cat: any) => {
                const newCat = { ...cat };
                if (applyNoStackRule) {
                    if (newCat.type === "Poison (No Stack)" && item.id !== maxPoisonId) {
                        newCat.dps = 0;
                        newCat.totalDamage = 0;
                        newCat.ignored = true;
                    }
                    if (newCat.type === "Fire (No Stack)" && item.id !== maxFireId) {
                        newCat.dps = 0;
                        newCat.totalDamage = 0;
                        newCat.ignored = true;
                    }
                }
                finalDps += newCat.dps;
                updatedCategories.push(newCat);
            });
        }

        item.dps = finalDps; 
        item.dpsCategory = updatedCategories;

        const itemObj = getObject(item.isJoystickSynergy ? "joystick" : item.name, item.tier);
        if (itemObj) {
            item.itemType = itemObj.type || "default"; 
            item.reload = itemObj.reload || 0; 
            item.secondReload = itemObj.secondReload || 0; 

            if (itemObj.type === "egg" && itemObj.petName) {
                const petTier = itemObj.petTier !== undefined ? itemObj.petTier : item.tier;
                const petObj = getObject(itemObj.petName, petTier, true);
                if (petObj) {
                    item.health = petObj.health;
                    item.damage = petObj.damage;
                    item.armor = petObj.armor;
                }
            } else {
                item.health = itemObj.health;
                item.damage = itemObj.damage;
                item.armor = itemObj.armor;
            }
        }
    });

    // Tri en fonction du DPS potentiellement pénalisé
    inventory.sort((a, b) => (b.dps || 0) - (a.dps || 0));
    return inventory;
}

export function getItemById(id: number): IInventoryItem | undefined {
    return inventory.find(i => i.id === id);
}

export function addItem(name: string, tier: number, qty: number) {
    if (!name || qty <= 0) return;
    const existingItem = inventory.find(i => i.name === name && i.tier === tier);
    if (existingItem) {
        existingItem.quantity += qty;
    } else {
        inventory.push({ id: nextId++, name, tier, quantity: qty });
    }
    saveState();
}

export function removeOneItem(id: number) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    if (item.quantity > 1) {
        item.quantity--; 
        if (getEquippedCount(id) > item.quantity) {
            const lastSlotIndex = equippedSlots.lastIndexOf(id);
            if (lastSlotIndex !== -1) equippedSlots[lastSlotIndex] = null;
        }
    } else {
        inventory = inventory.filter(i => i.id !== id);
        equippedSlots = equippedSlots.map(slotId => slotId === id ? null : slotId); 
    }
    saveState();
}

export function removeAllItems(id: number) {
    inventory = inventory.filter(i => i.id !== id);
    equippedSlots = equippedSlots.map(slotId => slotId === id ? null : slotId); 
    saveState();
}

export function equipItem(id: number) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const available = item.quantity - getEquippedCount(id);
    const activeSlots = getEquippedSlots();
    const emptyIndex = activeSlots.indexOf(null);

    if (emptyIndex !== -1 && available > 0) {
        equippedSlots[emptyIndex] = id;
        saveState();
    }
}

export function unequipSlot(index: number) {
    if (index >= 0 && index < getMaxSlots()) {
        equippedSlots[index] = null;
        saveState();
    }
}

export function unequipAllSlots() {
    equippedSlots = Array(30).fill(null);
    saveState();
}

export function applySlotConfiguration(newSlots: (number | null)[]) {
    equippedSlots = Array(30).fill(null);
    for (let i = 0; i < newSlots.length; i++) {
        if (i < 30) {
            equippedSlots[i] = newSlots[i];
        }
    }
    saveState();
}

export function clearInventory() {
    inventory = [];
    equippedSlots = Array(30).fill(null);
    saveState();
}

export function exportInventoryData(): any[] {
    return inventory.map(item => ({
        name: item.name,
        tier: item.tier,
        amount: item.quantity 
    }));
}

export function importInventoryData(data: any[]) {
    if (!Array.isArray(data)) return;
    for (const item of data) {
        if (item && typeof item.name === "string" && typeof item.tier === "number") {
            const qty = typeof item.amount === "number" ? item.amount : (typeof item.quantity === "number" ? item.quantity : 1);
            if (qty > 0) {
                addItem(item.name, item.tier, qty);
            }
        }
    }
}

export function removeOneItemByNameAndTier(name: string, tier: number) {
    const item = inventory.find(i => i.name === name && i.tier === tier);
    if (item) {
        removeOneItem(item.id);
    }
}