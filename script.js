let activePetals = [];
let equippedPetals = [];
let activeMob = null;
let isAscending = false;

const tierColors = {
    0: "#7eef6d", 1: "#ffe65d", 2: "#4d52e3", 3: "#861fde",
    4: "#de1f1f", 5: "#1fdbde", 6: "#ff2b75", 7: "#2bffa3"
};

const playerStats = { luck: 1.0 };

const effectHandlers = {
    luckMultiplier: (perf, effect, stats, context, petal) => {
        const triggerChance = Math.min(effect.chance * stats.luck, 1.0);
        const standardChance = 1 - triggerChance;
        const expectedMultiplier = (standardChance * 1) + (triggerChance * effect.multiplier);
        perf.physicalDps *= expectedMultiplier;
    },
    damageSeconds: (perf, effect, stats, context, petal) => {
        perf.physicalDps /= 10;
    },
    Poison: (perf, effect, stats, context, petal) => {
        let uptime = 1;
        if (!context.isInfinite && context.totalCycleDuration > 0) {
            uptime = Math.min((context.lifeDuration + effect.duration) / context.totalCycleDuration, 1.0);
        }
        const pDps = effect.damage * uptime;
        if (effect.stack) perf.stackingPoisonDps += pDps;
        else perf.nonStackingPoisonDps += pDps;
    },
    Fire: (perf, effect, stats, context, petal) => {
        let uptime = 1;
        if (!context.isInfinite && context.totalCycleDuration > 0) {
            uptime = Math.min((context.lifeDuration + effect.duration) / context.totalCycleDuration, 1.0);
        }
        const fDps = effect.damage * uptime;
        if (effect.stack) perf.stackingFireDps += fDps;
        else perf.nonStackingFireDps += fDps;
    },
    Lightning: (perf, effect, stats, context, petal) => {
        let bounces = 0;
        if (typeof effect.bounce === 'number') bounces = effect.bounce;
        else if (effect.bounce) {
            const maxT = Math.max(...Object.keys(effect.bounce).map(Number));
            bounces = effect.bounce[petal.tier > maxT ? maxT : petal.tier] || 0;
        }
        const totalLmg = effect.damage * bounces;
        const lDps = context.isInfinite ? (totalLmg * 10) : (context.totalCycleDuration > 0 ? (totalLmg * context.survivalTicks) / context.totalCycleDuration : 0);
        perf.lightningDps += lDps;
    }
};

