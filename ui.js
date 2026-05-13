const ui = {
    activePetals: [],
    equippedPetals: [],
    activeMob: null,
    baseLuck: 0.0,
    isAscending: false,

    updatePlayerStats: () => {
        ui.baseLuck = parseFloat(document.getElementById('player-luck').value) || 0.0;
        ui.refresh();
    },

    // Calcule les stats finales (Luck + Boosts des pétales de support)
    getPlayerStats: () => {
        const stats = { luck: ui.baseLuck, damageBoost: 1, activeBoosts: [] };
        
        ui.equippedPetals.forEach(p => {
            const effects = p.specials || (p.special ? [p.special] : []);
            effects.forEach(e => {
                if (e.type === "Boost") {
                    const val = e.value[p.tier] || 1;
                    if (e.stats === "Damage") stats.damageBoost += (val - 1);
                    stats.activeBoosts.push({ name: p.name, type: e.stats, value: val });
                }
            });
        });
        return stats;
    },

    refresh: () => {
        const stats = ui.getPlayerStats();
        ui.renderTable(stats);
        ui.renderEquipped(stats);
        ui.renderMob();
        ui.renderStatPanel(stats);
    },

    renderStatPanel: (stats) => {
        const panel = document.getElementById('player-stats-display');
        let html = `<div>Base Luck: +${(stats.luck * 100).toFixed(1)}%</div>`;
        if (stats.damageBoost > 1) {
            html += `<div style="color: #27ae60">Total DMG Multiplier: x${stats.damageBoost.toFixed(2)}</div>`;
        }
        stats.activeBoosts.forEach(b => {
            html += `<div style="font-size: 0.85em; color: #7f8c8d">└ ${b.name}: x${b.value} ${b.type}</div>`;
        });
        panel.innerHTML = html;
    },

    renderTable: (stats) => {
        const tbody = document.getElementById('table-body');
        tbody.innerHTML = "";
        ui.activePetals.forEach((p, i) => {
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            const row = document.createElement('tr');
            row.style.backgroundColor = engine.tierColors[p.tier] || 'transparent';
            row.innerHTML = `
                <td>${p.name}</td><td>${p.tier}</td><td>${p.currentEntities || 1}</td>
                <td>${p.health ? Math.round(p.health).toLocaleString() : "-"}</td>
                <td>${p.damage ? Math.round(p.damage).toLocaleString() : "-"}</td>
                <td>${p.reload ? p.reload + "s" : "-"}</td>
                <td>${ui.getSpecDesc(p)}</td><td>${perf.ticks}</td>
                <td><strong>${perf.baseDps.toFixed(2)}</strong></td>
                <td><button onclick="ui.equip(${i})">Equip</button></td>
            `;
            tbody.appendChild(row);
        });
    },

    renderEquipped: (stats) => {
        const list = document.getElementById('slots-list');
        const totalDisp = document.querySelector('#total-dps-display strong');
        if (ui.equippedPetals.length === 0) { list.innerHTML = "Empty"; totalDisp.innerText = "0.00"; return; }

        let maxP = 0, pIdx = -1, maxF = 0, fIdx = -1;
        ui.equippedPetals.forEach((p, i) => {
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            if (perf.nonStackingPoisonDps > maxP) { maxP = perf.nonStackingPoisonDps; pIdx = i; }
            if (perf.nonStackingFireDps > maxF) { maxF = perf.nonStackingFireDps; fIdx = i; }
        });

        list.innerHTML = "";
        let total = 0;
        ui.equippedPetals.forEach((p, i) => {
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            const nsp = (i === pIdx) ? perf.nonStackingPoisonDps : 0;
            const nsf = (i === fIdx) ? perf.nonStackingFireDps : 0;
            const dps = perf.physicalDps + perf.stackingPoisonDps + nsp + perf.stackingFireDps + nsf + perf.lightningDps;
            total += dps;

            const div = document.createElement('div');
            div.className = "equipped-item";
            div.style.backgroundColor = engine.tierColors[p.tier];
            div.innerHTML = `
                <div class="item-main-row">
                    <span>${p.name} ${p.currentEntities ? 'x'+p.currentEntities : ''} (T${p.tier})</span>
                    <span>${dps > 0 ? dps.toFixed(2) + ' DPS' : 'SUPPORT'}</span>
                    <button class="btn-delete" onclick="ui.unequip(${i})">X</button>
                </div>
                ${dps > 0 ? `<div class="dps-details">Phys: ${perf.physicalDps.toFixed(2)} | Poison: ${(perf.stackingPoisonDps + nsp).toFixed(2)} | Fire: ${(perf.stackingFireDps + nsf).toFixed(2)}</div>` : ''}
            `;
            list.appendChild(div);
        });
        totalDisp.innerText = total.toLocaleString(undefined, {minimumFractionDigits: 2});
    },

    getSpecDesc: (p) => {
        const effs = p.specials || (p.special ? [p.special] : []);
        return effs.length ? effs.map(e => e.type).join(", ") : "-";
    },

    renderMob: () => {
        const d = document.getElementById('active-mob-display');
        if (!ui.activeMob) { d.innerHTML = "No mob selected"; return; }
        d.style.backgroundColor = engine.tierColors[ui.activeMob.tier];
        d.innerHTML = `<strong>${ui.activeMob.name} (T${ui.activeMob.tier})</strong><br>H: ${Math.round(ui.activeMob.health).toLocaleString()} | D: ${Math.round(ui.activeMob.damage).toLocaleString()} | A: ${Math.round(ui.activeMob.armor).toLocaleString()}`;
    },

    equip: (i) => {
        const petal = ui.activePetals[i];
        if (petal.stack === false && ui.equippedPetals.some(p => p.name === petal.name)) {
            alert("This petal cannot be stacked!");
            return;
        }
        ui.equippedPetals.push(structuredClone(petal));
        ui.refresh();
    },
    unequip: (i) => { ui.equippedPetals.splice(i, 1); ui.refresh(); },
    sortByDPS: () => { 
        const stats = ui.getPlayerStats();
        ui.activePetals.sort((a,b) => engine.calculatePerformance(b, ui.activeMob, stats).baseDps - engine.calculatePerformance(a, ui.activeMob, stats).baseDps); 
        ui.renderTable(stats); 
    },
    sortTable: (key) => { ui.activePetals.sort((a,b) => a[key] > b[key] ? 1 : -1); ui.refresh(); }
};

