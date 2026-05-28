const optimizer = {
    findBestBuild: (selectedItems, slotsCount, targetMob) => {
        if (!targetMob) {
            alert("Veuillez d'abord sélectionner un monstre (Target Mob) pour calculer le DPS !");
            return null;
        }

        // 1. Préparation de l'inventaire
        let inventory = {};
        let totalAvailable = 0;
        selectedItems.forEach(p => {
            let key = p.name + "_" + p.tier;
            if (!inventory[key]) {
                inventory[key] = {
                    item: p,
                    max: p.stack === false ? 1 : (p.ownedQuantity || 1)
                };
            }
        });

        for (let key in inventory) {
            totalAvailable += inventory[key].max;
        }

        const targetSize = Math.min(slotsCount, totalAvailable);
        if (targetSize === 0) return [];

        // 2. Paramètre de l'algorithme "Beam Search"
        // 50 est le nombre magique : assez grand pour ne pas rater des synergies (Root+Dizzy), 
        // assez petit pour que le navigateur calcule ça instantanément.
        const BEAM_WIDTH = 50; 
        
        let currentBeams = [
            { build: [], counts: {}, dps: 0 }
        ];

        // 3. Construction slot par slot
        for (let step = 0; step < targetSize; step++) {
            let nextBeams = [];
            let seenSignatures = new Set(); // Pour éviter de calculer deux fois la même composition

            for (let b = 0; b < currentBeams.length; b++) {
                let state = currentBeams[b];

                // Essayer d'ajouter chaque objet disponible dans l'inventaire
                for (let key in inventory) {
                    let usedCount = state.counts[key] || 0;
                    
                    if (usedCount < inventory[key].max) {
                        let candidateItem = inventory[key].item;

                        // Tester l'insertion de cet objet à TOUTES les positions possibles 
                        // (C'est crucial pour que les Mimic et Fission trouvent leur place parfaite)
                        for (let pos = 0; pos <= state.build.length; pos++) {
                            let newBuild = [...state.build];
                            newBuild.splice(pos, 0, candidateItem);

                            // Créer une signature (ex: Hot Water6|Mimic6|Root6)
                            let sig = newBuild.map(p => p.name + p.tier).join('|');
                            if (seenSignatures.has(sig)) continue;
                            seenSignatures.add(sig);

                            let newCounts = { ...state.counts };
                            newCounts[key] = usedCount + 1;

                            // Calculer le vrai DPS de cette nouvelle composition
                            let dps = optimizer.calculateExactDps(newBuild, targetMob);

                            nextBeams.push({
                                build: newBuild,
                                counts: newCounts,
                                dps: dps
                            });
                        }
                    }
                }
            }

            // 4. L'Élagage (Trier et couper)
            // On trie les milliers de nouvelles compositions par DPS décroissant
            nextBeams.sort((a, b) => b.dps - a.dps);

            // On ne garde STRICTEMENT que les "BEAM_WIDTH" meilleures (les 50 meilleures)
            currentBeams = nextBeams.slice(0, BEAM_WIDTH);
        }

        console.log(`[Optimizer] Optimisation instantanée terminée. Max DPS trouvé: ${currentBeams[0].dps.toFixed(2)}`);
        return currentBeams[0].build;
    },

    calculateExactDps: (arrangedCombo, targetMob) => {
        const effective = engine.getEffectivePetals(arrangedCombo);
        const stats = engine.getGlobalStats(effective);
        
        let totalDps = 0;
        let maxP = 0, pIdx = -1, maxF = 0, fIdx = -1;
        
        const perfs = effective.map((p, i) => {
            const perf = engine.calculatePerformance(p, targetMob, stats);
            // Identifie la meilleure source de poison/feu non cumulable
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