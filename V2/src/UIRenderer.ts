// UIRenderer.ts

import { GameController } from "./GameController";
import { TIERS, GENERAL_COLORS } from "./constants";
import { formatNumber } from "./formatNumber"; 

interface CardConfig {
    type: 'target' | 'equipped' | 'inventory' | 'empty' | 'catalog' | 'mob-catalog';
    effectiveName?: string;
    originalName?: string;
    displayTier?: number;
    statTier?: number;
    health?: number;
    damage?: number;
    armor?: number;
    reload?: number;
    secondReload?: number; 
    dps?: number;
    dpsCategory?: any[];
    effects?: any[];
    petName?: string;     
    entityCount?: number; 
    petTier?: number;     
    isInactive?: boolean;
    inactiveReason?: string;
    synergy?: string;
    entityMulti?: number;
    available?: number; 
    equippedQty?: number;
    totalQty?: number;
}

function getEntityCount(obj: any): number | undefined {
    if (!obj) return undefined;
    return obj.petCount ?? obj.petAmount ?? obj.amount ?? obj.count ?? obj.spawnCount ?? obj.quantity ?? obj.entity;
}

function handleTooltipFlip(e: Event) {
    const slot = e.currentTarget as HTMLElement;
    slot.classList.remove("tooltip-flip"); 
    
    setTimeout(() => {
        const content = slot.querySelector(".tooltip-content");
        if (content) {
            const rect = content.getBoundingClientRect();
            if (rect.top < 10 && rect.top !== 0) {
                slot.classList.add("tooltip-flip");
            }
        }
    }, 10);
}

function getSequenceColor(index: number): string {
    const colorObj = GENERAL_COLORS[index % GENERAL_COLORS.length];
    const key = Object.keys(colorObj)[0];
    return (colorObj as any)[key];
}

// --- NOUVELLE FONCTION : CALCUL DE LA COULEUR DU DPS ---
function getDpsColor(dps: number): string {
    if (!dps || dps <= 0) return "rgb(255, 80, 80)"; // Rouge par défaut
    
    const milestones = [
        { limit: 0,          color: [255, 80, 80] },   // Rouge
        { limit: 1000,       color: [255, 165, 0] },   // Orange
        { limit: 1000000,    color: [255, 235, 50] },  // Jaune
        { limit: 1000000000, color: [80, 255, 80] }    // Vert
    ];

    if (dps >= 1000000000) return "rgb(80, 255, 80)"; // Max Vert

    for (let i = 0; i < milestones.length - 1; i++) {
        const lower = milestones[i];
        const upper = milestones[i + 1];

        if (dps >= lower.limit && dps <= upper.limit) {
            const range = upper.limit - lower.limit;
            const percent = (dps - lower.limit) / range;
            
            // Interpolation linéaire des couleurs RGB
            const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * percent);
            const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * percent);
            const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * percent);
            
            return `rgb(${r}, ${g}, ${b})`;
        }
    }
    return "rgb(255, 80, 80)";
}
// --------------------------------------------------------

