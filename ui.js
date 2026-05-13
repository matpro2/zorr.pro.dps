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

    refresh: () => {
        // 1. Calculer les statistiques globales (inclut les boosts de supports)
        const stats = engine.getGlobalStats(ui.equippedPetals, ui.baseLuck);
        
        // 2. Mettre à jour l'interface avec ces stats
        ui.renderTable(stats);
        ui.renderEquipped(stats);
        ui.renderMob();
        ui.renderStatPanel(stats);
    },

    renderStatPanel: (stats) => {
        const panel = document.getElementById('player-stats-display');
        let html = `<div>Base Luck Bonus: <strong>+${(stats.luck * 100).toFixed(1)}%</strong></div>`;
        
        if (stats.multipliers.Damage > 1) {
            html += `<div style="color: #27ae60; font-weight: bold; margin-top: 5px;">Total DMG Multiplier: x${stats.multipliers.Damage.toFixed(2)}</div>`;
        }
        
        if (stats.activeSupports.length > 0) {
            html += `<div style="margin-top: 5px; font-size: 0.9em;"><strong>Active Supports:</strong></div>`;
            stats.activeSupports.forEach(b => {
                html += `<div style="color: #7f8c8d; margin-left: 10px;">└ ${b.name} (T${b.tier}): ${b.type} ${b.stat} <strong>x${b.value}</strong></div>`;
            });
        }
        
        panel.innerHTML = html;
    },

    getSpecDesc: (p) => {
        const effs = p.specials || (p.special ? [p.special] : []);
        if (!effs.length) return "-";
        return effs.map(e => {
            if (e.type === "luckMultiplier") return `Dice (+${(e.chance * 100).toFixed(1)}%)`;
            if (engine.supportEffects.includes(e.type)) return `${e.type} ${e.stats}`;
            return e.type;
        }).join(", ");
    },

    renderTable: (stats) => {
        const tbody = document.getElementById('table-body');
        tbody.innerHTML = "";
        ui.activePetals.forEach((p, i) => {
            const perf = engine.calculatePerformance(p, ui.activeMob, stats);
            const row = document.createElement('tr');
            row.style.backgroundColor = engine.tierColors[p.tier] || 'transparent';
            
            const isSupport = (p.damage == null || p.health == null);

            row.innerHTML = `
                <td>${p.name}</td><td>${p.tier}</td><td>${p.currentEntities || 1}</td>
                <td>${p.health != null ? Math.round(p.health).toLocaleString() : "-"}</td>
                <td>${p.armor != null ? Math.round(p.armor).toLocaleString() : "-"}</td>
                <td>${p.damage != null ? Math.round(p.damage).toLocaleString() : "-"}</td>
                <td>${p.reload != null ? p.reload + "s" : "-"}</td>
                <td>${ui.getSpecDesc(p)}</td>
                <td>${perf.ticks}</td>
                <td><strong>${isSupport ? "SUPPORT" : (perf.baseDps || 0).toFixed(2)}</strong></td>
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
            const isSupport = (p.damage == null || p.health == null);
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
                    <span>${isSupport ? 'SUPPORT' : dps.toFixed(2) + ' DPS'}</span>
                    <button class="btn-delete" onclick="ui.unequip(${i})">X</button>
                </div>
                ${isSupport ? '' : `<div class="dps-details">Phys: ${perf.physicalDps.toFixed(2)} | Poison: ${(perf.stackingPoisonDps + nsp).toFixed(2)} | Fire: ${(perf.stackingFireDps + nsf).toFixed(2)} | Light: ${perf.lightningDps.toFixed(2)}</div>`}
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
        const petal = ui.activePetals[i];
        if (petal.stack === false && ui.equippedPetals.some(p => p.name === petal.name)) {
            alert(`You cannot stack multiple ${petal.name} !`);
            return;
        }
        ui.equippedPetals.push(structuredClone(petal));
        ui.refresh();
    },
    
    unequip: (i) => { ui.equippedPetals.splice(i, 1); ui.refresh(); },
    
    sortByDPS: () => { 
        const stats = engine.getGlobalStats(ui.equippedPetals, ui.baseLuck);
        ui.activePetals.sort((a,b) => engine.calculatePerformance(b, ui.activeMob, stats).baseDps - engine.calculatePerformance(a, ui.activeMob, stats).baseDps); 
        ui.renderTable(stats); 
    },
    
    sortTable: (key) => { 
        ui.activePetals.sort((a,b) => {
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

// Init
ui.refresh();