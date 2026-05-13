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
        let poisonUptimeRatio = 1;
        if (!context.isInfinite) {
            const poisonActiveTime = context.lifeDuration + effect.duration;
            poisonUptimeRatio = Math.min(poisonActiveTime / context.totalCycleDuration, 1.0);
        }
        const poisonDps = effect.damage * poisonUptimeRatio;
        if (effect.stack) perf.stackingPoisonDps += poisonDps;
        else perf.nonStackingPoisonDps += poisonDps;
    },
    Fire: (perf, effect, stats, context, petal) => {
        let fireUptimeRatio = 1;
        if (!context.isInfinite) {
            const fireActiveTime = context.lifeDuration + effect.duration;
            fireUptimeRatio = Math.min(fireActiveTime / context.totalCycleDuration, 1.0);
        }
        const fireDps = effect.damage * fireUptimeRatio;
        if (effect.stack) perf.stackingFireDps += fireDps;
        else perf.nonStackingFireDps += fireDps;
    },
    Lightning: (perf, effect, stats, context, petal) => {
        let bounces = 0;
        if (typeof effect.bounce === 'number') bounces = effect.bounce;
        else if (effect.bounce) {
            const maxTier = Math.max(...Object.keys(effect.bounce).map(Number));
            const targetTier = petal.tier > maxTier ? maxTier : petal.tier;
            bounces = effect.bounce[targetTier];
        }
        const lightningDmgPerHit = effect.damage * bounces;
        const lDps = context.isInfinite ? (lightningDmgPerHit * 10) : ((lightningDmgPerHit * context.survivalTicks) / context.totalCycleDuration);
        perf.lightningDps += lDps;
    }
};

function updatePlayerStats() {
    const luckInput = document.getElementById('player-luck').value;
    playerStats.luck = parseFloat(luckInput) || 1.0;
    renderTable();
    renderEquippedSlots();
}

function calculatePetalPerformance(petal) {
    if (!activeMob) return { ticks: 0, dps: 0, physicalDps: 0, stackingPoisonDps: 0, nonStackingPoisonDps: 0, stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0 };

    const effectiveMobDmg = Math.max(0, activeMob.damage - petal.armor);
    const effectivePetalDmg = Math.max(0, petal.damage - activeMob.armor);

    let survivalTicks;
    let lifeDuration = 0;
    let totalCycleDuration = 0;

    if (effectiveMobDmg > 0) {
        survivalTicks = Math.ceil(petal.health / effectiveMobDmg);
        lifeDuration = survivalTicks * 0.1;
        totalCycleDuration = lifeDuration + petal.reload;
    } else {
        survivalTicks = "∞";
    }

    let initialPhysicalDps = (survivalTicks === "∞") ? (effectivePetalDmg * 10) : ((survivalTicks * effectivePetalDmg) / totalCycleDuration);

    let perf = {
        ticks: survivalTicks,
        physicalDps: initialPhysicalDps,
        stackingPoisonDps: 0,
        nonStackingPoisonDps: 0,
        stackingFireDps: 0,
        nonStackingFireDps: 0,
        lightningDps: 0
    };

    const context = { lifeDuration, totalCycleDuration, isInfinite: survivalTicks === "∞", survivalTicks };
    const effects = petal.specials || (petal.special ? [petal.special] : []);

    effects.forEach(effect => {
        if (effectHandlers[effect.type]) effectHandlers[effect.type](perf, effect, playerStats, context, petal);
    });

    const eCount = petal.currentEntities || 1;
    perf.physicalDps *= eCount;
    perf.stackingPoisonDps *= eCount;
    perf.stackingFireDps *= eCount;
    perf.lightningDps *= eCount;

    // dps sum will be handled in renderEquippedSlots for non-stacking
    perf.baseDps = perf.physicalDps + perf.stackingPoisonDps + perf.nonStackingPoisonDps + perf.stackingFireDps + perf.nonStackingFireDps + perf.lightningDps;

    return perf;
}

function getSpecialDescription(petal) {
    const effects = petal.specials || (petal.special ? [petal.special] : []);
    if (effects.length === 0) return "-";
    return effects.map(e => {
        if (e.type === "Poison" || e.type === "Fire") return `${e.type}: ${e.damage} (${e.duration}s)`;
        if (e.type === "Lightning") return "Lightning";
        if (e.type === "luckMultiplier") return "Luck";
        return e.type;
    }).join(", ");
}

