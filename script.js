let activePetals = [];
let activeMob = null;
let isAscending = false;

const playerStats = {
    luck: 1.0
};

const effectHandlers = {
    luckMultiplier: (baseValue, effect, stats) => {
        const triggerChance = Math.min(effect.chance * stats.luck, 1.0);
        const standardChance = 1 - triggerChance;
        const expectedMultiplier = (standardChance * 1) + (triggerChance * effect.multiplier);
        return baseValue * expectedMultiplier;
    },
    damageSeconds: (baseValue, effect, stats) => {
        return baseValue / 10;
    }
};

function updatePlayerStats() {
    const luckInput = document.getElementById('player-luck').value;
    playerStats.luck = parseFloat(luckInput) || 1.0;
    renderTable();
}

function calculatePetalPerformance(petal) {
    if (!activeMob) {
        return { ticks: 0, dps: 0 };
    }

    const effectiveMobDmg = Math.max(0, activeMob.damage - petal.armor);
    const effectivePetalDmg = Math.max(0, petal.damage - activeMob.armor);

    let survivalTicks;
    let finalDps;

    if (effectiveMobDmg > 0) {
        survivalTicks = Math.ceil(petal.health / effectiveMobDmg);
        const lifeDuration = survivalTicks * 0.1;
        const totalCycleDuration = lifeDuration + petal.reload;
        const totalDamageDealt = survivalTicks * effectivePetalDmg;
        finalDps = totalDamageDealt / totalCycleDuration;
    } else {
        survivalTicks = "∞";
        finalDps = effectivePetalDmg * 10;
    }

    if (petal.special && effectHandlers[petal.special.type]) {
        finalDps = effectHandlers[petal.special.type](finalDps, petal.special, playerStats);
    }

    return {
        ticks: survivalTicks,
        dps: finalDps
    };
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = ""; 

    activePetals.forEach(petal => {
        const perf = calculatePetalPerformance(petal);
        
        const row = `<tr>
            <td>${petal.name}</td>
            <td>${petal.tier}</td>
            <td>${Math.round(petal.health).toLocaleString()}</td>
            <td>${Math.round(petal.damage).toLocaleString()}</td>
            <td>${Math.round(petal.armor).toLocaleString()}</td>
            <td>${petal.reload}</td>
            <td>${perf.ticks}</td>
            <td><strong>${perf.dps.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
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

function closePetalLightbox() {
    document.getElementById('petal-lightbox').style.display = 'none';
}

function addPetal(index) {
    const tier = parseInt(document.getElementById('tier-selection').value) || 0;
    const multiplier = Math.pow(3, tier);
    const clone = structuredClone(petals[index]);
    clone.tier = tier;
    clone.health *= multiplier;
    clone.damage *= multiplier;
    clone.armor *= multiplier;
    activePetals.push(clone);
    renderTable();
    closePetalLightbox();
}

function renderActiveMob() {
    const display = document.getElementById('active-mob-display');
    if (!activeMob) {
        display.innerHTML = "No mob selected";
        return;
    }
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

function closeMobLightbox() {
    document.getElementById('mob-lightbox').style.display = 'none';
}

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
    closeMobLightbox();
}

renderTable();
renderActiveMob();