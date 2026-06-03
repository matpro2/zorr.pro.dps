// main.ts

import { GameController } from "./GameController";
import { TIERS } from "./constants";
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

    const slotsContainer = document.getElementById("slots-container") as HTMLDivElement;
    const playerStatsContainer = document.getElementById("player-stats-container") as HTMLDivElement;
    const totalDpsDisplay = document.getElementById("total-dps-display") as HTMLDivElement;
    const filterTypeSelect = document.getElementById("filter-type") as HTMLSelectElement;

    // --- INITIALISATION DES LISTES ---
    GameController.getAllItemNames().forEach(name => itemSelect.add(new Option(name, name)));
    GameController.getAllMobNames().forEach(name => targetSelect.add(new Option(name, name)));

    // --- FONCTIONS DE RENDU (UI UNIQUEMENT) ---
    
    // --- FONCTION DE FLIP AUTOMATIQUE DES TOOLTIPS ---
    function handleTooltipFlip(e: Event) {
        const container = e.currentTarget as HTMLElement;
        container.classList.remove("tooltip-flip"); // On reset pour mesurer sa position normale vers le haut
        const content = container.querySelector(".tooltip-content");
        
        if (content) {
            const rect = content.getBoundingClientRect();
            // Si le haut du tooltip dépasse l'écran (avec une marge de sécurité de 10px)
            if (rect.top < 10) {
                container.classList.add("tooltip-flip");
            }
        }
    }

    function renderSlots() {
        slotsContainer.innerHTML = "";
        
        // On demande au Backend toutes les données prêtes à être affichées
        const data = GameController.getSlotsData(targetSelect.value, Number(targetTier.value));
        
        data.slots.forEach(slot => {
            const slotDiv = document.createElement("div");
            slotDiv.className = "equipped-item";

            if (!slot.isEmpty) {
                const tierData = TIERS[slot.item.tier] || { Name: `T${slot.item.tier}`, Background: "#fafafa", Border: "#ccc" };
                slotDiv.style.backgroundColor = tierData.Background;
                
                // Détermination des couleurs de bordure
                let borderColor = tierData.Border; 
                if (slot.isInactive) {
                    slotDiv.style.opacity = "0.5";
                    slotDiv.style.filter = "grayscale(80%)";
                    slotDiv.style.borderStyle = "dashed";
                    slotDiv.style.borderColor = borderColor;
                } else if (slot.isFusion || slot.isMimic || slot.isJoystick || slot.isFission) {
                    if (slot.isFusion) borderColor = "#3498db";
                    else if (slot.isMimic) borderColor = "#9b59b6";   
                    else if (slot.isFission) borderColor = "#ff9ff3"; 
                    if (slot.isJoystick) borderColor = "#f39c12";    

                    slotDiv.style.borderColor = borderColor;
                    slotDiv.style.boxShadow = `inset 0 0 10px ${borderColor}50`;
                } else {
                    slotDiv.style.borderColor = borderColor;
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
                
                const displayTierName = TIERS[slot.displayTier]?.Name || `T${slot.displayTier}`;
                const displayTierColor = TIERS[slot.displayTier]?.Background || "#fff";
                const statTierName = TIERS[slot.statTier]?.Name || `T${slot.statTier}`;
                const statTierColor = TIERS[slot.statTier]?.Background || "#fff";

                let tierText = slot.statTier !== slot.displayTier 
                    ? `<span style="color: ${displayTierColor}; font-weight: bold;">${displayTierName}</span> <span style="color: #bdc3c7;">(Stats <span style="color: ${statTierColor};">${statTierName}</span>)</span>` 
                    : `<span style="color: ${displayTierColor}; font-weight: bold;">${displayTierName}</span>`;
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
                <div class="item-dps-tiny" style="display: ${slot.result.dps > 0 ? 'block' : 'none'}; background-color: ${borderColor}; color: #fff; text-shadow: 0px 1px 2px rgba(0,0,0,0.4);">
                    ${formatNumber(slot.result.dps)}
                </div>
                `;

                const tooltipContainer = slotDiv.querySelector('.tooltip-container');
                if (tooltipContainer) {
                    tooltipContainer.addEventListener("click", (e) => e.stopPropagation());
                    tooltipContainer.addEventListener("mouseenter", handleTooltipFlip);
                }

            } else {
                slotDiv.addEventListener("click", () => { GameController.unequipSlot(slot.index); refreshAll(); });
                slotDiv.style.borderStyle = "solid";
                slotDiv.style.borderColor = "#cbcbcb";
                slotDiv.style.backgroundColor = "#ffffff";
                slotDiv.innerHTML = ""; 
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
        targetStatsDiv.removeAttribute("style"); 

        if (targetObj) {
            const targetTierData = TIERS[currentTargetTier] || { Name: `T${currentTargetTier}`, Background: "#f8f8f8", Border: "#bdc3c7" };

            targetStatsDiv.innerHTML = `
                <div class="target-slot" style="background-color: ${targetTierData.Background}; border-color: ${targetTierData.Border};">
                    <div class="tooltip-container">
                        <span class="tooltip-icon">i</span>
                        <div class="tooltip-content" style="cursor: default;">
                            <div style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 8px;">
                                <span style="background: rgba(0,0,0,0.8); color: #fff; padding: 4px 8px; border-radius: 4px; display:inline-block; margin-bottom: 8px;">
                                    ${targetObj.name || currentTargetName} (<span style="color: ${targetTierData.Background}; font-weight: bold;">${targetTierData.Name}</span>)
                                </span>
                            </div>
                            <div style="display: grid; grid-template-columns: auto auto; column-gap: 15px; row-gap: 4px;">
                                <div><strong>Health:</strong> ${formatNumber(targetObj.health)}</div>
                                <div><strong>Damage:</strong> ${formatNumber(targetObj.damage)}</div>
                                <div><strong>Armor:</strong> ${formatNumber(targetObj.armor)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="target-name-large">
                        ${targetObj.name || currentTargetName}
                    </div>
                </div>
            `;
        } else {
            targetStatsDiv.innerHTML = `<div style="text-align: center; color: #777; width: 100%;">Impossible de charger la cible.</div>`;
        }
        // AJOUTEZ CECI POUR LE TOOLTIP DE LA CIBLE :
        const targetTooltip = targetStatsDiv.querySelector('.tooltip-container');
        if (targetTooltip) {
            targetTooltip.addEventListener("mouseenter", handleTooltipFlip);
        }
        // UI : Grille d'inventaire
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
            
            const tierData = TIERS[item.tier] || { Name: `T${item.tier}`, Background: "#fafafa", Border: "#ccc" };
            
            const slotDiv = document.createElement("div");
            slotDiv.className = "equipped-item";
            slotDiv.style.backgroundColor = tierData.Background;
            
            let borderColor = tierData.Border;
            if (available <= 0) {
                slotDiv.style.opacity = "0.5";
            }
            if (isTransformed) {
                borderColor = "#f39c12"; // Couleur spéciale Joystick
                slotDiv.style.borderColor = borderColor;
                slotDiv.style.boxShadow = `inset 0 0 10px #f39c1250`;
            } else {
                slotDiv.style.borderColor = borderColor;
            }

            // Statistiques détaillées pour le tooltip
            const statParts: string[] = [];
            if (item.health !== 0 && item.health !== undefined) statParts.push(`<div><strong>Health:</strong> ${formatNumber(item.health)}</div>`);
            if (item.damage !== 0 && item.damage !== undefined) statParts.push(`<div><strong>Damage:</strong> ${formatNumber(item.damage)}</div>`);
            if (item.armor !== 0 && item.armor !== undefined) statParts.push(`<div><strong>Armor:</strong> ${formatNumber(item.armor)}</div>`);
            if (item.reload !== 0 && item.reload !== undefined) statParts.push(`<div><strong>Reload:</strong> ${formatNumber(item.reload)}s</div>`);

            if (obj && obj.effects) {
                for (const effect of obj.effects) {
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
            if (item.dpsCategory && item.dpsCategory.length > 0) {
                const breakdownText = item.dpsCategory.map((cat: any) => `<div style="display:flex; justify-content:space-between; margin-bottom: 2px;"><span>${cat.type}:</span> <strong>${formatNumber(cat.dps)}</strong></div>`).join('');
                dpsBreakdown = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dotted rgba(0,0,0,0.3); color: #c0392b;">${breakdownText}</div>`;
            }
            
            const itemTierName = tierData.Name;
            const itemTierColor = tierData.Background;
            const tierHtml = `<span style="color: ${itemTierColor}; font-weight: bold;">${itemTierName}</span>`;

            const badgeHtml = isTransformed 
                ? `<span style="background: rgba(0,0,0,0.8); color: #f1c40f; padding: 4px 8px; border-radius: 4px; display:inline-block; margin-bottom: 8px;">Stick ➔ Joystick (${tierHtml})</span>`
                : `<span style="background: rgba(0,0,0,0.8); color: #fff; padding: 4px 8px; border-radius: 4px; display:inline-block; margin-bottom: 8px;">${item.name} (${tierHtml})</span>`;
            
            // HTML du slot d'inventaire
            slotDiv.innerHTML = `
                <div class="tooltip-container tooltip-left">
                    <span class="tooltip-icon">i</span>
                    <div class="tooltip-content" style="cursor: default;">
                        <div style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 8px;">
                            ${badgeHtml}
                        </div>
                        ${statsHtml} 
                        ${dpsBreakdown}
                        <div style="margin-top: 10px; display: flex; gap: 5px; border-top: 1px solid #eee; padding-top: 8px;">
                            <button class="inv-remove-one" style="flex:1; background: #e67e22; color: #fff; border: none; border-radius: 4px; padding: 4px; cursor: pointer;">-1</button>
                            <button class="inv-remove-all" style="flex:1; background: #e74c3c; color: #fff; border: none; border-radius: 4px; padding: 4px; cursor: pointer;">Del</button>
                        </div>
                    </div>
                </div>
                <div class="qty-badge">${equipped}/${item.quantity}</div>
                <div class="item-name-tiny" style="margin-top: 14px;" title="${item.name}">${effectiveName}</div>
            <div class="item-dps-tiny" style="display: ${(item.dps || 0) > 0 ? 'block' : 'none'}; background-color: ${borderColor}; color: #fff; text-shadow: 0px 1px 2px rgba(0,0,0,0.4);">
                            ${formatNumber(item.dps || 0)}
                                        </div>
            `;

            // Ajout des Events
            const tooltipContainer = slotDiv.querySelector('.tooltip-container');
            if (tooltipContainer) {
                tooltipContainer.addEventListener('click', (e) => e.stopPropagation());
                tooltipContainer.addEventListener('mouseenter', handleTooltipFlip);
            }

            const btnRemoveOne = slotDiv.querySelector('.inv-remove-one');
            if (btnRemoveOne) btnRemoveOne.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                GameController.removeOneItem(item.id); 
                refreshAll(); 
            });

            const btnRemoveAll = slotDiv.querySelector('.inv-remove-all');
            if (btnRemoveAll) btnRemoveAll.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                GameController.removeAllItems(item.id); 
                refreshAll(); 
            });

            // Equiper l'objet
            slotDiv.addEventListener('click', () => {
                if (available > 0 && hasEmptySlot) {
                    GameController.equipItem(item.id); 
                    refreshAll();
                }
            });

            inventoryGrid.appendChild(slotDiv);
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