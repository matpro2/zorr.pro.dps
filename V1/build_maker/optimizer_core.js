const optimizer = {
    currentMethodIsBasic: false,

    // L'ARBITRE ABSOLU : Confiance totale au moteur de jeu
    checkInfinity: (rawArr, targetMob) => {
        if (optimizer.currentMethodIsBasic && rawArr.some(p => p.name === "Stick") && !rawArr.some(p => p.name === "Joystick")) {
            return { isInf: false, hasPhysicalDps: false };
        }

        let effective = engine.getEffectivePetals(rawArr);
        let stats = engine.getGlobalStats(effective);
        let isInf = true;
        let hasPhysicalDps = false;

        effective.forEach(p => {
            // VOTRE LOGIQUE : Un support est simplement une pétale qui n'a pas de stats de combat.
            let isPureSupport = !p.isEgg && !p.isSpill && (p.damage == null || p.health == null);
            
            // Seules les pétales de combat (DPS/Tank) sont testées pour la survie infinie
            if (!isPureSupport) {
                let perf = engine.calculatePerformance(p, targetMob, stats);
                
                // Si la pétale génère du DPS (ou est une Coconut), elle DOIT survivre à l'infini
                if (perf.baseDps > 0 || p.name === "Coconut") {
                    hasPhysicalDps = true;
                    if (perf.ticks !== "∞") {
                        isInf = false;
                    }
                }
            }
        });
        return { isInf, hasPhysicalDps };
    },

    // LE CALCULATEUR DE DPS BRUT
    calculateExactDps: (arrangedCombo, targetMob) => {
        if (optimizer.currentMethodIsBasic && arrangedCombo.some(p => p.name === "Stick") && !arrangedCombo.some(p => p.name === "Joystick")) {
            return 0;
        }

        const effective = engine.getEffectivePetals(arrangedCombo);
        const stats = engine.getGlobalStats(effective);
        
        let totalDps = 0;
        let maxP = 0, pIdx = -1, maxF = 0, fIdx = -1;
        
        const perfs = effective.map((p, i) => {
            const perf = engine.calculatePerformance(p, targetMob, stats);
            if (perf.nonStackingPoisonDps > maxP) { maxP = perf.nonStackingPoisonDps; pIdx = i; }
            if (perf.nonStackingFireDps > maxF) { maxF = perf.nonStackingFireDps; fIdx = i; }
            return perf;
        });
        
        effective.forEach((p, i) => {
            const perf = perfs[i];
            const nsp = (i === pIdx) ? perf.nonStackingPoisonDps : 0;
            const nsf = (i === fIdx) ? perf.nonStackingFireDps : 0;
            totalDps += perf.physicalDps + perf.stackingPoisonDps + nsp + perf.stackingFireDps + nsf + perf.lightningDps;
        });
        
        return totalDps;
    },

    // LE CALCULATEUR DE POTENTIEL
    calculatePotentialDps: (arrangedCombo, targetMob) => {
        if (optimizer.currentMethodIsBasic && arrangedCombo.some(p => p.name === "Stick") && !arrangedCombo.some(p => p.name === "Joystick")) return 0;
        
        const effective = engine.getEffectivePetals(arrangedCombo);
        const stats = engine.getGlobalStats(effective);
        
        // L'astuce magique : On injecte un soin divin pour forcer l'évaluation du vrai potentiel offensif
        stats.rawSupports.push({ type: "petalHeal", value: 999999999, qty: 1, sourceTier: 0, target: null });
        
        let totalDps = 0;
        let maxP = 0, pIdx = -1, maxF = 0, fIdx = -1;
        
        const perfs = effective.map((p, i) => {
            const perf = engine.calculatePerformance(p, targetMob, stats);
            if (perf.nonStackingPoisonDps > maxP) { maxP = perf.nonStackingPoisonDps; pIdx = i; }
            if (perf.nonStackingFireDps > maxF) { maxF = perf.nonStackingFireDps; fIdx = i; }
            return perf;
        });
        
        effective.forEach((p, i) => {
            const perf = perfs[i];
            const nsp = (i === pIdx) ? perf.nonStackingPoisonDps : 0;
            const nsf = (i === fIdx) ? perf.nonStackingFireDps : 0;
            totalDps += perf.physicalDps + perf.stackingPoisonDps + nsp + perf.stackingFireDps + nsf + perf.lightningDps;
        });
        
        return totalDps;
    },

    // GÉNÉRATEUR DE BLOCS (Préparation de l'inventaire)
    generateBlocks: (selectedItems, targetMob, isBasic) => {
        let inventory = {};
        const hasJoystick = selectedItems.some(item => item.name === "Joystick");

        selectedItems.forEach(p => {
            if (isBasic && (p.isSpill || p.isEgg)) {
                if (!(hasJoystick && p.name === "Stick")) return;
            }
            let key = p.name + "_" + p.tier;
            if (!inventory[key]) inventory[key] = { item: p, max: p.stack === false ? 1 : (p.ownedQuantity || 1), used: 0 };
        });

        let invKeys = Object.keys(inventory);
        if (invKeys.length === 0) return null;

        let fusions = invKeys.filter(k => inventory[k].item.name === "Fusion").map(k => inventory[k]);
        let fissions = invKeys.filter(k => inventory[k].item.name === "Fission").map(k => inventory[k]);
        let mimics = invKeys.filter(k => inventory[k].item.name === "Mimic").map(k => inventory[k]);
        let bases = invKeys.filter(k => !["Fusion", "Fission", "Mimic"].includes(inventory[k].item.name)).map(k => inventory[k]);

        let composites = [];
        let compIdCounter = 0;

        const addComposite = (type, slots, rawArr, costObj) => {
            composites.push({ 
                id: compIdCounter++, type, slots, raw: rawArr, cost: costObj, 
                standaloneDps: optimizer.calculatePotentialDps(rawArr, targetMob) 
            });
        };

        bases.forEach(b => addComposite("Base", 1, [b.item], { [b.item.name + "_" + b.item.tier]: 1 }));

        let rootBlock = bases.find(b => b.item.name === "Root");
        let dizzyBlock = bases.find(b => b.item.name === "Dizzy");
        if (rootBlock && dizzyBlock) {
            addComposite("Synergy", 2, [rootBlock.item, dizzyBlock.item], { [rootBlock.item.name + "_" + rootBlock.item.tier]: 1, [dizzyBlock.item.name + "_" + dizzyBlock.item.tier]: 1 });
        }
        
        // CORRECTIF 1 : Synergie Joystick + Sticks (Jusqu'à 10 Sticks)
        let joystickBlocks = bases.filter(b => b.item.name === "Joystick");
        let stickBlocks = bases.filter(b => b.item.name === "Stick");
        joystickBlocks.forEach(j => {
            stickBlocks.forEach(s => {
                let maxSticks = Math.min(10, s.max);
                for (let i = 1; i <= maxSticks; i++) {
                    let rawArr = [j.item];
                    let costObj = { [j.item.name + "_" + j.item.tier]: 1 };
                    for (let k = 0; k < i; k++) rawArr.push(s.item);
                    costObj[s.item.name + "_" + s.item.tier] = i;
                    addComposite("Synergy", 1 + i, rawArr, costObj);
                }
            });
        });

        // CORRECTIF 2 : Synergie Base + 1 SEUL Mimic
        mimics.forEach(m => {
            bases.forEach(b => {
                if (!b.item.isSpill && !b.item.isEgg && b.item.name !== "Stick") {
                    let rawArr = [b.item, m.item];
                    addComposite("Synergy", 2, rawArr, { 
                        [b.item.name + "_" + b.item.tier]: 1,
                        [m.item.name + "_" + m.item.tier]: 1
                    });
                }
            });
        });

        // Les Packs de Supports (Le Cheval de Troie légal)
        bases.forEach(b => {
            let isSupport = (b.item.specials || (b.item.special ? [b.item.special] : [])).some(e => e.global);
            if (isSupport) {
                if (b.max >= 2) addComposite("SupportPack", 2, [b.item, b.item], { [b.item.name + "_" + b.item.tier]: 2 });
                if (b.max >= 3) addComposite("SupportPack", 3, [b.item, b.item, b.item], { [b.item.name + "_" + b.item.tier]: 3 });
            }
        });

        fusions.forEach(f => bases.forEach(b => {
            let isRestricted = !!f.item.tierRestricted;
            let isSupport = (b.item.specials || (b.item.special ? [b.item.special] : [])).some(e => e.global);
            
            if (b.max >= 3 && !isSupport && (!isRestricted || b.item.tier <= f.item.tier)) {
                addComposite("Fusion", 4, [f.item, b.item, b.item, b.item], { [f.item.name + "_" + f.item.tier]: 1, [b.item.name + "_" + b.item.tier]: 3 });
            }
        }));

        fissions.forEach(f => addComposite("Fission", 1, [f.item], { [f.item.name + "_" + f.item.tier]: 1 }));
        mimics.forEach(m => addComposite("Mimic", 1, [m.item], { [m.item.name + "_" + m.item.tier]: 1 }));

        composites.forEach(c => { c.dpsPerSlot = c.slots > 0 ? (c.standaloneDps / c.slots) : 0; });

        let dpsBlocks = composites.filter(c => c.standaloneDps > 0).sort((a, b) => b.dpsPerSlot - a.dpsPerSlot || a.slots - b.slots);
        let survivalSupports = composites.filter(c => {
            let corePetal = c.raw.find(item => !["Fusion", "Fission", "Mimic"].includes(item.name)) || c.raw[0];
            let effects = corePetal.specials || (corePetal.special ? [corePetal.special] : []);
            return effects.some(e => e.global && ["petalHeal", "mobDamageFactor", "petalHealthBuff"].includes(e.type));
        });

        return { inventory, composites, dpsBlocks, survivalSupports };
    },

    // LE ROUTEUR PRINCIPAL
    findBestBuild: (selectedItems, slotsCount, targetMob, method = "Basic - DMG/Reload") => {
        if (!targetMob) {
            alert("Please select a target mob first to calculate DPS!");
            return null;
        }

        optimizer.currentMethodIsBasic = method.startsWith("Basic");
        const isPerma = method === "Basic - PermaDMG";

        let executionLog = {
            metadata: { strategy: method, targetMob: targetMob.name, slotsCount: slotsCount },
            phase1_blocksGenerated: [],
            phase2_baseBuild: {},
            phase3_swaps: [],
            finalResult: null
        };

        let blockData = optimizer.generateBlocks(selectedItems, targetMob, optimizer.currentMethodIsBasic);
        if (!blockData) {
            alert(`No valid petals selected for method: ${method}`);
            return null;
        }

        executionLog.phase1_blocksGenerated = {
            availableBlocksEvaluated: blockData.composites.map(c => ({ type: c.type, items: c.raw.map(p=>p.name).join('+'), dpsPerSlot: c.dpsPerSlot, slotsCost: c.slots }))
        };

        // Redirection vers le bon script selon la méthode
        if (isPerma) {
            return optimizerPerma.run(blockData, slotsCount, targetMob, executionLog);
        } else {
            return optimizerClassic.run(blockData, slotsCount, targetMob, executionLog);
        }
    }
};