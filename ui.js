const ui = {
    activeItems: [],
    equippedPetals: [],
    activeMob: null,
    isAscending: false,

    saveToLocal: () => {
        localStorage.setItem('zorr_dps_activeItems', JSON.stringify(ui.activeItems));
        localStorage.setItem('zorr_dps_equippedPetals', JSON.stringify(ui.equippedPetals));
    },

    loadFromLocal: () => {
        const active = localStorage.getItem('zorr_dps_activeItems');
        const equipped = localStorage.getItem('zorr_dps_equippedPetals');
        if (active) ui.activeItems = JSON.parse(active);
        if (equipped) ui.equippedPetals = JSON.parse(equipped);
    },

    exportInventory: () => {
        if (ui.activeItems.length === 0) {
            alert("Votre inventaire est vide, rien à exporter !");
            return;
        }
        
        // On crée un inventaire épuré avec uniquement les données essentielles
        const cleanInventory = ui.activeItems.map(p => ({
            name: p.name,
            tier: p.tier,
            ownedQuantity: p.ownedQuantity || 1
        }));

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanInventory, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "inventaire_petals.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    },

    importInventory: (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    
                    // On reconstruit complètement les statistiques des objets à partir de leur nom et tier
                    let reconstructedItems = [];
                    imported.forEach(imp => {
                        let baseDef = petals.find(p => p.name === imp.name);
                        if (!baseDef && typeof eggs !== 'undefined') {
                            baseDef = eggs.find(eg => eg.name === imp.name);
                        }

                        if (baseDef) {
                            let c = structuredClone(baseDef);
                            c.tier = imp.tier;
                            c.ownedQuantity = imp.ownedQuantity || 1;
                            
                            // Recalcul des multiplicateurs de stats
                            const m = Math.pow(3, c.tier);
                            if (c.health != null) c.health *= m; 
                            if (c.damage != null) c.damage *= m; 
                            if (c.armor != null) c.armor *= m;
                            const effs = c.specials || (c.special ? [c.special] : []);
                            effs.forEach(e => { if (e.damage != null) e.damage *= m; });
                            
                            // Recalcul des entités (pour les œufs ou les flaques)
                            let qty = 1;
                            if (c.entity != null) {
                                if (typeof c.entity === 'number') qty = c.entity;
                                else {
                                    const maxT = Math.max(...Object.keys(c.entity).map(Number));
                                    qty = c.entity[c.tier > maxT ? maxT : c.tier];
                                }
                            }
                            c.currentEntities = qty;
                            
                            reconstructedItems.push(c);
                        }
                    });

                    ui.activeItems = reconstructedItems;
                    ui.refresh();
                    alert("✅ Inventaire importé et reconstruit avec succès !");
                } else {
                    alert("Format invalide : Le fichier JSON doit être un tableau d'objets.");
                }
            } catch (err) {
                alert("Erreur lors de la lecture du fichier JSON : " + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = ""; 
    },

    exportBuild: () => {
        if (ui.equippedPetals.length === 0) {
            alert("Aucun build équipé à exporter !");
            return;
        }
        const effectiveEquipped = engine.getEffectivePetals(ui.equippedPetals);
        const stats = engine.getGlobalStats(effectiveEquipped);
        
        // Compile l'intégralité des statistiques brutes et calculées calcul après calcul
        const buildDetails = effectiveEquipped.map(p => {
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            const displayStats = engine.getDisplayStats(p, stats);
            return {
                name: p.name,
                tier: p.tier,
                originalName: p.originalName || null,
                originalTier: p.originalTier || null,
                entities: p.currentEntities || 1,
                calculatedStats: {
                    health: displayStats.health,
                    damage: displayStats.damage,
                    armor: displayStats.armor,
                    reload: displayStats.reload
                },
                performanceAgainstMob: {
                    targetMob: ui.activeMob ? `${ui.activeMob.name} (T${ui.activeMob.tier})` : "Aucun monstre sélectionné",
                    ticksBeforeDeath: perf.ticks,
                    totalDps: perf.baseDps,
                    physicalDps: perf.physicalDps,
                    poisonStackingDps: perf.stackingPoisonDps,
                    poisonNonStackingDps: perf.nonStackingPoisonDps,
                    fireStackingDps: perf.stackingFireDps,
                    fireNonStackingDps: perf.nonStackingFireDps,
                    lightningDps: perf.lightningDps,
                    healingHps: perf.healingHps
                }
            };
        });

        const exportData = {
            exportTime: new Date().toISOString(),
            activeMob: ui.activeMob,
            globalModifiers: {
                luckBonus: stats.luck,
                manaFlow: stats.manaRegen - stats.manaDrain,
                hpRegenGlobal: stats.hpRegen,
                shieldRegenGlobal: stats.shieldRegen,
                activeSupportsList: stats.activeSupports
            },
            build: buildDetails
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "build_stats_brutes.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    },

    refresh: () => {
        const effectiveEquipped = engine.getEffectivePetals(ui.equippedPetals);
        const stats = engine.getGlobalStats(effectiveEquipped);
        ui.renderTable(stats);
        ui.renderEquipped(effectiveEquipped, stats);
        ui.renderMob(stats); // <-- Ajout de 'stats' ici
        ui.renderStatPanel(stats);
        
        ui.saveToLocal();
    },

    renderStatPanel: (stats) => {
        const panel = document.getElementById('player-stats-display');
        let html = '';
        
        if (stats.luck > 0) {
            html += `<div>Total Luck Bonus: <strong>+${stats.luck.toFixed(2)}%</strong></div>`;
        }
        
        if (stats.manaRegen > 0 || stats.manaDrain > 0) {
            const manaBalance = stats.manaRegen - stats.manaDrain;
            const manaColor = manaBalance < 0 ? "#e74c3c" : "#3498db";
            html += `<div style="color: ${manaColor}; font-weight: bold; margin-top: 5px;">Mana Flow: ${manaBalance >= 0 ? '+' : ''}${manaBalance.toFixed(2)}/s (Regen: ${stats.manaRegen.toFixed(1)} | Drain: ${stats.manaDrain.toFixed(1)})</div>`;
        }

        let totalLocalHps = 0;
        const effectiveEquipped = engine.getEffectivePetals(ui.equippedPetals);
        effectiveEquipped.forEach(p => {
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            totalLocalHps += perf.healingHps || 0;
        });
        const finalHps = stats.hpRegen + totalLocalHps;
        
        if (finalHps > 0) {
            html += `<div style="color: #2ecc71; font-weight: bold; margin-top: 5px;">Total Health Regen: +${finalHps.toFixed(2)} HP/s</div>`;
        }

        if (stats.shieldRegen > 0) {
            html += `<div style="color: #00cec9; font-weight: bold; margin-top: 5px;">Total Shield Regen: +${stats.shieldRegen.toFixed(2)} SH/s</div>`;
        }

        const maxModsPetal = engine.getModifiersForTier(0, stats, "Petal");
        const maxModsPet = engine.getModifiersForTier(0, stats, "Pet");
        
        if (maxModsPetal.Damage > 1) {
            const bonusPercent = (maxModsPetal.Damage - 1) * 100;
            html += `<div style="color: #27ae60; font-weight: bold; margin-top: 5px;">Max Petal DMG Multiplier (T0): x${maxModsPetal.Damage.toFixed(2)} (+${bonusPercent.toFixed(1)}%)</div>`;
        }
        if (maxModsPet.Damage > 1) {
            const bonusPercent = (maxModsPet.Damage - 1) * 100;
            html += `<div style="color: #d35400; font-weight: bold; margin-top: 5px;">Max Pet DMG Multiplier (T0): x${maxModsPet.Damage.toFixed(2)} (+${bonusPercent.toFixed(1)}%)</div>`;
        }
        if (maxModsPetal.Health > 1) {
            const healthPercent = (maxModsPetal.Health - 1) * 100;
            html += `<div style="color: #e67e22; font-weight: bold; margin-top: 5px;">Max HP Multiplier (T0): x${maxModsPetal.Health.toFixed(2)} (+${healthPercent.toFixed(1)}%)</div>`;
        }
        if (maxModsPetal.Reload !== 0) {
            const reloadPercent = (maxModsPetal.Reload * 100).toFixed(1);
            html += `<div style="color: #8e44ad; font-weight: bold; margin-top: 5px;">Max Reload Speed (T0): ${reloadPercent > 0 ? '+' : ''}${reloadPercent}%</div>`;
        }
        if (maxModsPetal.SecondReload !== 0) {
            const secReloadPercent = (maxModsPetal.SecondReload * 100).toFixed(1);
            html += `<div style="color: #c0392b; font-weight: bold; margin-top: 5px;">Max Sec. Reload Speed (T0): ${secReloadPercent > 0 ? '+' : ''}${secReloadPercent}%</div>`;
        }
        if (maxModsPetal.reloadSkipChance > 0) {
            const skipPercent = (maxModsPetal.reloadSkipChance * 100).toFixed(1);
            html += `<div style="color: #f1c40f; font-weight: bold; margin-top: 5px;">Max Reload Skip Chance (T0): +${skipPercent}%</div>`;
        }
        if (maxModsPetal.mobDamageReduction > 0) {
            const mobDmgRedPercent = (maxModsPetal.mobDamageReduction * 100).toFixed(1);
            html += `<div style="color: #8e44ad; font-weight: bold; margin-top: 5px;">Max Mob DMG Reduction (T0): -${mobDmgRedPercent}%</div>`;
        }
        
        if (stats.activeSupports.length > 0) {
            html += `<div style="margin-top: 5px; font-size: 0.9em;"><strong>Active Supports:</strong></div>`;
            stats.activeSupports.forEach(b => {
                html += `<div style="color: #7f8c8d; margin-left: 10px;">└ ${b.name} (T${b.tier}): ${b.type} ${b.stat} <strong>${b.value}</strong> <em>${b.restriction || ''}</em></div>`;
            });
        }
        
        if (html === '') {
            html = '<div style="color: #7f8c8d; font-style: italic;">No active modifiers</div>';
        }
        panel.innerHTML = html;
    },

    getSpecDesc: (p) => {
        let desc = [];
        
        if (p.isEgg) {
            const petTier = typeof p.mobTier === 'object' ? (p.mobTier[p.tier] !== undefined ? p.mobTier[p.tier] : 0) : (p.mobTier || 0);
            desc.push(`Spawns T${petTier} Pet`);
        }
        
        if (p.isSpill) {
            desc.push(`Spill Puddle (5s)`);
        }

        const effs = p.specials || (p.special ? [p.special] : []);
        if (effs.length > 0) {
            const mappedEffs = effs.map(e => {
                if (e.type === "Magic") {
                    let magicInfo = [];
                    if (e.regen) magicInfo.push(`Regen +${e.regen * Math.pow(2, p.tier)}/s`);
                    if (e.cost) magicInfo.push(`Cost ${e.cost * Math.pow(2, p.tier)}`);
                    if (e.drain) magicInfo.push(`Drain -${e.drain * Math.pow(2, p.tier)}/s`);
                    if (e.petArmor) magicInfo.push(`Pet Armor +${e.petArmor * Math.pow(3, p.tier)}`);
                    return `Magic [${magicInfo.join(', ')}]`;
                }

                if (e.type === "Heal") {
                    const scale = Math.pow(3, p.tier);
                    if (e.regen) return `Heal Regen (+${(e.regen * scale).toFixed(1)}/s Global)`;
                    if (e.value) return `Heal on Cooldown (${(e.value * scale).toFixed(1)} HP)`;
                    if (e.onDamage) return `Heal on Tick (${(e.onDamage * scale).toFixed(1)} HP)`;
                }

                if (e.type === "Shield") {
                    const scale = Math.pow(3, p.tier);
                    if (e.regen) return `Shield Regen (+${(e.regen * scale).toFixed(1)}/s Global)`;
                }

                let val = e.value;
                if (typeof val === 'object' && val[0] !== undefined) {
                    const maxT = Math.max(...Object.keys(val).map(Number));
                    val = val[p.tier > maxT ? maxT : p.tier];
                }
                
                if (e.type === "Critical" && !e.global) {
                    return `Crit (x${val.multiplier} @ ${val.chance}%)`;
                }
                
                if (e.global) {
                    let restrictStr = e.tierRestricted ? `≤ T${p.tier}` : `All Tiers`;
                    if (e.target) restrictStr += `, ${e.target}s`;
                    const restrictText = `(${restrictStr})`;

                    if (e.type === "petMutation") {
                        let chanceVal = e.chance;
                        if (typeof chanceVal === 'object' && chanceVal[0] !== undefined) {
                            const maxT = Math.max(...Object.keys(chanceVal).map(Number));
                            chanceVal = chanceVal[p.tier > maxT ? maxT : p.tier];
                        }
                        return `Mutation (+${chanceVal}%) ${restrictText}`;
                    }
                    if (e.type === "reloadFactor") return `Reload Speed (${val > 0 ? '+' : ''}${val}%) ${restrictText}`;
                    if (e.type === "secondaryReloadFactor") return `Sec. Reload Speed (${val > 0 ? '+' : ''}${val}%) ${restrictText}`;
                    if (e.type === "petalHealthBuff") return `Health Buff (+${val}%) ${restrictText}`;
                    if (e.type === "petalReloadSkipRate") return `Reload Skip Chance (+${val}%) ${restrictText}`;
                    if (e.type === "mobDamageFactor") return `Mob Damage Reduction (-${val}%) ${restrictText}`;
                    if (e.type === "Luck") return `Luck (+${val}%)`;
                    if (e.type === "Critical") return `Crit Buff ${restrictText}`;
                    return `${e.type} ${e.stats} (+${val}%) ${restrictText}`;
                }
                
                if (e.type === "Poison" || e.type === "Fire") return `${e.type} (${e.damage}/s)`;
                if (e.type === "Lightning") return `Lightning`;
                if (e.type === "finalDamage") return `Damage on Death`;
                if (e.type === "joyStick") return `Transforms Sticks`;
                return e.type;
            });
            desc = desc.concat(mappedEffs);
        }
        
        return desc.length > 0 ? desc.join(", ") : "-";
    },

    renderTable: (stats) => {
        const tbody = document.getElementById('table-body');
        tbody.innerHTML = "";
        
        // Récupère le choix de la colonne variable
        const varColSelect = document.getElementById('variable-column-select');
        const varColVal = varColSelect ? varColSelect.value : 'special';
        const varColHeader = document.getElementById('variable-column-header');
        
        // Met à jour le titre de la colonne
        if (varColHeader) {
            if (varColVal === 'special') varColHeader.innerText = 'Special Effects';
            else if (varColVal === 'entities') varColHeader.innerText = 'Entities Qty';
            else if (varColVal === 'ticks') varColHeader.innerText = 'Survival Ticks';
        }

        ui.activeItems.forEach((p, i) => {
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            const row = document.createElement('tr');
            row.style.backgroundColor = engine.tierColors[p.tier] || 'transparent';
            
            const isPureSupport = !p.isEgg && !p.isSpill && (p.damage == null || p.health == null);
            const displayStats = engine.getDisplayStats(p, stats);
            
            const actualHealthStr = displayStats.health != null ? Math.round(displayStats.health).toLocaleString() : "-";
            const actualArmorStr = displayStats.armor != null ? Math.round(displayStats.armor).toLocaleString() : "-";
            const actualDamageStr = displayStats.damage != null ? Math.round(displayStats.damage).toLocaleString() : "-";
            let actualReloadStr = displayStats.reload != null ? displayStats.reload.toFixed(2) + "s" : "-";
            
            if (displayStats.reload === Infinity) actualReloadStr = "∞";

            const equippedCount = ui.equippedPetals.filter(eq => eq.name === p.name && eq.tier === p.tier).length;
            const ownedQty = p.ownedQuantity || 1;

            // Détermine ce qui doit s'afficher dans la colonne variable
            let variableContent = "";
            if (varColVal === 'special') variableContent = ui.getSpecDesc(p);
            else if (varColVal === 'entities') variableContent = p.currentEntities || 1;
            else if (varColVal === 'ticks') variableContent = perf.ticks;

            row.innerHTML = `
                <td>${p.name}</td><td>${p.tier}</td>
                <td><strong>${equippedCount} / ${ownedQty}</strong></td>
                <td>${actualHealthStr}</td>
                <td>${actualArmorStr}</td>
                <td>${actualDamageStr}</td>
                <td><strong>${actualReloadStr}</strong></td>
                <td>${variableContent}</td>
                <td><strong>${isPureSupport ? "SUPPORT" : (perf.baseDps || 0).toFixed(2)}</strong></td>
                <td>
                    <button onclick="ui.equip(${i})">Equip</button>
                    <button class="btn-delete" style="margin-left: 5px;" onclick="ui.removeActiveItem(${i})">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    renderEquipped: (effectiveEquipped, stats) => {
        const list = document.getElementById('slots-list');
        const totalDisp = document.querySelector('#total-dps-display strong');
        
        if (effectiveEquipped.length === 0) { list.innerHTML = "No items equipped"; totalDisp.innerText = "0.00 DPS"; return; }

        let maxP = 0, pIdx = -1, maxF = 0, fIdx = -1;
        effectiveEquipped.forEach((p, i) => {
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            if (perf.nonStackingPoisonDps > maxP) { maxP = perf.nonStackingPoisonDps; pIdx = i; }
            if (perf.nonStackingFireDps > maxF) { maxF = perf.nonStackingFireDps; fIdx = i; }
        });

        list.innerHTML = "";
        let totalDPS = 0;
        
        ui.equippedPetals.forEach((originalPetal, originalIndex) => {
            const effectiveVersion = effectiveEquipped.find(e => e.originalIndex === originalIndex) || originalPetal;
            const isConsumed = !effectiveEquipped.some(e => e === originalPetal || e.originalIndex === originalIndex);
            
            if (isConsumed) {
                const div = document.createElement('div');
                div.className = "equipped-item";
                div.style.backgroundColor = "#e0e0e0"; 
                div.style.color = "#7f8c8d";
                div.innerHTML = `
                    <div class="item-main-row" style="font-size: 0.9em; opacity: 0.8;">
                        <span>${originalPetal.name} (T${originalPetal.tier}) ➔ <em>Fusioned</em></span>
                        <button class="btn-delete" onclick="ui.unequip(${originalIndex})">X</button>
                    </div>
                `;
                list.appendChild(div);
                return; 
            }

            const p = effectiveVersion;
            
            const isPureSupport = !p.isEgg && !p.isSpill && (p.damage == null || p.health == null) && !p.originalName && !p.specials?.some(e => e.type === "Heal" && e.regen);
            
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            const nsp = (originalIndex === pIdx) ? perf.nonStackingPoisonDps : 0;
            const nsf = (originalIndex === fIdx) ? perf.nonStackingFireDps : 0;
            const dps = perf.physicalDps + perf.stackingPoisonDps + nsp + perf.stackingFireDps + nsf + perf.lightningDps;
            
            totalDPS += dps;

            const displayStats = engine.getDisplayStats(p, stats);
            const actualHealthStr = displayStats.health != null ? Math.round(displayStats.health).toLocaleString() : "-";

            const div = document.createElement('div');
            div.className = "equipped-item";
            div.style.backgroundColor = engine.tierColors[p.tier];
            
            let resultDisplay = "";
            if (isPureSupport) resultDisplay = "SUPPORT";
            else if (dps > 0) resultDisplay += `${dps.toFixed(2)} DPS`;

            let nameDisplay = p.name;
            let tierDisplay = `(T${p.tier})`;
            if (p.originalName) {
                nameDisplay = `${p.originalName} (T${p.originalTier}) ➔ ${p.name}`;
            }
            const entitiesDisplay = p.currentEntities && p.currentEntities > 1 ? ` x${p.currentEntities}` : '';

            div.innerHTML = `
                <div class="item-main-row">
                    <span>${nameDisplay}${entitiesDisplay} ${p.originalName ? tierDisplay : tierDisplay}</span>
                    <span>${resultDisplay}</span>
                    <button class="btn-delete" onclick="ui.unequip(${originalIndex})">X</button>
                </div>
                ${isPureSupport ? '' : `<div class="dps-details">Phys: ${perf.physicalDps.toFixed(2)} | Poison: ${(perf.stackingPoisonDps + nsp).toFixed(2)} | Fire: ${(perf.stackingFireDps + nsf).toFixed(2)} | Light: ${perf.lightningDps.toFixed(2)} ${p.isSpill ? '' : '| HP: ' + actualHealthStr}</div>`}
            `;
            list.appendChild(div);
        });
        
        totalDisp.innerHTML = `${totalDPS.toLocaleString(undefined, {minimumFractionDigits: 2})} DPS`;
    },

    renderMob: (stats) => {
        const d = document.getElementById('active-mob-display');
        if (!ui.activeMob) { d.innerHTML = "No mob selected"; return; }
        d.style.backgroundColor = engine.tierColors[ui.activeMob.tier];
        
        // Calcul visuel des dégâts réduits
        let actualDamage = ui.activeMob.damage;
        if (stats) {
            const mods = engine.getModifiersForTier(0, stats, "Petal"); // On récupère la stat globale
            actualDamage = ui.activeMob.damage * Math.max(0, 1 - (mods.mobDamageReduction || 0));
        }

        d.innerHTML = `<strong>${ui.activeMob.name} (T${ui.activeMob.tier})</strong><br>H: ${Math.round(ui.activeMob.health).toLocaleString()} | D: ${Math.round(actualDamage).toLocaleString()} | A: ${Math.round(ui.activeMob.armor).toLocaleString()}`;
    },

    equip: (i) => {
        const item = ui.activeItems[i];
        
        if (item.stack === false && ui.equippedPetals.some(p => p.name === item.name)) {
            alert(`Vous ne pouvez pas équiper plusieurs ${item.name} ! (Stack désactivé)`);
            return;
        }
        
        const owned = item.ownedQuantity || 1;
        const equippedCount = ui.equippedPetals.filter(p => p.name === item.name && p.tier === item.tier).length;
        if (equippedCount >= owned) {
            alert(`Vous ne possédez que ${owned}x ${item.name} (T${item.tier}) ! Vous ne pouvez pas en équiper plus.`);
            return;
        }

        ui.equippedPetals.push(structuredClone(item));
        ui.refresh();
    },
    
    unequip: (i) => { ui.equippedPetals.splice(i, 1); ui.refresh(); },
    
    removeActiveItem: (i) => { 
        const item = ui.activeItems[i];
        ui.equippedPetals = ui.equippedPetals.filter(p => !(p.name === item.name && p.tier === item.tier));
        ui.activeItems.splice(i, 1); 
        ui.refresh(); 
    },

    sortByDPS: () => { 
        const effectiveEquipped = engine.getEffectivePetals(ui.equippedPetals);
        const stats = engine.getGlobalStats(effectiveEquipped);
        ui.activeItems.sort((a,b) => engine.calculatePerformance(b, ui.activeMob, stats).baseDps - engine.calculatePerformance(a, ui.activeMob, stats).baseDps); 
        ui.renderTable(stats); 
        ui.saveToLocal(); 
    },
    
    sortTable: (key) => { 
        ui.activeItems.sort((a,b) => {
            if(a[key] == null) return 1;
            if(b[key] == null) return -1;
            return a[key] > b[key] ? 1 : -1;
        }); 
        ui.refresh(); 
    }
};

window.openPetalLightbox = () => {
    document.getElementById('petal-lightbox').style.display = 'block';
    const list = document.getElementById('petal-selection-list');
    list.innerHTML = "";
    petals.forEach((p, i) => {
        if (p.health == null || p.damage == null) {
            if(!p.isSpill && !p.specials?.some(e => e.type === "Heal") && !p.special?.type === "Heal" && p.name !== "Mimic" && p.name !== "Fission" && p.name !== "Fusion") return; 
        }
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.name}</span><button onclick="addPetalToTable(${i})">Add</button>`;
        list.appendChild(li);
    });
};

window.closePetalLightbox = () => document.getElementById('petal-lightbox').style.display = 'none';

window.openEggLightbox = () => {
    document.getElementById('egg-lightbox').style.display = 'block';
    const list = document.getElementById('egg-selection-list');
    list.innerHTML = "";
    eggs.forEach((e, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${e.name}</span><button onclick="addEggToTable(${i})" style="background: #f39c12;">Add</button>`;
        list.appendChild(li);
    });
};

window.closeEggLightbox = () => document.getElementById('egg-lightbox').style.display = 'none';

window.openSupportLightbox = () => {
    document.getElementById('support-lightbox').style.display = 'block';
    const list = document.getElementById('support-selection-list');
    list.innerHTML = "";
    petals.forEach((p, i) => {
        const hasSupport = p.name === "Mimic" || p.name === "Fission" || p.name === "Fusion" || (p.specials || (p.special ? [p.special] : [])).some(e => e.global === true || e.type === "Magic" || (e.type === "Heal" && e.regen) || (e.type === "Shield" && e.regen));
        if (!hasSupport) return;
        
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.name}</span><button onclick="addSupportToSlots(${i})" class="btn-add-support" style="margin:0;">Equip</button>`;
        list.appendChild(li);
    });
};

window.closeSupportLightbox = () => document.getElementById('support-lightbox').style.display = 'none';

window.addSupportToSlots = (idx) => {
    const t = parseInt(document.getElementById('support-tier-selection').value) || 0;
    const q = parseInt(document.getElementById('support-quantity-input').value) || 1;
    const c = structuredClone(petals[idx]);
    c.tier = t; 
    
    let existingIdx = ui.activeItems.findIndex(item => item.name === c.name && item.tier === c.tier);
    
    if (existingIdx === -1) {
        c.ownedQuantity = q;
        const m = Math.pow(3, t);
        if (c.health != null) c.health *= m; 
        if (c.damage != null) c.damage *= m; 
        if (c.armor != null) c.armor *= m;
        const effs = c.specials || (c.special ? [c.special] : []);
        effs.forEach(e => { if (e.damage != null) e.damage *= m; });
        
        let qty = 1;
        if (c.entity != null) {
            if (typeof c.entity === 'number') qty = c.entity;
            else {
                const maxT = Math.max(...Object.keys(c.entity).map(Number));
                qty = c.entity[t > maxT ? maxT : t];
            }
        }
        c.currentEntities = qty;
        
        ui.activeItems.push(c);
        existingIdx = ui.activeItems.length - 1;
    }
    
    ui.equip(existingIdx);
    window.closeSupportLightbox();
};

window.addPetalToTable = (idx) => {
    const t = parseInt(document.getElementById('tier-selection').value) || 0;
    const q = parseInt(document.getElementById('petal-quantity-input').value) || 1;
    const c = structuredClone(petals[idx]);
    c.tier = t; 
    c.ownedQuantity = q;

    if (ui.activeItems.some(item => item.name === c.name && item.tier === c.tier)) {
        alert(`L'élément ${c.name} (T${c.tier}) est déjà dans le comparateur !`);
        return;
    }
    
    const m = Math.pow(3, t);
    if (c.health != null) c.health *= m; 
    if (c.damage != null) c.damage *= m; 
    if (c.armor != null) c.armor *= m;
    const effs = c.specials || (c.special ? [c.special] : []);
    effs.forEach(e => { if (e.damage != null) e.damage *= m; });
    
    let qty = 1;
    if (c.entity != null) {
        if (typeof c.entity === 'number') qty = c.entity;
        else {
            const maxT = Math.max(...Object.keys(c.entity).map(Number));
            qty = c.entity[t > maxT ? maxT : t];
        }
    }
    c.currentEntities = qty;
    
    ui.activeItems.push(c);
    ui.refresh();
    closePetalLightbox();
};

window.addEggToTable = (idx) => {
    const t = parseInt(document.getElementById('egg-tier-selection').value) || 0;
    const q = parseInt(document.getElementById('egg-quantity-input').value) || 1;
    const c = structuredClone(eggs[idx]);
    c.tier = t; 
    c.ownedQuantity = q;

    if (ui.activeItems.some(item => item.name === c.name && item.tier === c.tier)) {
        alert(`L'œuf ${c.name} (T${c.tier}) est déjà dans le comparateur !`);
        return;
    }
    
    let qty = 1;
    if (c.entity != null) {
        if (typeof c.entity === 'number') qty = c.entity;
        else {
            const maxT = Math.max(...Object.keys(c.entity).map(Number));
            qty = c.entity[t > maxT ? maxT : t];
        }
    }
    c.currentEntities = qty;
    
    ui.activeItems.push(c);
    ui.refresh();
    closeEggLightbox();
};

window.openMobLightbox = () => {
    document.getElementById('mob-lightbox').style.display = 'block';
    const list = document.getElementById('mob-selection-list');
    list.innerHTML = "";
    mobs.forEach((m, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${m.name}</span><button onclick="selectMob(${i})">Select</button>`;
        list.appendChild(li);
    });
};

window.closeMobLightbox = () => document.getElementById('mob-lightbox').style.display = 'none';

window.selectMob = (idx) => {
    const t = parseInt(document.getElementById('mob-tier-selection').value) || 0;
    const f = [3.75, 3.6, 4, 7.5, 6, 15, 12];
    let hm = 1; for (let i = 0; i < t; i++) hm *= (f[i] || 1);
    const sm = Math.pow(3, t);
    
    ui.activeMob = structuredClone(mobs[idx]);
    ui.activeMob.tier = t;
    ui.activeMob.health *= hm;
    ui.activeMob.damage *= sm;
    ui.activeMob.armor *= sm;
    
    ui.refresh();
    closeMobLightbox();
};

window.openOptimizerLightbox = () => {
    document.getElementById('optimizer-lightbox').style.display = 'block';
    const list = document.getElementById('optimizer-selection-list');
    list.innerHTML = "";
    
    if(ui.activeItems.length === 0) {
        list.innerHTML = "<li><em>Votre inventaire est vide. Ajoutez des pétales dans le tableau principal d'abord.</em></li>";
        return;
    }

    ui.activeItems.forEach((p, i) => {
        const owned = p.ownedQuantity || 1;
        const li = document.createElement('li');
        li.style.justifyContent = "flex-start";
        li.innerHTML = `
            <label style="display:flex; align-items:center; cursor:pointer; width:100%;">
                <input type="checkbox" class="opti-checkbox" value="${i}" checked style="margin-right:10px; width: 18px; height: 18px;">
                <span><strong>${p.name}</strong> (T${p.tier}) - Quantité max: ${owned}</span>
            </label>
        `;
        list.appendChild(li);
    });
};

window.closeOptimizerLightbox = () => document.getElementById('optimizer-lightbox').style.display = 'none';

window.runOptimizer = () => {
    const slots = parseInt(document.getElementById('optimizer-slots').value) || 5;
    const checkboxes = document.querySelectorAll('.opti-checkbox:checked');
    const selectedItems = Array.from(checkboxes).map(cb => ui.activeItems[cb.value]);
    
    if (selectedItems.length === 0) {
        alert("Sélectionnez au moins une pétale à optimiser !");
        return;
    }
    
    // Fermer l'interface et lancer le calcul
    window.closeOptimizerLightbox();
    
    // Petit délai (setTimeout) pour laisser le navigateur fermer la modale avant le gros calcul
    setTimeout(() => {
        const bestBuild = optimizer.findBestBuild(selectedItems, slots, ui.activeMob);
        if (bestBuild) {
            ui.equippedPetals = bestBuild;
            ui.refresh();
            alert("✅ Build optimisé trouvé et équipé !");
        }
    }, 50);
};

window.onload = () => {
    ui.loadFromLocal();
    ui.refresh();
};