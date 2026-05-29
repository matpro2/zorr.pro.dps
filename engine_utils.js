const engineUtils = {
    // Récupère la valeur d'une stat selon le Tier (si c'est un tableau)
    getVal: (val, tier) => {
        if (val == null) return 0;
        if (typeof val === 'number') return val;
        const maxT = Math.max(...Object.keys(val).map(Number));
        return val[tier > maxT ? maxT : tier] || 0;
    },
    
    // Transforme instantanément n'importe quelle pétale au Tier demandé
    scalePetal: (baseDef, targetTier, originalName = null, originalTier = null, originalIndex = null) => {
        let p = structuredClone(baseDef);
        p.tier = targetTier;
        const m = Math.pow(3, targetTier);
        if (p.health != null) p.health *= m;
        if (p.damage != null) p.damage *= m;
        if (p.armor != null) p.armor *= m;
        if (p.specials) p.specials.forEach(e => { if (e.damage != null) e.damage *= m; });
        if (p.special && p.special.damage != null) p.special.damage *= m;
        p.currentEntities = engineUtils.getVal(p.entity || 1, targetTier);
        if (originalName) p.originalName = originalName;
        if (originalTier != null) p.originalTier = originalTier;
        if (originalIndex != null) p.originalIndex = originalIndex;
        return p;
    },

    // Calcul centralisé du temps de rechargement
    getReload: (p, mods) => {
        const b = Math.max(0.01, ((p.reload || 0) / mods.Reload) * (1 - mods.reloadSkipChance));
        const s = Math.max(0, engineUtils.getVal(p.secondReload, p.tier) / mods.SecondReload);
        return b + s;
    },

    // Calcul des multiplicateurs des Pets (Mob Tier)
    getPetMods: (petTier) => {
        const factors = [3.75, 3.6, 4, 7.5, 6, 15, 12];
        let hMult = 1; for (let i = 0; i < petTier; i++) hMult *= (factors[i] || 1);
        return { hMult, sMult: Math.pow(3, petTier) };
    },

    // Formule centralisée de survie (Ticks, Invincibilité, vie infinie)
    calcSurvival: (bHealth, bArmor, targetMob, mods) => {
        if (!targetMob) return { ticks: "-", isInfinite: true, lifeDuration: 0, mDmg: 0 };
        const mDmg = Math.max(0, (targetMob.damage * Math.max(0, 1 - mods.mobDamageReduction)) - bArmor);
        const netDmg = mDmg - (mods.petalHeal / 10);
        if (netDmg > 0) {
            const ticks = mDmg >= bHealth ? 1 : Math.ceil(bHealth / netDmg);
            return { ticks, isInfinite: false, lifeDuration: ticks * 0.1, mDmg };
        }
        return { ticks: "∞", isInfinite: true, lifeDuration: 0, mDmg };
    },

    // Application propre des dégâts finaux (Coconut) ou constants
    applyDPS: (perf, pDmg, surv, cycleDur, specials) => {
        const hasFinal = (specials || []).some(e => e.type === "finalDamage");
        if (hasFinal) perf.physicalDps = surv.isInfinite ? 0 : (cycleDur > 0 ? pDmg / cycleDur : 0);
        else perf.physicalDps = surv.isInfinite ? (pDmg * 10) : (cycleDur > 0 ? (surv.ticks * pDmg) / cycleDur : 0);
    }
};