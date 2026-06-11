import { getObject } from "./GetObject";
import { PlayerValue } from "./PlayerValue";

export interface ICombatEntity {
    name: string;
    type?: string;
    object?: string;
    health?: number;
    duration?: number;
    damage?: number;
    armor?: number;
    reload?: number;
    secondReload?: number;
    petName?: string;
    petTier?: number;
    entity?: number;
    effects?: any[];
}

export interface IDpsResult {
    dps: number;
    dpsCategory: any[]; 
    reloadTime: number; 
    survivedTicks: number;
}

export class DpsCalculator {
    private static readonly TICK_RATE = 0.06;
    private static readonly INFINITE_TICKS = 1e99;

    private static calculateEffectDamage(effects: any[] | undefined, survivalTicks: number, targetArmor: number, totalTime: number, targetEvasion: number = 0) {
        let poisonStack = 0;
        let poisonNoStack = 0;
        let fireStack = 0;
        let fireNoStack = 0;
        let lightning = 0;
        let telepathic = 0;
        let explosion = 0; 
        let finalDamage = 0; 
        
        const hitChance = Math.max(0, 1 - (targetEvasion / 100));

        if (!effects || effects.length === 0) return { poisonStack, poisonNoStack, fireStack, fireNoStack, lightning, telepathic, explosion, finalDamage };
        
        for (const effect of effects) {
            const triggerType = (effect.Trigger || effect.trigger || "").toLowerCase();
            const isDeathTrigger = triggerType === "death" || effect.type === "Explosion";

            if (isDeathTrigger) {
                if (survivalTicks !== DpsCalculator.INFINITE_TICKS) {
                    if (effect.type === "Explosion") {
                        explosion += effect.value || 0; 
                    } else if (effect.type === "Poison") {
                        const val = (effect.value || 0) * (effect.duration || 1);
                        if (effect.stack) poisonStack += val; else poisonNoStack += val;
                    } else if (effect.type === "Fire") {
                        const val = (effect.value || 0) * (effect.duration || 1);
                        if (effect.stack) fireStack += val; else fireNoStack += val;
                    }
                }
            } else {
                if (effect.type === "Poison" || effect.type === "Fire") {
                    let dmg = 0;
                    
                    if (effect.stack) {
                        const totalDamagePerStack = (effect.value || 0) * (effect.duration || 1);
                        dmg = totalDamagePerStack * survivalTicks * hitChance; 
                        
                        if (effect.type === "Poison") poisonStack += dmg;
                        if (effect.type === "Fire") fireStack += dmg;
                    } else {
                        const totalPoisonedTime = (survivalTicks * DpsCalculator.TICK_RATE) + (effect.duration || 1);
                        const cappedTime = Math.min(totalTime, totalPoisonedTime);
                        dmg = (effect.value || 0) * cappedTime;
                        if (hitChance === 0) dmg = 0;

                        if (effect.type === "Poison") poisonNoStack += dmg;
                        if (effect.type === "Fire") fireNoStack += dmg;
                    }
                } 
                else if (effect.type === "Lightning") {
                    const bounces = (effect.multiHit && effect.bounce) ? effect.bounce : 1;
                    
                    if (triggerType === "seconds") {
                        const secondsAlive = Math.floor(survivalTicks * DpsCalculator.TICK_RATE);
                        lightning += ((effect.value || 0) * bounces) * secondsAlive;
                    } else {
                        lightning += ((effect.value || 0) * bounces) * survivalTicks * hitChance;
                    }
                }
                else if (effect.type === "Telepathic") {
                    const secondsAlive = Math.floor(survivalTicks * DpsCalculator.TICK_RATE);
                    telepathic += (effect.value || 0) * secondsAlive; 
                }
                else if (effect.type === "finalDamage") {
                    finalDamage += Math.max(0, (effect.value || 0) - targetArmor) * hitChance;
                }
            }
        }
        return { poisonStack, poisonNoStack, fireStack, fireNoStack, lightning, telepathic, explosion, finalDamage };
    }

