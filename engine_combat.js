const engineCombat = {
    effectHandlers: {
        Critical: (perf, effect, stats, context, petal) => {
            if (effect.global) return; 
            let val = engineUtils.getVal(effect.value, petal.tier);
            const actualChance = Math.min(((val.chance || 0) / 100) + (stats.luck / 100), 1.0);
            perf.physicalDps *= (1 + (actualChance * ((val.multiplier || 1) - 1)));
        },
        damageSeconds: (perf) => { perf.physicalDps /= 10; },
        Poison: (perf, effect, stats, context) => {
            const totalDmg = effect.duration * effect.damage;
            const dps = context.isInfinite ? (10 * totalDmg) : (context.totalCycleDuration > 0 ? (context.survivalTicks * totalDmg) / context.totalCycleDuration : 0);
            const uptime = context.isInfinite ? 1 : (context.totalCycleDuration > 0 ? Math.min((context.lifeDuration + effect.duration) / context.totalCycleDuration, 1.0) : 0);
            if (effect.stack) perf.stackingPoisonDps += dps; else perf.nonStackingPoisonDps += effect.damage * uptime;
        },
        Fire: (perf, effect, stats, context) => {
            const totalDmg = effect.duration * effect.damage;
            const dps = context.isInfinite ? (10 * totalDmg) : (context.totalCycleDuration > 0 ? (context.survivalTicks * totalDmg) / context.totalCycleDuration : 0);
            const uptime = context.isInfinite ? 1 : (context.totalCycleDuration > 0 ? Math.min((context.lifeDuration + effect.duration) / context.totalCycleDuration, 1.0) : 0);
            if (effect.stack) perf.stackingFireDps += dps; else perf.nonStackingFireDps += effect.damage * uptime;
        },
        Lightning: (perf, effect, stats, context, petal) => {
            const bounces = engineUtils.getVal(effect.bounce, petal.tier);
            const totalLmg = effect.damage * bounces;
            perf.lightningDps += context.isInfinite ? (totalLmg * 10) : (context.totalCycleDuration > 0 ? (totalLmg * context.survivalTicks) / context.totalCycleDuration : 0);
        },
        Heal: (perf, effect, stats, context, petal) => {
            if (effect.regen) return; 
            const scale = Math.pow(3, petal.tier);
            if (effect.value) {
                const totalHeal = effect.value * scale;
                perf.healingHps += context.totalCycleDuration > 0 ? totalHeal / context.totalCycleDuration : (context.isInfinite ? totalHeal / (petal.reload || 0.1) : 0);
            } else if (effect.onDamage) {
                const healPerTick = effect.onDamage * scale;
                perf.healingHps += context.isInfinite ? healPerTick * 10 : (context.totalCycleDuration > 0 ? (context.survivalTicks * healPerTick) / context.totalCycleDuration : 0);
            }
        }
    },

    calcSpill: (spill, mob, globalStats, engineCore) => {
        const perf = { ticks: "50 (5s)", baseDps: 0, physicalDps: 0, stackingPoisonDps: 0, nonStackingPoisonDps: 0, stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0, healingHps: 0 };
        if (!mob) return perf;
        const mods = engineCore.getModifiersForTier(spill.tier, globalStats, "Petal");
        const cycleDur = engineUtils.getReload(spill, mods);
        const context = { lifeDuration: 5.0, totalCycleDuration: cycleDur, isInfinite: false, survivalTicks: 50 };
        
        const effects = spill.specials || (spill.special ? [spill.special] : []);
        const hasFinal = effects.some(e => e.type === "finalDamage");
        const dmgMult = hasFinal ? 1 : mods.Damage; // IGNORE LE BOOST SI C'EST FINAL DAMAGE

        if (spill.damage != null) perf.physicalDps = (Math.max(0, (spill.damage * dmgMult) - mob.armor) * 50) / cycleDur;
        
        effects.forEach(e => { if (engineCombat.effectHandlers[e.type]) engineCombat.effectHandlers[e.type](perf, e, globalStats, context, spill); });

        const qty = spill.currentEntities || 1;
        ['physicalDps', 'stackingPoisonDps', 'stackingFireDps', 'lightningDps', 'healingHps'].forEach(k => perf[k] *= qty);
        perf.baseDps = perf.physicalDps + perf.stackingPoisonDps + perf.nonStackingPoisonDps + perf.stackingFireDps + perf.nonStackingFireDps + perf.lightningDps;
        return perf;
    },

    calcPetal: (item, mob, globalStats, engineCore) => {
        const perf = { ticks: "-", baseDps: 0, physicalDps: 0, stackingPoisonDps: 0, nonStackingPoisonDps: 0, stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0, healingHps: 0 };
        const mods = engineCore.getModifiersForTier(item.tier, globalStats, "Petal"); 
        let actRel = engineUtils.getReload(item, mods);
        const effects = item.specials || (item.special ? [item.special] : []);
        
        if (item.damage == null || item.health == null) {
            effects.forEach(e => { if (engineCombat.effectHandlers[e.type]) engineCombat.effectHandlers[e.type](perf, e, globalStats, { lifeDuration: 0, totalCycleDuration: actRel, isInfinite: false, survivalTicks: 0 }, item); });
            perf.healingHps *= (item.currentEntities || 1);
            return perf;
        }

        if (!mob) return perf;

        let uptime = 1.0, isDrained = false;
        if (item.special?.type === "Magic" && item.special.drain) {
            const drainReq = item.special.drain * Math.pow(2, item.tier);
            if (globalStats.manaRegen < drainReq) {
                if (globalStats.manaRegen <= 0) return perf; 
                uptime = globalStats.manaRegen / drainReq;
                isDrained = true;
            }
        }
        if (item.special?.type === "Magic" && item.special.cost) {
            const cost = item.special.cost * Math.pow(2, item.tier);
            if (globalStats.manaRegen > 0) actRel = Math.max(actRel, cost / globalStats.manaRegen);
            else return perf; 
        }

        const surv = engineUtils.calcSurvival(item.health * mods.Health, item.armor || 0, mob, mods);
        const cycleDur = surv.isInfinite ? actRel : surv.lifeDuration + actRel;
        perf.ticks = surv.ticks;

        const hasFinal = effects.some(e => e.type === "finalDamage");
        const dmgMult = hasFinal ? 1 : mods.Damage; // IGNORE LE BOOST SI C'EST FINAL DAMAGE

        engineUtils.applyDPS(perf, Math.max(0, (item.damage * dmgMult) - mob.armor), surv, cycleDur, effects);
        if (isDrained) perf.physicalDps *= uptime;

        const context = { lifeDuration: surv.lifeDuration, totalCycleDuration: cycleDur, isInfinite: surv.isInfinite, survivalTicks: surv.ticks };
        effects.forEach(e => { if (engineCombat.effectHandlers[e.type]) engineCombat.effectHandlers[e.type](perf, e, globalStats, context, item); });

        const qty = item.currentEntities || 1;
        ['physicalDps', 'stackingPoisonDps', 'stackingFireDps', 'lightningDps', 'healingHps'].forEach(k => perf[k] *= qty);
        if (isDrained) ['stackingPoisonDps', 'stackingFireDps', 'lightningDps', 'healingHps'].forEach(k => perf[k] *= uptime);
        perf.baseDps = perf.physicalDps + perf.stackingPoisonDps + perf.nonStackingPoisonDps + perf.stackingFireDps + perf.nonStackingFireDps + perf.lightningDps;
        return perf;
    },

    calcSingleEgg: (egg, targetMob, globalStats, petTier, mods, engineCore) => {
        const perf = { ticks: "-", baseDps: 0, physicalDps: 0, stackingPoisonDps: 0, nonStackingPoisonDps: 0, stackingFireDps: 0, nonStackingFireDps: 0, lightningDps: 0, healingHps: 0 };
        const basePet = targetMob ? mobs.find(m => m.name === (egg.mobSpawned || egg.name.replace(" Egg", ""))) : null;
        if (!basePet) return perf;

        const pMods = engineUtils.getPetMods(petTier);
        const surv = engineUtils.calcSurvival(basePet.health * pMods.hMult * mods.Health, (basePet.armor * pMods.sMult) + mods.flatArmor, targetMob, mods);
        perf.ticks = surv.ticks;

        const cycleDur = surv.isInfinite ? Infinity : Math.max(surv.lifeDuration, engineUtils.getReload(egg, mods));
        const effects = egg.specials || (egg.special ? [egg.special] : []);

        const hasFinal = effects.some(e => e.type === "finalDamage");
        const dmgMult = hasFinal ? 1 : mods.Damage; // IGNORE LE BOOST SI C'EST FINAL DAMAGE

        engineUtils.applyDPS(perf, Math.max(0, (basePet.damage * pMods.sMult * dmgMult) - targetMob.armor), surv, cycleDur, effects);

        const context = { lifeDuration: surv.lifeDuration, totalCycleDuration: cycleDur, isInfinite: surv.isInfinite, survivalTicks: surv.ticks };
        effects.forEach(e => { if (engineCombat.effectHandlers[e.type]) engineCombat.effectHandlers[e.type](perf, e, globalStats, context, egg); });

        const qty = engineUtils.getVal(egg.entity || 1, egg.tier);
        ['physicalDps', 'stackingPoisonDps', 'stackingFireDps', 'lightningDps', 'healingHps'].forEach(k => perf[k] *= qty);
        perf.baseDps = perf.physicalDps + perf.stackingPoisonDps + perf.nonStackingPoisonDps + perf.stackingFireDps + perf.nonStackingFireDps + perf.lightningDps;
        return perf;
    }
};