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

    private static calculateEffectDamage(effects: any[] | undefined, survivalTicks: number, targetArmor: number, totalTime: number) {
        let poison = 0;
        let fire = 0;
        let lightning = 0;
        let finalDamage = 0; 
        
        if (!effects || effects.length === 0) return { poison, fire, lightning, finalDamage };
        
        for (const effect of effects) {
            if (effect.type === "Poison" || effect.type === "Fire") {
                let dmg = 0;
                
                if (effect.stack) {
                    const totalDamagePerStack = effect.value * (effect.duration || 1);
                    dmg = totalDamagePerStack * survivalTicks;
                } else {
                    const totalPoisonedTime = (survivalTicks * DpsCalculator.TICK_RATE) + (effect.duration || 1);
                    const cappedTime = Math.min(totalTime, totalPoisonedTime);
                    dmg = effect.value * cappedTime;
                }
                
                if (effect.type === "Poison") poison += dmg;
                if (effect.type === "Fire") fire += dmg;
            } 
            else if (effect.type === "Lightning") {
                const bounces = (effect.multiHit && effect.bounce) ? effect.bounce : 1;
                lightning += (effect.value * bounces) * survivalTicks; 
            }
            else if (effect.type === "finalDamage") {
                finalDamage += Math.max(0, effect.value - targetArmor);
            }
        }
        return { poison, fire, lightning, finalDamage };
    }

    public static getCollisionResult(attacker: ICombatEntity, target: ICombatEntity) {
        const objectType = attacker.object === "mob" ? "target" : (attacker.object || "none");
        
        const hps = (PlayerValue as any)[objectType]?.heal || 0;
        const attackerHealth = attacker.health || 1; 

        const effectiveTargetArmor = attacker.type === "spill" ? 0 : (target.armor || 0);

        const finalAttackerDamage = Math.max(0, (attacker.damage || 0) - effectiveTargetArmor);
        const finalTargetDamage = Math.max(0, (target.damage || 0) - (attacker.armor || 0));

        const attackerDamagePerTick = finalTargetDamage - (hps * this.TICK_RATE);
        
        let attackerSurvivalTicks = attackerDamagePerTick <= 0 
            ? this.INFINITE_TICKS 
            : Math.ceil(attackerHealth / attackerDamagePerTick);
        
        if (attacker.type === "spill") {
            attackerSurvivalTicks = Math.ceil((attacker.duration || 0) / this.TICK_RATE); 
        } else if (attacker.type === "radiation") {
            attackerSurvivalTicks = 1;
        }
        
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
        let result = this.getCollisionResult(attacker, target);

        if (attacker.type === "egg") {
            const petName = attacker.petName || "none";
            const petTier = attacker.petTier || 0;
            const pet = getObject(petName, petTier) as ICombatEntity | null;
            if (pet) {
                result = this.getCollisionResult(pet, target);
            }
        }

        const survivalTick = result.attackerSurvivalTicks;
        const finalAttackerDamage = result.finalAttackerDamage;

        let totalTime = reloadtime;

        if (attacker.type !== "spill") {
            totalTime += (DpsCalculator.TICK_RATE * survivalTick);
        }

        if (attacker.type === "radiation") {
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

        if (attacker.effects && attacker.effects.length > 0) {
            const effectiveTargetArmor = attacker.type === "spill" ? 0 : (target.armor || 0);

            const effectResult = DpsCalculator.calculateEffectDamage(
                attacker.effects, 
                survivalTick, 
                effectiveTargetArmor,
                totalTime
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