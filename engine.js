const engine = {
    tierColors: {
        0: "#7eef6d", 1: "#ffe65d", 2: "#4d52e3", 3: "#861fde",
        4: "#de1f1f", 5: "#1fdbde", 6: "#ff2b75", 7: "#2bffa3"
    },
    // Liste des effets considérés comme supports
    supportEffects: ["Boost", "Critical"],

    // Parcourt les pétales équipées pour extraire les bonus globaux
    getGlobalStats: (equippedPetals, baseLuck) => {
        const stats = { luck: baseLuck, multipliers: { Damage: 1 }, activeSupports: [] };
        
        equippedPetals.forEach(p => {
            const effects = p.specials || (p.special ? [p.special] : []);
            effects.forEach(e => {
                if (engine.supportEffects.includes(e.type)) {
                    let val = e.value;
                    if (typeof val === 'object' && val[0] !== undefined) {
                        const maxT = Math.max(...Object.keys(val).map(Number));
                        val = val[p.tier > maxT ? maxT : p.tier];
                    }

                    if (e.type === "Boost" && e.stats === "Damage") {
                        stats.multipliers.Damage += (val / 100);
                        stats.activeSupports.push({ name: p.name, type: e.type, stat: e.stats, value: val, tier: p.tier });
                    }
                    else if (e.type === "Critical" && e.stats === "Damage") {
                        // Le bonus final (espérance) = (chance + luck) * (boost - 1)
                        const actualChance = Math.min((val.chance / 100) + (stats.luck / 100), 1.0);
                        const expectedBonus = actualChance * (val.boost - 1);
                        stats.multipliers.Damage += expectedBonus;
                        
                        const displayPercent = (expectedBonus * 100).toFixed(2);
                        stats.activeSupports.push({ name: p.name, type: "Crit Exp.", stat: e.stats, value: displayPercent, tier: p.tier });
                    }
                }
            });
        });
        return stats;
    },

    effectHandlers: {
        luckMultiplier: (perf, effect, stats, context, petal) => {
            // Chance de base (ex: 0.08) + Bonus de luck en % (ex: 0.8% -> 0.008)
            const triggerChance = Math.min(effect.chance + (stats.luck / 100), 1.0);
            const expectedMultiplier = ((1 - triggerChance) * 1) + (triggerChance * effect.multiplier);
            perf.physicalDps *= expectedMultiplier;
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

    calculatePerformance: (petal, mob, globalStats) => {
        const perf = {
            ticks: "-", baseDps: 0, physicalDps: 0, 
            stackingPoisonDps: 0, nonStackingPoisonDps: 0,
            stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0
        };
        
        // Les pétales sans dégâts ni santé (comme Dizzy ou Opal) sont des supports purs
        if (petal.damage == null || petal.health == null) return perf;
        if (!mob) return perf;

        // On applique le multiplicateur de dégâts global (1 + sommes des %) apporté par les supports
        const boostedDamage = petal.damage * (globalStats.multipliers.Damage || 1);
        
        const mDmg = Math.max(0, mob.damage - (petal.armor || 0));
        const pDmg = Math.max(0, boostedDamage - mob.armor);

        let lifeDuration = 0, totalCycleDuration = 0, isInfinite = true, survivalTicks = 0;

        if (mDmg > 0) {
            survivalTicks = Math.ceil(petal.health / mDmg);
            lifeDuration = survivalTicks * 0.1;
            totalCycleDuration = lifeDuration + (petal.reload || 0);
            isInfinite = false;
            perf.ticks = survivalTicks;
        } else {
            perf.ticks = "∞";
        }

        perf.physicalDps = isInfinite ? (pDmg * 10) : (totalCycleDuration > 0 ? (survivalTicks * pDmg) / totalCycleDuration : 0);

        const context = { lifeDuration, totalCycleDuration, isInfinite, survivalTicks };
        const effects = petal.specials || (petal.special ? [petal.special] : []);

        effects.forEach(e => {
            if (engine.effectHandlers[e.type]) engine.effectHandlers[e.type](perf, e, globalStats, context, petal);
        });

        const qty = petal.currentEntities || 1;
        perf.physicalDps *= qty;
        perf.stackingPoisonDps *= qty;
        perf.stackingFireDps *= qty;
        perf.lightningDps *= qty;

        perf.baseDps = perf.physicalDps + perf.stackingPoisonDps + perf.nonStackingPoisonDps + perf.stackingFireDps + perf.nonStackingFireDps + perf.lightningDps;
        return perf;
    }
};