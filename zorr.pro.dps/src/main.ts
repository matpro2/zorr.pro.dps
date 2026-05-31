import petals from "../public/data/petals.json";
import mobs from "../public/data/mobs.json";
import spills from "../public/data/spills.json";
import eggs from "../public/data/eggs.json";
import utilities from "../public/data/utilities.json";

import { PlayerValue } from "./PlayerValue";
import { getObject } from "./GetObject";
import { DpsCalculator } from "./DpsCalculator";

// On combine toutes les données pour récupérer tous les noms disponibles
const allData: Record<string, any> = {
    ...petals,
    ...mobs,
    ...spills,
    ...eggs,
    ...utilities
};

function flatten(obj: any, prefix = ""): string[] {
    const result: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;

        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            result.push(...flatten(value, path));
        } else if (typeof value === "number") {
            result.push(path);
        }
    }

    return result;
}

document.addEventListener("DOMContentLoaded", () => {
    const petalSelect = document.getElementById("petal-name") as HTMLSelectElement;
    const attackerSelect = document.getElementById("attacker-name") as HTMLSelectElement;
    const targetSelect = document.getElementById("target-name") as HTMLSelectElement;
    const valuesContainer = document.getElementById("values")!;

    // On récupère toutes les clés (noms) de tous les objets combinés et on les trie
    const objectNames = Object.keys(allData).sort();

    // On remplit les listes déroulantes avec tous les objets du jeu
    objectNames.forEach(name => {
        petalSelect.add(new Option(name, name));
        attackerSelect.add(new Option(name, name));
        targetSelect.add(new Option(name, name));
    });

    const fields = flatten(PlayerValue);

    for (const field of fields) {
        let value: any = PlayerValue;

        for (const part of field.split(".")) {
            value = value[part];
        }

        const label = document.createElement("label");
        label.textContent = field;

        const input = document.createElement("input");
        input.type = "number";
        input.step = "0.01";
        input.value = String(value);

        input.addEventListener("input", () => {
            let target: any = PlayerValue;
            const parts = field.split(".");

            for (let i = 0; i < parts.length - 1; i++) {
                target = target[parts[i]];
            }

            target[parts[parts.length - 1]] = Number(input.value);
        });

        valuesContainer.appendChild(label);
        valuesContainer.appendChild(input);
    }

    document.getElementById("btn-test")!.addEventListener("click", () => {
        const objectName = petalSelect.value;
        const objectTier = Number((document.getElementById("petal-tier") as HTMLInputElement).value);
        
        const testObject = getObject(objectName, objectTier);

        console.group("OBJECT TEST");
        console.log("PlayerValue", structuredClone(PlayerValue));
        console.log("Object", testObject);
        console.groupEnd();
    });

    document.getElementById("btn-combat")!.addEventListener("click", () => {
        const attackerName = attackerSelect.value;
        const attackerTier = Number((document.getElementById("attacker-tier") as HTMLInputElement).value);

        const targetName = targetSelect.value;
        const targetTier = Number((document.getElementById("target-tier") as HTMLInputElement).value);

        const attacker = getObject(attackerName, attackerTier);
        const target = getObject(targetName, targetTier);

        const result = DpsCalculator.calculateDps(
            attackerName,
            attackerTier,
            targetName,
            targetTier
        );

        console.group("COMBAT TEST");
        console.log("PlayerValue", structuredClone(PlayerValue));
        console.log("Attacker", attacker);
        console.log("Target", target);
        console.log("Result", result);
        console.groupEnd();
    });
});