    public static getCollisionResult(attacker: ICombatEntity, target: ICombatEntity) {
        const objectType = attacker.object === "mob" ? "target" : (attacker.object || "none");
        
        // LECTURE SÉCURISÉE DE L'OBJET HEAL
        const healStat = (PlayerValue as any)[objectType]?.heal;
        let hps = 0;
        if (healStat && Array.isArray(healStat.boosts)) {
            for (const mod of healStat.boosts) {
                if (typeof mod.value === 'number' && !isNaN(mod.value)) {
                    hps += mod.value;
                }
            }
        }
        
        const attackerHealth = attacker.health || 1; 

        const effectiveTargetArmor = attacker.type === "spill" ? 0 : (target.armor || 0);
        
        let attackerEvasion = 0;
        if (attacker.effects) {
            const ev = attacker.effects.find(e => e.type && e.type.toLowerCase() === "evasion");
            if (ev && typeof ev.value === 'number' && !isNaN(ev.value)) attackerEvasion = ev.value;
        }

        let targetEvasion = 0;
        if (target.effects) {
            const ev = target.effects.find(e => e.type && e.type.toLowerCase() === "evasion");
            if (ev && typeof ev.value === 'number' && !isNaN(ev.value)) targetEvasion = ev.value;
        }

        const baseTargetDamage = Math.max(0, (target.damage || 0) - (attacker.armor || 0));
        const finalTargetDamage = baseTargetDamage * Math.max(0, 1 - (attackerEvasion / 100));

        let damageHeal = 0;
        if (attacker.effects) {
            const healEffect = attacker.effects.find(e => e.type && e.type.toLowerCase() === "damageheal");
            if (healEffect && typeof healEffect.value === 'number' && !isNaN(healEffect.value)) {
                damageHeal = healEffect.value;
            }
        }

        const attackerDamagePerTick = finalTargetDamage - (hps * this.TICK_RATE) - damageHeal;
        
        let attackerSurvivalTicks = attackerDamagePerTick <= 0 
            ? this.INFINITE_TICKS 
            : Math.ceil(attackerHealth / attackerDamagePerTick);
        
        if (attacker.type === "spill") {
            attackerSurvivalTicks = Math.ceil((attacker.duration || 0) / this.TICK_RATE); 
        } else if (attacker.type === "radiation") {
            attackerSurvivalTicks = 1;
        }

        let averageDamageMulti = 1;
        if (attacker.effects) {
            const growthEffect = attacker.effects.find(e => e.type && e.type.toLowerCase() === "damagegrowth");
            if (growthEffect && typeof growthEffect.value === 'number' && !isNaN(growthEffect.value)) {
                if (attackerSurvivalTicks !== this.INFINITE_TICKS) {
                    averageDamageMulti = (1 + growthEffect.value) / 2;
                }
            }
        }

        const boostedDamage = (attacker.damage || 0) * averageDamageMulti;
        const baseAttackerDamage = Math.max(0, boostedDamage - effectiveTargetArmor);
        
        const finalAttackerDamage = baseAttackerDamage * Math.max(0, 1 - (targetEvasion / 100));
        
        return { finalAttackerDamage, attackerSurvivalTicks };
    }

