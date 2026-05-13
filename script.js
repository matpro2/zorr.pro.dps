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

        if (effect.stack) {
            perf.stackingPoisonDps += poisonDps;
        } else {
            perf.nonStackingPoisonDps += poisonDps;
        }
    },
    Fire: (perf, effect, stats, context, petal) => {
        let fireUptimeRatio = 1;
        if (!context.isInfinite) {
            const fireActiveTime = context.lifeDuration + effect.duration;
            fireUptimeRatio = Math.min(fireActiveTime / context.totalCycleDuration, 1.0);
        }
        
        const fireDps = effect.damage * fireUptimeRatio;

        if (effect.stack) {
            perf.stackingFireDps += fireDps;
        } else {
            perf.nonStackingFireDps += fireDps;
        }
    },
    Lightning: (perf, effect, stats, context, petal) => {
        if (effect.multiHit) {
            let bounces = 0;
            if (typeof effect.bounce === 'number') {
                bounces = effect.bounce;
            } else if (effect.bounce) {
                const maxTier = Math.max(...Object.keys(effect.bounce).map(Number));
                const targetTier = petal.tier > maxTier ? maxTier : petal.tier;
                bounces = effect.bounce[targetTier];
            }

            const lightningDamagePerHit = effect.damage * bounces;
            
            if (context.isInfinite) {
                perf.physicalDps += lightningDamagePerHit * 10;
            } else {
                perf.physicalDps += (lightningDamagePerHit * context.survivalTicks) / context.totalCycleDuration;
            }
        }
    }
};

function updatePlayerStats() {
    const luckInput = document.getElementById('player-luck').value;
    playerStats.luck = parseFloat(luckInput) || 1.0;
    renderTable();
    renderEquippedSlots();
}

function calculatePetalPerformance(petal) {
    if (!activeMob) return { ticks: 0, dps: 0, physicalDps: 0, stackingPoisonDps: 0, nonStackingPoisonDps: 0, stackingFireDps: 0, nonStackingFireDps: 0 };

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

    let initialPhysicalDps = 0;
    if (survivalTicks === "∞") {
        initialPhysicalDps = effectivePetalDmg * 10;
    } else {
        initialPhysicalDps = (survivalTicks * effectivePetalDmg) / totalCycleDuration;
    }

    let perf = {
        ticks: survivalTicks,
        physicalDps: initialPhysicalDps,
        stackingPoisonDps: 0,
        nonStackingPoisonDps: 0,
        stackingFireDps: 0,
        nonStackingFireDps: 0
    };

    const context = {
        lifeDuration: lifeDuration,
        totalCycleDuration: totalCycleDuration,
        isInfinite: survivalTicks === "∞",
        survivalTicks: survivalTicks
    };

    const effects = petal.specials || (petal.special ? [petal.special] : []);

    effects.forEach(effect => {
        if (effectHandlers[effect.type]) {
            effectHandlers[effect.type](perf, effect, playerStats, context, petal);
        }
    });

    const eCount = petal.currentEntities || 1;
    
    perf.physicalDps *= eCount;
    perf.stackingPoisonDps *= eCount;
    perf.stackingFireDps *= eCount;

    perf.dps = perf.physicalDps + perf.stackingPoisonDps + perf.nonStackingPoisonDps + perf.stackingFireDps + perf.nonStackingFireDps;

    return perf;
}

function equipPetal(index) {
    equippedPetals.push(structuredClone(activePetals[index]));
    renderEquippedSlots();
}

function unequipPetal(index) {
    equippedPetals.splice(index, 1);
    renderEquippedSlots();
}

