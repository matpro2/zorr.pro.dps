import { getEntity } from "./GetEntity";
import { PlayerValue } from "./PlayerValue";

export interface ICombatEntity {
    name: string;
    health: number;
    damage: number;
    armor: number;
    reload?: number;
    healPerSecond?: number;
}

export interface IDpsResult {
    dps: number;
    survivedTicks: number;
}

export class DpsCalculator {
    private static readonly TICK_RATE = 0.06;
    private static readonly INFINITE_TICKS = 1e99;

    public static calculateDps(
        attackerName: string,
        attackerTier: number,
        targetName: string,
        targetTier: number
    ): IDpsResult {

        const attacker = getEntity(attackerName, attackerTier) as ICombatEntity | null;
        const target = getEntity(targetName, targetTier) as ICombatEntity | null;

        if (!attacker || !target || !attacker.damage) {
            return {
                dps: 0,
                survivedTicks: 0
            };
        }

        const hps = PlayerValue.petal.heal || 0;

        const finalTargetDamage = Math.max(
            0,
            target.damage - attacker.armor
        );

        const damagePerTick =
            finalTargetDamage -
            hps * this.TICK_RATE;

        const effectiveDamage = Math.max(
            0,
            attacker.damage - target.armor
        );

        const reloadTime =
            attacker.reload && attacker.reload > 0
                ? attacker.reload
                : 1;

        let ticks: number;

        if (damagePerTick <= 0) {
            ticks = this.INFINITE_TICKS;
        } else {
            ticks = Math.ceil(
                attacker.health / damagePerTick
            );
        }

        const totalDamage = effectiveDamage * ticks;
        const totalTime =
            reloadTime +
            ticks * this.TICK_RATE;

        return {
            dps: totalDamage / totalTime,
            survivedTicks: ticks
        };
    }
}