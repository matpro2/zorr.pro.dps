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
    mobSpawned?: string;
    mobTier?: number;
    entity?: number;
}

export interface IDpsResult {
    dps: number;
    survivedTicks: number;
}

export class DpsCalculator {
    private static readonly TICK_RATE = 0.06;
    private static readonly INFINITE_TICKS = 1e99;

    public static calculateDps(attackerName: string, attackerTier: number, targetName: string, targetTier: number): IDpsResult {
        const attacker = getObject(attackerName, attackerTier) as ICombatEntity | null;
        const target = getObject(targetName, targetTier) as ICombatEntity | null;

        if (!attacker || !target) {
            return { dps: 0, survivedTicks: 0 };
        }

        const targetArmor = target.armor || 0;
        const targetDamage = target.damage || 0;
        
        // On récupère le nombre d'entités (1 par défaut si non spécifié)
        const entityCount = attacker.entity || 1;

        // --- LOGIQUE POUR LES OEUFS (EGGS) ---
        if (attacker.type === "egg") {
            const petName = attacker.mobSpawned;
            const petTier = attacker.mobTier || 0;
            
            const pet = getObject(petName!, petTier) as ICombatEntity | null;
            if (!pet) return { dps: 0, survivedTicks: 0 };

            const petDamage = pet.damage || 0;
            const petHealth = pet.health || 1;
            const petArmor = pet.armor || 0;
            
            const effectiveDamage = Math.max(0, petDamage - targetArmor);
            const finalTargetDamage = Math.max(0, targetDamage - petArmor);
            
            const hps = PlayerValue.pet.heal || 0; 
            const damagePerTick = finalTargetDamage - (hps * this.TICK_RATE);

            let petTicks: number;
            if (damagePerTick <= 0) {
                petTicks = this.INFINITE_TICKS;
            } else {
                petTicks = Math.ceil(petHealth / damagePerTick);
            }

            const spawnCooldown = (attacker.reload || 0) + (attacker.secondReload || 0);

            if (petTicks === this.INFINITE_TICKS) {
                return {
                    dps: entityCount * (effectiveDamage / this.TICK_RATE),
                    survivedTicks: this.INFINITE_TICKS
                };
            }

            const petLifeTime = petTicks * this.TICK_RATE;
            const petTotalDamage = effectiveDamage * petTicks;
            
            const cycleTime = Math.max(spawnCooldown, petLifeTime);

            return {
                dps: (entityCount * petTotalDamage) / cycleTime,
                survivedTicks: petTicks
            };
        }

        const attackerDamage = attacker.damage || 0;
        const effectiveDamage = Math.max(0, attackerDamage - targetArmor);
        const reloadTime = attacker.reload && attacker.reload > 0 ? attacker.reload : 1;

        // --- LOGIQUE POUR LES SPILLS ---
        if (attacker.type === "spill") {
            const duration = attacker.duration || 0;
            const ticks = Math.ceil(duration / this.TICK_RATE);
            const totalDamage = effectiveDamage * ticks;
            
            return {
                dps: (totalDamage * entityCount) / reloadTime,
                survivedTicks: ticks
            };
        }

        const attackerHealth = attacker.health || 1;
        const attackerArmor = attacker.armor || 0;
        const hps = PlayerValue.petal.heal || 0;
        
        const finalTargetDamage = Math.max(0, targetDamage - attackerArmor);
        const damagePerTick = finalTargetDamage - (hps * this.TICK_RATE);

        let ticks: number;
        if (damagePerTick <= 0) {
            ticks = this.INFINITE_TICKS;
        } else {
            ticks = Math.ceil(attackerHealth / damagePerTick);
        }

        const totalDamage = effectiveDamage * ticks;
        const totalTime = reloadTime + (ticks * this.TICK_RATE);

        return {
            dps: (totalDamage * entityCount) / totalTime,
            survivedTicks: ticks
        };
    }
}