    public static calculateDps(attackerName: string, attackerTier: number, targetName: string, targetTier: number): IDpsResult {
        const attacker = getObject(attackerName, attackerTier) as ICombatEntity | null;
        const target = getObject(targetName, targetTier) as ICombatEntity | null;

        const zeroResult: IDpsResult = {
            dps: 0,
            dpsCategory: [], 
            reloadTime: 0,
            survivedTicks: 0,
        };
        
        if (!attacker || !target) return zeroResult;

        const reloadtime = (attacker.reload || 0) + (attacker.secondReload || 0);
        
        let combatAttacker = attacker;
        let result = this.getCollisionResult(combatAttacker, target);

        if (attacker.type === "egg") {
            const petName = attacker.petName || "none";
            const petTier = attacker.petTier !== undefined ? attacker.petTier : attackerTier; 
            const pet = getObject(petName, petTier, true) as ICombatEntity | null;
            if (pet) {
                combatAttacker = pet;
                result = this.getCollisionResult(combatAttacker, target);
            }
        }

        const survivalTick = result.attackerSurvivalTicks;
        const finalAttackerDamage = result.finalAttackerDamage;

        let totalTime = reloadtime;

        if (combatAttacker.type !== "spill") {
            totalTime += (DpsCalculator.TICK_RATE * survivalTick);
        }

        if (combatAttacker.type === "radiation") {
            totalTime = 0.3333;
        }

        const dpsCategory: any[] = [];

        const totalPhysicalDamage = survivalTick * finalAttackerDamage;
        const physicalDps = totalTime > 0 ? totalPhysicalDamage / totalTime : 0;

        dpsCategory.push({
            type: "Physical",
            totalDamage: totalPhysicalDamage,
            dps: isNaN(physicalDps) ? 0 : physicalDps
        });

        if (combatAttacker.effects && combatAttacker.effects.length > 0) {
            const effectiveTargetArmor = combatAttacker.type === "spill" ? 0 : (target.armor || 0);
            
            let targetEvasion = 0;
            if (target.effects) {
                const ev = target.effects.find(e => e.type && e.type.toLowerCase() === "evasion");
                if (ev && typeof ev.value === 'number') targetEvasion = ev.value;
            }

            const effectResult = DpsCalculator.calculateEffectDamage(
                combatAttacker.effects, 
                survivalTick, 
                effectiveTargetArmor,
                totalTime,
                targetEvasion
            );

            for (const [key, value] of Object.entries(effectResult)) {
                if (value > 0 && !isNaN(value)) {
                    let typeName = key;
                    if (key === "poisonStack") typeName = "Poison (Stack)";
                    else if (key === "poisonNoStack") typeName = "Poison (No Stack)";
                    else if (key === "fireStack") typeName = "Fire (Stack)";
                    else if (key === "fireNoStack") typeName = "Fire (No Stack)";
                    else if (key === "finalDamage") typeName = "Final Damage";
                    else typeName = key.charAt(0).toUpperCase() + key.slice(1);

                    const effectDps = totalTime > 0 ? value / totalTime : 0;

                    dpsCategory.push({
                        type: typeName,
                        totalDamage: value,
                        dps: isNaN(effectDps) ? 0 : effectDps
                    });
                }
            }
        }

        const entityCount = attacker.entity || 1;
        
        let finalDps = 0;
        dpsCategory.forEach(cat => {
            if (cat.type !== "Poison (No Stack)" && cat.type !== "Fire (No Stack)") {
                cat.dps *= entityCount;
                cat.totalDamage *= entityCount;
            }
            finalDps += cat.dps;
        });

        return {
            dps: isNaN(finalDps) ? 0 : finalDps,
            dpsCategory: dpsCategory, 
            reloadTime: reloadtime,
            survivedTicks: survivalTick
        };
    }

    public static calculateManaPerSec(obj: any): number {
    let manaPerSec = 0;

    if (Array.isArray(obj.effects)) {
        for (const effect of obj.effects) {
            if (typeof effect.type === "string" && effect.type.toLowerCase().includes("mana")) {
                if (typeof effect.value === "number" && !isNaN(effect.value)) {
                    manaPerSec += effect.value;
                }
            }
        }
    }

    if (typeof obj.manaPrice === "number" && obj.manaPrice > 0) {
        const reload = (obj.reload || 0) + (obj.secondReload || 0);
        if (reload > 0) {
            manaPerSec -= obj.manaPrice / reload;
        }
    }

    return manaPerSec;
}
}