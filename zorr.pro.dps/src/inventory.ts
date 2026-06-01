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
}

let inventory: IInventoryItem[] = [];
let nextId = 0;

export const MAX_SLOTS = 5;
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

export function getProcessedInventory(targetName: string, targetTier: number): IInventoryItem[] {
    inventory.forEach(item => {
        const result = DpsCalculator.calculateDps(item.name, item.tier, targetName, targetTier);
        item.dps = result.dps; 
        item.dpsCategory = result.dpsCategory;

        const itemObj = getObject(item.name, item.tier);
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