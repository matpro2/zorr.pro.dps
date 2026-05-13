const ui = {
    activePetals: [],
    equippedPetals: [],
    activeMob: null,
    luck: 1.0,
    isAscending: false,

    updatePlayerStats: () => {
        ui.luck = parseFloat(document.getElementById('player-luck').value) || 1.0;
        ui.refresh();
    },

    refresh: () => {
        ui.renderTable();
        ui.renderEquipped();
        ui.renderMob();
    },

    renderTable: () => {
        const tbody = document.getElementById('table-body');
        tbody.innerHTML = "";
        ui.activePetals.forEach((p, i) => {
            const perf = engine.calculatePerformance(p, ui.activeMob, ui.luck);
            const row = document.createElement('tr');
            row.style.backgroundColor = engine.tierColors[p.tier] || 'transparent';
            row.innerHTML = `
                <td>${p.name}</td><td>${p.tier}</td><td>${p.currentEntities}</td>
                <td>${Math.round(p.health).toLocaleString()}</td><td>${Math.round(p.damage).toLocaleString()}</td>
                <td>${p.reload}s</td><td>${ui.getSpecDesc(p)}</td><td>${perf.ticks}</td>
                <td><strong>${(perf.baseDps || 0).toFixed(2)}</strong></td>
                <td><button onclick="ui.equip(${i})">Equip</button></td>
            `;
            tbody.appendChild(row);
        });
    },

    renderEquipped: () => {
        const list = document.getElementById('slots-list');
        const totalDisp = document.querySelector('#total-dps-display strong');
        if (ui.equippedPetals.length === 0) { list.innerHTML = "Empty"; totalDisp.innerText = "0.00"; return; }

        let maxP = 0, pIdx = -1, maxF = 0, fIdx = -1;
        ui.equippedPetals.forEach((p, i) => {
            const perf = engine.calculatePerformance(p, ui.activeMob, ui.luck);
            if (perf.nonStackingPoisonDps > maxP) { maxP = perf.nonStackingPoisonDps; pIdx = i; }
            if (perf.nonStackingFireDps > maxF) { maxF = perf.nonStackingFireDps; fIdx = i; }
        });

        list.innerHTML = "";
        let total = 0;
        ui.equippedPetals.forEach((p, i) => {
            const perf = engine.calculatePerformance(p, ui.activeMob, ui.luck);
            const nsp = (i === pIdx) ? perf.nonStackingPoisonDps : 0;
            const nsf = (i === fIdx) ? perf.nonStackingFireDps : 0;
            const dps = perf.physicalDps + perf.stackingPoisonDps + nsp + perf.stackingFireDps + nsf + perf.lightningDps;
            total += dps;

            const div = document.createElement('div');
            div.className = "equipped-item";
            div.style.backgroundColor = engine.tierColors[p.tier];
            div.innerHTML = `
                <div class="item-main-row">
                    <span>${p.name} x${p.currentEntities} (T${p.tier})</span>
                    <span>${dps.toFixed(2)} DPS</span>
                    <button class="btn-delete" onclick="ui.unequip(${i})">X</button>
                </div>
                <div class="dps-details">
                    Phys: ${perf.physicalDps.toFixed(2)} | Poison: ${(perf.stackingPoisonDps + nsp).toFixed(2)} | Fire: ${(perf.stackingFireDps + nsf).toFixed(2)} | Light: ${perf.lightningDps.toFixed(2)}
                </div>
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

    getSpecDesc: (p) => {
        const effs = p.specials || (p.special ? [p.special] : []);
        return effs.length ? effs.map(e => e.type).join(", ") : "-";
    },

    equip: (i) => { ui.equippedPetals.push(structuredClone(ui.activePetals[i])); ui.refresh(); },
    unequip: (i) => { ui.equippedPetals.splice(i, 1); ui.refresh(); },
    sortByDPS: () => { ui.activePetals.sort((a,b) => engine.calculatePerformance(b, ui.activeMob, ui.luck).baseDps - engine.calculatePerformance(a, ui.activeMob, ui.luck).baseDps); ui.renderTable(); },
    sortTable: (key) => { ui.activePetals.sort((a,b) => a[key] > b[key] ? 1 : -1); ui.renderTable(); }
};

// Global handlers pour les boutons HTML
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
    c.tier = t; c.health *= m; c.damage *= m; c.armor *= m;
    const effs = c.specials || (c.special ? [c.special] : []);
    effs.forEach(e => { if (e.damage) e.damage *= m; });
    
    let qty = 1;
    if (c.entity) {
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