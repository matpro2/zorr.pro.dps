const engine = {
    tierColors: {
        0: "#7eef6d", 1: "#ffe65d", 2: "#4d52e3", 3: "#861fde",
        4: "#de1f1f", 5: "#1fdbde", 6: "#ff2b75", 7: "#2bffa3",
        8: "#f329d9", 9: "#444444"
    },

    supportEffects: ["Boost", "Critical", "reloadFactor", "secondaryReloadFactor", "petalHealthBuff", "Luck", "petMutation", "petalReloadSkipRate"],

    getEffectivePetals: (equippedPetals) => {
        // CORRECTION : Sépare définitivement les objets en mémoire pour éviter le bug "Fusioned"
        let effective = equippedPetals.map(p => structuredClone(p)); 
        let itemsToHide = new Set(); 

        for (let i = effective.length - 1; i >= 0; i--) {
            let p = effective[i];
            
            if (itemsToHide.has(i)) continue;

            if (p.name === "Fusion") {
                let ingredients = [];
                for (let j = i + 1; j < effective.length && ingredients.length < 3; j++) {
                    if (!itemsToHide.has(j)) {
                        ingredients.push({ item: effective[j], index: j });
                    }
                }

                if (ingredients.length === 3) {
                    let p1 = ingredients[0].item;
                    let p2 = ingredients[1].item;
                    let p3 = ingredients[2].item;
                    
                    let n1 = p1.originalName || p1.name;
                    let n2 = p2.originalName || p2.name;
                    let n3 = p3.originalName || p3.name;
                    
                    if (n1 === n2 && n2 === n3 &&
                        p1.tier === p2.tier && p2.tier === p3.tier && 
                        n1 !== "Fusion" && n1 !== "Fission" && n1 !== "Mimic") { 
                        
                        let baseDef = petals.find(x => x.name === n1) || (typeof eggs !== 'undefined' ? eggs.find(x => x.name === n1) : null) || p1;
                        let newPetal = structuredClone(baseDef);
                        
                        newPetal.tier = p1.tier + 1;
                        
                        const m = Math.pow(3, newPetal.tier);
                        if (baseDef.health != null) newPetal.health = baseDef.health * m;
                        if (baseDef.damage != null) newPetal.damage = baseDef.damage * m;
                        if (baseDef.armor != null) newPetal.armor = baseDef.armor * m;
                        
                        if (newPetal.specials) {
                            newPetal.specials.forEach(e => { if (e.damage != null) e.damage = (baseDef.specials.find(x=>x.type === e.type)?.damage || e.damage) * m; });
                        }
                        if (newPetal.special && newPetal.special.damage != null) {
                            newPetal.special.damage = (baseDef.special.damage) * m;
                        }

                        let baseQty = 1;
                        if (baseDef.entity != null) {
                            if (typeof baseDef.entity === 'number') baseQty = baseDef.entity;
                            else {
                                const maxT = Math.max(...Object.keys(baseDef.entity).map(Number));
                                baseQty = baseDef.entity[newPetal.tier > maxT ? maxT : newPetal.tier] || 1;
                            }
                        }
                        newPetal.currentEntities = baseQty;
                        newPetal.originalName = p.name;
                        newPetal.originalTier = p.tier;
                        newPetal.originalIndex = i;

                        effective[i] = newPetal;
                        ingredients.forEach(ing => itemsToHide.add(ing.index));
                    } else {
                        effective[i].originalIndex = i;
                    }
                } else {
                    effective[i].originalIndex = i;
                }
            }
            else if (p.name === "Mimic") {
                let targetIdx = -1;
                for (let j = i + 1; j < effective.length; j++) {
                    if (!itemsToHide.has(j)) {
                        targetIdx = j; 
                        break;
                    }
                }

                if (targetIdx !== -1) {
                    let target = effective[targetIdx];
                    let originalName = target.originalName || target.name; 

                    if (originalName !== "Mimic" && originalName !== "Fission" && originalName !== "Fusion") {
                        let baseDef = petals.find(x => x.name === originalName) || (typeof eggs !== 'undefined' ? eggs.find(x => x.name === originalName) : null) || target;
                        
                        if (baseDef.stack !== false) {
                            let newPetal = structuredClone(baseDef);
                            
                            // CORRECTION : Le Mimic impose sa propre rareté à l'objet copié
                            newPetal.tier = p.tier;

                            const m = Math.pow(3, newPetal.tier);
                            if (baseDef.health != null) newPetal.health = baseDef.health * m;
                            if (baseDef.damage != null) newPetal.damage = baseDef.damage * m;
                            if (baseDef.armor != null) newPetal.armor = baseDef.armor * m;
                            
                            if (newPetal.specials) {
                                newPetal.specials.forEach(e => { if (e.damage != null) e.damage = (baseDef.specials.find(x=>x.type === e.type)?.damage || e.damage) * m; });
                            }
                            if (newPetal.special && newPetal.special.damage != null) {
                                newPetal.special.damage = (baseDef.special.damage) * m;
                            }

                            let baseQty = 1;
                            if (baseDef.entity != null) {
                                if (typeof baseDef.entity === 'number') baseQty = baseDef.entity;
                                else {
                                    const maxT = Math.max(...Object.keys(baseDef.entity).map(Number));
                                    baseQty = baseDef.entity[newPetal.tier > maxT ? maxT : newPetal.tier] || 1;
                                }
                            }
                            newPetal.currentEntities = baseQty;
                            newPetal.originalName = p.name; 
                            newPetal.originalTier = p.tier;
                            newPetal.originalIndex = i;

                            effective[i] = newPetal;
                        } else {
                            effective[i].originalIndex = i; 
                        }
                    } else {
                        effective[i].originalIndex = i; 
                    }
                } else {
                    effective[i].originalIndex = i; 
                }
            }
            else if (p.name === "Fission") {
                let targetIdx = -1;
                for (let j = i + 1; j < effective.length; j++) {
                    if (!itemsToHide.has(j)) {
                        targetIdx = j; 
                        break;
                    }
                }
                
                if (targetIdx !== -1) {
                    let target = effective[targetIdx];
                    let originalName = target.originalName || target.name;
                    
                    if (originalName !== "Mimic" && originalName !== "Fission" && originalName !== "Fusion") {
                        let baseDef = petals.find(x => x.name === originalName) || (typeof eggs !== 'undefined' ? eggs.find(x => x.name === originalName) : null) || target;
                        
                        if (baseDef.stack !== false) {
                            effective[targetIdx].currentEntities = (effective[targetIdx].currentEntities || 1) * 3;
                            effective[targetIdx].isBuffedByFission = true;
                            effective[i].originalIndex = i;
                            effective[targetIdx].originalIndex = targetIdx;
                        } else {
                            effective[i].originalIndex = i; 
                        }
                    } else {
                        effective[i].originalIndex = i; 
                    }
                } else {
                    effective[i].originalIndex = i; 
                }
            } else {
                effective[i].originalIndex = i;
            }
        }
        
        return effective.filter((_, index) => !itemsToHide.has(index));
    },

    getGlobalStats: (effectivePetals) => {
        const hasRoot = effectivePetals.some(p => p.name === "Root");

        const stats = { 
            luck: 0, 
            manaRegen: 0,
            manaDrain: 0,
            hpRegen: 0,
            shieldRegen: 0,
            rawSupports: [], 
            activeSupports: [],
            multipliers: { Damage: 1, Reload: 1, SecondReload: 1, Health: 1 }, 
        };
        
        effectivePetals.forEach(p => {
            if (p.name === "Dizzy" && !hasRoot) return;
            const effects = p.specials || (p.special ? [p.special] : []);
            const qty = p.currentEntities || 1;
            
            effects.forEach(e => {
                if (e.global && e.type === "Luck") {
                    let val = e.value;
                    if (typeof val === 'object' && val[0] !== undefined) {
                        const maxT = Math.max(...Object.keys(val).map(Number));
                        val = val[p.tier > maxT ? maxT : p.tier];
                    }
                    stats.luck += val * qty;
                    stats.activeSupports.push({ name: p.name, type: "Luck", stat: "Bonus", value: `+${(val * qty).toFixed(1)}%`, tier: p.tier, restriction: "(All Tiers)" });
                }
                
                if (e.type === "Magic") {
                    if (e.regen) stats.manaRegen += (e.regen * Math.pow(2, p.tier) * qty);
                    if (e.drain) stats.manaDrain += (e.drain * Math.pow(2, p.tier) * qty);
                }

                if (e.type === "Heal" && e.regen) stats.hpRegen += (e.regen * Math.pow(3, p.tier) * qty);
                if (e.type === "Shield" && e.regen) stats.shieldRegen += (e.regen * Math.pow(3, p.tier) * qty);
            });
        });

        effectivePetals.forEach(p => {
            if (p.name === "Dizzy" && !hasRoot) return;

            const effects = p.specials || (p.special ? [p.special] : []);
            effects.forEach(e => {
                
                if (e.type === "Magic" && e.petArmor) {
                     const pArmor = e.petArmor * Math.pow(3, p.tier);
                     stats.rawSupports.push({ type: "petArmorBuff", value: pArmor, target: "Pet", name: p.name });
                     stats.activeSupports.push({ name: p.name, type: "Pet Armor", stat: "Buff", value: `+${pArmor.toFixed(1)}`, tier: p.tier, restriction: "(All Tiers, Pets only)" });
                }

                if (e.global && engine.supportEffects.includes(e.type) && e.type !== "Luck") {
                    
                    let val = e.value;
                    if (typeof val === 'object' && val[0] !== undefined) {
                        const maxT = Math.max(...Object.keys(val).map(Number));
                        val = val[p.tier > maxT ? maxT : p.tier];
                    }
                    
                    let chance = e.chance;
                    if (typeof chance === 'object' && chance[0] !== undefined) {
                        const maxT = Math.max(...Object.keys(chance).map(Number));
                        chance = chance[p.tier > maxT ? maxT : p.tier];
                    }

                    stats.rawSupports.push({
                        type: e.type,
                        stats: e.stats,
                        value: val,
                        chance: chance || e.chance,
                        multiplier: e.multiplier || (typeof val === 'object' ? val.multiplier : undefined),
                        sourceTier: p.tier,
                        tierRestricted: e.tierRestricted === true,
                        target: e.target, 
                        affectedByClover: e.affectedByClover,
                        name: p.name
                    });

                    let restrictStr = e.tierRestricted ? `≤ T${p.tier}` : `All Tiers`;
                    if (e.target) restrictStr += `, ${e.target}s`;
                    const restrictionText = `(${restrictStr})`;
                    
                    if (e.type === "petMutation") {
                        const actualChance = Math.min(((chance || e.chance) / 100) + (e.affectedByClover ? (stats.luck / 100) : 0), 1.0);
                        stats.activeSupports.push({ name: p.name, type: "Mutation", stat: "Chance", value: `+${(actualChance*100).toFixed(2)}%`, tier: p.tier, restriction: restrictionText });
                    } else if (e.type === "Boost" && e.stats === "Damage") {
                        stats.activeSupports.push({ name: p.name, type: e.type, stat: e.stats, value: `+${val}%`, tier: p.tier, restriction: restrictionText });
                    } else if (e.type === "Critical" && e.stats === "Damage") {
                        const actualChance = Math.min((val.chance / 100) + (stats.luck / 100), 1.0);
                        const expectedBonus = actualChance * (val.multiplier - 1);
                        stats.activeSupports.push({ name: p.name, type: "Crit Exp.", stat: e.stats, value: `+${(expectedBonus*100).toFixed(2)}%`, tier: p.tier, restriction: restrictionText });
                    } else if (e.type === "reloadFactor") {
                        stats.activeSupports.push({ name: p.name, type: "Reload", stat: "Speed", value: `${val > 0 ? '+' : ''}${val}%`, tier: p.tier, restriction: restrictionText });
                    } else if (e.type === "secondaryReloadFactor") {
                        stats.activeSupports.push({ name: p.name, type: "Sec. Reload", stat: "Speed", value: `${val > 0 ? '+' : ''}${val}%`, tier: p.tier, restriction: restrictionText });
                    } else if (e.type === "petalHealthBuff") {
                        stats.activeSupports.push({ name: p.name, type: "Health", stat: "Buff", value: `+${val}%`, tier: p.tier, restriction: restrictionText });
                    } else if (e.type === "petalReloadSkipRate") {
                        stats.activeSupports.push({ name: p.name, type: "Reload Skip", stat: "Chance", value: `+${val}%`, tier: p.tier, restriction: restrictionText });
                    }
                }
            });
        });
        return stats;
    },

    getModifiersForTier: (targetTier, globalStats, targetType) => {
        const mods = { Damage: 1, Reload: 1, SecondReload: 1, Health: 1, eggMutationChance: 0, flatArmor: 0, reloadSkipChance: 0 };
        
        globalStats.rawSupports.forEach(sup => {
            if (sup.tierRestricted && targetTier > sup.sourceTier) return;
            if (sup.target && sup.target !== targetType) return;

            if (sup.type === "Boost" && sup.stats === "Damage") mods.Damage += (sup.value / 100);
            else if (sup.type === "Critical" && sup.stats === "Damage") {
                const actualChance = Math.min((sup.value.chance / 100) + (globalStats.luck / 100), 1.0);
                mods.Damage += actualChance * (sup.value.multiplier - 1);
            }
            else if (sup.type === "reloadFactor") mods.Reload *= Math.max(0.01, 1 + (sup.value / 100));
            else if (sup.type === "secondaryReloadFactor") mods.SecondReload *= Math.max(0.01, 1 + (sup.value / 100));
            else if (sup.type === "petalHealthBuff") mods.Health += (sup.value / 100);
            else if (sup.type === "petMutation") {
                const actualChance = Math.min((sup.chance / 100) + (sup.affectedByClover ? (globalStats.luck / 100) : 0), 1.0);
                mods.eggMutationChance += actualChance;
            }
            else if (sup.type === "petArmorBuff") mods.flatArmor += sup.value;
            else if (sup.type === "petalReloadSkipRate") mods.reloadSkipChance += (sup.value / 100);
        });
        
        mods.reloadSkipChance = Math.min(mods.reloadSkipChance, 1.0);
        
        return mods;
    },

    effectHandlers: {
        Critical: (perf, effect, stats, context, petal) => {
            if (effect.global) return; 
            let val = effect.value;
            if (typeof val === 'object' && val[0] !== undefined) {
                const maxT = Math.max(...Object.keys(val).map(Number));
                val = val[petal.tier > maxT ? maxT : petal.tier];
            }
            const actualChance = Math.min((val.chance / 100) + (stats.luck / 100), 1.0);
            const expectedBonus = actualChance * (val.multiplier - 1);
            perf.physicalDps *= (1 + expectedBonus);
        },
        damageSeconds: (perf) => { perf.physicalDps /= 10; },
        Poison: (perf, effect, stats, context) => {
            if (effect.stack) {
                let dps = 0;
                if (context.isInfinite) dps = 10 * effect.duration * effect.damage;
                else if (context.totalCycleDuration > 0) dps = (context.survivalTicks * effect.duration * effect.damage) / context.totalCycleDuration;
                perf.stackingPoisonDps += dps;
            } else {
                let uptime = 1;
                if (!context.isInfinite && context.totalCycleDuration > 0) uptime = Math.min((context.lifeDuration + effect.duration) / context.totalCycleDuration, 1.0);
                perf.nonStackingPoisonDps += effect.damage * uptime;
            }
        },
        Fire: (perf, effect, stats, context) => {
            if (effect.stack) {
                let dps = 0;
                if (context.isInfinite) dps = 10 * effect.duration * effect.damage;
                else if (context.totalCycleDuration > 0) dps = (context.survivalTicks * effect.duration * effect.damage) / context.totalCycleDuration;
                perf.stackingFireDps += dps;
            } else {
                let uptime = 1;
                if (!context.isInfinite && context.totalCycleDuration > 0) uptime = Math.min((context.lifeDuration + effect.duration) / context.totalCycleDuration, 1.0);
                perf.nonStackingFireDps += effect.damage * uptime;
            }
        },
        Lightning: (perf, effect, stats, context, petal) => {
            let bounces = 0;
            if (typeof effect.bounce === 'number') bounces = effect.bounce;
            else if (effect.bounce) {
                const maxT = Math.max(...Object.keys(effect.bounce).map(Number));
                bounces = effect.bounce[petal.tier > maxT ? maxT : petal.tier] || 0;
            }
            const totalLmg = effect.damage * bounces;
            const lDps = context.isInfinite ? (totalLmg * 10) : (context.totalCycleDuration > 0 ? (totalLmg * context.survivalTicks) / context.totalCycleDuration : 0);
            perf.lightningDps += lDps;
        },
        Heal: (perf, effect, stats, context, petal) => {
            if (effect.regen) return; 
            const scale = Math.pow(3, petal.tier);
            if (effect.value) {
                const totalHeal = effect.value * scale;
                let hps = 0;
                if (context.totalCycleDuration > 0) hps = totalHeal / context.totalCycleDuration;
                else if (context.isInfinite) hps = totalHeal / (petal.reload || 0.1); 
                perf.healingHps += hps;
            }
            else if (effect.onDamage) {
                const healPerTick = effect.onDamage * scale;
                let hps = 0;
                if (context.isInfinite) hps = healPerTick * 10;
                else if (context.totalCycleDuration > 0) hps = (context.survivalTicks * healPerTick) / context.totalCycleDuration;
                perf.healingHps += hps;
            }
        }
    },

    getDisplayStats: (item, globalStats) => {
        const targetType = item.isEgg ? "Pet" : "Petal";
        const mods = engine.getModifiersForTier(item.tier, globalStats, targetType);
        
        if (item.isSpill) {
            const sr = item.secondReload || 0;
            const actualBaseReload = Math.max(0.01, ((item.reload || 0) / mods.Reload) * (1 - mods.reloadSkipChance));
            const actualSecondReload = Math.max(0, sr / mods.SecondReload);

            return { 
                health: null, 
                damage: item.damage != null ? item.damage * mods.Damage : null, 
                armor: null, 
                reload: actualBaseReload + actualSecondReload 
            };
        } else if (!item.isEgg) {
            let baseReload = item.reload != null ? Math.max(0.01, ((item.reload || 0) / mods.Reload) * (1 - mods.reloadSkipChance)) : null;
            
            if (item.special && item.special.type === "Magic" && item.special.cost) {
                const cost = item.special.cost * Math.pow(2, item.tier);
                if (globalStats.manaRegen > 0) {
                     const timeToRegen = cost / globalStats.manaRegen;
                     if (timeToRegen > baseReload) baseReload = timeToRegen;
                } else baseReload = Infinity;
            }

            return {
                health: item.health != null ? item.health * mods.Health : null,
                damage: item.damage != null ? item.damage * mods.Damage : null,
                armor: item.armor != null ? item.armor : null,
                reload: baseReload
            };
        } else {
            const mobName = item.name.replace(" Egg", "");
            const basePet = mobs.find(m => m.name === mobName);
            if (!basePet) return { health: null, damage: null, armor: null, reload: null };

            const petTier = typeof item.mobTier === 'object' ? (item.mobTier[item.tier] !== undefined ? item.mobTier[item.tier] : 0) : (item.mobTier || 0);
            const sr = typeof item.secondReload === 'object' ? (item.secondReload[item.tier] !== undefined ? item.secondReload[item.tier] : 0) : (item.secondReload || 0);
            const factors = [3.75, 3.6, 4, 7.5, 6, 15, 12];
            
            let hMult = 1; for (let i = 0; i < petTier; i++) hMult *= (factors[i] || 1);
            const sMult = Math.pow(3, petTier);

            let expHMult = hMult;
            let expSMult = sMult;

            if (mods.eggMutationChance > 0) {
                let hMultMut = 1; for (let i = 0; i < petTier + 1; i++) hMultMut *= (factors[i] || 1);
                const sMultMut = Math.pow(3, petTier + 1);
                expHMult = hMult * (1 - mods.eggMutationChance) + hMultMut * mods.eggMutationChance;
                expSMult = sMult * (1 - mods.eggMutationChance) + sMultMut * mods.eggMutationChance;
            }

            const actualBaseReload = Math.max(0.01, ((item.reload || 0) / mods.Reload) * (1 - mods.reloadSkipChance));
            const actualSecondReload = Math.max(0, sr / mods.SecondReload);

            return {
                health: basePet.health * expHMult * mods.Health,
                damage: basePet.damage * expSMult * mods.Damage,
                armor: (basePet.armor * expSMult) + mods.flatArmor,
                reload: actualBaseReload + actualSecondReload
            };
        }
    },

    calculateSpillPerformance: (spill, mob, globalStats) => {
        const perf = { ticks: "50 (5s)", baseDps: 0, physicalDps: 0, stackingPoisonDps: 0, nonStackingPoisonDps: 0, stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0, healingHps: 0 };
        if (!mob) return perf;

        const mods = engine.getModifiersForTier(spill.tier, globalStats, "Petal");
        const sr = spill.secondReload || 0;
        const actualBaseReload = Math.max(0.01, ((spill.reload || 0) / mods.Reload) * (1 - mods.reloadSkipChance));
        const actualSecondReload = Math.max(0, sr / mods.SecondReload);
        const actualCooldown = actualBaseReload + actualSecondReload;

        const SPILL_DURATION = 5.0; 
        const SPILL_TICKS = 50;

        const cycleDuration = actualCooldown;
        const context = { lifeDuration: SPILL_DURATION, totalCycleDuration: cycleDuration, isInfinite: false, survivalTicks: SPILL_TICKS };
        
        if (spill.damage != null) {
            const boostedDamage = spill.damage * mods.Damage;
            const pDmg = Math.max(0, boostedDamage - mob.armor);
            perf.physicalDps = (pDmg * SPILL_TICKS) / cycleDuration;
        }

        const effects = spill.specials || (spill.special ? [spill.special] : []);
        effects.forEach(e => {
            if (engine.effectHandlers[e.type]) engine.effectHandlers[e.type](perf, e, globalStats, context, spill);
        });

        const qty = spill.currentEntities || 1;
        perf.physicalDps *= qty; perf.stackingPoisonDps *= qty; perf.stackingFireDps *= qty; perf.lightningDps *= qty; perf.healingHps *= qty;
        perf.baseDps = perf.physicalDps + perf.stackingPoisonDps + perf.nonStackingPoisonDps + perf.stackingFireDps + perf.nonStackingFireDps + perf.lightningDps;
        return perf;
    },

    calculatePerformance: (item, mob, globalStats) => {
        if (item.isEgg) return engine.calculateEggPerformance(item, mob, globalStats);
        if (item.isSpill) return engine.calculateSpillPerformance(item, mob, globalStats);

        const perf = { ticks: "-", baseDps: 0, physicalDps: 0, stackingPoisonDps: 0, nonStackingPoisonDps: 0, stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0, healingHps: 0 };
        
        if (item.damage == null || item.health == null) {
            const mods = engine.getModifiersForTier(item.tier, globalStats, "Petal"); 
            let actualReload = Math.max(0.01, ((item.reload || 0.1) / mods.Reload) * (1 - mods.reloadSkipChance));
            const sr = item.secondReload || 0;
            actualReload += Math.max(0, sr / mods.SecondReload);
            const context = { lifeDuration: 0, totalCycleDuration: actualReload, isInfinite: false, survivalTicks: 0 };
            const effects = item.specials || (item.special ? [item.special] : []);
            effects.forEach(e => {
                if (engine.effectHandlers[e.type]) engine.effectHandlers[e.type](perf, e, globalStats, context, item);
            });
            const qty = item.currentEntities || 1;
            perf.healingHps *= qty;
            return perf;
        }

        if (!mob) return perf;

        let uptimeRatio = 1.0;
        let isDrained = false;
        if (item.special && item.special.type === "Magic" && item.special.drain) {
            const drainReq = item.special.drain * Math.pow(2, item.tier);
            if (globalStats.manaRegen < drainReq) {
                if (globalStats.manaRegen <= 0) return perf; 
                uptimeRatio = globalStats.manaRegen / drainReq;
                isDrained = true;
            }
        }

        const mods = engine.getModifiersForTier(item.tier, globalStats, "Petal");
        
        const boostedDamage = item.damage * mods.Damage;
        const boostedHealth = item.health * mods.Health;
        
        const mDmg = Math.max(0, mob.damage - (item.armor || 0));
        const pDmg = Math.max(0, boostedDamage - mob.armor);

        let lifeDuration = 0, totalCycleDuration = 0, isInfinite = true, survivalTicks = 0;
        let baseReload = Math.max(0.01, ((item.reload || 0) / mods.Reload) * (1 - mods.reloadSkipChance));
        baseReload += Math.max(0, (item.secondReload || 0) / mods.SecondReload);
        
        if (item.special && item.special.type === "Magic" && item.special.cost) {
            const cost = item.special.cost * Math.pow(2, item.tier);
            if (globalStats.manaRegen > 0) {
                 const timeToRegen = cost / globalStats.manaRegen;
                 if (timeToRegen > baseReload) baseReload = timeToRegen;
            } else return perf; 
        }

        if (mDmg > 0) {
            survivalTicks = Math.ceil(boostedHealth / mDmg);
            lifeDuration = survivalTicks * 0.1;
            totalCycleDuration = lifeDuration + baseReload;
            isInfinite = false;
            perf.ticks = survivalTicks;
        } else {
            perf.ticks = "∞";
            totalCycleDuration = baseReload; 
        }

        perf.physicalDps = isInfinite ? (pDmg * 10) : (totalCycleDuration > 0 ? (survivalTicks * pDmg) / totalCycleDuration : 0);
        if (isDrained) perf.physicalDps *= uptimeRatio;

        const context = { lifeDuration, totalCycleDuration, isInfinite, survivalTicks };
        const effects = item.specials || (item.special ? [item.special] : []);
        effects.forEach(e => {
            if (engine.effectHandlers[e.type]) engine.effectHandlers[e.type](perf, e, globalStats, context, item);
        });

        const qty = item.currentEntities || 1;
        perf.physicalDps *= qty; perf.stackingPoisonDps *= qty; perf.stackingFireDps *= qty; perf.lightningDps *= qty; perf.healingHps *= qty;

        if (isDrained) {
            perf.stackingPoisonDps *= uptimeRatio; perf.stackingFireDps *= uptimeRatio; perf.lightningDps *= uptimeRatio; perf.healingHps *= uptimeRatio;
        }

        perf.baseDps = perf.physicalDps + perf.stackingPoisonDps + perf.nonStackingPoisonDps + perf.stackingFireDps + perf.nonStackingFireDps + perf.lightningDps;
        return perf;
    },

    calcSingleEggPerf: (egg, targetMob, globalStats, petTier, mods) => {
        const perf = { ticks: "-", baseDps: 0, physicalDps: 0, stackingPoisonDps: 0, nonStackingPoisonDps: 0, stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0, healingHps: 0 };
        if (!targetMob) return perf;

        const mobName = egg.name.replace(" Egg", "");
        const basePet = mobs.find(m => m.name === mobName);
        if (!basePet) return perf;

        const sr = typeof egg.secondReload === 'object' ? (egg.secondReload[egg.tier] !== undefined ? egg.secondReload[egg.tier] : 0) : (egg.secondReload || 0);
        const qty = typeof egg.entity === 'object' ? (egg.entity[egg.tier] !== undefined ? egg.entity[egg.tier] : 1) : (egg.entity || 1);

        const factors = [3.75, 3.6, 4, 7.5, 6, 15, 12];
        let hMult = 1; for (let i = 0; i < petTier; i++) hMult *= (factors[i] || 1);
        const sMult = Math.pow(3, petTier);

        const petHealth = basePet.health * hMult;
        const petDamage = basePet.damage * sMult;
        const petArmor = basePet.armor * sMult;

        const boostedDamage = petDamage * mods.Damage;
        const boostedHealth = petHealth * mods.Health;
        const boostedArmor = petArmor + mods.flatArmor;

        const mDmg = Math.max(0, targetMob.damage - boostedArmor);
        const pDmg = Math.max(0, boostedDamage - targetMob.armor);

        let lifeDuration = 0, survivalTicks = 0, isInfinite = true;

        const actualBaseReload = Math.max(0.01, ((egg.reload || 0) / mods.Reload) * (1 - mods.reloadSkipChance));
        const actualSecondReload = Math.max(0, sr / mods.SecondReload);
        const actualCooldown = actualBaseReload + actualSecondReload;

        if (mDmg > 0) {
            survivalTicks = Math.ceil(boostedHealth / mDmg);
            lifeDuration = survivalTicks * 0.1;
            isInfinite = false;
            perf.ticks = survivalTicks;
        } else { perf.ticks = "∞"; }

        const cycleDuration = isInfinite ? Infinity : Math.max(lifeDuration, actualCooldown);
        perf.physicalDps = isInfinite ? (pDmg * 10) : (cycleDuration > 0 ? (survivalTicks * pDmg) / cycleDuration : 0);
        
        const context = { lifeDuration, totalCycleDuration: cycleDuration, isInfinite, survivalTicks };
        const effects = egg.specials || (egg.special ? [egg.special] : []);
        effects.forEach(e => {
            if (engine.effectHandlers[e.type]) engine.effectHandlers[e.type](perf, e, globalStats, context, egg);
        });

        perf.physicalDps *= qty; perf.stackingPoisonDps *= qty; perf.stackingFireDps *= qty; perf.lightningDps *= qty; perf.healingHps *= qty;
        perf.baseDps = perf.physicalDps + perf.stackingPoisonDps + perf.nonStackingPoisonDps + perf.stackingFireDps + perf.nonStackingFireDps + perf.lightningDps;
        return perf;
    },

    calculateEggPerformance: (egg, targetMob, globalStats) => {
        const mods = engine.getModifiersForTier(egg.tier, globalStats, "Pet");
        const petTier = typeof egg.mobTier === 'object' ? (egg.mobTier[egg.tier] !== undefined ? egg.mobTier[egg.tier] : 0) : (egg.mobTier || 0);
        
        const basePerf = engine.calcSingleEggPerf(egg, targetMob, globalStats, petTier, mods);
        const mutChance = mods.eggMutationChance;

        if (mutChance > 0) {
            const mutPerf = engine.calcSingleEggPerf(egg, targetMob, globalStats, petTier + 1, mods);

            basePerf.physicalDps = (basePerf.physicalDps * (1 - mutChance)) + (mutPerf.physicalDps * mutChance);
            basePerf.stackingPoisonDps = (basePerf.stackingPoisonDps * (1 - mutChance)) + (mutPerf.stackingPoisonDps * mutChance);
            basePerf.nonStackingPoisonDps = (basePerf.nonStackingPoisonDps * (1 - mutChance)) + (mutPerf.nonStackingPoisonDps * mutChance);
            basePerf.stackingFireDps = (basePerf.stackingFireDps * (1 - mutChance)) + (mutPerf.stackingFireDps * mutChance);
            basePerf.nonStackingFireDps = (basePerf.nonStackingFireDps * (1 - mutChance)) + (mutPerf.nonStackingFireDps * mutChance);
            basePerf.lightningDps = (basePerf.lightningDps * (1 - mutChance)) + (mutPerf.lightningDps * mutChance);
            basePerf.healingHps = (basePerf.healingHps * (1 - mutChance)) + (mutPerf.healingHps * mutChance);
            basePerf.baseDps = (basePerf.baseDps * (1 - mutChance)) + (mutPerf.baseDps * mutChance);

            if (basePerf.ticks !== mutPerf.ticks) basePerf.ticks = `${basePerf.ticks} / ${mutPerf.ticks}`;
        }
        return basePerf;
    }
};