import { CollisionHandler, ICombatEntity } from './CollisionHandler';

export interface IDpsEntity extends ICombatEntity {
    reload: number;
}

export class DpsCalculator {
    public static calculateDps(attacker: IDpsEntity, target: ICombatEntity): number {
        if (!attacker.damage) return 0;

        const ticks = CollisionHandler.getSurvivalTicks(attacker, target);
        const effectiveDamage = Math.max(0, attacker.damage - target.armor);
        const reloadTime = attacker.reload > 0 ? attacker.reload : 1; 

        if (ticks === Infinity) {
            return effectiveDamage / reloadTime;
        } 
        else if (ticks === 1) {
            return effectiveDamage / reloadTime;
        } 
        else {
            const totalDamageDealt = effectiveDamage * ticks;
            const survivalTime = ticks * 0.06;
            const totalCycleTime = reloadTime + survivalTime;
            
            return totalDamageDealt / totalCycleTime;
        }
    }
}