// Global helpers pour les Lightboxes
window.openPetalLightbox = () => {
    document.getElementById('petal-lightbox').style.display = 'block';
    const list = document.getElementById('petal-selection-list');
    list.innerHTML = "";
    petals.forEach((p, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.name}</span><button onclick="addPetalToTable(${i})">Add</button>`;
        list.appendChild(li);
    });
};
window.closePetalLightbox = () => document.getElementById('petal-lightbox').style.display = 'none';
window.addPetalToTable = (idx) => {
    const t = parseInt(document.getElementById('tier-selection').value) || 0;
    const m = Math.pow(3, t);
    const c = structuredClone(petals[idx]);
    c.tier = t;
    if (c.health) c.health *= m;
    if (c.damage) c.damage *= m;
    if (c.armor) c.armor *= m;
    const effs = c.specials || (c.special ? [c.special] : []);
    effs.forEach(e => { if (e.damage) e.damage *= m; });
    
    if (c.entity) {
        if (typeof c.entity === 'number') c.currentEntities = c.entity;
        else {
            const maxT = Math.max(...Object.keys(c.entity).map(Number));
            c.currentEntities = c.entity[t > maxT ? maxT : t];
        }
    }
    ui.activePetals.push(c);
    ui.refresh();
    closePetalLightbox();
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

ui.refresh();