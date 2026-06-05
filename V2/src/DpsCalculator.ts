// DpsCalculator.ts

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
        let poison = 0;
        let fire = 0;
        let lightning = 0;
        let telepathic = 0;
        let explosion = 0; 
        let finalDamage = 0; 
        
        // La probabilité de toucher la cible (ex: 80% évasion = 20% de chances de toucher)
        const hitChance = Math.max(0, 1 - (targetEvasion / 100));

        if (!effects || effects.length === 0) return { poison, fire, lightning, telepathic, explosion, finalDamage };
        
        for (const effect of effects) {
            const triggerType = (effect.Trigger || effect.trigger || "").toLowerCase();
            const isDeathTrigger = triggerType === "death" || effect.type === "Explosion";

            if (isDeathTrigger) {
                if (survivalTicks !== DpsCalculator.INFINITE_TICKS) {
                    if (effect.type === "Explosion") {
                        explosion += effect.value; 
                    } else if (effect.type === "Poison") {
                        poison += effect.value * (effect.duration || 1); 
                    } else if (effect.type === "Fire") {
                        fire += effect.value * (effect.duration || 1); 
                    }
                }
            } else {
                if (effect.type === "Poison" || effect.type === "Fire") {
                    let dmg = 0;
                    
                    if (effect.stack) {
                        const totalDamagePerStack = effect.value * (effect.duration || 1);
                        // Les effets cumulables dépendent du nombre de touches réussies
                        dmg = totalDamagePerStack * survivalTicks * hitChance; 
                    } else {
                        const totalPoisonedTime = (survivalTicks * DpsCalculator.TICK_RATE) + (effect.duration || 1);
                        const cappedTime = Math.min(totalTime, totalPoisonedTime);
                        dmg = effect.value * cappedTime;
                        // Si la cible esquive 100% du temps, impossible de l'empoisonner
                        if (hitChance === 0) dmg = 0;
                    }
                    
                    if (effect.type === "Poison") poison += dmg;
                    if (effect.type === "Fire") fire += dmg;
                } 
                else if (effect.type === "Lightning") {
                    const bounces = (effect.multiHit && effect.bounce) ? effect.bounce : 1;
                    
                    if (triggerType === "seconds") {
                        const secondsAlive = Math.floor(survivalTicks * DpsCalculator.TICK_RATE);
                        lightning += (effect.value * bounces) * secondsAlive; // L'évasion n'affecte pas l'effet par seconde
                    } else {
                        lightning += (effect.value * bounces) * survivalTicks * hitChance; // Réduit par l'évasion
                    }
                }
                else if (effect.type === "Telepathic") {
                    const secondsAlive = Math.floor(survivalTicks * DpsCalculator.TICK_RATE);
                    telepathic += effect.value * secondsAlive; // L'évasion n'affecte pas la télépathie
                }
                else if (effect.type === "finalDamage") {
                    finalDamage += Math.max(0, effect.value - targetArmor) * hitChance; // Réduit par l'évasion
                }
            }
        }
        return { poison, fire, lightning, telepathic, explosion, finalDamage };
    }

    public static getCollisionResult(attacker: ICombatEntity, target: ICombatEntity) {
        const objectType = attacker.object === "mob" ? "target" : (attacker.object || "none");
        
        const hps = (PlayerValue as any)[objectType]?.heal || 0;
        const attackerHealth = attacker.health || 1; 

        const effectiveTargetArmor = attacker.type === "spill" ? 0 : (target.armor || 0);
        
        // --- EXTRACTION DE L'ÉVASION ---
        let attackerEvasion = 0;
        if (attacker.effects) {
            const ev = attacker.effects.find(e => e.type && e.type.toLowerCase() === "evasion");
            if (ev) attackerEvasion = ev.value || 0;
        }

        let targetEvasion = 0;
        if (target.effects) {
            const ev = target.effects.find(e => e.type && e.type.toLowerCase() === "evasion");
            if (ev) targetEvasion = ev.value || 0;
        }

        // --- CALCUL DES DÉGÂTS SUBIS (L'attaquant esquive la cible) ---
        const baseTargetDamage = Math.max(0, (target.damage || 0) - (attacker.armor || 0));
        const finalTargetDamage = baseTargetDamage * Math.max(0, 1 - (attackerEvasion / 100));

        let damageHeal = 0;
        if (attacker.effects) {
            const healEffect = attacker.effects.find(e => e.type && e.type.toLowerCase() === "damageheal");
            if (healEffect) {
                damageHeal = healEffect.value || 0;
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
            if (growthEffect) {
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
            dps: physicalDps
        });

        let totalEffectDamage = 0;

        if (combatAttacker.effects && combatAttacker.effects.length > 0) {
            const effectiveTargetArmor = combatAttacker.type === "spill" ? 0 : (target.armor || 0);
            
            let targetEvasion = 0;
            if (target.effects) {
                const ev = target.effects.find(e => e.type && e.type.toLowerCase() === "evasion");
                if (ev) targetEvasion = ev.value || 0;
            }

            const effectResult = DpsCalculator.calculateEffectDamage(
                combatAttacker.effects, 
                survivalTick, 
                effectiveTargetArmor,
                totalTime,
                targetEvasion
            );

            for (const [key, value] of Object.entries(effectResult)) {
                if (value > 0) {
                    totalEffectDamage += value;
                    const typeName = key.charAt(0).toUpperCase() + key.slice(1);
                    dpsCategory.push({
                        type: typeName === "FinalDamage" ? "Final Damage" : typeName,
                        totalDamage: value,
                        dps: totalTime > 0 ? value / totalTime : 0
                    });
                }
            }
        }

        const entityCount = attacker.entity || 1;
        const totalDamage = totalPhysicalDamage + totalEffectDamage;
        const finalDps = (totalTime > 0 ? totalDamage / totalTime : 0) * entityCount;

        dpsCategory.forEach(cat => {
            cat.dps *= entityCount;
            cat.totalDamage *= entityCount;
        });

        return {
            dps: finalDps,
            dpsCategory: dpsCategory, 
            reloadTime: reloadtime,
            survivedTicks: survivalTick
        };
    }
}