export interface ICombatEntity {
    name: string;
    health: number;
    damage: number;
    armor: number;
    healPerSecond?: number;
}

export interface ICollisionResult {
    ticksElapsed: number | "∞";
    timeElapsedSeconds: number | "∞";
    entity1Alive: boolean;
    entity2Alive: boolean;
    entity1HealthRemaining: number;
    entity2HealthRemaining: number;
    damageDealtTo1: number;
    damageDealtTo2: number;
}

export class CollisionHandler {
    private static readonly TICK_RATE = 0.06;

    public static resolveCollision(obj1: ICombatEntity, obj2: ICombatEntity): ICollisionResult {
        const hps1 = obj1.healPerSecond || 0;
        const hps2 = obj2.healPerSecond || 0;

        const effDmg1to2 = Math.max(0, obj1.damage - obj2.armor);
        const effDmg2to1 = Math.max(0, obj2.damage - obj1.armor);

        const netDmgPerTickTo1 = effDmg2to1 - (hps1 * this.TICK_RATE);
        const netDmgPerTickTo2 = effDmg1to2 - (hps2 * this.TICK_RATE);

        let ticks1 = netDmgPerTickTo1 > 0 ? Math.ceil(obj1.health / netDmgPerTickTo1) : Infinity;
        let ticks2 = netDmgPerTickTo2 > 0 ? Math.ceil(obj2.health / netDmgPerTickTo2) : Infinity;

        if (effDmg2to1 >= obj1.health) ticks1 = 1;
        if (effDmg1to2 >= obj2.health) ticks2 = 1;

        if (ticks1 === Infinity && ticks2 === Infinity) {
            return {
                ticksElapsed: "∞",
                timeElapsedSeconds: "∞",
                entity1Alive: true,
                entity2Alive: true,
                entity1HealthRemaining: obj1.health,
                entity2HealthRemaining: obj2.health,
                damageDealtTo1: 0,
                damageDealtTo2: 0
            };
        }

        const finalTicks = Math.min(ticks1, ticks2);

        const finalHp1 = obj1.health - (netDmgPerTickTo1 * finalTicks);
        const finalHp2 = obj2.health - (netDmgPerTickTo2 * finalTicks);

        return {
            ticksElapsed: finalTicks,
            timeElapsedSeconds: Number((finalTicks * this.TICK_RATE).toFixed(3)),
            entity1Alive: finalHp1 > 0,
            entity2Alive: finalHp2 > 0,
            entity1HealthRemaining: Math.max(0, finalHp1),
            entity2HealthRemaining: Math.max(0, finalHp2),
            damageDealtTo1: netDmgPerTickTo1 * finalTicks,
            damageDealtTo2: netDmgPerTickTo2 * finalTicks
        };
    }
}