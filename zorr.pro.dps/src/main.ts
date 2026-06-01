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
    getProcessedInventory, getEquippedSlots, getEquippedCount, getItemById, MAX_SLOTS,
    getEffectiveBuild // AJOUT : On importe la fonction qui calcule le positionnement des Mimics
} from "./inventory";
import { TIER_COLORS } from "./constants";

const allData: Record<string, any> = {
    ...petals,
    ...mobs,
    ...spills,
    ...eggs,
    ...utilities,
    ...radiation
};

const formatNum = (num: number | undefined) => {
    return num !== undefined ? Number(num.toFixed(2)) : "-";
};

document.addEventListener("DOMContentLoaded", () => {
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
    
    const filterTypeSelect = document.getElementById("filter-type") as HTMLSelectElement;

    Object.keys(allData).sort().forEach(name => itemSelect.add(new Option(name, name)));
    Object.keys(mobs).sort().forEach(name => targetSelect.add(new Option(name, name)));

    function renderSlots() {
        slotsContainer.innerHTML = "";
        
        // On récupère directement le build transformé (Mimic déjà résolu)
        const effectiveBuild = getEffectiveBuild();
        let totalDps = 0; 
        
        // On récupère le statut de synergie ET le tier du joystick depuis PlayerValue
        const hasJoystickActive = (PlayerValue as any).petal?.hasJoystick?.active || false;
        const joystickTier = (PlayerValue as any).petal?.hasJoystick?.tier || 0;

        for (let i = 0; i < MAX_SLOTS; i++) {
            const item = effectiveBuild[i];
            const slotDiv = document.createElement("div");
            slotDiv.className = "equipped-item";

            if (item) {
                // On lit les propriétés transformées (si elles existent, suite au passage du Mimic)
                let effectiveName = item.transformed ? item.transformed.name : item.name;
                let effectiveTier = item.transformed ? item.transformed.tier : item.tier;

                const isMimic = item.transformed?.synergy === "mimic";
                let isJoystick = false;

                // Application de la synergie visuelle (Joystick) sur l'objet effectif
                // Règle : le nom devient joystick si on est un stick avec un tier inférieur ou égal
                if (hasJoystickActive && effectiveName.toLowerCase() === "stick" && effectiveTier <= joystickTier) {
                    effectiveName = "joystick";
                    isJoystick = true;
                }

                // Calculs avec effectiveTier
                const result = DpsCalculator.calculateDps(effectiveName, effectiveTier, targetSelect.value, Number(targetTier.value));
                totalDps += result.dps;
                
                const obj = getObject(effectiveName, effectiveTier);
                const itemReload = obj ? ((obj.reload || 0) + (obj.secondReload || 0)) : 0;
                const itemHealth = obj ? obj.health : item.health;
                const itemDamage = obj ? obj.damage : item.damage;
                const itemArmor = obj ? obj.armor : item.armor;

                // On garde la couleur de fond de l'objet d'origine (Mimic ou Stick) pour la clarté visuelle
                const tierColor = TIER_COLORS[item.tier] || "#fafafa";
                slotDiv.style.backgroundColor = tierColor;
                slotDiv.style.color = "#000";
                
                // Bordures dynamiques
                if (isMimic || isJoystick) {
                    const borderColor = isMimic ? "#9b59b6" : "#f39c12"; // Violet pour Mimic, Doré pour Joystick
                    slotDiv.style.border = `2px solid ${borderColor}`; 
                    slotDiv.style.boxShadow = `inset 0 0 10px ${borderColor}40`; // Hex 40 = ~25% d'opacité
                }
                
                let dpsBreakdown = "";
                if (result.dpsCategory && result.dpsCategory.length > 0) {
                    const breakdownText = result.dpsCategory.map((cat: any) => `<strong>${cat.type}:</strong> ${formatNum(cat.dps)}`).join(' | ');
                    dpsBreakdown = `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px dotted rgba(0,0,0,0.2); color: #c0392b;">${breakdownText}</div>`;
                }

                // Badges adaptatifs selon les synergies superposées
                let badgeHtml = "";
                if (isMimic && isJoystick) {
                    badgeHtml = `<span style="background: rgba(0,0,0,0.8); color: #f1c40f; padding: 2px 6px; border-radius: 4px;">Mimic ➔ Joystick (T${effectiveTier})</span>`;
                } else if (isMimic) {
                    badgeHtml = `<span style="background: rgba(0,0,0,0.8); color: #e056fd; padding: 2px 6px; border-radius: 4px;">Mimic ➔ ${effectiveName} (T${effectiveTier})</span>`;
                } else if (isJoystick) {
                    badgeHtml = `<span style="background: rgba(0,0,0,0.8); color: #f1c40f; padding: 2px 6px; border-radius: 4px;">Stick ➔ Joystick (T${effectiveTier})</span>`;
                } else {
                    badgeHtml = `<span style="background: rgba(255,255,255,0.6); padding: 2px 6px; border-radius: 4px;">${item.name} (T${item.tier})</span>`;
                }

                slotDiv.innerHTML = `
                    <div class="item-main-row">
                        ${badgeHtml}
                        <span style="background: rgba(255,255,255,0.8); padding: 2px 6px; border-radius: 4px;">${formatNum(result.dps)} DPS</span>
                    </div>
                    <div class="dps-details" style="color: #111; border-top-color: rgba(0,0,0,0.3); font-weight: 500;">
                        Health: ${formatNum(itemHealth)} | Damage: ${formatNum(itemDamage)} | Armor: ${formatNum(itemArmor)} | Reload: ${formatNum(itemReload)}s
                        ${dpsBreakdown}
                    </div>
                `;
                slotDiv.addEventListener("click", () => {
                    unequipSlot(i);
                    refreshAll();
                });
            } else {
                unequipSlot(i);
                slotDiv.style.borderStyle = "dashed";
                slotDiv.style.backgroundColor = "#fafafa";
                slotDiv.innerHTML = `<div class="item-main-row" style="color: #aaa; justify-content: center;">Empty Slot</div>`;
            }
            slotsContainer.appendChild(slotDiv);
        }

        const totalDiv = document.createElement("div");
        totalDiv.id = "total-dps-display";
        totalDiv.innerHTML = `Total DPS: <strong>${formatNum(totalDps)}</strong>`;
        slotsContainer.appendChild(totalDiv);
    }

    function renderInventory() {
        const currentTargetName = targetSelect.value;
        const currentTargetTier = Number(targetTier.value);

        const targetObj = getObject(currentTargetName, currentTargetTier);
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
                    H: ${formatNum(targetObj.health)} | D: ${formatNum(targetObj.damage)} | A: ${formatNum(targetObj.armor)}
                </span>
            `;
        } else {
            targetStatsDiv.style.backgroundColor = "#f8f8f8";
            targetStatsDiv.style.color = "#222";
            targetStatsDiv.innerHTML = `Impossible de charger la cible.`;
        }

        const hasJoystickActive = (PlayerValue as any).petal?.hasJoystick?.active || false;
        const joystickTier = (PlayerValue as any).petal?.hasJoystick?.tier || 0;
        
        let inventoryItems = getProcessedInventory(currentTargetName, currentTargetTier, hasJoystickActive, joystickTier);
        
        if (filterTypeSelect && filterTypeSelect.value !== "all") {
            inventoryItems = inventoryItems.filter(item => {
                const obj = getObject(item.name, item.tier);
                if (!obj) return false;

                switch (filterTypeSelect.value) {
                    case "default":
                        return (item.dps || 0) > 0;
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
                    case "egg":
                        return obj.type === "egg";
                    case "spill":
                        return obj.type === "spill";
                    default:
                        return true;
                }
            });
        }

        tbody.innerHTML = ""; 

        if (inventoryItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #777;">Inventaire vide ou aucun objet ne correspond au filtre.</td></tr>`;
            return;
        }

        const slots = getEquippedSlots();
        const hasEmptySlot = slots.includes(null);

        inventoryItems.forEach(item => {
            const tr = document.createElement("tr");
            
            const tierColor = TIER_COLORS[item.tier] || "transparent";
            tr.style.backgroundColor = tierColor;
            tr.style.color = "#000"; 
            tr.style.fontWeight = "500"; 

            const equipped = getEquippedCount(item.id);
            const available = item.quantity - equipped;

            const isTransformed = hasJoystickActive && item.name.toLowerCase() === "stick" && item.tier <= joystickTier;

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
            tdHealth.textContent = formatNum(item.health);

            const tdArmor = document.createElement("td");
            tdArmor.textContent = formatNum(item.armor);

            const tdDamage = document.createElement("td");
            tdDamage.textContent = formatNum(item.damage);

            const tdReload = document.createElement("td");
            tdReload.textContent = formatNum(item.reload) + "s";

            const tdDps = document.createElement("td");
            tdDps.innerHTML = `<strong>${formatNum(item.dps)}</strong>`;

            const tdActions = document.createElement("td");
            const actionContainer = document.createElement("div");
            actionContainer.style.display = "flex";
            actionContainer.style.gap = "5px";

            const equipBtn = document.createElement("button");
            equipBtn.textContent = "Equip";
            equipBtn.style.flex = "1";
            if (available <= 0 || !hasEmptySlot) equipBtn.disabled = true;
            equipBtn.addEventListener("click", () => {
                equipItem(item.id);
                refreshAll();
            });

            const removeOneBtn = document.createElement("button");
            removeOneBtn.textContent = "-1";
            removeOneBtn.addEventListener("click", () => {
                removeOneItem(item.id);
                refreshAll();
            });

            const removeAllBtn = document.createElement("button");
            removeAllBtn.textContent = "Del";
            removeAllBtn.addEventListener("click", () => {
                removeAllItems(item.id);
                refreshAll();
            });

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

        for (const category of Object.keys(baseState)) {
            const baseCat = baseState[category];
            const currCat = (PlayerValue as any)[category];
            
            if (typeof baseCat === "object" && baseCat !== null) {
                for (const stat of Object.keys(baseCat)) {
                    if (stat === "hasJoystick") continue;

                    if (typeof baseCat[stat] === "object" && baseCat[stat] !== null) {
                        for (const sub of Object.keys(baseCat[stat])) {
                            if (currCat[stat][sub] !== baseCat[stat][sub]) {
                                let val = currCat[stat][sub];
                                if (typeof val === "number") val = Number(val.toFixed(3));

                                let prefix = "";
                                if (baseCat[stat][sub] === 1) prefix = "x";

                                html += `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 4px 0;">
                                            <span>${category}.${stat}.${sub}</span>
                                            <strong style="color: #27ae60;">${prefix}${val}</strong>
                                         </div>`;
                            }
                        }
                    } else {
                        if (currCat[stat] !== baseCat[stat]) {
                            let val = currCat[stat];
                            if (typeof val === "number") val = Number(val.toFixed(3));
                            
                            let prefix = "";
                            if (baseCat[stat] === 1) prefix = "x";
                            
                            html += `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 4px 0;">
                                        <span>${category}.${stat}</span>
                                        <strong style="color: #27ae60;">${prefix}${val}</strong>
                                     </div>`;
                        }
                    }
                }
            }
        }

        if ((PlayerValue as any).petal?.hasJoystick?.active) {
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
        PlayerValue.reset();
        const baseState = JSON.parse(JSON.stringify(PlayerValue));
        
        PlayerValue.updateFromSlots();

        renderSlots();
        renderInventory();
        renderPlayerStats(baseState); 
    }

    btnAdd.addEventListener("click", () => {
        addItem(itemSelect.value, Number(itemTier.value), Number(itemQty.value));
        refreshAll();
    });

    filterTypeSelect.addEventListener("change", refreshAll);
    targetSelect.addEventListener("change", refreshAll);
    targetTier.addEventListener("input", refreshAll);

    refreshAll();
});