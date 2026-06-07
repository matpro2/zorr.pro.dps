import { GameController } from "./frontend/GameController";
import { getMaxSlots } from "./inventory";
import { PlayerValue } from "./PlayerValue"; // Ajuste le chemin vers PlayerValue si nécessaire

export const BuildMaker = {
    lastAuditLog: null as any,

    // NOUVEAU PARAMÈTRE : minRequirements (ex: { "player.extraVision": 2.5 })
    generateAutoBuild(allowedTypes: string[], targetName: string, targetTier: number, targetSlots: number, minRequirements: Record<string, number> = {}): { slots: (number | null)[], talents: Record<string, number> } {
        const auditLog: any = {
            date: new Date().toISOString(),
            parametres: { allowedTypes, targetName, targetTier, targetSlots, minRequirements },
            etapes: []
        };

        const statsToOptimize = [
            "petal.reloadFactor", 
            "petal.luck", 
            "petal.secondReloadFactor",
            "player.extraVision",
            "player.pickRange",
        ];
        
        if (allowedTypes.includes("egg")) {
            statsToOptimize.push("pet.healthMulti", "pet.damageMulti", "pet.mutation");
        }
        if (allowedTypes.includes("default")) {
            statsToOptimize.push("petal.damageMulti");
        }

        // On s'assure que les stats demandées en contrainte sont bien ciblées par l'optimiseur
        for (const req of Object.keys(minRequirements)) {
            if (!statsToOptimize.includes(req)) statsToOptimize.push(req);
        }

        const items = GameController.getInventoryData(targetName, targetTier, "all", "", true);

        // --- FONCTION D'ÉVALUATION (DPS + CONTRAINTES) ---
        const evaluateBuild = (currentSlots: (number | null)[], currentTalents?: Record<string, number>) => {
            const dpsData = GameController.getSlotsData(targetName, targetTier, currentSlots, currentTalents);
            let evaluatedDps = dpsData.totalDps;

            for (let i = 0; i < currentSlots.length; i++) {
                const slotId = currentSlots[i];
                if (slotId !== null) {
                    const item = items.find(inv => inv.id === slotId);
                    if (item) {
                        const itemType = (item.itemType || "default").toLowerCase();
                        if (!allowedTypes.includes(itemType)) {
                            const slotData = dpsData.slots[i];
                            if (slotData && slotData.result) {
                                evaluatedDps -= slotData.result.dps;
                            }
                        }
                    }
                }
            }

            // Calcul du déficit par rapport aux conditions minimales
            let isValid = true;
            let deficit = 0;

            for (const [reqKey, minVal] of Object.entries(minRequirements)) {
                const parts = reqKey.split('.');
                let actualVal = 0;
                
                if (parts.length === 2 && (PlayerValue as any)[parts[0]] && (PlayerValue as any)[parts[0]][parts[1]]) {
                    const statObj = (PlayerValue as any)[parts[0]][parts[1]];
                    actualVal = statObj.op === 'add' ? 0 : 1;
                    
                    for (const boost of statObj.boosts) {
                        if (statObj.op === 'factor') {
                            if (boost.source === "Talents") actualVal *= boost.value;
                            else actualVal *= Math.max(0.01, 1 + (boost.value / 100));
                        } else if (statObj.op === 'multiply') {
                            actualVal *= boost.value;
                        } else {
                            actualVal += boost.value;
                        }
                    }
                }

                if (actualVal < minVal) {
                    isValid = false;
                    deficit += (minVal - actualVal);
                }
            }

            return { dps: evaluatedDps, isValid, deficit };
        };

        // --- FONCTION DE COMPARAISON STRICTE ---
        const isBetter = (newEval: any, oldEval: any) => {
            if (newEval.isValid && !oldEval.isValid) return true; // Le nouveau devient valide
            if (!newEval.isValid && oldEval.isValid) return false; // Le nouveau casse le build
            if (!newEval.isValid && !oldEval.isValid) {
                // Si les deux sont invalides, on privilégie celui qui réduit le plus le déficit
                if (Math.abs(newEval.deficit - oldEval.deficit) > 0.0001) {
                    return newEval.deficit < oldEval.deficit;
                }
            }
            // Si les deux sont valides (ou même déficit), le DPS pur gagne
            return newEval.dps > oldEval.dps;
        };

        // --- METHODE 1 : Remplissage ---
        const filtered = items.filter(item => {
            const type = (item.itemType || "default").toLowerCase();
            const obj = GameController.getTargetData(item.name, item.tier);
            const itemNameLower = item.name.toLowerCase();
            
            const hasRelevantEffect = obj && Array.isArray(obj.effects) && obj.effects.some((e: any) => e.type && statsToOptimize.includes(e.type));
            const isSynergy = ["fission", "fusion", "mimic"].includes(itemNameLower) || 
                              (itemNameLower === "joystick" && allowedTypes.includes("default"));
            
            return allowedTypes.includes(type) || hasRelevantEffect || isSynergy;
        });

        const maxSlots = getMaxSlots(); 
        const actualTargetSlots = Math.min(targetSlots, maxSlots); 
        const method1Slots: (number | null)[] = new Array(maxSlots).fill(null);
        
        let currentSlotIndex = 0;
        for (const item of filtered) {
            let available = item.quantity;
            while (available > 0 && currentSlotIndex < actualTargetSlots) {
                method1Slots[currentSlotIndex] = item.id;
                currentSlotIndex++;
                available--;
            }
            if (currentSlotIndex >= actualTargetSlots) break; 
        }

        let bestSlots = [...method1Slots];
        let currentBestEval = evaluateBuild(bestSlots);
        
        auditLog.etapes.push({
            nom: "Methode 1 : Remplissage brut par DPS",
            evaluation: currentBestEval,
            slotsResultat: bestSlots.map(id => id === null ? "Vide" : `${items.find(i => i.id === id)?.name}`)
        });

        // --- METHODE 2 : Optimisation par Effets ---
        const effectItems = items.filter(item => {
            const obj = GameController.getTargetData(item.name, item.tier);
            const itemNameLower = item.name.toLowerCase();
            const hasRelevantEffect = obj && Array.isArray(obj.effects) && obj.effects.some((e: any) => e.type && statsToOptimize.includes(e.type));
            const isSynergy = ["fission", "fusion", "mimic"].includes(itemNameLower) || 
                              (itemNameLower === "joystick" && allowedTypes.includes("default"));
            
            return hasRelevantEffect || isSynergy;
        });

        if (effectItems.length > 0) {
            for (let i = actualTargetSlots - 1; i >= 0; i--) {
                if (bestSlots[i] === null) continue; 

                let slotImproved = false;
                let bestUtilityIdForSlot: number | null = null;
                const testsSurCeSlot: any[] = [];

                for (const util of effectItems) {
                    let usedCount = 0;
                    for (let j = 0; j < actualTargetSlots; j++) {
                        if (j !== i && bestSlots[j] === util.id) usedCount++;
                    }

                    if (util.quantity > usedCount) {
                        const testSlots = [...bestSlots];
                        testSlots[i] = util.id; 
                        
                        const testEval = evaluateBuild(testSlots);
                        
                        testsSurCeSlot.push({
                            pétaleTestée: `${util.name} (T${util.tier})`,
                            dpsObtenu: testEval.dps,
                            deficit: testEval.deficit,
                            estMeilleur: isBetter(testEval, currentBestEval)
                        });

                        if (isBetter(testEval, currentBestEval)) {
                            currentBestEval = testEval;
                            bestUtilityIdForSlot = util.id;
                            slotImproved = true;
                        }
                    }
                }

                if (slotImproved && bestUtilityIdForSlot !== null) {
                    bestSlots[i] = bestUtilityIdForSlot;
                    auditLog.etapes.push({
                        nom: `Methode 2 : Amélioration trouvée Slot Index ${i}`,
                        evaluation: currentBestEval
                    });
                }
            }
        }

        // --- METHODE 3 : Optimisation des Talents ---
        const currentTalents = { ...GameController.getTalents() };
        const talentDefs = GameController.getTalentDefs();
        const playerLevel = GameController.getPlayerLevel();
        const totalTP = Math.max(0, playerLevel - 1);

        for (const t of statsToOptimize) {
            if (talentDefs[t]) currentTalents[t] = 0;
        }

        let spentTP = 0;
        for (const [id, lvl] of Object.entries(currentTalents)) {
            if (!statsToOptimize.includes(id) && lvl > 0 && talentDefs[id]) {
                const def = talentDefs[id];
                if (Array.isArray(def.basePrice)) {
                    for (let i = 0; i < lvl; i++) spentTP += def.basePrice[i] || 0;
                } else {
                    spentTP += def.basePrice * (lvl * (lvl + 1)) / 2;
                }
            }
        }

        let availableTP = totalTP - spentTP;

        const getNextLevelCost = (id: string, currentLvl: number) => {
            const def = talentDefs[id];
            if (Array.isArray(def.basePrice)) return def.basePrice[currentLvl] || 0;
            return def.basePrice * (currentLvl + 1);
        };

        currentBestEval = evaluateBuild(bestSlots, currentTalents);
        let pointsAllocated = true;

        while (pointsAllocated) {
            pointsAllocated = false;
            let bestTalent: string | null = null;
            let bestEfficiency = -Infinity;
            let bestNewEval = currentBestEval;

            for (const t of statsToOptimize) {
                if (!talentDefs[t]) continue;

                const currentLvl = currentTalents[t] || 0;
                const cost = getNextLevelCost(t, currentLvl);

                if (currentLvl < talentDefs[t].maxLevel && availableTP >= cost) {
                    const req = talentDefs[t].requires;
                    if (req && (currentTalents[req.id] || 0) < req.lvl) continue; 

                    const testTalents = { ...currentTalents };
                    testTalents[t] = currentLvl + 1;

                    const testEval = evaluateBuild(bestSlots, testTalents);
                    
                    let isTalentBetter = false;
                    let efficiency = 0;

                    // Si le build ne respecte pas encore les contraintes (deficit > 0)
                    if (!currentBestEval.isValid) {
                        const deficitReduction = currentBestEval.deficit - testEval.deficit;
                        if (deficitReduction > 0) {
                            // On accorde un poids gigantesque à la réduction du déficit pour forcer l'algorithme
                            efficiency = 1000000 + (deficitReduction / cost);
                            isTalentBetter = true;
                        } else if (deficitReduction === 0 && testEval.dps > currentBestEval.dps && Math.abs(testEval.deficit - currentBestEval.deficit) < 0.0001) {
                            // Si pas de réduction de déficit, mais gain de DPS sans aggraver la situation
                            efficiency = (testEval.dps - currentBestEval.dps) / cost;
                            isTalentBetter = true;
                        }
                    } else {
                        // Le build est valide, on cherche juste le meilleur DPS / cout
                        if (testEval.isValid && testEval.dps > currentBestEval.dps) {
                            efficiency = (testEval.dps - currentBestEval.dps) / cost;
                            isTalentBetter = true;
                        }
                    }

                    if (isTalentBetter && efficiency > bestEfficiency) {
                        bestEfficiency = efficiency;
                        bestTalent = t;
                        bestNewEval = testEval;
                    }
                }
            }

            if (bestTalent !== null) {
                const currentLvl = currentTalents[bestTalent] || 0;
                const cost = getNextLevelCost(bestTalent, currentLvl);
                
                currentTalents[bestTalent] = currentLvl + 1;
                availableTP -= cost;
                currentBestEval = bestNewEval;
                pointsAllocated = true;
                
                auditLog.etapes.push({
                    nom: `Methode 3 : Talent attribué : ${talentDefs[bestTalent].label}`,
                    evaluation: currentBestEval
                });
            }
        }

        auditLog.resultatFinal = { evaluationFinale: currentBestEval, talentsFinaux: { ...currentTalents } };
        this.lastAuditLog = auditLog;

        return { slots: bestSlots, talents: currentTalents };
    }
};