function createCard(config: CardConfig): HTMLDivElement {
    const div = document.createElement("div");

    if (config.type === 'empty') {
        div.className = "card-slot card-small";
        div.innerHTML = `<div class="card-visuals" style="border-style: solid; border-color: #cbcbcb; background-color: #ffffff;"></div>`;
        return div;
    }

    const isTarget = config.type === 'target';
    
    let extraClass = '';
    if (config.type === 'inventory') extraClass = 'inventory-card';
    if (config.type === 'catalog') extraClass = 'catalog-card';
    if (config.type === 'mob-catalog') extraClass = 'mob-catalog-card';
    
    div.className = `card-slot ${isTarget ? 'card-large' : 'card-small'} ${extraClass}`;

    const tierData = TIERS[config.displayTier!] || { Name: `T${config.displayTier}`, Background: "#fafafa", Border: "#ccc" };
    
    let visualStyles = `background-color: ${tierData.Background}; `;
    let borderColor = tierData.Border;

    if (config.isInactive) {
        visualStyles += `opacity: 0.5; filter: grayscale(80%); border-style: dashed; `;
    } else if (config.synergy) {
        if (config.synergy.includes("fusion")) borderColor = "#3498db";
        if (config.synergy.includes("mimic")) borderColor = "#9b59b6";
        if (config.synergy.includes("fission")) borderColor = "#ff9ff3";
        if (config.synergy.includes("joystick")) borderColor = "#f63c39";
        visualStyles += `box-shadow: inset 0 0 10px ${borderColor}50; `;
    } else {
        if (config.type === 'inventory' && (config.available || 0) <= 0) {
            visualStyles += `opacity: 0.5; `;
        } else if (config.type === 'catalog' && (config.totalQty || 0) <= 0) {
            visualStyles += `opacity: 0.5; `;
        }
    }
    visualStyles += `border-color: ${borderColor}; `;

    const statParts: string[] = [];
    let statIndex = 0; 

    if (config.health !== undefined && config.health !== 0) {
        statParts.push(`<div style="margin-bottom: 2px;"><strong style="color: ${getSequenceColor(statIndex)};">Health:</strong> ${formatNumber(config.health)}</div>`);
        statIndex++;
    }
    if (config.damage !== undefined && config.damage !== 0) {
        statParts.push(`<div style="margin-bottom: 2px;"><strong style="color: ${getSequenceColor(statIndex)};">Damage:</strong> ${formatNumber(config.damage)}</div>`);
        statIndex++;
    }
    if (config.armor !== undefined && config.armor !== 0) {
        statParts.push(`<div style="margin-bottom: 2px;"><strong style="color: ${getSequenceColor(statIndex)};">Armor:</strong> ${formatNumber(config.armor)}</div>`);
        statIndex++;
    }

    if (config.petName) {
        const pCount = config.entityCount || 1;
        const pTier = config.petTier !== undefined ? config.petTier : config.statTier!; 
        const pTierData = TIERS[pTier] || { Name: `T${pTier}`, Background: "#fff" };
        statParts.push(`<div style="margin-bottom: 2px;"><strong style="color: ${getSequenceColor(statIndex)};">Pet:</strong> x${pCount} ${config.petName} (<span style="color: ${pTierData.Background}; font-weight: bold;">${pTierData.Name}</span>)</div>`);
        statIndex++;
    } else if (config.entityCount !== undefined && config.entityCount !== 1) {
        statParts.push(`<div style="margin-bottom: 2px;"><strong style="color: ${getSequenceColor(statIndex)};">Entities:</strong> x${config.entityCount}</div>`);
        statIndex++;
    }

    if (config.effects) {
        for (const effect of config.effects) {
            if (effect.value !== undefined && effect.value !== 0) {
                let displayVal = typeof effect.value === "object" && effect.value !== null
                    ? `${effect.value.chance}% (x${effect.value.multiplier})`
                    : (typeof effect.value === "number" ? formatNumber(effect.value) : String(effect.value));
                let effectName = effect.type.split('.').pop() || effect.type;
                effectName = effectName.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase()).trim();
                
                statParts.push(`<div style="margin-bottom: 2px;"><strong style="color: ${getSequenceColor(statIndex)};">${effectName}:</strong> ${displayVal}</div>`);
                statIndex++;
            }
        }
    }
    
    let statsHtml = statParts.length > 0 ? `<div style="display: flex; flex-direction: column; font-size: 0.95em;">${statParts.join('')}</div>` : ``;

    let dpsBreakdown = "";
    if (config.dpsCategory && config.dpsCategory.length > 0 && !isTarget) {
        const breakdownText = config.dpsCategory.map((cat: any) => 
            // Application de getDpsColor avec une ombre noire renforcée
            `<div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                <span>${cat.type}:</span> 
                <strong style="color: ${getDpsColor(cat.dps)}; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">${formatNumber(cat.dps)}</strong>
            </div>`
        ).join('');
        dpsBreakdown = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dotted rgba(255,255,255,0.2); color: #fff;">${breakdownText}</div>`;
    }

    const displayTierName = tierData.Name;
    const displayTierColor = tierData.Background;
    
    let titleName = config.effectiveName;
    if (config.synergy) {
         let synText = "";
         if (config.synergy.includes("fusion")) synText = "Fusion";
         else if (config.synergy.includes("mimic")) synText = "Mimic";
         else if (config.synergy.includes("fission")) synText = "Fission";

         if (config.synergy.includes("joystick")) {
             if (synText !== "") synText += " ➔ Joystick";
             else synText = `${config.originalName || "Stick"} ➔ Joystick`;
         } else {
             synText += ` ➔ ${config.effectiveName}`;
         }
         titleName = synText;
    }

    let tierStatusText = displayTierName;
    if (config.isInactive) {
        if (config.inactiveReason === "fusion") tierStatusText += " (Ingrédient)";
        else if (config.inactiveReason === "unstackable") tierStatusText += " (Non-cumulable)";
        else tierStatusText += " (Qté Insuffisante)";
    }
    if (config.statTier !== config.displayTier) tierStatusText += ` (Stats T${config.statTier})`;

    let reloadHtml = '';
    if ((config.reload !== undefined && config.reload > 0) || (config.secondReload !== undefined && config.secondReload > 0)) {
        let r1 = config.reload || 0;
        let r2 = config.secondReload || 0;
        let reloadText = "";
        if (r1 > 0 && r2 > 0) reloadText = `${formatNumber(r1)}s + ${formatNumber(r2)}s`;
        else if (r1 > 0) reloadText = `${formatNumber(r1)}s`;
        else if (r2 > 0) reloadText = `${formatNumber(r2)}s`;
        
        reloadHtml = `<div style="font-size: 0.95em; font-weight: bold; color: #fff; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; white-space: nowrap;">${reloadText} ↻</div>`;
    }

    const nameLen = config.effectiveName!.length;
    let dynamicSize = isTarget ? 14 : 11;
    if (!isTarget) {
        if (nameLen >= 12) dynamicSize = 8;
        else if (nameLen >= 9) dynamicSize = 9;
        else if (nameLen >= 7) dynamicSize = 10;
    }

    let innerHTML = `<div class="card-visuals" style="${visualStyles}">`;

    if (config.entityMulti && config.entityMulti > 1 && !config.isInactive && config.type === 'equipped') {
        innerHTML += `<div class="entity-badge">x${config.entityMulti}</div>`;
    }

    innerHTML += `<div class="card-name" style="font-size: ${dynamicSize}px;">${config.effectiveName}</div>`;

    if (!isTarget && config.type !== 'catalog' && config.type !== 'mob-catalog') {
         // Application de getDpsColor avec une ombre renforcée pour assurer la lisibilité
         innerHTML += `<div class="card-dps" style="display: ${(config.dps || 0) > 0 ? 'block' : 'none'}; background-color: ${borderColor}; color: ${getDpsColor(config.dps || 0)} !important; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 1px 2px rgba(0,0,0,0.8) !important;">
            ${formatNumber(config.dps || 0)}
        </div>`;
    }
    innerHTML += `</div>`; 

    if (config.type === 'inventory') {
        innerHTML += `<div class="delete-overlay">
            <button class="inv-remove-one del-btn">Del 1</button>
            <button class="inv-remove-all del-btn">Del All</button>
        </div>`;
    }

    if (config.type === 'catalog') {
        innerHTML += `<div class="add-overlay">
            <button class="cat-add-btn add-btn">Add</button>
        </div>`;
    }

    let tooltipHTML = `<div class="tooltip-content ${config.type === 'inventory' ? 'tooltip-left' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid rgba(255,255,255,0.1); gap: 15px;">
            <div>
                <div style="font-size: 1.3em; font-weight: 900; color: #fff; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 2px rgba(0,0,0,0.5);">${titleName}</div>
                <div style="color: ${displayTierColor}; font-weight: 900; font-size: 0.95em; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">${tierStatusText}</div>
            </div>
            ${reloadHtml}
        </div>
        ${statsHtml}
        ${dpsBreakdown}
    </div>`;

    innerHTML += tooltipHTML;

    if (config.type === 'inventory' && config.totalQty !== undefined) {
        innerHTML += `<div class="qty-badge">${config.equippedQty}/${config.totalQty}</div>`;
    } else if (config.type === 'catalog' && config.totalQty !== undefined && config.totalQty > 0) {
        innerHTML += `<div class="qty-badge">${config.totalQty}</div>`;
    }

    div.innerHTML = innerHTML;

    const tooltipContent = div.querySelector('.tooltip-content');
    if (tooltipContent) tooltipContent.addEventListener('click', (e) => e.stopPropagation());
    
    div.addEventListener('mouseenter', handleTooltipFlip);

    return div;
}

