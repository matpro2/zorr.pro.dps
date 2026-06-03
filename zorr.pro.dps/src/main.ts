// main.ts

import { GameController } from "./GameController";
import { TIERS } from "./constants";
import { formatNumber } from "./formatNumber"; 

interface CardConfig {
    type: 'target' | 'equipped' | 'inventory' | 'empty';
    effectiveName?: string;
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
    petCount?: number;    
    petTier?: number;     
    isInactive?: boolean;
    inactiveReason?: string;
    synergy?: string;
    entityMulti?: number;
    available?: number; 
    equippedQty?: number;
    totalQty?: number;
}

document.addEventListener("DOMContentLoaded", () => {
    // --- RÉCUPÉRATION DES ÉLÉMENTS DOM ---
    const itemSelect = document.getElementById("item-select") as HTMLSelectElement;
    const itemTier = document.getElementById("item-tier") as HTMLInputElement;
    const itemQty = document.getElementById("item-qty") as HTMLInputElement;
    const btnAdd = document.getElementById("btn-add") as HTMLButtonElement;
    
    const targetSelect = document.getElementById("target-select") as HTMLSelectElement;
    const targetTier = document.getElementById("target-tier") as HTMLInputElement;
    const targetStatsDiv = document.getElementById("target-stats") as HTMLDivElement;

    const slotsContainer = document.getElementById("slots-container") as HTMLDivElement;
    const playerStatsContainer = document.getElementById("player-stats-container") as HTMLDivElement;
    const totalDpsDisplay = document.getElementById("total-dps-display") as HTMLDivElement;
    const filterTypeSelect = document.getElementById("filter-type") as HTMLSelectElement;

    // --- INITIALISATION DES LISTES ---
    GameController.getAllItemNames().forEach(name => itemSelect.add(new Option(name, name)));
    GameController.getAllMobNames().forEach(name => targetSelect.add(new Option(name, name)));

    // --- LOGIQUE FACTORISÉE : TOOLTIP FLIP ---
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

    // --- USINE FACTORISÉE : GÉNÉRATEUR DE CARTES ---
    function createCard(config: CardConfig): HTMLDivElement {
        const div = document.createElement("div");

        if (config.type === 'empty') {
            div.className = "card-slot card-small";
            div.innerHTML = `<div class="card-visuals" style="border-style: solid; border-color: #cbcbcb; background-color: #ffffff;"></div>`;
            return div;
        }

        const isTarget = config.type === 'target';
        div.className = `card-slot ${isTarget ? 'card-large' : 'card-small'}`;

        const tierData = TIERS[config.displayTier!] || { Name: `T${config.displayTier}`, Background: "#fafafa", Border: "#ccc" };
        
        // --- STYLES DU CALQUE VISUEL ---
        let visualStyles = `background-color: ${tierData.Background}; `;
        let borderColor = tierData.Border;

        if (config.isInactive) {
            visualStyles += `opacity: 0.5; filter: grayscale(80%); border-style: dashed; `;
        } else if (config.synergy) {
            if (config.synergy.includes("fusion")) borderColor = "#3498db";
            if (config.synergy.includes("mimic")) borderColor = "#9b59b6";
            if (config.synergy.includes("fission")) borderColor = "#ff9ff3";
            if (config.synergy.includes("joystick")) borderColor = "#f39c12";

            visualStyles += `box-shadow: inset 0 0 10px ${borderColor}50; `;
        } else {
            if (config.type === 'inventory' && (config.available || 0) <= 0) {
                visualStyles += `opacity: 0.5; `;
            }
        }
        visualStyles += `border-color: ${borderColor}; `;

        // --- GÉNÉRATION DES STATS ---
        const statParts: string[] = [];
        
        if (config.health !== undefined && config.health !== 0) statParts.push(`<div style="margin-bottom: 2px;"><strong style="color: #ff4757;">Health:</strong> ${formatNumber(config.health)}</div>`);
        if (config.damage !== undefined && config.damage !== 0) statParts.push(`<div style="margin-bottom: 2px;"><strong style="color: #3498db;">Damage:</strong> ${formatNumber(config.damage)}</div>`);
        if (config.armor !== undefined && config.armor !== 0) statParts.push(`<div style="margin-bottom: 2px;"><strong style="color: #9b59b6;">Armor:</strong> ${formatNumber(config.armor)}</div>`);

        // --- AFFICHAGE DU PET ---
        if (config.petName) {
            const pCount = config.petCount || 1;
            const pTier = config.petTier !== undefined ? config.petTier : config.statTier!; 
            const pTierData = TIERS[pTier] || { Name: `T${pTier}`, Background: "#fff" };
            
            statParts.push(`<div style="margin-bottom: 2px;"><strong style="color: #48dbfb;">Pet:</strong> x${pCount} ${config.petName} (<span style="color: ${pTierData.Background}; font-weight: bold;">${pTierData.Name}</span>)</div>`);
        }

        if (config.effects) {
            for (const effect of config.effects) {
                if (effect.value !== undefined && effect.value !== 0) {
                    let displayVal = typeof effect.value === "object" && effect.value !== null
                        ? `${effect.value.chance}% (x${effect.value.multiplier})`
                        : (typeof effect.value === "number" ? formatNumber(effect.value) : String(effect.value));
                    let effectName = effect.type.split('.').pop() || effect.type;
                    effectName = effectName.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase()).trim();
                    statParts.push(`<div style="margin-bottom: 2px;"><strong style="color: #1dd1a1;">${effectName}:</strong> ${displayVal}</div>`);
                }
            }
        }
        
        let statsHtml = statParts.length > 0
            ? `<div style="display: flex; flex-direction: column; font-size: 0.95em;">${statParts.join('')}</div>`
            : ``;

        let dpsBreakdown = "";
        if (config.dpsCategory && config.dpsCategory.length > 0 && !isTarget) {
            const breakdownText = config.dpsCategory.map((cat: any) => `<div style="display:flex; justify-content:space-between; margin-bottom: 2px;"><span>${cat.type}:</span> <strong>${formatNumber(cat.dps)}</strong></div>`).join('');
            dpsBreakdown = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dotted rgba(255,255,255,0.2); color: #ff6b81;">${breakdownText}</div>`;
        }

        // --- EN-TÊTE DU TOOLTIP ---
        const displayTierName = tierData.Name;
        const displayTierColor = tierData.Background;
        
        let titleName = config.effectiveName;
        if (config.synergy) {
             let synText = "";
             if (config.synergy.includes("fusion")) synText = "Fusion";
             else if (config.synergy.includes("mimic")) synText = "Mimic";
             else if (config.synergy.includes("fission")) synText = "Fission";
             else if (config.synergy.includes("joystick")) synText = "Stick";

             if (config.synergy.includes("joystick") && synText !== "Stick") synText += " ➔ Joystick";
             else if (config.synergy.includes("joystick")) synText = "Stick ➔ Joystick";
             else synText += ` ➔ ${config.effectiveName}`;
             titleName = synText;
        }

        let tierStatusText = displayTierName;
        if (config.isInactive) {
            tierStatusText += config.inactiveReason === "fusion" ? " (Ingrédient)" : " (Qté Insuffisante)";
        }
        if (config.statTier !== config.displayTier) {
            tierStatusText += ` (Stats T${config.statTier})`;
        }

        let reloadHtml = '';
        if ((config.reload !== undefined && config.reload > 0) || (config.secondReload !== undefined && config.secondReload > 0)) {
            let r1 = config.reload || 0;
            let r2 = config.secondReload || 0;
            
            let reloadText = "";
            if (r1 > 0 && r2 > 0) {
                reloadText = `${formatNumber(r1)}s + ${formatNumber(r2)}s`;
            } else if (r1 > 0) {
                reloadText = `${formatNumber(r1)}s`;
            } else if (r2 > 0) {
                reloadText = `${formatNumber(r2)}s`;
            }
            
            reloadHtml = `<div style="font-size: 0.95em; font-weight: bold; color: #fff; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; white-space: nowrap;">${reloadText} ↻</div>`;
        }

        const nameLen = config.effectiveName!.length;
        let dynamicSize = isTarget ? 14 : 11;
        if (!isTarget) {
            if (nameLen >= 12) dynamicSize = 8;
            else if (nameLen >= 9) dynamicSize = 9;
            else if (nameLen >= 7) dynamicSize = 10;
        }

        // --- ASSEMBLAGE HTML ---
        let innerHTML = `<div class="card-visuals" style="${visualStyles}">`;

        if (config.entityMulti && config.entityMulti > 1 && !config.isInactive && config.type === 'equipped') {
            innerHTML += `<div class="entity-badge">x${config.entityMulti}</div>`;
        }

        innerHTML += `<div class="card-name" style="font-size: ${dynamicSize}px;">${config.effectiveName}</div>`;

        if (!isTarget) {
             innerHTML += `<div class="card-dps" style="display: ${(config.dps || 0) > 0 ? 'block' : 'none'}; background-color: ${borderColor};">
                ${formatNumber(config.dps || 0)}
            </div>`;
        }
        innerHTML += `</div>`; 

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
        `;

        if (config.type === 'inventory') {
            tooltipHTML += `<div style="margin-top: 10px; display: flex; gap: 5px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                <button class="inv-remove-one" style="flex:1; background: #e67e22; color: #fff; border: none; border-radius: 4px; padding: 4px; cursor: pointer;">-1</button>
                <button class="inv-remove-all" style="flex:1; background: #e74c3c; color: #fff; border: none; border-radius: 4px; padding: 4px; cursor: pointer;">Del</button>
            </div>`;
        }
        tooltipHTML += `</div>`;
        innerHTML += tooltipHTML;

        if (config.type === 'inventory' && config.totalQty !== undefined) {
            innerHTML += `<div class="qty-badge">${config.equippedQty}/${config.totalQty}</div>`;
        }

        div.innerHTML = innerHTML;

        const tooltipContent = div.querySelector('.tooltip-content');
        if (tooltipContent) tooltipContent.addEventListener('click', (e) => e.stopPropagation());
        
        div.addEventListener('mouseenter', handleTooltipFlip);

        return div;
    }

    function renderSlots() {
        slotsContainer.innerHTML = "";
        const data = GameController.getSlotsData(targetSelect.value, Number(targetTier.value));
        
        data.slots.forEach(slot => {
            if (slot.isEmpty) {
                const emptyCard = createCard({ type: 'empty' });
                emptyCard.addEventListener("click", () => { GameController.unequipSlot(slot.index); refreshAll(); });
                slotsContainer.appendChild(emptyCard);
                return;
            }

            const card = createCard({
                type: 'equipped',
                effectiveName: slot.effectiveName,
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
                petCount: slot.obj?.entity, // <-- On lit la donnée propre gérée par GetObject !
                petTier: slot.obj?.petTier,
                isInactive: slot.isInactive,
                inactiveReason: slot.inactiveReason,
                synergy: slot.item.transformed?.synergy || (slot.isJoystick ? "joystick" : ""),
                entityMulti: slot.entityMulti
            });

            card.addEventListener("click", () => { GameController.unequipSlot(slot.index); refreshAll(); });
            slotsContainer.appendChild(card);
        });

        if (totalDpsDisplay) {
            totalDpsDisplay.innerHTML = `Total DPS: ${formatNumber(data.totalDps)}`;
        }
    }

    function renderInventory() {
        const currentTargetName = targetSelect.value;
        const currentTargetTier = Number(targetTier.value);

        targetStatsDiv.innerHTML = ""; 
        const targetObj = GameController.getTargetData(currentTargetName, currentTargetTier);
        if (targetObj) {
            const targetCard = createCard({
                type: 'target',
                effectiveName: targetObj.name || currentTargetName,
                displayTier: currentTargetTier,
                statTier: currentTargetTier,
                health: targetObj.health,
                damage: targetObj.damage,
                armor: targetObj.armor,
                reload: targetObj.reload,
                secondReload: targetObj.secondReload,
                effects: targetObj.effects,
                petName: targetObj.petName,
                petCount: targetObj.entity, // <-- Ici aussi
                petTier: targetObj.petTier
            });
            targetStatsDiv.appendChild(targetCard);
        } else {
            targetStatsDiv.innerHTML = `<div style="text-align: center; color: #777; width: 100%;">Impossible de charger la cible.</div>`;
        }

        const inventoryGrid = document.getElementById("inventory-grid") as HTMLDivElement;
        const inventoryItems = GameController.getInventoryData(currentTargetName, currentTargetTier, filterTypeSelect.value);
        inventoryGrid.innerHTML = ""; 

        if (inventoryItems.length === 0) {
            inventoryGrid.innerHTML = `<div style="width: 100%; text-align: center; color: #777; padding: 20px;">Inventaire vide ou aucun objet ne correspond au filtre.</div>`;
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
                petCount: obj?.entity, // <-- Et là aussi !
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
                refreshAll(); 
            });

            const btnRemoveAll = card.querySelector('.inv-remove-all');
            if (btnRemoveAll) btnRemoveAll.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                GameController.removeAllItems(item.id); 
                refreshAll(); 
            });

            card.addEventListener('click', () => {
                if (available > 0 && hasEmptySlot) {
                    GameController.equipItem(item.id); 
                    refreshAll();
                }
            });

            inventoryGrid.appendChild(card);
        });
    }

    function renderPlayerStats(baseState: any) {
        if (!playerStatsContainer) return;
        let html = "";
        
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

            let nameHtml = `<span>${diff.category}.${diff.stat}</span>`;
            if (isTiered) {
                const reqTierName = TIERS[diff.tierReq]?.Name || `T${diff.tierReq}`;
                const reqTierColor = TIERS[diff.tierReq]?.Background || "#e74c3c";
                nameHtml = `<span>${diff.category}.${diff.stat} <span style="color: ${reqTierColor}; font-size: 0.85em; font-weight: bold; text-shadow: 0 0 1px rgba(0,0,0,0.2);">[${reqTierName}-]</span></span>`;
            }
            
            html += `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 4px 0;">
                        ${nameHtml}
                        <strong style="color: #27ae60;">${prefix}${displayVal}${suffix}</strong>
                     </div>`;
        });

        if (diffData.hasJoystick) {
            html += `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 4px 0; background-color: #fff9e6;">
                        <span style="color: #d35400; font-weight: bold;">Synergie Active</span>
                        <strong style="color: #d35400;">Joystick</strong>
                     </div>`;
        }

        if (html === "") {
            playerStatsContainer.innerHTML = `<em style="color: #aaa;">Aucune stat modifiée</em>`;
        } else {
            playerStatsContainer.innerHTML = html;
        }
    }

    function refreshAll() {
        const baseState = GameController.refreshPlayerStats();
        renderSlots();
        renderInventory();
        renderPlayerStats(baseState); 
    }

    btnAdd.addEventListener("click", () => {
        GameController.addItem(itemSelect.value, Number(itemTier.value), Number(itemQty.value));
        refreshAll();
    });

    filterTypeSelect.addEventListener("change", refreshAll);
    targetSelect.addEventListener("change", refreshAll);
    targetTier.addEventListener("input", refreshAll);

    refreshAll();
});