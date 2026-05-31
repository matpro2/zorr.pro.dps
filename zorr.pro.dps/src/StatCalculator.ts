export interface IPetalData {
    name?: string;
    type?: "default" | "utility" | "egg" | "spill";
    health?: number;
    damage?: number;
    armor?: number;
    reload?: number;
    healPerSecond?: number;
}

export interface IGlobalModifiers {
    damageMultiplier: number;
    healthMultiplier: number;
    reloadMultiplier: number;
    flatArmor: number;
}

export interface IFinalStats {
    health: number;
    damage: number;
    armor: number;
    reload: number;
    healPerSecond: number;
}

export interface ICombatEntity {
    name: string;
    tier: number;
}

export class StatCalculator {
    private static readonly TICK_RATE = 0.06;

    private static getTierMultiplier(tier: number): number {
        return Math.pow(3, tier);
    }

    public static computeFinalStats(
        petal: "name",
        tier: number,
        mods: IGlobalModifiers = { damageMultiplier: 1, healthMultiplier: 1, reloadMultiplier: 1, flatArmor: 0 }
    ): IFinalStats {
        const scale = this.getTierMultiplier(tier);

        return {
            health: (petal.health ?? 0) * scale * mods.healthMultiplier,
            damage: (petal.damage ?? 0) * scale * mods.damageMultiplier,
            armor: (petal.armor ?? 0) * scale + mods.flatArmor,
            reload: petal.reload != null ? petal.reload / mods.reloadMultiplier : 0,
            healPerSecond: petal.healPerSecond ?? 0
        };
    }

    public static getStats(entity: ICombatEntity): IFinalStats {
        const petal = PetalDatabase.get(entity.name);
        return this.computeFinalStats(petal, entity.tier);
    }

    public static calculateDamagePerTick(entity: ICombatEntity, target: ICombatEntity): number {
        const attacker = this.getStats(entity);
        const defender = this.getStats(target);

        return Math.max(0, attacker.damage - defender.armor) - defender.healPerSecond * this.TICK_RATE;
    }
}