function renderEquippedSlots() {
    const listContainer = document.getElementById('slots-list');
    const totalDpsDisplay = document.querySelector('#total-dps-display strong');
    
    if (equippedPetals.length === 0) {
        listContainer.innerHTML = "No petals equipped";
        totalDpsDisplay.innerHTML = "0.00";
        return;
    }

    listContainer.innerHTML = "";
    
    let totalPhysical = 0;
    let totalStackingPoison = 0;
    let maxNonStackingPoison = 0;
    let totalStackingFire = 0;
    let maxNonStackingFire = 0;

    equippedPetals.forEach((petal, index) => {
        const perf = calculatePetalPerformance(petal);
        
        totalPhysical += perf.physicalDps;
        
        totalStackingPoison += perf.stackingPoisonDps;
        if (perf.nonStackingPoisonDps > maxNonStackingPoison) {
            maxNonStackingPoison = perf.nonStackingPoisonDps;
        }

        totalStackingFire += perf.stackingFireDps;
        if (perf.nonStackingFireDps > maxNonStackingFire) {
            maxNonStackingFire = perf.nonStackingFireDps;
        }

        const bgColor = tierColors[petal.tier] || "transparent";
        const eCount = petal.currentEntities || 1;

        const item = document.createElement('div');
        item.className = "equipped-item";
        item.style.backgroundColor = bgColor;
        item.innerHTML = `
            <span><strong>${petal.name}</strong> x${eCount} (T${petal.tier}) - ${perf.dps.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} DPS</span>
            <button onclick="unequipPetal(${index})">X</button>
        `;
        listContainer.appendChild(item);
    });

    const finalTotalDps = totalPhysical + totalStackingPoison + maxNonStackingPoison + totalStackingFire + maxNonStackingFire;
    totalDpsDisplay.innerHTML = finalTotalDps.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = ""; 

    activePetals.forEach((petal, index) => {
        const perf = calculatePetalPerformance(petal);
        const bgColor = tierColors[petal.tier] || "transparent";
        const eCount = petal.currentEntities || 1;
        
        const row = `<tr style="background-color: ${bgColor}">
            <td>${petal.name}</td>
            <td>${petal.tier}</td>
            <td>${eCount}</td>
            <td>${Math.round(petal.health).toLocaleString()}</td>
            <td>${Math.round(petal.damage).toLocaleString()}</td>
            <td>${Math.round(petal.armor).toLocaleString()}</td>
            <td>${petal.reload}</td>
            <td>${perf.ticks}</td>
            <td><strong>${perf.dps.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            <td><button onclick="equipPetal(${index})">Equip</button></td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function sortByDPS() {
    activePetals.sort((a, b) => {
        const dpsA = calculatePetalPerformance(a).dps;
        const dpsB = calculatePetalPerformance(b).dps;
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
    effects.forEach(effect => {
        if (effect.damage) effect.damage *= multiplier;
    });

    let eCount = 1;
    if (clone.entity !== undefined) {
        if (typeof clone.entity === 'number') {
            eCount = clone.entity;
        } else {
            const maxTier = Math.max(...Object.keys(clone.entity).map(Number));
            const targetTier = tier > maxTier ? maxTier : tier;
            eCount = clone.entity[targetTier];
        }
    }
    clone.currentEntities = eCount;

    activePetals.push(clone);
    renderTable();
    closePetalLightbox();
}

function renderActiveMob() {
    const display = document.getElementById('active-mob-display');
    if (!activeMob) {
        display.innerHTML = "No mob selected";
        display.style.backgroundColor = "transparent";
        return;
    }
    display.style.backgroundColor = tierColors[activeMob.tier] || "transparent";
    display.innerHTML = `<strong>${activeMob.name} (Tier ${activeMob.tier})</strong><br>
                         Health: ${Math.round(activeMob.health).toLocaleString()} | 
                         Damage: ${Math.round(activeMob.damage).toLocaleString()} | 
                         Armor: ${Math.round(activeMob.armor).toLocaleString()}`;
}

function openMobLightbox() {
    document.getElementById('mob-lightbox').style.display = 'block'; 
    const list = document.getElementById('mob-selection-list');
    list.innerHTML = ""; 
    mobs.forEach((m, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<button onclick="selectMob(${i})">Select ${m.name}</button>`;
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

    renderActiveMob();
    renderTable();
    renderEquippedSlots();
    closeMobLightbox();
}

renderTable();
renderActiveMob();
renderEquippedSlots();