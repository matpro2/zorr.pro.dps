// UIRenderer.ts

import { GameController } from "./GameController";
import { TIERS } from "../constants";
import { formatNumber } from "../formatNumber";
import { createCard, getDpsColor, generateStatHtml } from "./CardFactory";

function getEntityCount(obj: any): number | undefined {
    if (!obj) return undefined;
    return obj.petCount ?? obj.petAmount ?? obj.amount ?? obj.count ?? obj.spawnCount ?? obj.quantity ?? obj.entity;
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
            manaPrice: obj?.manaPrice,
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
                originalName: slot.item?.name || slot.effectiveName,                
                displayTier: slot.displayTier,
                statTier: slot.statTier,
                health: slot.itemHealth,
                damage: slot.itemDamage,
                armor: slot.itemArmor,
                reload: slot.itemReload,
                secondReload: slot.itemSecondReload,
                manaPrice: slot.obj?.manaPrice,
                dps: slot.result.dps,
                dpsCategory: slot.result.dpsCategory,
                effects: slot.obj?.effects,
                petName: slot.obj?.petName,
                entityCount: getEntityCount(slot.obj),
                petTier: slot.obj?.petTier,
                isInactive: slot.isInactive,
                inactiveReason: slot.inactiveReason,
                synergy: slot.item?.transformed?.synergy || (slot.isJoystick ? "joystick" : ""),                
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
                manaPrice: GameController.getTargetData(item.name, item.tier)?.manaPrice,
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
        const allNames = GameController.getAllItemNames().filter(name => {
            const obj = GameController.getTargetData(name, tier);
            return obj && obj.object !== "mob";
        });

        buildGenericCatalog(catalogGrid, tier, searchQuery, allNames, 'catalog', {
            inventoryItems,
            onAdd,
            onRemove
        });
    },

    renderMobCatalog(
        catalogGrid: HTMLElement,
        tier: number,
        searchQuery: string,
        onSelect: (name: string, tier: number) => void
    ) {
        buildGenericCatalog(catalogGrid, tier, searchQuery, GameController.getAllMobNames(), 'mob-catalog', {
            onSelect
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

            const categoryName = diff.category.charAt(0).toUpperCase() + diff.category.slice(1);
            const statName = diff.stat.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase()).trim();
            const nameText = `${categoryName} ${statName}`;

            if (!groupedStats[nameText]) groupedStats[nameText] = [];
            groupedStats[nameText].push(diff);
        });

        joystickStats.forEach(diff => {
            const reqTierName  = TIERS[diff.tierReq]?.Name      || `T${diff.tierReq}`;
            const reqTierColor = TIERS[diff.tierReq]?.Background || "#f1c40f";
            const tierText = ` (<span style="color: ${reqTierColor};">${reqTierName}</span>)`;
            html += generateStatHtml("Joystick", "Active", statIndex++, { extraHtml: tierText, isPlayerStat: true });
        });

        for (const [nameText, diffs] of Object.entries(groupedStats)) {
            const colorIndex = statIndex++;

            if (diffs.length === 1) {
                const diff    = diffs[0];
                const val     = diff.value;
                const op      = diff.op;
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
                    const reqTierName  = TIERS[diff.tierReq]?.Name      || `T${diff.tierReq}`;
                    const reqTierColor = TIERS[diff.tierReq]?.Background || "#e74c3c";
                    tierText = ` (<span style="color: ${reqTierColor};">${reqTierName}-</span>)`;
                }

                const sourceName  = diff.source ? diff.source.charAt(0).toUpperCase() + diff.source.slice(1) : "";
                const displayName = sourceName ? `${nameText} <span style="font-size: 0.85em; opacity: 0.8;">(${sourceName})</span>` : nameText;

                html += generateStatHtml(displayName, val, colorIndex, {
                    prefix,
                    suffix,
                    extraHtml: tierText,
                    isPlayerStat: true
                });
            } else {
                const op     = diffs[0].op;
                const isRate = diffs[0].stat.toLowerCase().endsWith("rate");

                let totalVal = (op === 'multiply' || op === 'factor') ? 1 : 0;
                diffs.forEach(d => {
                    if (op === 'multiply')     totalVal *= d.value;
                    else if (op === 'factor')  totalVal *= Math.max(0.01, 1 + (d.value / 100));
                    else                       totalVal += d.value;
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

                const tempHtml = generateStatHtml("", 0, colorIndex, { isPlayerStat: true });
                const colorMatch = tempHtml.match(/color: (#[0-9a-fA-F]+|rgb[^;]+)/);
                const resolvedColor = colorMatch ? colorMatch[1] : "#fff";

                let detailsHtml = `<details style="margin-bottom: 4px;">
                    <summary class="florr-text" style="font-size: 1.1em; letter-spacing: 0.5px; cursor: pointer; color: #fff; outline: none; user-select: none;">
                        <span style="color: ${resolvedColor};">${nameText}</span>: ${prefix}${displayTotal}${suffix}
                    </summary>
                    <div style="padding-left: 20px; border-left: 2px solid ${resolvedColor}80; margin-top: 4px; margin-left: 6px; display: flex; flex-direction: column; gap: 4px; font-size: 0.95em;">`;

                diffs.forEach(diff => {
                    const val      = diff.value;
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
                        const reqTierName  = TIERS[diff.tierReq]?.Name      || `T${diff.tierReq}`;
                        const reqTierColor = TIERS[diff.tierReq]?.Background || "#e74c3c";
                        tierText = ` (<span style="color: ${reqTierColor};">${reqTierName}-</span>)`;
                    }

                    const sourceName = diff.source ? diff.source.charAt(0).toUpperCase() + diff.source.slice(1) : "Item";
                    detailsHtml += `<div class="florr-text" style="color: #fff;">↳ ${sourceName}: ${subPrefix}${formatNumber(val)}${subSuffix}${tierText}</div>`;
                });

                detailsHtml += `</div></details>`;
                html += detailsHtml;
            }
        }

        playerStatsContainer.innerHTML = html === "" ? `<em style="color: #aaa;">No stats to show</em>` : html;
    },

    renderTalents(
        container: HTMLElement,
        talents: Record<string, number>,
        defs: Record<string, { label: string; step: number; isMulti: boolean; basePrice: number | number[]; maxLevel: number; requires?: { id: string; lvl: number } }>,
        tpInfo: { total: number; spent: number; available: number },
        onTalentChange: (id: string, lvl: number) => void
    ) {
        if (!container) return;

        let html = `
        <div style="text-align: center; margin-bottom: 15px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.1);">
            <span class="florr-text" style="font-size: 1.3em; color: #f1c40f;">Talent Points (TP): <span style="color: ${tpInfo.available > 0 ? '#2ecc71' : '#e74c3c'};">${tpInfo.available}</span> / ${tpInfo.total}</span>
        </div>
        <div class="talent-grid">`;

        for (const [id, def] of Object.entries(defs)) {
            const lvl        = talents[id] || 0;
            const val        = def.isMulti ? 1 + (lvl * def.step) : (lvl * def.step);
            const prefix     = def.isMulti ? "x" : "+";
            const displayVal = formatNumber(val);

            let nextCost     = 0;
            let refundAmount = 0;
            if (Array.isArray(def.basePrice)) {
                nextCost     = def.basePrice[lvl]      || 0;
                refundAmount = lvl > 0 ? (def.basePrice[lvl - 1] || 0) : 0;
            } else {
                nextCost     = def.basePrice * (lvl + 1);
                refundAmount = def.basePrice * lvl;
            }

            const isMaxLevel = lvl >= def.maxLevel;

            let isLocked = false;
            let lockMsg  = "";
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
                        if (lvl - 1 < depDef.requires.lvl) { canDowngrade = false; break; }
                    }
                }
            }

            html += `
            <div class="talent-card ${isLocked ? 'locked' : ''}">
                <div class="talent-name florr-text" style="color: ${isLocked ? '#e74c3c' : '#f1c40f'};">${def.label}</div>
                <div class="talent-center">
                    ${isLocked
                        ? `<div style="font-size: 2em; margin-bottom: 2px;">🔒</div>
                           <div style="font-size: 0.7em; color: #ff7675; font-weight: bold; text-align: center;">${lockMsg}</div>`
                        : `<div class="florr-text" style="font-size: 1.5em; color: #fff;">${prefix}${displayVal}</div>
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
                if (currentLvl > 0) onTalentChange(id, currentLvl - 1);
            });
        });

        container.querySelectorAll('.talent-btn-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
                onTalentChange(id, (talents[id] || 0) + 1);
            });
        });
    }
};