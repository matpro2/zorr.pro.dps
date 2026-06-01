import { getObject } from "./GetObject";
import { PlayerValue } from "./PlayerValue";

export interface ICombatEntity {
    name: string;
    type?: string;
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
    physicalDps: number;
    poisonDps: number;
    fireDps: number;
    lightningDps: number; 
    finalDamageDps: number;
    reloadTime: number; 
    survivedTicks: number;
}

export class DpsCalculator {
    private static readonly TICK_RATE = 0.06;
    private static readonly INFINITE_TICKS = 1e99;

    private static getExpectedEffectiveDamage(damage: number, armor: number, effects?: any[]): number {
        let critChance = 0;
        let critMultiplier = 1;

        if (effects) {
            for (const effect of effects) {
                if (effect.type === "Critical" && effect.value) {
                    critChance = (effect.value.chance || 0) / 100;
                    critMultiplier = effect.value.multiplier || 1;
                }
            }
        }

        const normalDamage = Math.max(0, damage - armor);
        const critDamage = Math.max(0, (damage * critMultiplier) - armor);

        return (normalDamage * (1 - critChance)) + (critDamage * critChance);
    }

    private static calculateEffectDamage(effects: any[] | undefined, ticks: number, cycleLimit: number, entityLifeTime: number, targetArmor: number) {
        let poison = 0;
        let fire = 0;
        let lightning = 0;
        let finalDamage = 0; 
        
        if (!effects || effects.length === 0) return { poison, fire, lightning, finalDamage };
        
        for (const effect of effects) {
            if (effect.type === "Poison" || effect.type === "Fire") {
                let dmg = 0;
                if (effect.stack) {
                    const totalDamagePerInstance = effect.value * (effect.duration || 1);
                    dmg = totalDamagePerInstance * ticks;
                } else {
                    const activeTime = Math.min(cycleLimit, entityLifeTime + (effect.duration || 0));
                    dmg = effect.value * activeTime; 
                }
                
                if (effect.type === "Poison") poison += dmg;
                if (effect.type === "Fire") fire += dmg;
            } 
            else if (effect.type === "Lightning") {
                const bounces = (effect.multiHit && effect.bounce) ? effect.bounce : 1;
                lightning += effect.value * bounces * ticks;
            }
            else if (effect.type === "finalDamage") {
                finalDamage += Math.max(0, effect.value - targetArmor);
            }
        }
        return { poison, fire, lightning, finalDamage };
    }

    private static calculateInfiniteEffectDps(effects: any[] | undefined) {
        let poisonDps = 0;
        let fireDps = 0;
        let lightningDps = 0;
        let finalDamageDps = 0; 
        
        if (!effects || effects.length === 0) return { poisonDps, fireDps, lightningDps, finalDamageDps };
        
        for (const effect of effects) {
            if (effect.type === "Poison" || effect.type === "Fire") {
                let dps = 0;
                if (effect.stack) {
                    const maxSimultaneousStacks = (effect.duration || 1) / this.TICK_RATE;
                    dps = maxSimultaneousStacks * effect.value;
                } else {
                    dps = effect.value;
                }
                
                if (effect.type === "Poison") poisonDps += dps;
                if (effect.type === "Fire") fireDps += dps;
            } 
            else if (effect.type === "Lightning") {
                const bounces = (effect.multiHit && effect.bounce) ? effect.bounce : 1;
                lightningDps += (effect.value * bounces) / this.TICK_RATE;
            }
        }
        return { poisonDps, fireDps, lightningDps, finalDamageDps };
    }

