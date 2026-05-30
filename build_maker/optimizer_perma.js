const optimizerPerma = {
    run: (blockData, slotsCount, targetMob, executionLog) => {
        let { inventory, composites, dpsBlocks, survivalSupports } = blockData;
        let bestPermaFound = null;

        for (let dpsBlock of dpsBlocks) {
            let queue = [{ supps: [], slots: 0, cost: { ...dpsBlock.cost } }];
            let visited = new Set([""]);
            let minimalSurvivals = [];
            let iterations = 0;

            while (queue.length > 0 && iterations < 1000) { 
                iterations++;
                let curr = queue.shift();

                let rawArr = [...dpsBlock.raw, ...curr.supps.flatMap(s => s.raw)];
                let { isInf, hasPhysicalDps } = optimizer.checkInfinity(rawArr, targetMob);

                if (hasPhysicalDps && isInf) {
                    minimalSurvivals.push(curr);
                    continue; 
                }

                for (let supp of survivalSupports) {
                    let newSlots = curr.slots + supp.slots;
                    if (dpsBlock.slots + newSlots > slotsCount) continue;

                    let newCost = { ...curr.cost };
                    let canAfford = true;
                    for (let [k, qty] of Object.entries(supp.cost)) {
                        newCost[k] = (newCost[k] || 0) + qty;
                        if (newCost[k] > inventory[k].max) { canAfford = false; break; }
                    }
                    if (!canAfford) continue;

                    let newSupps = [...curr.supps, supp].sort((a,b) => a.id - b.id);
                    let sig = newSupps.map(s => s.id).join('|');

                    if (!visited.has(sig)) {
                        visited.add(sig);
                        queue.push({ supps: newSupps, slots: newSlots, cost: newCost });
                    }
                }
            }

            for (let surv of minimalSurvivals) {
                let fullBuild = [dpsBlock, ...surv.supps];
                let slotsUsed = dpsBlock.slots + surv.slots;
                let currentCost = { ...surv.cost }; 

                for (let fillBlock of [dpsBlock, ...dpsBlocks]) {
                    while (slotsUsed + fillBlock.slots <= slotsCount) {
                        let canAfford = true;
                        for (let [k, qty] of Object.entries(fillBlock.cost)) {
                            if ((currentCost[k] || 0) + qty > inventory[k].max) { canAfford = false; break; }
                        }
                        if (!canAfford) break;

                        let testBuild = [...fullBuild, fillBlock].flatMap(b => b.raw);
                        if (!optimizer.checkInfinity(testBuild, targetMob).isInf) break; 

                        for (let [k, qty] of Object.entries(fillBlock.cost)) currentCost[k] = (currentCost[k] || 0) + qty;
                        fullBuild.push(fillBlock);
                        slotsUsed += fillBlock.slots;
                    }
                }

                let dps = optimizer.calculateExactDps(fullBuild.flatMap(b => b.raw), targetMob);

                if (!bestPermaFound || dps > bestPermaFound.dps) {
                    bestPermaFound = { dpsBlock, survCombo: surv.supps, buildBlocks: fullBuild, dps: dps };
                }
            }
        }

        if (!bestPermaFound) {
            executionLog.finalResult = { error: "No infinite survival combinations found." };
            alert(`Aucun combo infini possible avec cet inventaire contre ${targetMob.name}.`);
            return { equippedBuild: [], reasoningLog: executionLog };
        }

        let currentBuild = bestPermaFound.buildBlocks;
        let isOptimizing = true;

        for (let key in inventory) inventory[key].used = 0;
        currentBuild.forEach(block => {
            for (let [k, qty] of Object.entries(block.cost)) inventory[k].used += qty;
        });

        executionLog.phase2_baseBuild = {
            items: currentBuild.map(b => b.raw.map(p=>p.name).join('+')),
            baseTotalDps: bestPermaFound.dps,
            survivalCore: bestPermaFound.survCombo.map(s => s.raw.map(p=>p.name).join('+'))
        };

        while (isOptimizing) {
            isOptimizing = false;
            let currentTotalDps = optimizer.calculateExactDps(currentBuild.flatMap(b => b.raw), targetMob);

            let blockContributions = currentBuild.map((block, idx) => {
                let testBuild = currentBuild.filter((_, i) => i !== idx);
                let rawArr = testBuild.flatMap(b => b.raw);
                
                if (rawArr.length === 0 || !optimizer.checkInfinity(rawArr, targetMob).isInf) {
                    return { block, idx, realDpsPerSlot: Infinity };
                }

                let testDps = optimizer.calculateExactDps(rawArr, targetMob);
                return { block, idx, realDpsPerSlot: (currentTotalDps - testDps) / block.slots };
            });

            blockContributions.sort((a, b) => a.realDpsPerSlot - b.realDpsPerSlot);

            let bestSwap = null;
            let bestNewDps = currentTotalDps;

            for (let candidate of composites) {
                let slotsNeeded = candidate.slots;
                let blocksToRemoveIdxs = [];
                let slotsFreed = 0;

                for (let obj of blockContributions) {
                    if (obj.realDpsPerSlot === Infinity) break; 
                    blocksToRemoveIdxs.push(obj.idx);
                    slotsFreed += obj.block.slots;
                    if (slotsFreed >= slotsNeeded) break;
                }

                if (slotsFreed < slotsNeeded) continue;

                let tempUsed = {};
                for (let k in inventory) tempUsed[k] = inventory[k].used;
                blocksToRemoveIdxs.forEach(idx => {
                    for (let [k, qty] of Object.entries(currentBuild[idx].cost)) tempUsed[k] -= qty;
                });

                let canAffordCandidate = Object.entries(candidate.cost).every(([k, qty]) => (tempUsed[k] || 0) + qty <= inventory[k].max);

                if (canAffordCandidate) {
                    let baseTestBuild = currentBuild.filter((_, idx) => !blocksToRemoveIdxs.includes(idx));
                    for (let [k, qty] of Object.entries(candidate.cost)) tempUsed[k] = (tempUsed[k] || 0) + qty;

                    let leftoverSlots = slotsFreed - slotsNeeded;
                    if (leftoverSlots > 0) {
                        for (let block of dpsBlocks) {
                            while (leftoverSlots >= block.slots) {
                                let canAffordFill = Object.entries(block.cost).every(([k, qty]) => (tempUsed[k] || 0) + qty <= inventory[k].max);
                                if (!canAffordFill) break;

                                let tempTest = [...baseTestBuild, block].flatMap(b => b.raw);
                                if (!optimizer.checkInfinity(tempTest, targetMob).isInf) break;

                                for (let [k, qty] of Object.entries(block.cost)) tempUsed[k] += qty;
                                baseTestBuild.push({ ...block });
                                leftoverSlots -= block.slots;
                            }
                        }
                    }

                    for (let insertIdx = 0; insertIdx <= baseTestBuild.length; insertIdx++) {
                        let positionalTestBuild = [...baseTestBuild];
                        positionalTestBuild.splice(insertIdx, 0, candidate);

                        let rawArr = positionalTestBuild.flatMap(b => b.raw);
                        let { isInf, hasPhysicalDps } = optimizer.checkInfinity(rawArr, targetMob);

                        if (hasPhysicalDps && isInf) {
                            let testDps = optimizer.calculateExactDps(rawArr, targetMob);
                            if (testDps > bestNewDps) {
                                bestNewDps = testDps;
                                bestSwap = { candidate: candidate, removedIdxs: blocksToRemoveIdxs, finalTestBuild: positionalTestBuild };
                            }
                        }
                    }
                }
            }

            if (bestSwap) {
                executionLog.phase3_swaps.push({
                    removed: bestSwap.removedIdxs.map(idx => currentBuild[idx].raw.map(p=>p.name).join('+')).join(', '),
                    added: bestSwap.candidate.raw.map(p=>p.name).join('+'),
                    dpsJump: `${currentTotalDps.toFixed(2)} -> ${bestNewDps.toFixed(2)}`
                });

                for (let key in inventory) inventory[key].used = 0;
                bestSwap.finalTestBuild.forEach(block => {
                    for (let [k, qty] of Object.entries(block.cost)) inventory[k].used += qty;
                });

                currentBuild = bestSwap.finalTestBuild;
                isOptimizing = true;
            }
        }

        let finalRawBuild = currentBuild.flatMap(b => b.raw);
        let finalDps = optimizer.calculateExactDps(finalRawBuild, targetMob);

        executionLog.finalResult = { finalDps: finalDps, finalBuild: finalRawBuild.map(p => `${p.name} (T${p.tier})`) };

        return { equippedBuild: finalRawBuild, reasoningLog: executionLog };
    }
};