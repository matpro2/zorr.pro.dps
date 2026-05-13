const engine = {
    tierColors: {
        0: "#7eef6d", 1: "#ffe65d", 2: "#4d52e3", 3: "#861fde",
        4: "#de1f1f", 5: "#1fdbde", 6: "#ff2b75", 7: "#2bffa3"
    },

    effectHandlers: {
        luckMultiplier: (perf, effect, luck, context, petal) => {
            const triggerChance = Math.min(effect.chance * luck, 1.0);
            const expectedMultiplier = ((1 - triggerChance) * 1) + (triggerChance * effect.multiplier);
            perf.physicalDps *= expectedMultiplier;
        },
        damageSeconds: (perf) => {
            perf.physicalDps /= 10;
        },
        Poison: (perf, effect, luck, context) => {
            let uptime = 1;
            if (!context.isInfinite && context.totalCycleDuration > 0) {
                uptime = Math.min((context.lifeDuration + effect.duration) / context.totalCycleDuration, 1.0);
            }
            const dps = effect.damage * uptime;
            if (effect.stack) perf.stackingPoisonDps += dps;
            else perf.nonStackingPoisonDps += dps;
        },
        Fire: (perf, effect, luck, context) => {
            let uptime = 1;
            if (!context.isInfinite && context.totalCycleDuration > 0) {
                uptime = Math.min((context.lifeDuration + effect.duration) / context.totalCycleDuration, 1.0);
            }
            const dps = effect.damage * uptime;
            if (effect.stack) perf.stackingFireDps += dps;
            else perf.nonStackingFireDps += dps;
        },
        Lightning: (perf, effect, luck, context, petal) => {
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

    calculatePerformance: (petal, mob, luck) => {
        const perf = {
            ticks: "∞", baseDps: 0, physicalDps: 0, 
            stackingPoisonDps: 0, nonStackingPoisonDps: 0,
            stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0
        };
        
        if (!mob) return perf;

        const mDmg = Math.max(0, mob.damage - petal.armor);
        const pDmg = Math.max(0, petal.damage - mob.armor);

        let lifeDuration = 0, totalCycleDuration = 0, isInfinite = true, survivalTicks = 0;

        if (mDmg > 0) {
            survivalTicks = Math.ceil(petal.health / mDmg);
            lifeDuration = survivalTicks * 0.1;
            totalCycleDuration = lifeDuration + petal.reload;
            isInfinite = false;
            perf.ticks = survivalTicks;
        }

        perf.physicalDps = isInfinite ? (pDmg * 10) : (totalCycleDuration > 0 ? (survivalTicks * pDmg) / totalCycleDuration : 0);

        const context = { lifeDuration, totalCycleDuration, isInfinite, survivalTicks };
        const effects = petal.specials || (petal.special ? [petal.special] : []);

        effects.forEach(e => {
            if (engine.effectHandlers[e.type]) engine.effectHandlers[e.type](perf, e, luck, context, petal);
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