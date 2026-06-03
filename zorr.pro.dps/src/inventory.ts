import { DpsCalculator } from "./DpsCalculator";
import { getObject } from "./GetObject";

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
    itemType?: string;   
    isJoystickSynergy?: boolean; // <-- NOUVELLE LIGNE ICI
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

export const MAX_SLOTS = 14;
let equippedSlots: (number | null)[] = Array(MAX_SLOTS).fill(null);

function saveState() {
    localStorage.setItem("zorr_inventory", JSON.stringify(inventory));
    localStorage.setItem("zorr_nextId", nextId.toString());
    localStorage.setItem("zorr_slots", JSON.stringify(equippedSlots));
}

function loadState() {
    const savedInv = localStorage.getItem("zorr_inventory");
    const savedId = localStorage.getItem("zorr_nextId");
    const savedSlots = localStorage.getItem("zorr_slots");

    if (savedInv) inventory = JSON.parse(savedInv);
    if (savedId) nextId = parseInt(savedId, 10);
    if (savedSlots) equippedSlots = JSON.parse(savedSlots);
}

loadState();

export function getEquippedCount(id: number): number {
    return equippedSlots.filter(slotId => slotId === id).length;
}

export function getEquippedSlots(): (number | null)[] {
    return equippedSlots;
}

export function getItemById(id: number): IInventoryItem | undefined {
    return inventory.find(i => i.id === id);
}

export function getEffectiveBuild(): (IEffectiveItem | null)[] {
    const build: (IEffectiveItem | null)[] = equippedSlots.map(slotId => {
        if (slotId === null) return null;
        const item = getItemById(slotId);
        return item ? { ...item } : null; 
    });

    const getEffectiveName = (item: IEffectiveItem) => item.transformed ? item.transformed.name : item.name;
    const getDisplayTier = (item: IEffectiveItem) => item.transformed ? item.transformed.displayTier : item.tier;
    const getStatTier = (item: IEffectiveItem) => item.transformed ? item.transformed.statTier : item.tier;

    // Passe 1 : Mimic
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

    // Passe 2 : Fission 
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

    // Passe 3 : Fusion
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

    // Passe 4 : Amount Requirement
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

    // PASSE 5 : JOYSTICK (Géré à 100% par l'inventaire maintenant !)
    let maxJoystickTier = -1;
    for (const item of build) {
        if (item && !item.inactive && getEffectiveName(item).toLowerCase() === "joystick") {
            maxJoystickTier = Math.max(maxJoystickTier, getDisplayTier(item));
        }
    }

    if (maxJoystickTier >= 0) {
        for (const item of build) {
            if (item && !item.inactive && getEffectiveName(item).toLowerCase() === "stick" && getDisplayTier(item) <= maxJoystickTier) {
                const prevSynergy = item.transformed?.synergy || "";
                item.transformed = {
                    name: "Joystick", // Se transforme officiellement !
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

// L'inventaire recalcule lui-même s'il y a un Joystick actif dans le build
export function getProcessedInventory(targetName: string, targetTier: number): IInventoryItem[] {
    const build = getEffectiveBuild();
    let maxJoystickTier = -1;
    for (const item of build) {
        if (item && !item.inactive && (item.transformed ? item.transformed.name : item.name).toLowerCase() === "joystick") {
            maxJoystickTier = Math.max(maxJoystickTier, item.transformed ? item.transformed.displayTier : item.tier);
        }
    }

    inventory.forEach(item => {
        let effectiveName = item.name;
        let statTier = item.tier;
        item.isJoystickSynergy = false; // Reset par défaut
        
        // Applique la synergie à l'affichage de l'inventaire
        if (maxJoystickTier >= 0 && item.name.toLowerCase() === "stick" && item.tier <= maxJoystickTier) {
            effectiveName = "joystick";
            item.isJoystickSynergy = true; // <-- ON DIT EXPLICITEMENT AU FRONTEND QUE C'EST UN JOYSTICK
        }

        const result = DpsCalculator.calculateDps(effectiveName, statTier, targetName, targetTier);
        item.dps = result.dps; 
        item.dpsCategory = result.dpsCategory;

        const itemObj = getObject(effectiveName, statTier);
        if (itemObj) {
            item.itemType = itemObj.type || "default"; 
            item.reload = (itemObj.reload || 0) + (itemObj.secondReload || 0);

            if (itemObj.type === "egg" && itemObj.petName) {
                const petTier = itemObj.petTier || 0;
                const petObj = getObject(itemObj.petName, petTier);
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

    inventory.sort((a, b) => (b.dps || 0) - (a.dps || 0));
    return inventory;
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
        equippedSlots = equippedSlots.map(slotId => slotId === id ? null : id);
    }
    saveState();
}

export function removeAllItems(id: number) {
    inventory = inventory.filter(i => i.id !== id);
    equippedSlots = equippedSlots.map(slotId => slotId === id ? null : id);
    saveState();
}

export function equipItem(id: number) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const available = item.quantity - getEquippedCount(id);
    const emptyIndex = equippedSlots.indexOf(null);

    if (emptyIndex !== -1 && available > 0) {
        equippedSlots[emptyIndex] = id;
    }
    saveState();
}

export function unequipSlot(index: number) {
    if (index >= 0 && index < MAX_SLOTS) {
        equippedSlots[index] = null;
    }
    saveState();
}