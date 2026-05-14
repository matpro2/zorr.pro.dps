const engine = {
    tierColors: {
        0: "#7eef6d", 1: "#ffe65d", 2: "#4d52e3", 3: "#861fde",
        4: "#de1f1f", 5: "#1fdbde", 6: "#ff2b75", 7: "#2bffa3"
    },

    supportEffects: ["Boost", "Critical", "reloadFactor", "secondaryReloadFactor", "petalHealthBuff", "Luck"],

    getGlobalStats: (equippedPetals) => {
        const stats = { luck: 0, multipliers: { Damage: 1, Reload: 0, SecondReload: 0, Health: 1 }, activeSupports: [] };
        
        equippedPetals.forEach(p => {
            const effects = p.specials || (p.special ? [p.special] : []);
            effects.forEach(e => {
                if (e.global && engine.supportEffects.includes(e.type)) {
                    let val = e.value;
                    if (typeof val === 'object' && val[0] !== undefined) {
                        const maxT = Math.max(...Object.keys(val).map(Number));
                        val = val[p.tier > maxT ? maxT : p.tier];
                    }

                    if (e.type === "Luck") {
                        stats.luck += val;
                        stats.activeSupports.push({ name: p.name, type: "Luck", stat: "Bonus", value: `+${val}%`, tier: p.tier });
                    }
                    else if (e.type === "Boost" && e.stats === "Damage") {
                        stats.multipliers.Damage += (val / 100);
                        stats.activeSupports.push({ name: p.name, type: e.type, stat: e.stats, value: `+${val}%`, tier: p.tier });
                    }
                    else if (e.type === "Critical" && e.stats === "Damage") {
                        const actualChance = Math.min((val.chance / 100) + (stats.luck / 100), 1.0);
                        const expectedBonus = actualChance * (val.multiplier - 1);
                        stats.multipliers.Damage += expectedBonus;
                        
                        const displayPercent = (expectedBonus * 100).toFixed(2);
                        stats.activeSupports.push({ name: p.name, type: "Crit Exp.", stat: e.stats, value: `+${displayPercent}%`, tier: p.tier });
                    }
                    else if (e.type === "reloadFactor") {
                        stats.multipliers.Reload += (val / 100);
                        stats.activeSupports.push({ name: p.name, type: "Reload", stat: "Speed", value: `${val > 0 ? '+' : ''}${val}%`, tier: p.tier });
                    }
                    else if (e.type === "secondaryReloadFactor") {
                        stats.multipliers.SecondReload += (val / 100);
                        stats.activeSupports.push({ name: p.name, type: "Sec. Reload", stat: "Speed", value: `${val > 0 ? '+' : ''}${val}%`, tier: p.tier });
                    }
                    else if (e.type === "petalHealthBuff") {
                        stats.multipliers.Health += (val / 100);
                        stats.activeSupports.push({ name: p.name, type: "Health", stat: "Buff", value: `+${val}%`, tier: p.tier });
                    }
                }
            });
        });
        return stats;
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
        damageSeconds: (perf) => {
            perf.physicalDps /= 10;
        },
        Poison: (perf, effect, stats, context) => {
            let uptime = 1;
            if (!context.isInfinite && context.totalCycleDuration > 0) {
                uptime = Math.min((context.lifeDuration + effect.duration) / context.totalCycleDuration, 1.0);
            }
            const dps = effect.damage * uptime;
            if (effect.stack) perf.stackingPoisonDps += dps;
            else perf.nonStackingPoisonDps += dps;
        },
        Fire: (perf, effect, stats, context) => {
            let uptime = 1;
            if (!context.isInfinite && context.totalCycleDuration > 0) {
                uptime = Math.min((context.lifeDuration + effect.duration) / context.totalCycleDuration, 1.0);
            }
            const dps = effect.damage * uptime;
            if (effect.stack) perf.stackingFireDps += dps;
            else perf.nonStackingFireDps += dps;
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
        }
    },

    getDisplayStats: (item, globalStats) => {
        if (!item.isEgg) {
            return {
                health: item.health != null ? item.health * (globalStats.multipliers.Health || 1) : null,
                damage: item.damage != null ? item.damage * (globalStats.multipliers.Damage || 1) : null,
                armor: item.armor != null ? item.armor : null,
                reload: item.reload != null ? Math.max(0.01, item.reload * (1 - (globalStats.multipliers.Reload || 0))) : null
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

            const actualBaseReload = Math.max(0.01, (item.reload || 0) * (1 - (globalStats.multipliers.Reload || 0)));
            const actualSecondReload = Math.max(0, sr * (1 - (globalStats.multipliers.SecondReload || 0)));

            return {
                health: basePet.health * hMult * (globalStats.multipliers.Health || 1),
                damage: basePet.damage * sMult * (globalStats.multipliers.Damage || 1),
                armor: basePet.armor * sMult,
                reload: actualBaseReload + actualSecondReload
            };
        }
    },

    calculatePerformance: (item, mob, globalStats) => {
        if (item.isEgg) return engine.calculateEggPerformance(item, mob, globalStats);

        const perf = {
            ticks: "-", baseDps: 0, physicalDps: 0, 
            stackingPoisonDps: 0, nonStackingPoisonDps: 0,
            stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0
        };
        
        if (item.damage == null || item.health == null) return perf;
        if (!mob) return perf;

        const boostedDamage = item.damage * (globalStats.multipliers.Damage || 1);
        const boostedHealth = item.health * (globalStats.multipliers.Health || 1);
        
        const mDmg = Math.max(0, mob.damage - (item.armor || 0));
        const pDmg = Math.max(0, boostedDamage - mob.armor);

        let lifeDuration = 0, totalCycleDuration = 0, isInfinite = true, survivalTicks = 0;

        if (mDmg > 0) {
            survivalTicks = Math.ceil(boostedHealth / mDmg);
            lifeDuration = survivalTicks * 0.1;
            
            const actualReload = Math.max(0.01, (item.reload || 0) * (1 - (globalStats.multipliers.Reload || 0)));
            
            totalCycleDuration = lifeDuration + actualReload;
            isInfinite = false;
            perf.ticks = survivalTicks;
        } else {
            perf.ticks = "∞";
        }

        perf.physicalDps = isInfinite ? (pDmg * 10) : (totalCycleDuration > 0 ? (survivalTicks * pDmg) / totalCycleDuration : 0);

        const context = { lifeDuration, totalCycleDuration, isInfinite, survivalTicks };
        const effects = item.specials || (item.special ? [item.special] : []);

        effects.forEach(e => {
            if (engine.effectHandlers[e.type]) engine.effectHandlers[e.type](perf, e, globalStats, context, item);
        });

        const qty = item.currentEntities || 1;
        perf.physicalDps *= qty;
        perf.stackingPoisonDps *= qty;
        perf.stackingFireDps *= qty;
        perf.lightningDps *= qty;

        perf.baseDps = perf.physicalDps + perf.stackingPoisonDps + perf.nonStackingPoisonDps + perf.stackingFireDps + perf.nonStackingFireDps + perf.lightningDps;
        return perf;
    },

    calculateEggPerformance: (egg, targetMob, globalStats) => {
        const perf = {
            ticks: "-", baseDps: 0, physicalDps: 0, 
            stackingPoisonDps: 0, nonStackingPoisonDps: 0,
            stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0
        };
        if (!targetMob) return perf;

        const mobName = egg.name.replace(" Egg", "");
        const basePet = mobs.find(m => m.name === mobName);
        if (!basePet) return perf;

        const petTier = typeof egg.mobTier === 'object' ? (egg.mobTier[egg.tier] !== undefined ? egg.mobTier[egg.tier] : 0) : (egg.mobTier || 0);
        const sr = typeof egg.secondReload === 'object' ? (egg.secondReload[egg.tier] !== undefined ? egg.secondReload[egg.tier] : 0) : (egg.secondReload || 0);
        const qty = typeof egg.entity === 'object' ? (egg.entity[egg.tier] !== undefined ? egg.entity[egg.tier] : 1) : (egg.entity || 1);

        const factors = [3.75, 3.6, 4, 7.5, 6, 15, 12];
        let hMult = 1; for (let i = 0; i < petTier; i++) hMult *= (factors[i] || 1);
        const sMult = Math.pow(3, petTier);

        const petHealth = basePet.health * hMult;
        const petDamage = basePet.damage * sMult;
        const petArmor = basePet.armor * sMult;

        const boostedDamage = petDamage * (globalStats.multipliers.Damage || 1);
        const boostedHealth = petHealth * (globalStats.multipliers.Health || 1);

        const mDmg = Math.max(0, targetMob.damage - petArmor);
        const pDmg = Math.max(0, boostedDamage - targetMob.armor);

        let lifeDuration = 0, survivalTicks = 0, isInfinite = true;

        const actualBaseReload = Math.max(0.01, (egg.reload || 0) * (1 - (globalStats.multipliers.Reload || 0)));
        const actualSecondReload = Math.max(0, sr * (1 - (globalStats.multipliers.SecondReload || 0)));
        const actualCooldown = actualBaseReload + actualSecondReload;

        if (mDmg > 0) {
            survivalTicks = Math.ceil(boostedHealth / mDmg);
            lifeDuration = survivalTicks * 0.1;
            isInfinite = false;
            perf.ticks = survivalTicks;
        } else {
            perf.ticks = "∞";
        }

        const cycleDuration = isInfinite ? Infinity : Math.max(lifeDuration, actualCooldown);

        perf.physicalDps = isInfinite ? (pDmg * 10) : (cycleDuration > 0 ? (survivalTicks * pDmg) / cycleDuration : 0);
        
        const context = { lifeDuration, totalCycleDuration: cycleDuration, isInfinite, survivalTicks };
        const effects = egg.specials || (egg.special ? [egg.special] : []);

        effects.forEach(e => {
            if (engine.effectHandlers[e.type]) engine.effectHandlers[e.type](perf, e, globalStats, context, egg);
        });

        perf.physicalDps *= qty;
        perf.stackingPoisonDps *= qty;
        perf.stackingFireDps *= qty;
        perf.lightningDps *= qty;

        perf.baseDps = perf.physicalDps + perf.stackingPoisonDps + perf.nonStackingPoisonDps + perf.stackingFireDps + perf.nonStackingFireDps + perf.lightningDps;
        return perf;
    }
};