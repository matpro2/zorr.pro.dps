// UIRenderer.ts

import { GameController } from "./GameController";
import { TIERS, GENERAL_COLORS } from "../constants";
import { formatNumber } from "../formatNumber"; 

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

function getDpsColor(dps: number): string {
    if (!dps || dps <= 0) return "rgb(255, 80, 80)"; 
    
    const milestones = [
        { limit: 10,          color: [255, 80, 80] },   
        { limit: 1000,       color: [255, 165, 0] },   
        { limit: 100000,    color: [255, 235, 50] },  
        { limit: 10000000, color: [80, 255, 80] }    
    ];

    if (dps >= 10000000) return "rgb(80, 255, 80)"; 

    for (let i = 0; i < milestones.length - 1; i++) {
        const lower = milestones[i];
        const upper = milestones[i + 1];

        if (dps >= lower.limit && dps <= upper.limit) {
            const range = upper.limit - lower.limit;
            const percent = (dps - lower.limit) / range;
            
            const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * percent);
            const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * percent);
            const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * percent);
            
            return `rgb(${r}, ${g}, ${b})`;
        }
    }
    return "rgb(255, 80, 80)";
}

function generateStatHtml(
    name: string,
    value: string | number,
    colorIndex: number,
    options: { prefix?: string, suffix?: string, extraHtml?: string, isPlayerStat?: boolean } = {}
): string {
    const color = getSequenceColor(colorIndex);
    const displayVal = typeof value === "number" ? formatNumber(value) : String(value);
    const prefix = options.prefix || "";
    const suffix = options.suffix || "";
    const extra = options.extraHtml || "";

    if (options.isPlayerStat) {
        return `<div class="florr-text" style="font-size: 1.1em; margin-bottom: 4px; letter-spacing: 0.5px;"><span style="color: ${color};">${name}</span>: ${prefix}${displayVal}${suffix}${extra}</div>`;
    } else {
        return `<div style="margin-bottom: 2px;"><strong style="color: ${color};">${name}:</strong> ${prefix}${displayVal}${suffix}${extra}</div>`;
    }
}

