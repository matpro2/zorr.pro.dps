const uiModals = {
    close: (id) => document.getElementById(id).style.display = 'none',
    
    // Fonction centralisée pour cloner, mettre au bon niveau, et ajouter à l'inventaire
    scaleAndAdd: (baseDef, tier, quantity, allowDuplicates = false) => {
        let existingIdx = ui.activeItems.findIndex(item => item.name === baseDef.name && item.tier === tier);
        
        if (existingIdx !== -1 && !allowDuplicates) {
            alert(`L'élément ${baseDef.name} (T${tier}) est déjà dans le comparateur !`);
            return null;
        }

        if (existingIdx === -1) {
            // Fait appel au cerveau mathématique central (engine_utils.js) ! Fini les répétitions !
            let newItem = engineUtils.scalePetal(baseDef, tier);
            newItem.ownedQuantity = quantity;
            ui.activeItems.push(newItem);
            existingIdx = ui.activeItems.length - 1;
        }
        return existingIdx;
    },

    openPetal: () => {
        document.getElementById('petal-lightbox').style.display = 'block';
        const list = document.getElementById('petal-selection-list');
        list.innerHTML = "";
        petals.forEach((p, i) => {
            if (p.health == null || p.damage == null) {
                if(!p.isSpill && !p.specials?.some(e => e.type === "Heal") && p.special?.type !== "Heal" && p.name !== "Mimic" && p.name !== "Fission" && p.name !== "Fusion") return; 
            }
            list.insertAdjacentHTML('beforeend', `<li><span>${p.name}</span><button onclick="uiModals.addPetal(${i})">Add</button></li>`);
        });
    },

    addPetal: (idx) => {
        const t = parseInt(document.getElementById('tier-selection').value) || 0;
        const q = parseInt(document.getElementById('petal-quantity-input').value) || 1;
        if (uiModals.scaleAndAdd(petals[idx], t, q) !== null) {
            ui.refresh();
            uiModals.close('petal-lightbox');
        }
    },

    openEgg: () => {
        document.getElementById('egg-lightbox').style.display = 'block';
        const list = document.getElementById('egg-selection-list');
        list.innerHTML = "";
        eggs.forEach((e, i) => {
            list.insertAdjacentHTML('beforeend', `<li><span>${e.name}</span><button onclick="uiModals.addEgg(${i})" style="background: #f39c12;">Add</button></li>`);
        });
    },

    addEgg: (idx) => {
        const t = parseInt(document.getElementById('egg-tier-selection').value) || 0;
        const q = parseInt(document.getElementById('egg-quantity-input').value) || 1;
        if (uiModals.scaleAndAdd(eggs[idx], t, q) !== null) {
            ui.refresh();
            uiModals.close('egg-lightbox');
        }
    },

    openSupport: () => {
        document.getElementById('support-lightbox').style.display = 'block';
        const list = document.getElementById('support-selection-list');
        list.innerHTML = "";
        petals.forEach((p, i) => {
            const hasSupport = p.name === "Mimic" || p.name === "Fission" || p.name === "Fusion" || (p.specials || (p.special ? [p.special] : [])).some(e => e.global === true || e.type === "Magic" || (e.type === "Heal" && e.regen) || (e.type === "Shield" && e.regen));
            if (hasSupport) list.insertAdjacentHTML('beforeend', `<li><span>${p.name}</span><button onclick="uiModals.addSupport(${i})" class="btn-add-support" style="margin:0;">Equip</button></li>`);
        });
    },

    addSupport: (idx) => {
        const t = parseInt(document.getElementById('support-tier-selection').value) || 0;
        const q = parseInt(document.getElementById('support-quantity-input').value) || 1;
        const addedIdx = uiModals.scaleAndAdd(petals[idx], t, q, true); // True autorise les doublons temporaires pour les supports
        if (addedIdx !== null) {
            ui.equip(addedIdx);
            uiModals.close('support-lightbox');
        }
    },

    openMob: () => {
        document.getElementById('mob-lightbox').style.display = 'block';
        const list = document.getElementById('mob-selection-list');
        list.innerHTML = "";
        mobs.forEach((m, i) => {
            list.insertAdjacentHTML('beforeend', `<li><span>${m.name}</span><button onclick="uiModals.selectMob(${i})">Select</button></li>`);
        });
    },

    selectMob: (idx) => {
        const t = parseInt(document.getElementById('mob-tier-selection').value) || 0;
        const pMods = engineUtils.getPetMods(t); 
        
        ui.activeMob = structuredClone(mobs[idx]);
        ui.activeMob.tier = t;
        ui.activeMob.health *= pMods.hMult;
        ui.activeMob.damage *= pMods.sMult;
        ui.activeMob.armor *= pMods.sMult;
        
        ui.refresh();
        uiModals.close('mob-lightbox');
    },

openOptimizer: () => {
        document.getElementById('optimizer-lightbox').style.display = 'block';
        const list = document.getElementById('optimizer-selection-list');
        list.innerHTML = "";
        
        if (ui.activeItems.length === 0) {
            list.innerHTML = "<li><em>Your inventory is empty. Add petals first.</em></li>";
            return;
        }

        list.innerHTML = `
            <li style="flex-direction: column; align-items: flex-start;">
                <label for="optimizer-method" style="font-weight: bold; margin-bottom: 10px;">Optimization Method:</label>
                <select id="optimizer-method" style="width: 100%; padding: 8px; border-radius: 5px; font-size: 1.1em;">
                    <option value="Basic - DMG/Reload">Basic - DMG/Reload</option>
                    <option value="Basic - PermaDMG">Basic - PermaDMG (Infinite Survival)</option>
                </select>
            </li>
        `;
    },

    runOptimizer: () => {
        const slots = parseInt(document.getElementById('optimizer-slots').value) || 5;
        const methodSelect = document.getElementById('optimizer-method');
        const selectedMethod = methodSelect ? methodSelect.value : "Basic - DMG/Reload";
        const selectedItems = ui.activeItems;
        
        if (selectedItems.length === 0) return alert("Your inventory is empty!");
        
        uiModals.close('optimizer-lightbox');
        
        setTimeout(() => {
            const result = optimizer.findBestBuild(selectedItems, slots, ui.activeMob, selectedMethod);
            
            if (result && result.equippedBuild) {
                ui.equippedPetals = result.equippedBuild;
                ui.refresh();
                
                window.lastOptiLog = result.reasoningLog;
                console.log(`[Optimizer - ${selectedMethod}] Log available in console.`);

                const wantLog = confirm(`✅ Optimized build found and equipped!\nMethod: ${selectedMethod}\n\nWould you like to download the detailed JSON log?`);
                
                if (wantLog) {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.reasoningLog, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `optimization_log_${new Date().getTime()}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                }
            }
        }, 50);
    }
};

// Lier les fonctions à l'interface HTML
window.openPetalLightbox = uiModals.openPetal;
window.closePetalLightbox = () => uiModals.close('petal-lightbox');
window.addPetalToTable = uiModals.addPetal;

window.openEggLightbox = uiModals.openEgg;
window.closeEggLightbox = () => uiModals.close('egg-lightbox');
window.addEggToTable = uiModals.addEgg;

window.openSupportLightbox = uiModals.openSupport;
window.closeSupportLightbox = () => uiModals.close('support-lightbox');
window.addSupportToSlots = uiModals.addSupport;

window.openMobLightbox = uiModals.openMob;
window.closeMobLightbox = () => uiModals.close('mob-lightbox');
window.selectMob = uiModals.selectMob;

window.openOptimizerLightbox = uiModals.openOptimizer;
window.closeOptimizerLightbox = () => uiModals.close('optimizer-lightbox');
window.runOptimizer = uiModals.runOptimizer;