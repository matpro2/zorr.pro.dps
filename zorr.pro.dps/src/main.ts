import { StatCalculator } from './StatCalculator';
import { CollisionHandler } from './CollisionHandler';
import { DpsCalculator } from './DpsCalculator';

let allPetals: any = {};
let allMobs: any = {};

async function init() {
    try {
        const [pRes, uRes, sRes, eRes, mRes] = await Promise.all([
            fetch('/data/petals.json'),
            fetch('/data/utilities.json'),
            fetch('/data/spills.json'),
            fetch('/data/eggs.json'),
            fetch('/data/mobs.json')
        ]);

        const p = await pRes.json();
        const u = await uRes.json();
        const s = await sRes.json();
        const e = await eRes.json();
        
        allMobs = await mRes.json();
        allPetals = { ...p, ...u, ...s, ...e };

        const sel1 = document.getElementById('ent1-name') as HTMLSelectElement;
        const sel2 = document.getElementById('ent2-name') as HTMLSelectElement;

        Object.keys(allPetals).forEach(k => sel1.add(new Option(`[Pétale] ${k}`, k)));
        Object.keys(allMobs).forEach(k => {
            sel1.add(new Option(`[Mob] ${k}`, k));
            sel2.add(new Option(k, k));
        });

        document.getElementById('loading')!.style.display = 'none';
        document.getElementById('app')!.style.display = 'block';
    } catch (error) {
        console.error(error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnStart = document.getElementById('btn-start');

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            const name1 = (document.getElementById('ent1-name') as HTMLSelectElement).value;
            const tier1 = parseInt((document.getElementById('ent1-tier') as HTMLInputElement).value);
            
            const name2 = (document.getElementById('ent2-name') as HTMLSelectElement).value;
            const tier2 = parseInt((document.getElementById('ent2-tier') as HTMLInputElement).value);

            let fighter1;

            if (allPetals[name1]) {
                const stats = StatCalculator.computeFinalStats(allPetals[name1], tier1);
                fighter1 = {
                    name: `${name1} (T${tier1})`,
                    health: stats.health || 1,
                    damage: stats.damage || 0,
                    armor: stats.armor || 0,
                    reload: stats.reload || 1,
                    healPerSecond: 0
                };
            } else {
                const scale = Math.pow(3, tier1);
                fighter1 = {
                    name: `${name1} (T${tier1})`,
                    health: allMobs[name1].health * scale,
                    damage: allMobs[name1].damage * scale,
                    armor: allMobs[name1].armor * scale,
                    reload: 1,
                    healPerSecond: 0
                };
            }

            const scale2 = Math.pow(3, tier2);
            const fighter2 = {
                name: `${name2} (T${tier2})`,
                health: allMobs[name2].health * scale2,
                damage: allMobs[name2].damage * scale2,
                armor: allMobs[name2].armor * scale2,
                healPerSecond: 0
            };

            const ticks = CollisionHandler.getSurvivalTicks(fighter1, fighter2);
            const dps = DpsCalculator.calculateDps(fighter1, fighter2);

            console.clear();
            console.log("⚔️ COMBATTANT 1 :", fighter1);
            console.log("🛡️ COMBATTANT 2 :", fighter2);
            console.table({
                [fighter1.name]: {
                    "Ticks Survie": ticks === Infinity ? "Alive" : ticks,
                    "DPS": Number(dps.toFixed(2))
                }
            });
        });
    }

    init();
});