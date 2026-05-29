const ui = {
    activeItems: [],
    equippedPetals: [],
    activeMob: null,
    isAscending: false,

    // Fonction centralisée pour formater les nombres (finit les .toLocaleString() répétés 100 fois !)
    format: (val, isTime = false) => {
        if (val === Infinity) return "∞";
        if (val == null) return "-";
        return isTime ? val.toFixed(2) + "s" : Math.round(val).toLocaleString();
    },

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
        if (ui.activeItems.length === 0) return alert("Votre inventaire est vide, rien à exporter !");
        const cleanInventory = ui.activeItems.map(p => ({ name: p.name, tier: p.tier, ownedQuantity: p.ownedQuantity || 1 }));
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
                    // Refactorisation majeure : on utilise engineUtils pour reconstruire l'inventaire en 5 lignes !
                    ui.activeItems = imported.map(imp => {
                        let baseDef = petals.find(p => p.name === imp.name) || (typeof eggs !== 'undefined' ? eggs.find(eg => eg.name === imp.name) : null);
                        if (!baseDef) return null;
                        let newItem = engineUtils.scalePetal(baseDef, imp.tier);
                        newItem.ownedQuantity = imp.ownedQuantity || 1;
                        return newItem;
                    }).filter(item => item !== null);
                    
                    ui.refresh();
                    alert("✅ Inventaire importé et reconstruit avec succès !");
                } else alert("Format invalide : Le fichier JSON doit être un tableau d'objets.");
            } catch (err) { alert("Erreur lors de la lecture du fichier JSON : " + err.message); }
        };
        reader.readAsText(file);
        event.target.value = ""; 
    },

    exportBuild: () => {
        if (ui.equippedPetals.length === 0) return alert("Aucun build équipé à exporter !");
        
        const effectiveEquipped = engine.getEffectivePetals(ui.equippedPetals);
        const stats = engine.getGlobalStats(effectiveEquipped);
        
        const buildDetails = effectiveEquipped.map(p => {
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            const displayStats = engine.getDisplayStats(p, stats);
            return {
                name: p.name, tier: p.tier, originalName: p.originalName || null, originalTier: p.originalTier || null, entities: p.currentEntities || 1,
                calculatedStats: { health: displayStats.health, damage: displayStats.damage, armor: displayStats.armor, reload: displayStats.reload },
                performanceAgainstMob: { targetMob: ui.activeMob ? `${ui.activeMob.name} (T${ui.activeMob.tier})` : "Aucun monstre", ticksBeforeDeath: perf.ticks, totalDps: perf.baseDps, physicalDps: perf.physicalDps, poisonStackingDps: perf.stackingPoisonDps, poisonNonStackingDps: perf.nonStackingPoisonDps, fireStackingDps: perf.stackingFireDps, fireNonStackingDps: perf.nonStackingFireDps, lightningDps: perf.lightningDps, healingHps: perf.healingHps }
            };
        });

        const exportData = {
            exportTime: new Date().toISOString(), activeMob: ui.activeMob,
            globalModifiers: { luckBonus: stats.luck, manaFlow: stats.manaRegen - stats.manaDrain, hpRegenGlobal: stats.hpRegen, shieldRegenGlobal: stats.shieldRegen, activeSupportsList: stats.activeSupports },
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
        ui.renderMob(stats); 
        ui.renderStatPanel(stats);
        ui.saveToLocal();
    },

    renderStatPanel: (stats) => {
        const panel = document.getElementById('player-stats-display');
        let html = '';
        const addStat = (condition, color, text) => { if (condition) html += `<div style="color: ${color}; font-weight: bold; margin-top: 5px;">${text}</div>`; };

        if (stats.luck > 0) html += `<div>Total Luck Bonus: <strong>+${stats.luck.toFixed(2)}%</strong></div>`;
        
        if (stats.manaRegen > 0 || stats.manaDrain > 0) {
            const manaBalance = stats.manaRegen - stats.manaDrain;
            addStat(true, manaBalance < 0 ? "#e74c3c" : "#3498db", `Mana Flow: ${manaBalance >= 0 ? '+' : ''}${manaBalance.toFixed(2)}/s (Regen: ${stats.manaRegen.toFixed(1)} | Drain: ${stats.manaDrain.toFixed(1)})`);
        }

        const finalHps = stats.hpRegen + engine.getEffectivePetals(ui.equippedPetals).reduce((sum, p) => sum + (engine.calculatePerformance(p, ui.activeMob, stats).healingHps || 0), 0);
        
        addStat(finalHps > 0, "#2ecc71", `Total Health Regen: +${finalHps.toFixed(2)} HP/s`);
        addStat(stats.shieldRegen > 0, "#00cec9", `Total Shield Regen: +${stats.shieldRegen.toFixed(2)} SH/s`);

        const pMods = engine.getModifiersForTier(0, stats, "Petal");
        const eMods = engine.getModifiersForTier(0, stats, "Pet");
        
        addStat(pMods.Damage > 1, "#27ae60", `Max Petal DMG Multiplier (T0): x${pMods.Damage.toFixed(2)} (+${((pMods.Damage - 1) * 100).toFixed(1)}%)`);
        addStat(eMods.Damage > 1, "#d35400", `Max Pet DMG Multiplier (T0): x${eMods.Damage.toFixed(2)} (+${((eMods.Damage - 1) * 100).toFixed(1)}%)`);
        addStat(pMods.Health > 1, "#e67e22", `Max HP Multiplier (T0): x${pMods.Health.toFixed(2)} (+${((pMods.Health - 1) * 100).toFixed(1)}%)`);
        
        // Correction de l'affichage du Reload : on vérifie !== 1 puisque le multiplicateur de base est désormais 1.
        addStat(pMods.Reload !== 1, "#8e44ad", `Max Reload Speed (T0): ${pMods.Reload > 1 ? '+' : ''}${((pMods.Reload - 1) * 100).toFixed(1)}%`);
        addStat(pMods.SecondReload !== 1, "#c0392b", `Max Sec. Reload Speed (T0): ${pMods.SecondReload > 1 ? '+' : ''}${((pMods.SecondReload - 1) * 100).toFixed(1)}%`);
        
        addStat(pMods.reloadSkipChance > 0, "#f1c40f", `Max Reload Skip Chance (T0): +${(pMods.reloadSkipChance * 100).toFixed(1)}%`);
        addStat(pMods.mobDamageReduction > 0, "#8e44ad", `Max Mob DMG Reduction (T0): -${(pMods.mobDamageReduction * 100).toFixed(1)}%`);
        addStat(pMods.petalHeal > 0, "#e84393", `Max Petal HP Regen (T0): +${pMods.petalHeal.toLocaleString()} HP/s`);
        
        if (stats.activeSupports.length > 0) {
            html += `<div style="margin-top: 5px; font-size: 0.9em;"><strong>Active Supports:</strong></div>`;
            stats.activeSupports.forEach(b => html += `<div style="color: #7f8c8d; margin-left: 10px;">└ ${b.name} (T${b.tier}): ${b.type} ${b.stat} <strong>${b.value}</strong> <em>${b.restriction || ''}</em></div>`);
        }
        
        panel.innerHTML = html === '' ? '<div style="color: #7f8c8d; font-style: italic;">No active modifiers</div>' : html;
    },

    getSpecDesc: (p) => {
        let desc = [];
        if (p.isEgg) desc.push(`Spawns T${engineUtils.getVal(p.mobTier || 0, p.tier)} Pet`);
        if (p.isSpill) desc.push(`Spill Puddle (5s)`);

        const effs = p.specials || (p.special ? [p.special] : []);
        if (effs.length > 0) {
            desc = desc.concat(effs.map(e => {
                if (e.type === "Magic") {
                    let m = [];
                    if (e.regen) m.push(`Regen +${e.regen * Math.pow(2, p.tier)}/s`);
                    if (e.cost) m.push(`Cost ${e.cost * Math.pow(2, p.tier)}`);
                    if (e.drain) m.push(`Drain -${e.drain * Math.pow(2, p.tier)}/s`);
                    if (e.petArmor) m.push(`Pet Armor +${e.petArmor * Math.pow(3, p.tier)}`);
                    return `Magic [${m.join(', ')}]`;
                }

                const scale3 = Math.pow(3, p.tier);
                if (e.type === "Heal") {
                    if (e.regen) return `Heal Regen (+${(e.regen * scale3).toFixed(1)}/s Global)`;
                    if (e.value) return `Heal on Cooldown (${(e.value * scale3).toFixed(1)} HP)`;
                    if (e.onDamage) return `Heal on Tick (${(e.onDamage * scale3).toFixed(1)} HP)`;
                }
                if (e.type === "Shield" && e.regen) return `Shield Regen (+${(e.regen * scale3).toFixed(1)}/s Global)`;

                let val = engineUtils.getVal(e.value !== undefined ? e.value : e.regen, p.tier);
                if (e.type === "Critical" && !e.global) return `Crit (x${val.multiplier} @ ${val.chance}%)`;
                
                if (e.global) {
                    const restrictText = `(${e.tierRestricted ? '≤ T'+p.tier : 'All Tiers'}${e.target ? ', '+e.target+'s' : ''})`;
                    if (e.type === "petMutation") return `Mutation (+${engineUtils.getVal(e.chance, p.tier)}%) ${restrictText}`;
                    if (e.type === "reloadFactor") return `Reload Speed (${val > 0 ? '+' : ''}${val}%) ${restrictText}`;
                    if (e.type === "secondaryReloadFactor") return `Sec. Reload Speed (${val > 0 ? '+' : ''}${val}%) ${restrictText}`;
                    if (e.type === "petalHealthBuff") return `Health Buff (+${val}%) ${restrictText}`;
                    if (e.type === "petalReloadSkipRate") return `Reload Skip Chance (+${val}%) ${restrictText}`;
                    if (e.type === "mobDamageFactor") return `Mob Damage Reduction (-${val}%) ${restrictText}`;
                    if (e.type === "petalHeal") return `Petal Regen (+${(val * scale3).toLocaleString()}/s) ${restrictText}`;
                    if (e.type === "Luck") return `Luck (+${val}%)`;
                    if (e.type === "Critical") return `Crit Buff ${restrictText}`;
                    return `${e.type} ${e.stats} (+${val}%) ${restrictText}`;
                }
                
                if (e.type === "Poison" || e.type === "Fire") return `${e.type} (${e.damage}/s)`;
                if (e.type === "Lightning") return `Lightning`;
                if (e.type === "finalDamage") return `Damage on Death`;
                if (e.type === "joyStick") return `Transforms Sticks`;
                return e.type;
            }));
        }
        return desc.length > 0 ? desc.join(", ") : "-";
    },

    renderTable: (stats) => {
        const tbody = document.getElementById('table-body');
        tbody.innerHTML = "";
        
        const varColVal = document.getElementById('variable-column-select')?.value || 'special';
        const varColHeader = document.getElementById('variable-column-header');
        if (varColHeader) varColHeader.innerText = varColVal === 'special' ? 'Special Effects' : (varColVal === 'entities' ? 'Entities Qty' : 'Survival Ticks');

        const showDPS = document.getElementById('filter-dps')?.checked ?? true;
        const showSupport = document.getElementById('filter-support')?.checked ?? true;
        const showEgg = document.getElementById('filter-egg')?.checked ?? true;

        const itemsToRender = ui.activeItems.map((p, i) => ({ p, i })).filter(({ p }) => {
            const isEgg = p.isEgg === true;
            const isSupport = ["Mimic", "Fission", "Fusion", "Root", "Quartz"].includes(p.name) || (p.specials || (p.special ? [p.special] : [])).some(e => e.global || e.type === "Magic" || (e.type === "Heal" && e.regen) || (e.type === "Shield" && e.regen));
            const isDPS = !isEgg && (p.damage != null || p.health != null || p.isSpill);
            return (isEgg && showEgg) || (isSupport && showSupport) || (isDPS && showDPS);
        });

        itemsToRender.forEach(({ p, i }) => {
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            const dStats = engine.getDisplayStats(p, stats);
            const isSupport = !p.isEgg && !p.isSpill && (p.damage == null || p.health == null);
            
            let varContent = varColVal === 'special' ? ui.getSpecDesc(p) : (varColVal === 'entities' ? (p.currentEntities || 1) : perf.ticks);

            tbody.insertAdjacentHTML('beforeend', `
                <tr style="background-color: ${engine.tierColors[p.tier] || 'transparent'};">
                    <td>${p.name}</td><td>${p.tier}</td>
                    <td><strong>${ui.equippedPetals.filter(eq => eq.name === p.name && eq.tier === p.tier).length} / ${p.ownedQuantity || 1}</strong></td>
                    <td>${ui.format(dStats.health)}</td>
                    <td>${ui.format(dStats.armor)}</td>
                    <td>${ui.format(dStats.damage)}</td>
                    <td><strong>${ui.format(dStats.reload, true)}</strong></td>
                    <td>${varContent}</td>
                    <td><strong>${isSupport ? "SUPPORT" : (perf.baseDps || 0).toFixed(2)}</strong></td>
                    <td>
                        <button onclick="ui.equip(${i})">Equip</button>
                        <button class="btn-delete" style="margin-left: 5px;" onclick="ui.removeActiveItem(${i})">🗑️</button>
                    </td>
                </tr>
            `);
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
            
            if (!effectiveEquipped.some(e => e === originalPetal || e.originalIndex === originalIndex)) {
                list.insertAdjacentHTML('beforeend', `<div class="equipped-item" style="background-color: #e0e0e0; color: #7f8c8d;"><div class="item-main-row" style="font-size: 0.9em; opacity: 0.8;"><span>${originalPetal.name} (T${originalPetal.tier}) ➔ <em>Fusioned</em></span><button class="btn-delete" onclick="ui.unequip(${originalIndex})">X</button></div></div>`);
                return; 
            }

            const p = effectiveVersion;
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            const nsp = (originalIndex === pIdx) ? perf.nonStackingPoisonDps : 0;
            const nsf = (originalIndex === fIdx) ? perf.nonStackingFireDps : 0;
            const dps = perf.physicalDps + perf.stackingPoisonDps + nsp + perf.stackingFireDps + nsf + perf.lightningDps;
            totalDPS += dps;

            const isSupport = !p.isEgg && !p.isSpill && (p.damage == null || p.health == null) && !p.originalName && !p.specials?.some(e => e.type === "Heal" && e.regen);
            const dStats = engine.getDisplayStats(p, stats);

            list.insertAdjacentHTML('beforeend', `
                <div class="equipped-item" style="background-color: ${engine.tierColors[p.tier]};">
                    <div class="item-main-row">
                        <span>${p.originalName ? `${p.originalName} (T${p.originalTier}) ➔ ${p.name}` : p.name}${p.currentEntities > 1 ? ' x'+p.currentEntities : ''} (T${p.tier})</span>
                        <span>${isSupport ? "SUPPORT" : (dps > 0 ? dps.toFixed(2) + " DPS" : "")}</span>
                        <button class="btn-delete" onclick="ui.unequip(${originalIndex})">X</button>
                    </div>
                    ${isSupport ? '' : `<div class="dps-details">Phys: ${perf.physicalDps.toFixed(2)} | Poison: ${(perf.stackingPoisonDps + nsp).toFixed(2)} | Fire: ${(perf.stackingFireDps + nsf).toFixed(2)} | Light: ${perf.lightningDps.toFixed(2)} ${p.isSpill ? '' : '| HP: ' + ui.format(dStats.health)}</div>`}
                </div>
            `);
        });
        
        totalDisp.innerHTML = `${totalDPS.toLocaleString(undefined, {minimumFractionDigits: 2})} DPS`;
    },

    renderMob: (stats) => {
        const d = document.getElementById('active-mob-display');
        if (!ui.activeMob) { d.innerHTML = "No mob selected"; return; }
        d.style.backgroundColor = engine.tierColors[ui.activeMob.tier];
        
        let actualDamage = ui.activeMob.damage;
        if (stats) actualDamage *= Math.max(0, 1 - (engine.getModifiersForTier(0, stats, "Petal").mobDamageReduction || 0));

        d.innerHTML = `<strong>${ui.activeMob.name} (T${ui.activeMob.tier})</strong><br>H: ${Math.round(ui.activeMob.health).toLocaleString()} | D: ${Math.round(actualDamage).toLocaleString()} | A: ${Math.round(ui.activeMob.armor).toLocaleString()}`;
    },

    equip: (i) => {
        const item = ui.activeItems[i];
        if (item.stack === false && ui.equippedPetals.some(p => p.name === item.name)) return alert(`Vous ne pouvez pas équiper plusieurs ${item.name} ! (Stack désactivé)`);
        
        const owned = item.ownedQuantity || 1;
        if (ui.equippedPetals.filter(p => p.name === item.name && p.tier === item.tier).length >= owned) return alert(`Vous ne possédez que ${owned}x ${item.name} (T${item.tier}) ! Vous ne pouvez pas en équiper plus.`);

        ui.equippedPetals.push(structuredClone(item));
        ui.refresh();
    },
    
    unequip: (i) => { ui.equippedPetals.splice(i, 1); ui.refresh(); },
    removeActiveItem: (i) => { 
        ui.equippedPetals = ui.equippedPetals.filter(p => !(p.name === ui.activeItems[i].name && p.tier === ui.activeItems[i].tier));
        ui.activeItems.splice(i, 1); 
        ui.refresh(); 
    },
    sortByDPS: () => { 
        const stats = engine.getGlobalStats(engine.getEffectivePetals(ui.equippedPetals));
        ui.activeItems.sort((a,b) => engine.calculatePerformance(b, ui.activeMob, stats).baseDps - engine.calculatePerformance(a, ui.activeMob, stats).baseDps); 
        ui.renderTable(stats); ui.saveToLocal(); 
    },
    sortTable: (key) => { ui.activeItems.sort((a,b) => (a[key] == null ? 1 : (b[key] == null ? -1 : (a[key] > b[key] ? 1 : -1)))); ui.refresh(); }
};

window.onload = () => { ui.loadFromLocal(); ui.refresh(); };