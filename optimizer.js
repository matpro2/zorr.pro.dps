const optimizer = {
    findBestBuild: (selectedItems, slotsCount, targetMob) => {
        if (!targetMob) {
            alert("Veuillez d'abord sélectionner un monstre (Target Mob) pour calculer le DPS !");
            return null;
        }

        let inventory = {};
        selectedItems.forEach(p => {
            let key = p.name + "_" + p.tier;
            if (!inventory[key]) {
                inventory[key] = { item: p, max: p.stack === false ? 1 : (p.ownedQuantity || 1) };
            }
        });

        const targetSize = Math.min(slotsCount, Object.values(inventory).reduce((sum, item) => sum + item.max, 0));
        if (targetSize === 0) return [];

        let invKeys = Object.keys(inventory);
        let fusions = invKeys.filter(k => inventory[k].item.name === "Fusion");
        let fissions = invKeys.filter(k => inventory[k].item.name === "Fission");
        let mimics = invKeys.filter(k => inventory[k].item.name === "Mimic");
        
        // Toutes les autres pétales (y compris les Chromosomes)
        let bases = invKeys.filter(k => !["Fusion", "Fission", "Mimic"].includes(inventory[k].item.name));

        const BEAM_WIDTH = 100; 
        let beamsBySize = Array.from({ length: targetSize + 1 }, () => []);
        let signaturesBySize = Array.from({ length: targetSize + 1 }, () => new Set());
        
        beamsBySize[0].push({ build: [], counts: {}, dps: 0 });

        for (let currentSize = 0; currentSize < targetSize; currentSize++) {
            
            beamsBySize[currentSize].sort((a, b) => b.dps - a.dps);
            beamsBySize[currentSize] = beamsBySize[currentSize].slice(0, BEAM_WIDTH);

            for (let state of beamsBySize[currentSize]) {
                let moves = []; 

                // A : Poser 1 pétale classique
                for (let k of bases) {
                    if ((state.counts[k] || 0) < inventory[k].max) {
                        moves.push({ items: [inventory[k].item] });
                    }
                }

                // B : Poser 1 Fusion + 3 Ingrédients OBLIGATOIREMENT (4 slots)
                for (let fKey of fusions) {
                    if ((state.counts[fKey] || 0) < inventory[fKey].max) {
                        let fItem = inventory[fKey].item;
                        for (let bKey of bases) {
                            let bItem = inventory[bKey].item;
                            if (inventory[bKey].max - (state.counts[bKey] || 0) >= 3) {
                                if (fItem.tierRestricted && bItem.tier > fItem.tier) continue;
                                moves.push({ items: [fItem, bItem, bItem, bItem] });
                            }
                        }
                    }
                }

                // C : Poser 1 Fission + 1 Cible OBLIGATOIREMENT (2 slots)
                for (let fKey of fissions) {
                    if ((state.counts[fKey] || 0) < inventory[fKey].max) {
                        let fItem = inventory[fKey].item;
                        for (let bKey of bases) {
                            let bItem = inventory[bKey].item;
                            if (inventory[bKey].max - (state.counts[bKey] || 0) >= 1 && bItem.stack !== false) {
                                if (fItem.tierRestricted && bItem.tier > fItem.tier) continue;
                                moves.push({ items: [fItem, bItem] });
                            }
                        }
                    }
                }

                // D : Poser 1 Mimic + 1 Cible OBLIGATOIREMENT (2 slots)
                for (let mKey of mimics) {
                    if ((state.counts[mKey] || 0) < inventory[mKey].max) {
                        let mItem = inventory[mKey].item;
                        for (let bKey of bases) {
                            let bItem = inventory[bKey].item;
                            if (inventory[bKey].max - (state.counts[bKey] || 0) >= 1 && bItem.stack !== false) {
                                if (mItem.tierRestricted && bItem.tier > mItem.tier) continue;
                                moves.push({ items: [mItem, bItem] });
                            }
                        }
                    }
                }

                // L'ÉTAPE "E" DE BOUCHAGE DE TROUS A ÉTÉ SUPPRIMÉE ICI !

                for (let move of moves) {
                    let newSize = currentSize + move.items.length;
                    
                    if (newSize <= targetSize) {
                        let newBuild = [...state.build, ...move.items];
                        
                        let sig = newBuild.map(p => p.name + "_" + p.tier).sort().join('|');
                        if (signaturesBySize[newSize].has(sig)) continue;
                        signaturesBySize[newSize].add(sig);

                        let newCounts = { ...state.counts };
                        for (let item of move.items) {
                            let key = item.name + "_" + item.tier;
                            newCounts[key] = (newCounts[key] || 0) + 1;
                        }

                        beamsBySize[newSize].push({
                            build: newBuild,
                            counts: newCounts,
                            dps: optimizer.calculateExactDps(newBuild, targetMob)
                        });
                    }
                }
            }
        }

        let bestBuild = [];
        let maxDps = -1;

        // Choix du build : on regarde toutes les tailles pour ne pas forcer l'ajout d'items inutiles
        for (let i = 1; i <= targetSize; i++) {
            if (beamsBySize[i].length > 0) {
                beamsBySize[i].sort((a, b) => b.dps - a.dps);
                let top = beamsBySize[i][0];
                
                // On utilise >= pour autoriser l'ajout d'objets comme Chromosome (qui font 0 dégât pur)
                // tant qu'ils ne baissent pas le DPS des autres !
                if (top.dps >= maxDps) {
                    maxDps = top.dps;
                    bestBuild = top.build;
                }
            }
        }

        console.log(`[Optimizer] Max DPS trouvé: ${maxDps.toFixed(2)}`);
        return bestBuild;
    },

    calculateExactDps: (arrangedCombo, targetMob) => {
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
            
            const dps = perf.physicalDps + perf.stackingPoisonDps + nsp + perf.stackingFireDps + nsf + perf.lightningDps;
            totalDps += dps;
        });
        
        return totalDps;
    }
};