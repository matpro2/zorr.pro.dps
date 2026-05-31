import petals from "../public/data/petals.json";
import { PlayerValue } from "./PlayerValue";
import { getPetalStats } from "./GetEntity";

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
    const valuesContainer = document.getElementById("values")!;
    const result = document.getElementById("result")!;

    Object.keys(petals).sort().forEach(name => {
        petalSelect.add(new Option(name, name));
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

        input.oninput = () => {
            let target: any = PlayerValue;
            const parts = field.split(".");

            for (let i = 0; i < parts.length - 1; i++) {
                target = target[parts[i]];
            }

            target[parts[parts.length - 1]] = Number(input.value);
        };

        valuesContainer.appendChild(label);
        valuesContainer.appendChild(input);
    }

    document.getElementById("btn-test")!.addEventListener("click", () => {
        const petal = getPetalStats(
            petalSelect.value,
            Number((document.getElementById("petal-tier") as HTMLInputElement).value)
        );

        console.clear();
        console.log("PlayerValue", structuredClone(PlayerValue));
        console.log("Final Petal", petal);

        result.textContent = JSON.stringify(petal, null, 2);
    });
});