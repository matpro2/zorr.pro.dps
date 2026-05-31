export interface IPetalData {
    name: string;
    type: "default" | "utility" | "egg" | "spill";
    health?: number;
    damage?: number;
    armor?: number;
    reload?: number;
}

export interface IGlobalModifiers {
    damageMultiplier: number;
    healthMultiplier: number;
    reloadMultiplier: number;
    flatArmor: number;
}

export interface IFinalStats {
    health: number | null;
    damage: number | null;
    armor: number | null;
    reload: number | null;
}

export class StatCalculator {
    
    private static getTierMultiplier(tier: number): number {
        return Math.pow(3, tier);
    }

    public static computeFinalStats(
        petal: IPetalData, 
        tier: number, 
        mods: IGlobalModifiers = { damageMultiplier: 1, healthMultiplier: 1, reloadMultiplier: 1, flatArmor: 0 }
    ): IFinalStats {
        
        if (petal.type === "utility") {
            return { health: null, damage: null, armor: null, reload: null };
        }

        const tierScale = this.getTierMultiplier(tier);
        
        const finalDamage = petal.damage != null 
            ? (petal.damage * tierScale) * mods.damageMultiplier 
            : null;

        const finalHealth = petal.health != null 
            ? (petal.health * tierScale) * mods.healthMultiplier 
            : null;

        const finalArmor = petal.armor != null 
            ? (petal.armor * tierScale) + mods.flatArmor 
            : null;

        const finalReload = petal.reload != null 
            ? petal.reload / mods.reloadMultiplier 
            : null;

        return {
            health: finalHealth,
            damage: finalDamage,
            armor: finalArmor,
            reload: finalReload
        };
    }
}