    public static calculateDps(attackerName: string, attackerTier: number, targetName: string, targetTier: number): IDpsResult {
        const attacker = getObject(attackerName, attackerTier) as ICombatEntity | null;
        const target = getObject(targetName, targetTier) as ICombatEntity | null;

        const zeroResult: IDpsResult = { dps: 0, physicalDps: 0, poisonDps: 0, fireDps: 0, lightningDps: 0, finalDamageDps: 0, reloadTime: 0, survivedTicks: 0 };

        if (!attacker || !target) return zeroResult;

        const targetArmor = target.armor || 0;
        const targetDamage = target.damage || 0;
        const entityCount = attacker.entity || 1;

        if (attacker.type === "egg") {
            const petName = attacker.petName;
            const petTier = attacker.petTier || 0;
            
            if (!petName) {
                console.warn(`L'œuf "${attacker.name}" n'a pas de propriété "petName".`);
                return zeroResult;
            }

            const pet = getObject(petName, petTier) as ICombatEntity | null;
            if (!pet) return zeroResult;

            const petDamage = pet.damage || 0;
            const petHealth = pet.health || 1;
            const petArmor = pet.armor || 0;
            
            const effectiveDamage = this.getExpectedEffectiveDamage(petDamage, targetArmor, pet.effects);
            const finalTargetDamage = Math.max(0, targetDamage - petArmor);
            
            const hps = PlayerValue.pet.heal || 0; 
            const damagePerTick = finalTargetDamage - (hps * this.TICK_RATE);

            let petTicks = damagePerTick <= 0 ? this.INFINITE_TICKS : Math.ceil(petHealth / damagePerTick);
            
            // On utilise directement les valeurs pures (GetObject a déjà géré les divisions par les PlayerValues)
            const spawnCooldown = (attacker.reload || 0) + (attacker.secondReload || 0);

            if (petTicks === this.INFINITE_TICKS) {
                const extraDps = this.calculateInfiniteEffectDps(pet.effects);
                const physical = entityCount * (effectiveDamage / this.TICK_RATE);
                const poison = entityCount * extraDps.poisonDps;
                const fire = entityCount * extraDps.fireDps;
                const lightning = entityCount * extraDps.lightningDps;
                const finalDmg = entityCount * extraDps.finalDamageDps; 
                
                return {
                    physicalDps: physical, poisonDps: poison, fireDps: fire, lightningDps: lightning, finalDamageDps: finalDmg,
                    dps: physical + poison + fire + lightning + finalDmg,
                    reloadTime: spawnCooldown,
                    survivedTicks: this.INFINITE_TICKS
                };
            }

            const petLifeTime = petTicks * this.TICK_RATE;
            const cycleTime = Math.max(spawnCooldown, petLifeTime);
            
            const effectDamage = this.calculateEffectDamage(pet.effects, petTicks, cycleTime, petLifeTime, targetArmor);
            
            const physical = (entityCount * (effectiveDamage * petTicks)) / cycleTime;
            const poison = (entityCount * effectDamage.poison) / cycleTime;
            const fire = (entityCount * effectDamage.fire) / cycleTime;
            const lightning = (entityCount * effectDamage.lightning) / cycleTime;
            const finalDmg = (entityCount * effectDamage.finalDamage) / cycleTime;

            return {
                physicalDps: physical, poisonDps: poison, fireDps: fire, lightningDps: lightning, finalDamageDps: finalDmg,
                dps: physical + poison + fire + lightning + finalDmg,
                reloadTime: spawnCooldown,
                survivedTicks: petTicks
            };
        }

        const attackerDamage = attacker.damage || 0;
        const effectiveDamage = this.getExpectedEffectiveDamage(attackerDamage, targetArmor, attacker.effects);
        
        // On utilise directement les valeurs pures, GetObject s'est occupé des calculs
        const reloadTime = (attacker.reload && attacker.reload > 0 ? attacker.reload : 1) + (attacker.secondReload || 0);

        if (attacker.type === "spill") {
            const duration = attacker.duration || 0;
            const ticks = Math.ceil(duration / this.TICK_RATE);
            
            const effectDamage = this.calculateEffectDamage(attacker.effects, ticks, reloadTime, duration, targetArmor);
            
            const physical = (entityCount * (effectiveDamage * ticks)) / reloadTime;
            const poison = (entityCount * effectDamage.poison) / reloadTime;
            const fire = (entityCount * effectDamage.fire) / reloadTime;
            const lightning = (entityCount * effectDamage.lightning) / reloadTime;
            const finalDmg = (entityCount * effectDamage.finalDamage) / reloadTime;

            return {
                physicalDps: physical, poisonDps: poison, fireDps: fire, lightningDps: lightning, finalDamageDps: finalDmg,
                dps: physical + poison + fire + lightning + finalDmg,
                reloadTime: reloadTime,
                survivedTicks: ticks
            };
        }

        const attackerHealth = attacker.health || 1;
        const attackerArmor = attacker.armor || 0;
        const hps = PlayerValue.petal.heal || 0;
        
        const finalTargetDamage = Math.max(0, targetDamage - attackerArmor);
        const damagePerTick = finalTargetDamage - (hps * this.TICK_RATE);

        let ticks = damagePerTick <= 0 ? this.INFINITE_TICKS : Math.ceil(attackerHealth / damagePerTick);

        if (ticks === this.INFINITE_TICKS) {
            const extraDps = this.calculateInfiniteEffectDps(attacker.effects);
            const physical = entityCount * (effectiveDamage / this.TICK_RATE);
            const poison = entityCount * extraDps.poisonDps;
            const fire = entityCount * extraDps.fireDps;
            const lightning = entityCount * extraDps.lightningDps;
            const finalDmg = entityCount * extraDps.finalDamageDps;
            
            return {
                physicalDps: physical, poisonDps: poison, fireDps: fire, lightningDps: lightning, finalDamageDps: finalDmg,
                dps: physical + poison + fire + lightning + finalDmg,
                reloadTime: reloadTime,
                survivedTicks: this.INFINITE_TICKS
            };
        }

        const totalTime = reloadTime + (ticks * this.TICK_RATE);
        
        const effectDamage = this.calculateEffectDamage(attacker.effects, ticks, totalTime, ticks * this.TICK_RATE, targetArmor);
        
        const physical = (entityCount * (effectiveDamage * ticks)) / totalTime;
        const poison = (entityCount * effectDamage.poison) / totalTime;
        const fire = (entityCount * effectDamage.fire) / totalTime;
        const lightning = (entityCount * effectDamage.lightning) / totalTime;
        const finalDmg = (entityCount * effectDamage.finalDamage) / totalTime;

        return {
            physicalDps: physical, poisonDps: poison, fireDps: fire, lightningDps: lightning, finalDamageDps: finalDmg,
            dps: physical + poison + fire + lightning + finalDmg,
            reloadTime: reloadTime,
            survivedTicks: ticks
        };
    }
}