function renderEquippedSlots() {
    const listContainer = document.getElementById('slots-list');
    const totalDpsDisplay = document.querySelector('#total-dps-display strong');
    if (equippedPetals.length === 0) {
        listContainer.innerHTML = "No petals equipped";
        totalDpsDisplay.innerHTML = "0.00";
        return;
    }

    let maxNsPoison = 0, poisonProviderIdx = -1;
    let maxNsFire = 0, fireProviderIdx = -1;

    equippedPetals.forEach((p, idx) => {
        const perf = calculatePetalPerformance(p);
        if (perf.nonStackingPoisonDps > maxNsPoison) { maxNsPoison = perf.nonStackingPoisonDps; poisonProviderIdx = idx; }
        if (perf.nonStackingFireDps > maxNsFire) { maxNsFire = perf.nonStackingFireDps; fireProviderIdx = idx; }
    });

    listContainer.innerHTML = "";
    let totalDps = 0;

    equippedPetals.forEach((petal, index) => {
        const perf = calculatePetalPerformance(petal);
        const nsPoisonActual = (index === poisonProviderIdx) ? perf.nonStackingPoisonDps : 0;
        const nsFireActual = (index === fireProviderIdx) ? perf.nonStackingFireDps : 0;
        
        const itemDps = perf.physicalDps + perf.stackingPoisonDps + nsPoisonActual + perf.stackingFireDps + nsFireActual + perf.lightningDps;
        totalDps += itemDps;

        const bgColor = tierColors[petal.tier] || "transparent";
        const item = document.createElement('div');
        item.className = "equipped-item";
        item.style.backgroundColor = bgColor;
        
        item.innerHTML = `
            <div class="item-main-row">
                <span>${petal.name} x${petal.currentEntities} (T${petal.tier})</span>
                <span>${itemDps.toFixed(2)} DPS</span>
                <button onclick="unequipPetal(${index})">X</button>
            </div>
            <div class="dps-details">
                Phys: ${perf.physicalDps.toFixed(2)} | 
                Poison: ${(perf.stackingPoisonDps + nsPoisonActual).toFixed(2)} | 
                Fire: ${(perf.stackingFireDps + nsFireActual).toFixed(2)} | 
                Light: ${perf.lightningDps.toFixed(2)}
            </div>
        `;
        listContainer.appendChild(item);
    });
    totalDpsDisplay.innerHTML = totalDps.toLocaleString(undefined, {minimumFractionDigits: 2});
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = ""; 
    activePetals.forEach((petal, index) => {
        const perf = calculatePetalPerformance(petal);
        const bgColor = tierColors[petal.tier] || "transparent";
        const row = `<tr style="background-color: ${bgColor}">
            <td>${petal.name}</td>
            <td>${petal.tier}</td>
            <td>${petal.currentEntities}</td>
            <td>${Math.round(petal.health).toLocaleString()}</td>
            <td>${Math.round(petal.damage).toLocaleString()}</td>
            <td>${Math.round(petal.armor).toLocaleString()}</td>
            <td>${petal.reload}</td>
            <td>${getSpecialDescription(petal)}</td>
            <td>${perf.ticks}</td>
            <td><strong>${perf.baseDps.toFixed(2)}</strong></td>
            <td><button onclick="equipPetal(${index})">Equip</button></td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function sortByDPS() {
    activePetals.sort((a, b) => {
        const dpsA = calculatePetalPerformance(a).baseDps;
        const dpsB = calculatePetalPerformance(b).baseDps;
        return isAscending ? dpsA - dpsB : dpsB - dpsA;
    });
    isAscending = !isAscending; 
    renderTable(); 
}

function openPetalLightbox() {
    document.getElementById('petal-lightbox').style.display = 'block'; 
    const list = document.getElementById('petal-selection-list');
    list.innerHTML = ""; 
    petals.forEach((p, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<button onclick="addPetal(${i})">Add ${p.name}</button>`;
        li.style.margin = "5px 0";
        list.appendChild(li);
    });
}

function closePetalLightbox() { document.getElementById('petal-lightbox').style.display = 'none'; }

function addPetal(index) {
    const tier = parseInt(document.getElementById('tier-selection').value) || 0;
    const multiplier = Math.pow(3, tier);
    const clone = structuredClone(petals[index]);
    clone.tier = tier;
    clone.health *= multiplier;
    clone.damage *= multiplier;
    clone.armor *= multiplier;
    const effects = clone.specials || (clone.special ? [clone.special] : []);
    effects.forEach(e => { if (e.damage) e.damage *= multiplier; });
    
    let eCount = 1;
    if (clone.entity) {
        if (typeof clone.entity === 'number') eCount = clone.entity;
        else {
            const maxT = Math.max(...Object.keys(clone.entity).map(Number));
            eCount = clone.entity[tier > maxT ? maxT : tier];
        }
    }
    clone.currentEntities = eCount;
    activePetals.push(clone);
    renderTable();
    closePetalLightbox();
}

function renderActiveMob() {
    const display = document.getElementById('active-mob-display');
    if (!activeMob) { display.innerHTML = "No mob selected"; display.style.backgroundColor = "transparent"; return; }
    display.style.backgroundColor = tierColors[activeMob.tier];
    display.innerHTML = `<strong>${activeMob.name} (T${activeMob.tier})</strong><br>H: ${Math.round(activeMob.health).toLocaleString()} | D: ${Math.round(activeMob.damage).toLocaleString()} | A: ${Math.round(activeMob.armor).toLocaleString()}`;
}

function openMobLightbox() {
    document.getElementById('mob-lightbox').style.display = 'block'; 
    const list = document.getElementById('mob-selection-list');
    list.innerHTML = ""; 
    mobs.forEach((m, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<button onclick="selectMob(${i})">Select ${m.name}</button>`;
        li.style.margin = "5px 0";
        list.appendChild(li);
    });
}

function closeMobLightbox() { document.getElementById('mob-lightbox').style.display = 'none'; }

function selectMob(index) {
    const tier = parseInt(document.getElementById('mob-tier-selection').value) || 0;
    const factors = [3.75, 3.6, 4, 7.5, 6, 15, 12];
    let hMult = 1;
    for (let i = 0; i < tier; i++) hMult *= (factors[i] || 1);
    const sMult = Math.pow(3, tier);
    activeMob = structuredClone(mobs[index]);
    activeMob.tier = tier;
    activeMob.health *= hMult;
    activeMob.damage *= sMult;
    activeMob.armor *= sMult;
    renderActiveMob(); renderTable(); renderEquippedSlots(); closeMobLightbox();
}

function equipPetal(index) { equippedPetals.push(structuredClone(activePetals[index])); renderEquippedSlots(); }
function unequipPetal(index) { equippedPetals.splice(index, 1); renderEquippedSlots(); }

renderTable();
renderActiveMob();
renderEquippedSlots();