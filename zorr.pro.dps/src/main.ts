// main.ts

import { GameController } from "./GameController";
import { TIER_COLORS } from "./constants";
import { formatNumber } from "./formatNumber"; 

document.addEventListener("DOMContentLoaded", () => {
    // --- RÉCUPÉRATION DES ÉLÉMENTS DOM ---
    const itemSelect = document.getElementById("item-select") as HTMLSelectElement;
    const itemTier = document.getElementById("item-tier") as HTMLInputElement;
    const itemQty = document.getElementById("item-qty") as HTMLInputElement;
    const btnAdd = document.getElementById("btn-add") as HTMLButtonElement;
    
    const targetSelect = document.getElementById("target-select") as HTMLSelectElement;
    const targetTier = document.getElementById("target-tier") as HTMLInputElement;
    const targetStatsDiv = document.getElementById("target-stats") as HTMLDivElement;

    const tbody = document.getElementById("inventory-tbody") as HTMLTableSectionElement;
    const slotsContainer = document.getElementById("slots-container") as HTMLDivElement;
    const playerStatsContainer = document.getElementById("player-stats-container") as HTMLDivElement;
    const totalDpsDisplay = document.getElementById("total-dps-display") as HTMLDivElement;
    const filterTypeSelect = document.getElementById("filter-type") as HTMLSelectElement;

    // --- INITIALISATION DES LISTES ---
    GameController.getAllItemNames().forEach(name => itemSelect.add(new Option(name, name)));
    GameController.getAllMobNames().forEach(name => targetSelect.add(new Option(name, name)));

    // --- FONCTIONS DE RENDU (UI UNIQUEMENT) ---
    
    function renderSlots() {
        slotsContainer.innerHTML = "";
        
        // On demande au Backend toutes les données prêtes à être affichées
        const data = GameController.getSlotsData(targetSelect.value, Number(targetTier.value));
        
        data.slots.forEach(slot => {
            const slotDiv = document.createElement("div");
            slotDiv.className = "equipped-item";

            if (!slot.isEmpty) {
                const tierColor = TIER_COLORS[slot.item.tier] || "#fafafa";
                slotDiv.style.backgroundColor = tierColor;
                
                // Détermination des couleurs de bordure
                let borderColor = "#999"; 
                if (slot.isInactive) {
                    slotDiv.style.opacity = "0.5";
                    slotDiv.style.filter = "grayscale(80%)";
                    slotDiv.style.borderStyle = "dashed";
                } else if (slot.isFusion || slot.isMimic || slot.isJoystick || slot.isFission) {
                    if (slot.isFusion) borderColor = "#3498db";
                    else if (slot.isMimic) borderColor = "#9b59b6";   
                    else if (slot.isFission) borderColor = "#ff9ff3"; 
                    if (slot.isJoystick) borderColor = "#f39c12";    

                    slotDiv.style.borderColor = borderColor;
                    slotDiv.style.boxShadow = `inset 0 0 10px ${borderColor}50`;
                }

                // Formatage des statistiques dynamiques pour le Tooltip
                const statParts: string[] = [];
                if (slot.itemHealth !== 0 && slot.itemHealth !== undefined) statParts.push(`<div><strong>Health:</strong> ${formatNumber(slot.itemHealth)}</div>`);
                if (slot.itemDamage !== 0 && slot.itemDamage !== undefined) statParts.push(`<div><strong>Damage:</strong> ${formatNumber(slot.itemDamage)}</div>`);
                if (slot.itemArmor !== 0 && slot.itemArmor !== undefined) statParts.push(`<div><strong>Armor:</strong> ${formatNumber(slot.itemArmor)}</div>`);
                if (slot.itemReload !== 0 && slot.itemReload !== undefined) statParts.push(`<div><strong>Reload:</strong> ${formatNumber(slot.itemReload)}s</div>`);

                if (slot.obj && slot.obj.effects) {
                    for (const effect of slot.obj.effects) {
                        if (effect.value !== undefined && effect.value !== 0) {
                            let displayVal = "";
                            if (typeof effect.value === "object" && effect.value !== null) {
                                displayVal = `${effect.value.chance}% (x${effect.value.multiplier})`;
                            } else {
                                displayVal = typeof effect.value === "number" ? formatNumber(effect.value) : String(effect.value);
                            }
                            let effectName = effect.type.split('.').pop() || effect.type;
                            effectName = effectName.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase()).trim();
                            statParts.push(`<div><strong style="color: #8e44ad;">${effectName}:</strong> ${displayVal}</div>`);
                        }
                    }
                }

                let statsHtml = statParts.length > 0 
                    ? `<div style="display: grid; grid-template-columns: auto auto; column-gap: 15px; row-gap: 4px; margin-bottom: 5px;">${statParts.join('')}</div>`
                    : `<div style="margin-bottom: 5px; color: #7f8c8d; font-style: italic;">Aucune stat brute</div>`;

                let dpsBreakdown = "";
                if (slot.result.dpsCategory && slot.result.dpsCategory.length > 0) {
                    const breakdownText = slot.result.dpsCategory.map((cat: any) => `<div style="display:flex; justify-content:space-between; margin-bottom: 2px;"><span>${cat.type}:</span> <strong>${formatNumber(cat.dps)}</strong></div>`).join('');
                    dpsBreakdown = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dotted rgba(0,0,0,0.3); color: #c0392b;">${breakdownText}</div>`;
                }

                // Formatage des textes visuels
                let countBadge = slot.entityMulti > 1 && !slot.isInactive ? `<div style="font-size: 10px; color: #e84393; font-weight: bold; margin-top: 2px;">x${slot.entityMulti}</div>` : "";
                let tierText = slot.statTier !== slot.displayTier ? `T${slot.displayTier} <span style="color: #e74c3c;">(Stats T${slot.statTier})</span>` : `T${slot.displayTier}`;

                let badgeHtml = "";
                if (slot.isInactive) {
                    const reasonText = slot.inactiveReason === "fusion" ? "Ingrédient" : "Qté Insuffisante";
                    badgeHtml = `<span style="background: rgba(0,0,0,0.8); color: #bdc3c7; padding: 4px 8px; border-radius: 4px; display:inline-block; margin-bottom: 8px;">${slot.effectiveName} (${tierText})<br>${reasonText}</span>`;
                } else if (slot.isFusion && slot.isJoystick) {
                    badgeHtml = `<span style="background: rgba(0,0,0,0.8); color: #f1c40f; padding: 4px 8px; border-radius: 4px; display:inline-block; margin-bottom: 8px;">Fusion ➔ Joystick (${tierText})</span>`;
                } else if (slot.isMimic && slot.isJoystick) {
                    badgeHtml = `<span style="background: rgba(0,0,0,0.8); color: #f1c40f; padding: 4px 8px; border-radius: 4px; display:inline-block; margin-bottom: 8px;">Mimic ➔ Joystick (${tierText})</span>`;
                } else if (slot.isFusion) {
                    badgeHtml = `<span style="background: rgba(0,0,0,0.8); color: #3498db; padding: 4px 8px; border-radius: 4px; display:inline-block; margin-bottom: 8px;">Fusion ➔ ${slot.effectiveName} (${tierText})</span>`;
                } else if (slot.isMimic) {
                    badgeHtml = `<span style="background: rgba(0,0,0,0.8); color: #e056fd; padding: 4px 8px; border-radius: 4px; display:inline-block; margin-bottom: 8px;">Mimic ➔ ${slot.effectiveName} (${tierText})</span>`;
                } else if (slot.isJoystick) {
                    badgeHtml = `<span style="background: rgba(0,0,0,0.8); color: #f1c40f; padding: 4px 8px; border-radius: 4px; display:inline-block; margin-bottom: 8px;">Stick ➔ Joystick (${tierText})</span>`;
                } else {
                    badgeHtml = `<span style="background: rgba(0,0,0,0.8); color: #fff; padding: 4px 8px; border-radius: 4px; display:inline-block; margin-bottom: 8px;">${slot.item.name} (${tierText})</span>`;
                }

                // Insertion HTML finale
                slotDiv.innerHTML = `
                    <div class="item-name-tiny" title="${slot.effectiveName}">${slot.effectiveName}</div>
                    <div class="tooltip-container">
                        <span class="tooltip-icon">i</span>
                        <div class="tooltip-content">
                            <div style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 8px;">
                                ${badgeHtml}
                            </div>
                            ${statsHtml} 
                            ${dpsBreakdown}
                        </div>
                    </div>
                    ${countBadge}
                    <div class="item-dps-tiny" style="color: ${slot.result.dps > 0 ? '#2c3e50' : '#7f8c8d'};">
                        ${formatNumber(slot.result.dps)}
                    </div>
                `;

                const tooltipContainer = slotDiv.querySelector('.tooltip-container');
                if (tooltipContainer) tooltipContainer.addEventListener("click", (e) => e.stopPropagation());
                slotDiv.addEventListener("click", () => { GameController.unequipSlot(slot.index); refreshAll(); });

            } else {
                // Rendu d'un slot vide
                slotDiv.addEventListener("click", () => { GameController.unequipSlot(slot.index); refreshAll(); });
                slotDiv.style.borderStyle = "dashed";
                slotDiv.style.borderColor = "#ccc";
                slotDiv.style.backgroundColor = "transparent";
                slotDiv.innerHTML = `
                    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: #aaa;">
                        <span style="font-size: 16px; font-weight: bold;">+</span>
                    </div>`;
            }
            slotsContainer.appendChild(slotDiv);
        });

        if (totalDpsDisplay) {
            totalDpsDisplay.innerHTML = `Total DPS: ${formatNumber(data.totalDps)}`;
        }
    }

    function renderInventory() {
        const currentTargetName = targetSelect.value;
        const currentTargetTier = Number(targetTier.value);

        // UI : Cible
        const targetObj = GameController.getTargetData(currentTargetName, currentTargetTier);
        if (targetObj) {
            const tierColor = TIER_COLORS[currentTargetTier] || "#f8f8f8";
            targetStatsDiv.style.backgroundColor = tierColor;
            targetStatsDiv.style.color = "#000";
            targetStatsDiv.style.borderLeftColor = "rgba(0,0,0,0.5)";

            targetStatsDiv.innerHTML = `
                <div style="background: rgba(255,255,255,0.6); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">
                    <strong>${targetObj.name || currentTargetName} (T${currentTargetTier})</strong>
                </div><br>
                <span style="font-weight: 500;">
                    H: ${formatNumber(targetObj.health)} | D: ${formatNumber(targetObj.damage)} | A: ${formatNumber(targetObj.armor)}
                </span>
            `;
        } else {
            targetStatsDiv.style.backgroundColor = "#f8f8f8";
            targetStatsDiv.style.color = "#222";
            targetStatsDiv.innerHTML = `Impossible de charger la cible.`;
        }

        // UI : Tableau d'inventaire
        const inventoryItems = GameController.getInventoryData(currentTargetName, currentTargetTier, filterTypeSelect.value);
        tbody.innerHTML = ""; 

        if (inventoryItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #777;">Inventaire vide ou aucun objet ne correspond au filtre.</td></tr>`;
            return;
        }

        const slots = GameController.getEquippedSlots();
        const hasEmptySlot = slots.includes(null);

inventoryItems.forEach(item => {
            const tr = document.createElement("tr");
            tr.style.backgroundColor = TIER_COLORS[item.tier] || "transparent";
            tr.style.color = "#000"; 
            tr.style.fontWeight = "500"; 

            const equipped = GameController.getEquippedCount(item.id);
            const available = item.quantity - equipped;
   
            const isTransformed = item.isJoystickSynergy || false;

            const tdName = document.createElement("td");
            if (isTransformed) {
                tdName.innerHTML = `${item.name} <br><span style="background: rgba(0,0,0,0.65); color: #f1c40f; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; font-weight: bold; display: inline-block; margin-top: 4px;">(➔ Joystick)</span>`;
            } else {
                tdName.textContent = item.name;
            }

            const tdTier = document.createElement("td");
            tdTier.textContent = item.tier.toString();
            const tdQty = document.createElement("td");
            tdQty.innerHTML = `<strong>${equipped} / ${item.quantity}</strong>`;
            const tdHealth = document.createElement("td");
            tdHealth.textContent = formatNumber(item.health);
            const tdArmor = document.createElement("td");
            tdArmor.textContent = formatNumber(item.armor);
            const tdDamage = document.createElement("td");
            tdDamage.textContent = formatNumber(item.damage);
            const tdReload = document.createElement("td");
            tdReload.textContent = formatNumber(item.reload) + "s";
            const tdDps = document.createElement("td");
            tdDps.innerHTML = `<strong>${formatNumber(item.dps)}</strong>`;

            const tdActions = document.createElement("td");
            const actionContainer = document.createElement("div");
            actionContainer.style.display = "flex";
            actionContainer.style.gap = "5px";

            const equipBtn = document.createElement("button");
            equipBtn.textContent = "Equip";
            equipBtn.style.flex = "1";
            if (available <= 0 || !hasEmptySlot) equipBtn.disabled = true;
            equipBtn.addEventListener("click", () => { GameController.equipItem(item.id); refreshAll(); });

            const removeOneBtn = document.createElement("button");
            removeOneBtn.textContent = "-1";
            removeOneBtn.addEventListener("click", () => { GameController.removeOneItem(item.id); refreshAll(); });

            const removeAllBtn = document.createElement("button");
            removeAllBtn.textContent = "Del";
            removeAllBtn.addEventListener("click", () => { GameController.removeAllItems(item.id); refreshAll(); });

            actionContainer.appendChild(equipBtn);
            actionContainer.appendChild(removeOneBtn);
            actionContainer.appendChild(removeAllBtn);
            tdActions.appendChild(actionContainer);

            tr.append(tdName, tdTier, tdQty, tdHealth, tdArmor, tdDamage, tdReload, tdDps, tdActions);
            tbody.appendChild(tr);
        });
    }

    function renderPlayerStats(baseState: any) {
        if (!playerStatsContainer) return;
        let html = "";
        
        // On récupère les données de différence prêtes à l'emploi depuis le Backend !
        const diffData = GameController.getPlayerStatsDiff(baseState);

        diffData.diffs.forEach(diff => {
            let val = diff.value;
            let displayVal = typeof val === "number" ? formatNumber(val) : val;
            let prefix = (typeof val === "number" && val > 0 && diff.isTiered) ? "+" : "";
            let suffix = (diff.baseValue === 1 || diff.stat.includes("Factor")) ? "%" : "";
            
            if (!diff.isTiered && diff.baseValue === 1) prefix = "x";

            let nameHtml = diff.tierReq !== undefined 
                ? `<span>${diff.category}.${diff.stat} <span style="color: #e74c3c; font-size: 0.85em; font-weight: bold;">[T${diff.tierReq}+]</span></span>`
                : `<span>${diff.category}.${diff.stat}</span>`;

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

    // --- LE MOTEUR PRINCIPAL DE L'UI ---
    function refreshAll() {
        const baseState = GameController.refreshPlayerStats();

        // Ré-affiche toute l'interface basée sur ces nouvelles données
        renderSlots();
        renderInventory();
        renderPlayerStats(baseState); 
    }

    // --- LISTENERS ---
    btnAdd.addEventListener("click", () => {
        GameController.addItem(itemSelect.value, Number(itemTier.value), Number(itemQty.value));
        refreshAll();
    });

    filterTypeSelect.addEventListener("change", refreshAll);
    targetSelect.addEventListener("change", refreshAll);
    targetTier.addEventListener("input", refreshAll);

    // Initialisation
    refreshAll();
});