export const UIRenderer = {
    
    renderSlots(slotsContainer: HTMLElement, totalDpsDisplay: HTMLElement, targetName: string, targetTier: number, onRefresh: () => void) {
        slotsContainer.innerHTML = "";
        const data = GameController.getSlotsData(targetName, targetTier);
        
        data.slots.forEach(slot => {
            if (slot.isEmpty) {
                const emptyCard = createCard({ type: 'empty' });
                emptyCard.addEventListener("click", () => { GameController.unequipSlot(slot.index); onRefresh(); });
                slotsContainer.appendChild(emptyCard);
                return;
            }

            const card = createCard({
                type: 'equipped',
                effectiveName: slot.effectiveName,
                originalName: slot.item.name,
                displayTier: slot.displayTier,
                statTier: slot.statTier,
                health: slot.itemHealth,
                damage: slot.itemDamage,
                armor: slot.itemArmor,
                reload: slot.itemReload,
                secondReload: slot.itemSecondReload, 
                dps: slot.result.dps,
                dpsCategory: slot.result.dpsCategory,
                effects: slot.obj?.effects,
                petName: slot.obj?.petName,
                entityCount: getEntityCount(slot.obj),
                petTier: slot.obj?.petTier,
                isInactive: slot.isInactive,
                inactiveReason: slot.inactiveReason,
                synergy: slot.item.transformed?.synergy || (slot.isJoystick ? "joystick" : ""),
                entityMulti: slot.entityMulti
            });

            card.addEventListener("click", () => { GameController.unequipSlot(slot.index); onRefresh(); });
            slotsContainer.appendChild(card);
        });

        if (totalDpsDisplay) {
            // Application de getDpsColor au compteur Total
            totalDpsDisplay.innerHTML = `Total DPS: <span style="color: ${getDpsColor(data.totalDps)}; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.5); padding-left: 5px;">${formatNumber(data.totalDps)}</span>`;
        }
    },

    renderInventory(
        inventoryGrid: HTMLElement, targetStatsDiv: HTMLElement, 
        targetName: string, targetTier: number, filterType: string, searchQuery: string, 
        onRefresh: () => void
    ) {
        targetStatsDiv.innerHTML = ""; 
        const targetObj = GameController.getTargetData(targetName, targetTier);
        if (targetObj) {
            const targetCard = createCard({
                type: 'target',
                effectiveName: targetObj.name || targetName,
                displayTier: targetTier,
                statTier: targetTier,
                health: targetObj.health,
                damage: targetObj.damage,
                armor: targetObj.armor,
                reload: targetObj.reload,
                secondReload: targetObj.secondReload,
                effects: targetObj.effects,
                petName: targetObj.petName,
                entityCount: getEntityCount(targetObj),
                petTier: targetObj.petTier
            });
            targetStatsDiv.appendChild(targetCard);
        } else {
            targetStatsDiv.innerHTML = `<div style="text-align: center; color: #777; width: 100%;">Impossible de charger la cible.</div>`;
        }

        const inventoryItems = GameController.getInventoryData(targetName, targetTier, filterType, searchQuery);
        inventoryGrid.innerHTML = ""; 

        if (inventoryItems.length === 0) {
            inventoryGrid.innerHTML = `<div style="width: 100%; text-align: center; color: #777; padding: 20px;">Inventaire vide ou aucun objet ne correspond à la recherche.</div>`;
            return;
        }

        const slots = GameController.getEquippedSlots();
        const hasEmptySlot = slots.includes(null);

        inventoryItems.forEach(item => {
            const equipped = GameController.getEquippedCount(item.id);
            const available = item.quantity - equipped;
            
            const isTransformed = item.isJoystickSynergy || false;
            const effectiveName = isTransformed ? "Joystick" : item.name;
            const obj = GameController.getTargetData(effectiveName, item.tier); 

            const card = createCard({
                type: 'inventory',
                effectiveName: effectiveName,
                originalName: item.name, 
                displayTier: item.tier,
                statTier: item.tier,
                health: item.health,
                damage: item.damage,
                armor: item.armor,
                reload: item.reload,
                secondReload: item.secondReload, 
                dps: item.dps,
                dpsCategory: item.dpsCategory,
                effects: obj?.effects,
                petName: obj?.petName,
                entityCount: getEntityCount(obj), 
                petTier: obj?.petTier,
                synergy: isTransformed ? "joystick" : "",
                available: available,
                equippedQty: equipped,
                totalQty: item.quantity
            });

            const btnRemoveOne = card.querySelector('.inv-remove-one');
            if (btnRemoveOne) btnRemoveOne.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                GameController.removeOneItem(item.id); 
                onRefresh(); 
            });

            const btnRemoveAll = card.querySelector('.inv-remove-all');
            if (btnRemoveAll) btnRemoveAll.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                GameController.removeAllItems(item.id); 
                onRefresh(); 
            });

            card.addEventListener('click', () => {
                if (available > 0 && hasEmptySlot) {
                    GameController.equipItem(item.id); 
                    onRefresh();
                }
            });

            inventoryGrid.appendChild(card);
        });
    },

    renderCatalog(
        catalogGrid: HTMLElement, 
        tier: number, 
        searchQuery: string,
        inventoryItems: any[], 
        onAdd: (name: string, tier: number) => void
    ) {
        catalogGrid.innerHTML = "";
        let allNames = GameController.getAllItemNames();

        allNames = allNames.filter(name => {
            const obj = GameController.getTargetData(name, tier);
            return obj && obj.object !== "mob"; 
        });

        if (searchQuery && searchQuery.trim() !== "") {
            const queryWords = searchQuery.toLowerCase().trim().split(/\s+/);
            allNames = allNames.filter(name => {
                const tierName = TIERS[tier]?.Name?.toLowerCase() || `t${tier}`;
                const targetText = `${tierName} ${name.toLowerCase()}`;
                return queryWords.every(word => targetText.includes(word));
            });
        }

        allNames.forEach(name => {
            const obj = GameController.getTargetData(name, tier);
            const invItem = inventoryItems.find(i => i.name === name && i.tier === tier);
            const qty = invItem ? invItem.quantity : 0;

            const card = createCard({
                type: 'catalog',
                effectiveName: name,
                originalName: name,
                displayTier: tier,
                statTier: tier,
                health: obj?.health,
                damage: obj?.damage,
                armor: obj?.armor,
                reload: obj?.reload,
                secondReload: obj?.secondReload,
                effects: obj?.effects,
                petName: obj?.petName,
                entityCount: getEntityCount(obj),
                petTier: obj?.petTier,
                totalQty: qty 
            });

            const btnAdd = card.querySelector('.cat-add-btn');
            if (btnAdd) {
                btnAdd.addEventListener('click', (e) => {
                    e.stopPropagation();
                    onAdd(name, tier);
                });
            }

            catalogGrid.appendChild(card);
        });
    },

    renderMobCatalog(
        catalogGrid: HTMLElement, 
        tier: number, 
        searchQuery: string,
        onSelect: (name: string, tier: number) => void
    ) {
        catalogGrid.innerHTML = "";
        let allNames = GameController.getAllMobNames();

        if (searchQuery && searchQuery.trim() !== "") {
            const queryWords = searchQuery.toLowerCase().trim().split(/\s+/);
            allNames = allNames.filter(name => {
                const tierName = TIERS[tier]?.Name?.toLowerCase() || `t${tier}`;
                const targetText = `${tierName} ${name.toLowerCase()}`;
                return queryWords.every(word => targetText.includes(word));
            });
        }

        allNames.forEach(name => {
            const obj = GameController.getTargetData(name, tier);

            const card = createCard({
                type: 'mob-catalog',
                effectiveName: name,
                originalName: name,
                displayTier: tier,
                statTier: tier,
                health: obj?.health,
                damage: obj?.damage,
                armor: obj?.armor,
                reload: obj?.reload,
                secondReload: obj?.secondReload,
                effects: obj?.effects,
                petName: obj?.petName,
                entityCount: getEntityCount(obj),
                petTier: obj?.petTier
            });

            card.addEventListener('click', (e) => {
                e.stopPropagation();
                onSelect(name, tier);
            });

            catalogGrid.appendChild(card);
        });
    },

    renderPlayerStats(playerStatsContainer: HTMLElement, baseState: any) {
        if (!playerStatsContainer) return;
        let html = "";
        let statIndex = 0; 
        
        const diffData = GameController.getPlayerStatsDiff(baseState);

        diffData.diffs.forEach(diff => {
            let val = diff.value;
            let displayVal = typeof val === "number" ? formatNumber(val) : val;
            
            const isTiered = diff.tierReq !== undefined;
            let prefix = (typeof val === "number" && val > 0 && isTiered) ? "+" : "";
            let suffix = "";
            
            if (diff.stat.toLowerCase().endsWith("rate")) {
                suffix = "%";
                if (typeof val === "number" && val > 0) prefix = "+";
            } else if (!isTiered && diff.baseValue === 1) {
                prefix = "x";
            }

            let nameColor = getSequenceColor(statIndex);
            statIndex++;

            let nameText = `${diff.category} ${diff.stat}`;

            let tierText = "";
            if (isTiered) {
                const reqTierName = TIERS[diff.tierReq]?.Name || `T${diff.tierReq}`;
                const reqTierColor = TIERS[diff.tierReq]?.Background || "#e74c3c";
                tierText = ` (<span style="color: ${reqTierColor};">${reqTierName}-</span>)`;
            }
            
            html += `<div class="florr-text" style="font-size: 1.1em; margin-bottom: 4px; letter-spacing: 0.5px;">
                        <span style="color: ${nameColor};">${nameText}</span>: ${prefix}${displayVal}${suffix}${tierText}
                     </div>`;
        });

        if (diffData.hasJoystick) {
            let nameColor = getSequenceColor(statIndex);
            statIndex++;
            html += `<div class="florr-text" style="font-size: 1.1em; margin-bottom: 4px; letter-spacing: 0.5px;">
                        <span style="color: ${nameColor};">Synergie Active</span>: Joystick
                     </div>`;
        }

        playerStatsContainer.innerHTML = html === "" ? `<em style="color: #aaa;">Aucune stat modifiée</em>` : html;
    }
};