function calculatePetalPerformance(petal) {
    if (!activeMob) return { ticks: 0, baseDps: 0, physicalDps: 0, stackingPoisonDps: 0, nonStackingPoisonDps: 0, stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0 };

    const mobDmg = Math.max(0, activeMob.damage - petal.armor);
    const petDmg = Math.max(0, petal.damage - activeMob.armor);

    let survivalTicks = "∞", lifeDuration = 0, totalCycleDuration = 0, isInfinite = true;

    if (mobDmg > 0) {
        survivalTicks = Math.ceil(petal.health / mobDmg);
        lifeDuration = survivalTicks * 0.1;
        totalCycleDuration = lifeDuration + petal.reload;
        isInfinite = false;
    }

    let physDps = isInfinite ? (petDmg * 10) : (totalCycleDuration > 0 ? (survivalTicks * petDmg) / totalCycleDuration : 0);

    let perf = {
        ticks: survivalTicks, physicalDps: physDps,
        stackingPoisonDps: 0, nonStackingPoisonDps: 0,
        stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0
    };

    const context = { lifeDuration, totalCycleDuration, isInfinite, survivalTicks };
    const effects = petal.specials || (petal.special ? [petal.special] : []);

    effects.forEach(e => { if (effectHandlers[e.type]) effectHandlers[e.type](perf, e, playerStats, context, petal); });

    const qty = petal.currentEntities || 1;
    perf.physicalDps *= qty;
    perf.stackingPoisonDps *= qty;
    perf.stackingFireDps *= qty;
    perf.lightningDps *= qty;

    perf.baseDps = perf.physicalDps + perf.stackingPoisonDps + perf.nonStackingPoisonDps + perf.stackingFireDps + perf.nonStackingFireDps + perf.lightningDps;
    return perf;
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = ""; 
    activePetals.forEach((p, i) => {
        const perf = calculatePetalPerformance(p);
        const row = `<tr style="background-color: ${tierColors[p.tier] || 'transparent'}">
            <td>${p.name}</td><td>${p.tier}</td><td>${p.currentEntities}</td>
            <td>${Math.round(p.health).toLocaleString()}</td><td>${Math.round(p.damage).toLocaleString()}</td>
            <td>${Math.round(p.armor).toLocaleString()}</td><td>${p.reload}</td>
            <td>${getSpecialDescription(p)}</td><td>${perf.ticks}</td>
            <td><strong>${(perf.baseDps || 0).toFixed(2)}</strong></td>
            <td><button onclick="equipPetal(${i})">Equip</button></td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function renderEquippedSlots() {
    const list = document.getElementById('slots-list');
    const totalDisplay = document.querySelector('#total-dps-display strong');
    if (equippedPetals.length === 0) { list.innerHTML = "No petals equipped"; totalDisplay.innerHTML = "0.00"; return; }

    let maxNsP = 0, pIdx = -1, maxNsF = 0, fIdx = -1;
    equippedPetals.forEach((p, i) => {
        const perf = calculatePetalPerformance(p);
        if (perf.nonStackingPoisonDps > maxNsP) { maxNsP = perf.nonStackingPoisonDps; pIdx = i; }
        if (perf.nonStackingFireDps > maxNsF) { maxNsF = perf.nonStackingFireDps; fIdx = i; }
    });

    list.innerHTML = "";
    let total = 0;
    equippedPetals.forEach((p, i) => {
        const perf = calculatePetalPerformance(p);
        const nsp = (i === pIdx) ? perf.nonStackingPoisonDps : 0;
        const nsf = (i === fIdx) ? perf.nonStackingFireDps : 0;
        const dps = perf.physicalDps + perf.stackingPoisonDps + nsp + perf.stackingFireDps + nsf + perf.lightningDps;
        total += dps;
        const item = document.createElement('div');
        item.className = "equipped-item";
        item.style.backgroundColor = tierColors[p.tier] || "transparent";
        item.innerHTML = `<div class="item-main-row"><span>${p.name} x${p.currentEntities} (T${p.tier})</span><span>${dps.toFixed(2)} DPS</span><button onclick="unequipPetal(${i})">X</button></div>
            <div class="dps-details">Phys: ${perf.physicalDps.toFixed(2)} | Poison: ${(perf.stackingPoisonDps + nsp).toFixed(2)} | Fire: ${(perf.stackingFireDps + nsf).toFixed(2)} | Light: ${perf.lightningDps.toFixed(2)}</div>`;
        list.appendChild(item);
    });
    totalDisplay.innerHTML = total.toLocaleString(undefined, {minimumFractionDigits: 2});
}

// Les fonctions utilitaires (openLightbox, selectMob, etc.) restent identiques à la version précédente.
function updatePlayerStats() { const val = document.getElementById('player-luck').value; playerStats.luck = parseFloat(val) || 1.0; renderTable(); renderEquippedSlots(); }
function getSpecialDescription(p) { const effs = p.specials || (p.special ? [p.special] : []); return effs.length ? effs.map(e => e.type).join(", ") : "-"; }
function sortByDPS() { activePetals.sort((a, b) => calculatePetalPerformance(b).baseDps - calculatePetalPerformance(a).baseDps); renderTable(); }
function openPetalLightbox() { document.getElementById('petal-lightbox').style.display = 'block'; const list = document.getElementById('petal-selection-list'); list.innerHTML = ""; petals.forEach((p, i) => { const li = document.createElement('li'); li.innerHTML = `<button onclick="addPetal(${i})">Add ${p.name}</button>`; list.appendChild(li); }); }
function closePetalLightbox() { document.getElementById('petal-lightbox').style.display = 'none'; }
function addPetal(idx) { const t = parseInt(document.getElementById('tier-selection').value) || 0; const m = Math.pow(3, t); const c = structuredClone(petals[idx]); c.tier = t; c.health *= m; c.damage *= m; c.armor *= m; const effs = c.specials || (c.special ? [c.special] : []); effs.forEach(e => { if (e.damage) e.damage *= m; }); let qty = 1; if (c.entity) { if (typeof c.entity === 'number') qty = c.entity; else { const maxT = Math.max(...Object.keys(c.entity).map(Number)); qty = c.entity[t > maxT ? maxT : t]; } } c.currentEntities = qty; activePetals.push(c); renderTable(); closePetalLightbox(); }
function unequipPetal(i) { equippedPetals.splice(i, 1); renderEquippedSlots(); }
function equipPetal(i) { equippedPetals.push(structuredClone(activePetals[i])); renderEquippedSlots(); }
function openMobLightbox() { document.getElementById('mob-lightbox').style.display = 'block'; const list = document.getElementById('mob-selection-list'); list.innerHTML = ""; mobs.forEach((m, i) => { const li = document.createElement('li'); li.innerHTML = `<button onclick="selectMob(${i})">Select ${m.name}</button>`; list.appendChild(li); }); }
function closeMobLightbox() { document.getElementById('mob-lightbox').style.display = 'none'; }
function selectMob(idx) { const t = parseInt(document.getElementById('mob-tier-selection').value) || 0; const f = [3.75, 3.6, 4, 7.5, 6, 15, 12]; let hm = 1; for (let i = 0; i < t; i++) hm *= (f[i] || 1); const sm = Math.pow(3, t); activeMob = structuredClone(mobs[idx]); activeMob.tier = t; activeMob.health *= hm; activeMob.damage *= sm; activeMob.armor *= sm; renderActiveMob(); renderTable(); renderEquippedSlots(); closeMobLightbox(); }
function renderActiveMob() { const d = document.getElementById('active-mob-display'); if (!activeMob) return; d.style.backgroundColor = tierColors[activeMob.tier]; d.innerHTML = `<strong>${activeMob.name} (T${activeMob.tier})</strong><br>H: ${Math.round(activeMob.health).toLocaleString()} | D: ${Math.round(activeMob.damage).toLocaleString()} | A: ${Math.round(activeMob.armor).toLocaleString()}`; }

renderTable(); renderEquippedSlots();