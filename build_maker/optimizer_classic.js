const optimizerClassic = {
    run: (blockData, slotsCount, targetMob, executionLog) => {
        let { inventory, composites, dpsBlocks } = blockData;
        let currentBuild = [];
        let currentSlotsUsed = 0;
        
        for (let block of dpsBlocks) {
            while (currentSlotsUsed + block.slots <= slotsCount) {
                let canAfford = Object.entries(block.cost).every(([k, qty]) => inventory[k].used + qty <= inventory[k].max);
                if (!canAfford) break;

                for (let [k, qty] of Object.entries(block.cost)) inventory[k].used += qty;
                currentBuild.push({ ...block });
                currentSlotsUsed += block.slots;
            }
        }

        executionLog.phase2_baseBuild = {
            items: currentBuild.map(b => b.raw.map(p=>p.name).join(' + ')),
            baseTotalDps: optimizer.calculateExactDps(currentBuild.flatMap(b => b.raw), targetMob)
        };

        let isOptimizing = true;
        
        while (isOptimizing) {
            isOptimizing = false;
            let currentTotalDps = optimizer.calculateExactDps(currentBuild.flatMap(b => b.raw), targetMob);
            
            let blockContributions = currentBuild.map((block, idx) => {
                let testBuild = currentBuild.filter((_, i) => i !== idx);
                let testDps = optimizer.calculateExactDps(testBuild.flatMap(b => b.raw), targetMob);
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

                                for (let [k, qty] of Object.entries(block.cost)) tempUsed[k] += qty;
                                baseTestBuild.push({ ...block });
                                leftoverSlots -= block.slots;
                            }
                        }
                    }

                    for (let insertIdx = 0; insertIdx <= baseTestBuild.length; insertIdx++) {
                        let positionalTestBuild = [...baseTestBuild];
                        positionalTestBuild.splice(insertIdx, 0, candidate);

                        let testDps = optimizer.calculateExactDps(positionalTestBuild.flatMap(b => b.raw), targetMob);

                        if (testDps > bestNewDps) {
                            bestNewDps = testDps;
                            bestSwap = { candidate: candidate, removedIdxs: blocksToRemoveIdxs, finalTestBuild: positionalTestBuild };
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