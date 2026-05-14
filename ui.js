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

    refresh: () => {
        const stats = engine.getGlobalStats(ui.equippedPetals);
        ui.renderTable(stats);
        ui.renderEquipped(stats);
        ui.renderMob();
        ui.renderStatPanel(stats);
        
        ui.saveToLocal();
    },

    renderStatPanel: (stats) => {
        const panel = document.getElementById('player-stats-display');
        let html = `<div>Total Luck Bonus: <strong>+${stats.luck.toFixed(2)}%</strong></div>`;
        
        // Mana Stats
        const manaBalance = stats.manaRegen - stats.manaDrain;
        const manaColor = manaBalance < 0 ? "#e74c3c" : "#3498db";
        html += `<div style="color: ${manaColor}; font-weight: bold; margin-top: 5px;">Mana Flow: ${manaBalance >= 0 ? '+' : ''}${manaBalance.toFixed(2)}/s (Regen: ${stats.manaRegen.toFixed(1)} | Drain: ${stats.manaDrain.toFixed(1)})</div>`;

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
        
        if (stats.activeSupports.length > 0) {
            html += `<div style="margin-top: 5px; font-size: 0.9em;"><strong>Active Supports:</strong></div>`;
            stats.activeSupports.forEach(b => {
                html += `<div style="color: #7f8c8d; margin-left: 10px;">└ ${b.name} (T${b.tier}): ${b.type} ${b.stat} <strong>${b.value}</strong> <em>${b.restriction || ''}</em></div>`;
            });
        }
        
        panel.innerHTML = html;
    },

    getSpecDesc: (p) => {
        let desc = [];
        
        if (p.isEgg) {
            const petTier = typeof p.mobTier === 'object' ? (p.mobTier[p.tier] !== undefined ? p.mobTier[p.tier] : 0) : (p.mobTier || 0);
            desc.push(`Spawns T${petTier} Pet`);
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
                    if (e.type === "Luck") return `Luck (+${val}%)`;
                    if (e.type === "Critical") return `Crit Buff ${restrictText}`;
                    return `${e.type} ${e.stats} (+${val}%) ${restrictText}`;
                }
                
                if (e.type === "Poison" || e.type === "Fire") return `${e.type} (${e.damage}/s)`;
                if (e.type === "Lightning") return `Lightning`;
                return e.type;
            });
            desc = desc.concat(mappedEffs);
        }
        
        return desc.length > 0 ? desc.join(", ") : "-";
    },

    renderTable: (stats) => {
        const tbody = document.getElementById('table-body');
        tbody.innerHTML = "";
        ui.activeItems.forEach((p, i) => {
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            const row = document.createElement('tr');
            row.style.backgroundColor = engine.tierColors[p.tier] || 'transparent';
            
            const isPureSupport = !p.isEgg && (p.damage == null || p.health == null);
            const displayStats = engine.getDisplayStats(p, stats);
            
            const actualHealthStr = displayStats.health != null ? Math.round(displayStats.health).toLocaleString() : "-";
            const actualArmorStr = displayStats.armor != null ? Math.round(displayStats.armor).toLocaleString() : "-";
            const actualDamageStr = displayStats.damage != null ? Math.round(displayStats.damage).toLocaleString() : "-";
            let actualReloadStr = displayStats.reload != null ? displayStats.reload.toFixed(2) + "s" : "-";
            
            if (displayStats.reload === Infinity) actualReloadStr = "∞";

            const equippedCount = ui.equippedPetals.filter(eq => eq.name === p.name && eq.tier === p.tier).length;
            const ownedQty = p.ownedQuantity || 1;

            row.innerHTML = `
                <td>${p.name}</td><td>${p.tier}</td>
                <td>${p.currentEntities || 1}</td>
                <td><strong>${equippedCount} / ${ownedQty}</strong></td>
                <td>${actualHealthStr}</td>
                <td>${actualArmorStr}</td>
                <td>${actualDamageStr}</td>
                <td><strong>${actualReloadStr}</strong></td>
                <td>${ui.getSpecDesc(p)}</td>
                <td>${perf.ticks}</td>
                <td><strong>${isPureSupport ? "SUPPORT" : (perf.baseDps || 0).toFixed(2)}</strong></td>
                <td>
                    <button onclick="ui.equip(${i})">Equip</button>
                    <button class="btn-delete" style="margin-left: 5px;" onclick="ui.removeActiveItem(${i})">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    renderEquipped: (stats) => {
        const list = document.getElementById('slots-list');
        const totalDisp = document.querySelector('#total-dps-display strong');
        if (ui.equippedPetals.length === 0) { list.innerHTML = "No items equipped"; totalDisp.innerText = "0.00"; return; }

        let maxP = 0, pIdx = -1, maxF = 0, fIdx = -1;
        ui.equippedPetals.forEach((p, i) => {
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            if (perf.nonStackingPoisonDps > maxP) { maxP = perf.nonStackingPoisonDps; pIdx = i; }
            if (perf.nonStackingFireDps > maxF) { maxF = perf.nonStackingFireDps; fIdx = i; }
        });

        list.innerHTML = "";
        let total = 0;
        ui.equippedPetals.forEach((p, i) => {
            const isPureSupport = !p.isEgg && (p.damage == null || p.health == null);
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            const nsp = (i === pIdx) ? perf.nonStackingPoisonDps : 0;
            const nsf = (i === fIdx) ? perf.nonStackingFireDps : 0;
            const dps = perf.physicalDps + perf.stackingPoisonDps + nsp + perf.stackingFireDps + nsf + perf.lightningDps;
            total += dps;

            const displayStats = engine.getDisplayStats(p, stats);
            const actualHealthStr = displayStats.health != null ? Math.round(displayStats.health).toLocaleString() : "-";

            const div = document.createElement('div');
            div.className = "equipped-item";
            div.style.backgroundColor = engine.tierColors[p.tier];
            div.innerHTML = `
                <div class="item-main-row">
                    <span>${p.name} ${p.currentEntities && p.currentEntities > 1 ? 'x'+p.currentEntities : ''} (T${p.tier})</span>
                    <span>${isPureSupport ? 'SUPPORT' : dps.toFixed(2) + ' DPS'}</span>
                    <button class="btn-delete" onclick="ui.unequip(${i})">X</button>
                </div>
                ${isPureSupport ? '' : `<div class="dps-details">Phys: ${perf.physicalDps.toFixed(2)} | Poison: ${(perf.stackingPoisonDps + nsp).toFixed(2)} | Fire: ${(perf.stackingFireDps + nsf).toFixed(2)} | Light: ${perf.lightningDps.toFixed(2)} | HP: ${actualHealthStr}</div>`}
            `;
            list.appendChild(div);
        });
        totalDisp.innerText = total.toLocaleString(undefined, {minimumFractionDigits: 2});
    },

    renderMob: () => {
        const d = document.getElementById('active-mob-display');
        if (!ui.activeMob) { d.innerHTML = "No mob selected"; return; }
        d.style.backgroundColor = engine.tierColors[ui.activeMob.tier];
        d.innerHTML = `<strong>${ui.activeMob.name} (T${ui.activeMob.tier})</strong><br>H: ${Math.round(ui.activeMob.health).toLocaleString()} | D: ${Math.round(ui.activeMob.damage).toLocaleString()} | A: ${Math.round(ui.activeMob.armor).toLocaleString()}`;
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
        const stats = engine.getGlobalStats(ui.equippedPetals);
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

// Global Handlers
window.openPetalLightbox = () => {
    document.getElementById('petal-lightbox').style.display = 'block';
    const list = document.getElementById('petal-selection-list');
    list.innerHTML = "";
    petals.forEach((p, i) => {
        if (p.health == null || p.damage == null) return; 
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
        // Est considérée comme support toute pétale ayant un effet global OU un effet magique
        const hasSupport = (p.specials || (p.special ? [p.special] : [])).some(e => e.global === true || e.type === "Magic");
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

window.onload = () => {
    ui.loadFromLocal();
    ui.refresh();
};