function buildGenericCatalog(
    catalogGrid: HTMLElement,
    tier: number,
    searchQuery: string,
    names: string[],
    cardType: 'catalog' | 'mob-catalog',
    options: {
        inventoryItems?: any[],
        onAdd?: (name: string, tier: number) => void,
        onRemove?: (name: string, tier: number) => void,
        onSelect?: (name: string, tier: number) => void
    } = {}
) {
    catalogGrid.innerHTML = "";
    let filteredNames = [...names];

    if (searchQuery && searchQuery.trim() !== "") {
        const queryWords = searchQuery.toLowerCase().trim().split(/\s+/);
        filteredNames = filteredNames.filter(name => {
            const tierName = TIERS[tier]?.Name?.toLowerCase() || `t${tier}`;
            const targetText = `${tierName} ${name.toLowerCase()}`;
            return queryWords.every(word => targetText.includes(word));
        });
    }

    filteredNames.forEach(name => {
        const obj = GameController.getTargetData(name, tier);
        let qty = 0;
        if (options.inventoryItems) {
            const invItem = options.inventoryItems.find(i => i.name === name && i.tier === tier);
            qty = invItem ? invItem.quantity : 0;
        }

        const card = createCard({
            type: cardType,
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
            totalQty: cardType === 'catalog' ? qty : undefined
        });

        if (cardType === 'catalog') {
            const btnAdd = card.querySelector('.cat-add-btn');
            if (btnAdd && options.onAdd) {
                btnAdd.addEventListener('click', (e) => {
                    e.stopPropagation();
                    options.onAdd!(name, tier);
                });
            }
            const btnRem = card.querySelector('.cat-rem-btn');
            if (btnRem && options.onRemove) {
                btnRem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    options.onRemove!(name, tier);
                });
            }
        } else if (cardType === 'mob-catalog' && options.onSelect) {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                options.onSelect!(name, tier);
            });
        }

        catalogGrid.appendChild(card);
    });
}

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
        statParts.push(generateStatHtml("Health", config.health, statIndex++));
    }
    if (config.damage !== undefined && config.damage !== 0) {
        statParts.push(generateStatHtml("Damage", config.damage, statIndex++));
    }
    if (config.armor !== undefined && config.armor !== 0) {
        statParts.push(generateStatHtml("Armor", config.armor, statIndex++));
    }

    if (config.petName) {
        const pCount = config.entityCount || 1;
        const pTier = config.petTier !== undefined ? config.petTier : config.statTier!; 
        const pTierData = TIERS[pTier] || { Name: `T${pTier}`, Background: "#fff" };
        const extra = ` (<span style="color: ${pTierData.Background}; font-weight: bold;">${pTierData.Name}</span>)`;
        statParts.push(generateStatHtml("Pet", `x${pCount} ${config.petName}`, statIndex++, { extraHtml: extra }));
    } else if (config.entityCount !== undefined && config.entityCount !== 1) {
        statParts.push(generateStatHtml("Entities", config.entityCount, statIndex++, { prefix: "x" }));
    }

    if (config.effects) {
        for (const effect of config.effects) {
            if (effect.value !== undefined && effect.value !== 0) {
                let displayVal = typeof effect.value === "object" && effect.value !== null
                    ? `${effect.value.chance}% (x${effect.value.multiplier})`
                    : (typeof effect.value === "number" ? formatNumber(effect.value) : String(effect.value));
                
                let suffix = "";
                if (effect.subExplosion !== undefined) {
                    suffix = ` (x${1 + effect.subExplosion} hits)`;
                }

                let effectName = effect.type.split('.').pop() || effect.type;
                effectName = effectName.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase()).trim();
                
                statParts.push(generateStatHtml(effectName, displayVal, statIndex++, { suffix: suffix }));
            }
        }
    }
    
    let statsHtml = statParts.length > 0 ? `<div style="display: flex; flex-direction: column; font-size: 0.95em;">${statParts.join('')}</div>` : ``;

    let dpsBreakdown = "";
    if (config.dpsCategory && config.dpsCategory.length > 0 && !isTarget) {
        const breakdownText = config.dpsCategory.map((cat: any) => 
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
         innerHTML += `<div class="card-dps" style="display: ${(config.dps || 0) > 0 ? 'block' : 'none'}; background-color: ${borderColor}; color: ${getDpsColor(config.dps || 0)} !important; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 1px 2px rgba(0,0,0,0.8) !important;">
            ${formatNumber(config.dps || 0)}
        </div>`;
    }
    innerHTML += `</div>`; 

    if (config.type === 'catalog') {
        innerHTML += `<div class="edit-overlay">
            <button class="cat-add-btn add-btn">Add</button>
            <button class="cat-rem-btn del-btn">Del</button>
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
            totalDpsDisplay.innerHTML = `Total DPS: <span style="color: ${getDpsColor(data.totalDps)}; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.5); padding-left: 5px;">${formatNumber(data.totalDps)}</span>`;
        }
    },

    renderInventory(inventoryGrid: HTMLElement, targetStatsDiv: HTMLElement, targetName: string, targetTier: number, filterType: string, searchQuery: string, applyNoStackRule: boolean, onInventoryChange: () => void) {
        if (!inventoryGrid || !targetStatsDiv) return;
        inventoryGrid.innerHTML = "";
        
        const targetObj = GameController.getTargetData(targetName, targetTier);
        const targetCard = createCard({
            type: 'target',
            effectiveName: targetName,
            displayTier: targetTier,
            statTier: targetTier,
            health: targetObj?.health,
            damage: targetObj?.damage,
            armor: targetObj?.armor,
            effects: targetObj?.effects
        });
        targetStatsDiv.innerHTML = '';
        targetStatsDiv.appendChild(targetCard);

        // On transmet le paramètre de la règle No Stack ici :
        const inventoryItems = GameController.getInventoryData(targetName, targetTier, filterType, searchQuery, applyNoStackRule);

        inventoryItems.forEach(item => {
            const equippedCount = GameController.getEquippedCount(item.id);
            const available = item.quantity - equippedCount;

            const card = createCard({
                type: 'inventory',
                effectiveName: item.isJoystickSynergy ? "Joystick" : item.name,
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
                effects: GameController.getTargetData(item.isJoystickSynergy ? "Joystick" : item.name, item.tier)?.effects,
                petName: GameController.getTargetData(item.name, item.tier)?.petName,
                entityCount: getEntityCount(GameController.getTargetData(item.name, item.tier)),
                petTier: GameController.getTargetData(item.name, item.tier)?.petTier,
                available: available,
                equippedQty: equippedCount,
                totalQty: item.quantity,
                synergy: item.isJoystickSynergy ? "joystick" : undefined
            });

            card.addEventListener('click', () => {
                if (available > 0) {
                    GameController.equipItem(item.id);
                    onInventoryChange();
                }
            });
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                GameController.removeOneItem(item.id);
                onInventoryChange();
            });

            inventoryGrid.appendChild(card);
        });
    },

    renderCatalog(
    catalogGrid: HTMLElement, 
    tier: number, 
    searchQuery: string,
    inventoryItems: any[], 
    onAdd: (name: string, tier: number) => void,
    onRemove: (name: string, tier: number) => void
) {
    let allNames = GameController.getAllItemNames().filter(name => {
        const obj = GameController.getTargetData(name, tier);
        return obj && obj.object !== "mob";
    });

    buildGenericCatalog(catalogGrid, tier, searchQuery, allNames, 'catalog', {
        inventoryItems: inventoryItems,
        onAdd: onAdd,
        onRemove: onRemove
    });
},

    renderMobCatalog(
    catalogGrid: HTMLElement, 
    tier: number, 
    searchQuery: string,
    onSelect: (name: string, tier: number) => void
) {
    let allNames = GameController.getAllMobNames();

    buildGenericCatalog(catalogGrid, tier, searchQuery, allNames, 'mob-catalog', {
        onSelect: onSelect
    });
},

renderPlayerStats(playerStatsContainer: HTMLElement) {
        if (!playerStatsContainer) return;

        let html = "";
        let statIndex = 0;

        const diffData = GameController.getPlayerStatsDiff();
        const groupedStats: Record<string, any[]> = {};
        const joystickStats: any[] = [];

        diffData.diffs.forEach((diff: any) => {
            if (diff.isJoystickFlag) {
                joystickStats.push(diff);
                return;
            }

            let categoryName = diff.category.charAt(0).toUpperCase() + diff.category.slice(1);
            let statName = diff.stat.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase()).trim();
            let nameText = `${categoryName} ${statName}`;

            if (!groupedStats[nameText]) groupedStats[nameText] = [];
            groupedStats[nameText].push(diff);
        });

        joystickStats.forEach(diff => {
            const reqTierName = TIERS[diff.tierReq]?.Name || `T${diff.tierReq}`;
            const reqTierColor = TIERS[diff.tierReq]?.Background || "#f1c40f";
            const tierText = ` (<span style="color: ${reqTierColor};">${reqTierName}</span>)`;
            
            html += generateStatHtml("Joystick", "Active", statIndex++, {
                extraHtml: tierText,
                isPlayerStat: true
            });
        });

        for (const [nameText, diffs] of Object.entries(groupedStats)) {
            const colorIndex = statIndex++;
            const nameColor = getSequenceColor(colorIndex);
            
            if (diffs.length === 1) {
                const diff = diffs[0];
                const val = diff.value;
                const op = diff.op;
                const isTiered = diff.tierReq !== undefined;

                let prefix = "";
                let suffix = "";
                
                if (op === 'multiply') {
                    prefix = "x";
                } else if (op === 'factor') {
                    prefix = val > 0 ? "+" : "";
                    suffix = "%";
                } else {
                    prefix = val > 0 ? "+" : "";
                    if (diff.stat.toLowerCase().endsWith("rate")) suffix = "%";
                }
                
                let tierText = "";
                if (isTiered) {
                    const reqTierName = TIERS[diff.tierReq]?.Name || `T${diff.tierReq}`;
                    const reqTierColor = TIERS[diff.tierReq]?.Background || "#e74c3c";
                    tierText = ` (<span style="color: ${reqTierColor};">${reqTierName}-</span>)`;
                }

                const sourceName = diff.source ? diff.source.charAt(0).toUpperCase() + diff.source.slice(1) : "";
                const displayName = sourceName ? `${nameText} <span style="font-size: 0.85em; opacity: 0.8;">(${sourceName})</span>` : nameText;

                html += generateStatHtml(displayName, val, colorIndex, {
                    prefix: prefix,
                    suffix: suffix,
                    extraHtml: tierText,
                    isPlayerStat: true
                });
            } else {
                const op = diffs[0].op;
                const isRate = diffs[0].stat.toLowerCase().endsWith("rate");
                
                // Calcul du Total pour le menu déroulant
                let totalVal = (op === 'multiply' || op === 'factor') ? 1 : 0;
                diffs.forEach(d => {
                    if (op === 'multiply') totalVal *= d.value;
                    else if (op === 'factor') totalVal *= Math.max(0.01, 1 + (d.value / 100));
                    else totalVal += d.value;
                });

                let prefix = "";
                let suffix = "";
                let displayTotal = "";

                if (op === 'multiply') {
                    prefix = "x";
                    displayTotal = formatNumber(totalVal);
                } else if (op === 'factor') {
                    const pct = (totalVal - 1) * 100;
                    prefix = pct > 0 ? "+" : "";
                    suffix = "%";
                    displayTotal = formatNumber(pct);
                } else {
                    prefix = totalVal > 0 ? "+" : "";
                    if (isRate) suffix = "%";
                    displayTotal = formatNumber(totalVal);
                }

                let detailsHtml = `<details style="margin-bottom: 4px;">
                    <summary class="florr-text" style="font-size: 1.1em; letter-spacing: 0.5px; cursor: pointer; color: #fff; outline: none; user-select: none;">
                        <span style="color: ${nameColor};">${nameText}</span>: ${prefix}${displayTotal}${suffix}
                    </summary>
                    <div style="padding-left: 20px; border-left: 2px solid ${nameColor}80; margin-top: 4px; margin-left: 6px; display: flex; flex-direction: column; gap: 4px; font-size: 0.95em;">`;

                diffs.forEach(diff => {
                    const val = diff.value;
                    const isTiered = diff.tierReq !== undefined;

                    let subPrefix = "";
                    let subSuffix = "";
                    if (op === 'multiply') {
                        subPrefix = "x";
                    } else if (op === 'factor') {
                        subPrefix = val > 0 ? "+" : "";
                        subSuffix = "%";
                    } else {
                        subPrefix = val > 0 ? "+" : "";
                        if (isRate) subSuffix = "%";
                    }
                    
                    let tierText = "";
                    if (isTiered) {
                        const reqTierName = TIERS[diff.tierReq]?.Name || `T${diff.tierReq}`;
                        const reqTierColor = TIERS[diff.tierReq]?.Background || "#e74c3c";
                        tierText = ` (<span style="color: ${reqTierColor};">${reqTierName}-</span>)`;
                    }

                    const displayVal = formatNumber(val);
                    const sourceName = diff.source ? diff.source.charAt(0).toUpperCase() + diff.source.slice(1) : "Item";
                    
                    detailsHtml += `<div class="florr-text" style="color: #fff;">↳ ${sourceName}: ${subPrefix}${displayVal}${subSuffix}${tierText}</div>`;
                });

                detailsHtml += `</div></details>`;
                html += detailsHtml;
            }
        }

        playerStatsContainer.innerHTML = html === "" ? `<em style="color: #aaa;">No stats to show</em>` : html;
    },

renderTalents(container: HTMLElement, talents: Record<string, number>, defs: Record<string, { label: string, step: number, isMulti: boolean, basePrice: number | number[], maxLevel: number, requires?: { id: string, lvl: number } }>, tpInfo: { total: number, spent: number, available: number }, onTalentChange: (id: string, lvl: number) => void) {
        if (!container) return;
        
        let html = `
        <div style="text-align: center; margin-bottom: 15px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.1);">
            <span class="florr-text" style="font-size: 1.3em; color: #f1c40f;">Talent Points (TP): <span style="color: ${tpInfo.available > 0 ? '#2ecc71' : '#e74c3c'};">${tpInfo.available}</span> / ${tpInfo.total}</span>
        </div>
        <div class="talent-grid">`;
        
        for (const [id, def] of Object.entries(defs)) {
            const lvl = talents[id] || 0;
            const val = def.isMulti ? 1 + (lvl * def.step) : (lvl * def.step);
            const prefix = def.isMulti ? "x" : "+";
            const displayVal = formatNumber(val);
            
            let nextCost = 0;
            let refundAmount = 0;
            if (Array.isArray(def.basePrice)) {
                nextCost = def.basePrice[lvl] || 0;
                refundAmount = lvl > 0 ? (def.basePrice[lvl - 1] || 0) : 0;
            } else {
                nextCost = def.basePrice * (lvl + 1);
                refundAmount = def.basePrice * lvl;
            }

            const isMaxLevel = lvl >= def.maxLevel;
            
            let isLocked = false;
            let lockMsg = "";
            if (def.requires) {
                const reqLvl = talents[def.requires.id] || 0;
                if (reqLvl < def.requires.lvl) {
                    isLocked = true;
                    const reqLabel = defs[def.requires.id]?.label || def.requires.id;
                    lockMsg = `Requis:<br>${reqLabel} Lvl ${def.requires.lvl}`;
                }
            }

            const canAfford = tpInfo.available >= nextCost && !isMaxLevel && !isLocked;

            let canDowngrade = lvl > 0;
            if (canDowngrade) {
                for (const [depId, depDef] of Object.entries(defs)) {
                    if (depDef.requires?.id === id && (talents[depId] || 0) > 0) {
                        if (lvl - 1 < depDef.requires.lvl) {
                            canDowngrade = false; 
                            break;
                        }
                    }
                }
            }
            
            html += `
            <div class="talent-card ${isLocked ? 'locked' : ''}">
                <div class="talent-name florr-text" style="color: ${isLocked ? '#e74c3c' : '#f1c40f'};">${def.label}</div>
                
                <div class="talent-center">
                    ${isLocked ? 
                        `<div style="font-size: 2em; margin-bottom: 2px;">🔒</div>
                         <div style="font-size: 0.7em; color: #ff7675; font-weight: bold; text-align: center;">${lockMsg}</div>` 
                        : 
                        `<div class="florr-text" style="font-size: 1.5em; color: #fff;">${prefix}${displayVal}</div>
                         <div class="florr-text" style="font-size: 0.9em; color: #ddd; margin-top: 4px;">Lvl ${lvl}/${def.maxLevel}</div>`
                    }
                </div>

                <div class="talent-actions">
                    <button class="talent-btn-minus btn-header" data-id="${id}" style="background-color: ${canDowngrade ? '#e74c3c' : '#95a5a6'} !important; border-color: ${canDowngrade ? '#c0392b' : '#7f8c8d'} !important;" ${!canDowngrade ? 'disabled' : ''}>
                        <span style="font-weight: 900; font-size: 1.2em;">-</span>
                        <span style="font-size: 0.6em; color: #ffd700;">+${refundAmount} TP</span>
                    </button>
                    
                    <button class="talent-btn-plus btn-header" data-id="${id}" style="background-color: ${canAfford ? '#2ecc71' : '#95a5a6'} !important; border-color: ${canAfford ? '#27ae60' : '#7f8c8d'} !important;" ${!canAfford ? 'disabled' : ''}>
                        <span style="font-weight: 900; font-size: 1.2em;">${isMaxLevel ? 'MAX' : '+'}</span>
                        <span style="font-size: 0.6em; color: #ffd700;">${isMaxLevel || isLocked ? '' : `-${nextCost} TP`}</span>
                    </button>
                </div>
            </div>`;
        }
        
        html += `</div>`;
        container.innerHTML = html;

        container.querySelectorAll('.talent-btn-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
                const currentLvl = talents[id] || 0;
                if (currentLvl > 0) {
                    onTalentChange(id, currentLvl - 1);
                }
            });
        });
        
        container.querySelectorAll('.talent-btn-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
                const currentLvl = talents[id] || 0;
                onTalentChange(id, currentLvl + 1);
            });
        });
    }
};