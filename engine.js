const engine = {
    tierColors: {
        0: "#7eef6d", 1: "#ffe65d", 2: "#4d52e3", 3: "#861fde",
        4: "#de1f1f", 5: "#1fdbde", 6: "#ff2b75", 7: "#2bffa3",
        8: "#f329d9", 9: "#444444"
    },

    supportEffects: ["Boost", "Critical", "reloadFactor", "secondaryReloadFactor", "petalHealthBuff", "Luck", "petMutation", "petalReloadSkipRate", "mobDamageFactor", "petalHeal"],

    getEffectivePetals: (equippedPetals) => {
        const hasJoy = equippedPetals.some(p => p.name === "Joystick");
        const joyDef = petals.find(x => x.name === "Joystick");
        
        let effective = equippedPetals.map(p => (hasJoy && p.name === "Stick" && joyDef) ? engineUtils.scalePetal(joyDef, p.tier, "Stick", p.tier) : structuredClone(p)); 
        let itemsToHide = new Set(); 

        for (let i = effective.length - 1; i >= 0; i--) {
            let p = effective[i];
            if (itemsToHide.has(i)) continue;

            // On vérifie si la pétale active a une restriction de Tier
            let pDef = petals.find(x => x.name === p.name) || p;
            let isRestricted = pDef.tierRestricted === true;

            if (p.name === "Fusion") {
                let ings = [];
                for (let j = i + 1; j < effective.length && ings.length < 3; j++) { if (!itemsToHide.has(j)) ings.push({ item: effective[j], index: j }); }
                
                if (ings.length === 3) {
                    let [p1, p2, p3] = ings.map(ing => ing.item);
                    let n1 = p1.originalName || p1.name;
                    
                    // RÈGLE : tierRestricted (Une Fusion T6 ne peut pas fusionner un T7)
                    if (isRestricted && p1.tier > p.tier) {
                        effective[i].originalIndex = i;
                        continue;
                    }

                    if (n1 === (p2.originalName || p2.name) && n1 === (p3.originalName || p3.name) && p1.tier === p2.tier && p2.tier === p3.tier && !["Fusion", "Fission", "Mimic"].includes(n1)) { 
                        let bDef = petals.find(x => x.name === n1) || (typeof eggs !== 'undefined' ? eggs.find(x => x.name === n1) : null) || p1;
                        effective[i] = engineUtils.scalePetal(bDef, p1.tier + 1, p.name, p.tier, i);
                        ings.forEach(ing => itemsToHide.add(ing.index));
                        continue;
                    }
                }
            } else if (p.name === "Mimic" || p.name === "Fission") {
                let tIdx = effective.findIndex((item, idx) => idx > i && !itemsToHide.has(idx));
                if (tIdx !== -1) {
                    let target = effective[tIdx];

                    // RÈGLE : tierRestricted
                    if (isRestricted && target.tier > p.tier) {
                        effective[i].originalIndex = i;
                        continue;
                    }

                    let oName = target.originalName || target.name; 
                    if (!["Mimic", "Fission", "Fusion"].includes(oName)) {
                        let bDef = petals.find(x => x.name === oName) || (typeof eggs !== 'undefined' ? eggs.find(x => x.name === oName) : null) || target;
                        if (bDef.stack !== false) {
                            if (p.name === "Mimic") effective[i] = engineUtils.scalePetal(bDef, p.tier, p.name, p.tier, i);
                            else {
                                effective[tIdx].currentEntities = (effective[tIdx].currentEntities || 1) * 3;
                                effective[tIdx].isBuffedByFission = true;
                                effective[tIdx].originalIndex = tIdx;
                                effective[i].originalIndex = i;
                            }
                            continue;
                        }
                    }
                }
            }
            effective[i].originalIndex = i;
        }
        return effective.filter((_, idx) => !itemsToHide.has(idx));
    },

    getGlobalStats: (effectivePetals) => {
        const hasRoot = effectivePetals.some(p => p.name === "Root");
        const stats = { luck: 0, manaRegen: 0, manaDrain: 0, hpRegen: 0, shieldRegen: 0, rawSupports: [], activeSupports: [], multipliers: { Damage: 1, Reload: 1, SecondReload: 1, Health: 1 } };
        
        effectivePetals.forEach(p => {
            if (p.name === "Dizzy" && !hasRoot) return;
            const effects = p.specials || (p.special ? [p.special] : []);
            const qty = p.currentEntities || 1;
            
            effects.forEach(e => {
                let val = engineUtils.getVal(e.value !== undefined ? e.value : (e.regen !== undefined ? e.regen : 0), p.tier);
                
                if (e.global && e.type === "Luck") {
                    stats.luck += val * qty;
                    stats.activeSupports.push({ name: p.name, type: "Luck", stat: "Bonus", value: `+${(val * qty).toFixed(1)}%`, tier: p.tier, restriction: "(All Tiers)" });
                }
                if (e.type === "Magic") {
                    if (e.regen) stats.manaRegen += (e.regen * Math.pow(2, p.tier) * qty);
                    if (e.drain) stats.manaDrain += (e.drain * Math.pow(2, p.tier) * qty);
                    if (e.petArmor) {
                        const pArmor = e.petArmor * Math.pow(3, p.tier);
                        stats.rawSupports.push({ type: "petArmorBuff", value: pArmor, target: "Pet", name: p.name });
                        stats.activeSupports.push({ name: p.name, type: "Pet Armor", stat: "Buff", value: `+${pArmor.toFixed(1)}`, tier: p.tier, restriction: "(All Tiers, Pets only)" });
                    }
                }
                if (e.type === "Heal" && e.regen) stats.hpRegen += (e.regen * Math.pow(3, p.tier) * qty);
                if (e.type === "Shield" && e.regen) stats.shieldRegen += (e.regen * Math.pow(3, p.tier) * qty);

                if (e.global && engine.supportEffects.includes(e.type) && e.type !== "Luck") {
                    if (e.type === "petalHeal") val *= Math.pow(3, p.tier);
                    
                    stats.rawSupports.push({
                        type: e.type, stats: e.stats, value: val, chance: engineUtils.getVal(e.chance, p.tier) || e.chance,
                        multiplier: e.multiplier || (typeof e.value === 'object' ? e.value.multiplier : undefined),
                        sourceTier: p.tier, tierRestricted: e.tierRestricted === true, target: e.target, 
                        affectedByClover: e.affectedByClover, name: p.name, qty: qty
                    });

                    const resTxt = `(${e.tierRestricted ? '≤ T'+p.tier : 'All Tiers'}${e.target ? ', '+e.target+'s' : ''})`;
                    
                    if (e.type === "petMutation") {
                        const actChance = Math.min(((engineUtils.getVal(e.chance, p.tier) || e.chance) / 100) + (e.affectedByClover ? (stats.luck / 100) : 0), 1.0);
                        stats.activeSupports.push({ name: p.name, type: "Mutation", stat: "Chance", value: `+${(actChance*100).toFixed(2)}%`, tier: p.tier, restriction: resTxt });
                    } else if (e.type === "Boost" && e.stats === "Damage") stats.activeSupports.push({ name: p.name, type: e.type, stat: e.stats, value: `+${val}%`, tier: p.tier, restriction: resTxt });
                    else if (e.type === "Critical" && e.stats === "Damage") {
                        const actualChance = Math.min((val.chance / 100) + (stats.luck / 100), 1.0);
                        stats.activeSupports.push({ name: p.name, type: "Crit Exp.", stat: e.stats, value: `+${(actualChance * (val.multiplier - 1)*100).toFixed(2)}%`, tier: p.tier, restriction: resTxt });
                    } else if (e.type === "reloadFactor") stats.activeSupports.push({ name: p.name, type: "Reload", stat: "Speed", value: `${val > 0 ? '+' : ''}${val}%`, tier: p.tier, restriction: resTxt });
                    else if (e.type === "secondaryReloadFactor") stats.activeSupports.push({ name: p.name, type: "Sec. Reload", stat: "Speed", value: `${val > 0 ? '+' : ''}${val}%`, tier: p.tier, restriction: resTxt });
                    else if (e.type === "petalHealthBuff") stats.activeSupports.push({ name: p.name, type: "Health", stat: "Buff", value: `+${val}%`, tier: p.tier, restriction: resTxt });
                    else if (e.type === "petalReloadSkipRate") stats.activeSupports.push({ name: p.name, type: "Reload Skip", stat: "Chance", value: `+${val}%`, tier: p.tier, restriction: resTxt });
                    else if (e.type === "mobDamageFactor") stats.activeSupports.push({ name: p.name, type: "Mob DMG", stat: "Reduction", value: `-${val}%`, tier: p.tier, restriction: resTxt });
                    else if (e.type === "petalHeal") stats.activeSupports.push({ name: p.name, type: "Petal", stat: "Regen", value: `+${(val * qty).toLocaleString()} HP/s`, tier: p.tier, restriction: resTxt });
                }
            });
        });
        return stats;
    },

    getModifiersForTier: (targetTier, globalStats, targetType) => {
        const mods = { Damage: 1, Reload: 1, SecondReload: 1, Health: 1, eggMutationChance: 0, flatArmor: 0, reloadSkipChance: 0, mobDamageReduction: 0, petalHeal: 0 };
        
        globalStats.rawSupports.forEach(sup => {
            if (sup.tierRestricted && targetTier > sup.sourceTier) return;
            if (sup.target && sup.target !== targetType) return;
            const q = sup.qty || 1; 

            if (sup.type === "Boost" && sup.stats === "Damage") mods.Damage += (sup.value * q / 100);
            else if (sup.type === "Critical" && sup.stats === "Damage") mods.Damage += Math.min((sup.value.chance / 100) + (globalStats.luck / 100), 1.0) * (sup.value.multiplier - 1) * q;
            else if (sup.type === "reloadFactor") mods.Reload *= Math.pow(Math.max(0.01, 1 + (sup.value / 100)), q);
            else if (sup.type === "secondaryReloadFactor") mods.SecondReload *= Math.pow(Math.max(0.01, 1 + (sup.value / 100)), q);
            else if (sup.type === "petalHealthBuff") mods.Health += (sup.value * q / 100);
            else if (sup.type === "petMutation") mods.eggMutationChance += Math.min((sup.chance / 100) + (sup.affectedByClover ? (globalStats.luck / 100) : 0), 1.0) * q;
            else if (sup.type === "petArmorBuff") mods.flatArmor += sup.value * q;
            else if (sup.type === "petalReloadSkipRate") mods.reloadSkipChance += (sup.value * q / 100);
            else if (sup.type === "mobDamageFactor") mods.mobDamageReduction += (sup.value * q / 100);
            else if (sup.type === "petalHeal") mods.petalHeal += sup.value * q;
        });
        
        mods.reloadSkipChance = Math.min(mods.reloadSkipChance, 1.0);
        mods.mobDamageReduction = Math.min(mods.mobDamageReduction, 1.0); 
        return mods;
    },

    getDisplayStats: (item, globalStats) => {
        const mods = engine.getModifiersForTier(item.tier, globalStats, item.isEgg ? "Pet" : "Petal");
        const actRel = engineUtils.getReload(item, mods);
        
        const hasFinal = (item.specials || (item.special ? [item.special] : [])).some(e => e.type === "finalDamage");
        const dmgMult = hasFinal ? 1 : mods.Damage;

        if (item.isSpill) return { health: null, damage: item.damage != null ? item.damage * dmgMult : null, armor: null, reload: actRel };
        
        if (!item.isEgg) {
            let bRel = item.reload != null ? actRel : null;
            if (item.special?.type === "Magic" && item.special.cost) {
                bRel = globalStats.manaRegen > 0 ? Math.max(bRel || 0, (item.special.cost * Math.pow(2, item.tier)) / globalStats.manaRegen) : Infinity;
            }
            return { health: item.health != null ? item.health * mods.Health : null, damage: item.damage != null ? item.damage * dmgMult : null, armor: item.armor != null ? item.armor : null, reload: bRel };
        } 
        
        const basePet = mobs.find(m => m.name === (item.mobSpawned || item.name.replace(" Egg", "")));
        if (!basePet) return { health: null, damage: null, armor: null, reload: null };

        const petTier = engineUtils.getVal(item.mobTier || 0, item.tier);
        const pMods = engineUtils.getPetMods(petTier);
        let eHMult = pMods.hMult, eSMult = pMods.sMult;

        if (mods.eggMutationChance > 0) {
            const pModsMut = engineUtils.getPetMods(petTier + 1);
            eHMult = pMods.hMult * (1 - mods.eggMutationChance) + pModsMut.hMult * mods.eggMutationChance;
            eSMult = pMods.sMult * (1 - mods.eggMutationChance) + pModsMut.sMult * mods.eggMutationChance;
        }
        return { health: basePet.health * eHMult * mods.Health, damage: basePet.damage * eSMult * dmgMult, armor: (basePet.armor * eSMult) + mods.flatArmor, reload: actRel };
    },

    calculatePerformance: (item, mob, globalStats) => {
        if (item.isEgg) {
            const mods = engine.getModifiersForTier(item.tier, globalStats, "Pet");
            const petTier = engineUtils.getVal(item.mobTier || 0, item.tier);
            const bPerf = engineCombat.calcSingleEgg(item, mob, globalStats, petTier, mods, engine);
            if (mods.eggMutationChance > 0) {
                const mPerf = engineCombat.calcSingleEgg(item, mob, globalStats, petTier + 1, mods, engine);
                ['physicalDps', 'stackingPoisonDps', 'nonStackingPoisonDps', 'stackingFireDps', 'nonStackingFireDps', 'lightningDps', 'healingHps', 'baseDps'].forEach(k => bPerf[k] = (bPerf[k] * (1 - mods.eggMutationChance)) + (mPerf[k] * mods.eggMutationChance));
                if (bPerf.ticks !== mPerf.ticks) bPerf.ticks = `${bPerf.ticks} / ${mPerf.ticks}`;
            }
            return bPerf;
        }
        return item.isSpill ? engineCombat.calcSpill(item, mob, globalStats, engine) : engineCombat.calcPetal(item, mob, globalStats, engine);
    }
};