export interface ICombatEntity {
    name: string;
    health: number;
    damage: number;
    armor: number;
    healPerSecond?: number;
}

export class CollisionHandler {
    private static readonly TICK_RATE = 0.06;

    public static getSurvivalTicks(obj1: ICombatEntity, obj2: ICombatEntity): number {
        const hps1 = obj1.healPerSecond || 0;
        const effDmg2to1 = Math.max(0, obj2.damage - obj1.armor);
        const netDmgPerTickTo1 = effDmg2to1 - (hps1 * this.TICK_RATE);

        if (netDmgPerTickTo1 <= 0) {
            return Infinity;
        }

        let ticks = Math.ceil(obj1.health / netDmgPerTickTo1);

        if (effDmg2to1 >= obj1.health) {
            ticks = 1;
        }

        return ticks;
    }
}