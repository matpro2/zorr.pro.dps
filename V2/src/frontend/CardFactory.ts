// CardFactory.ts
// Responsable de la création des éléments DOM de type "card".
// UIRenderer importe createCard depuis ce fichier.

import { TIERS, GENERAL_COLORS } from "../constants";
import { formatNumber } from "../formatNumber";

// ─── Interface ───────────────────────────────────────────────────────────────

export interface CardConfig {
    type: 'target' | 'equipped' | 'inventory' | 'empty' | 'catalog' | 'mob-catalog';
    effectiveName?: string;
    originalName?: string;
    displayTier?: number;
    statTier?: number;
    health?: number;
    damage?: number;
    armor?: number;
    reload?: number;
    secondReload?: number;
    manaPrice?: number;
    dps?: number;
    dpsCategory?: any[];
    effects?: any[];
    petName?: string;
    entityCount?: number;
    petTier?: number;
    isInactive?: boolean;
    inactiveReason?: string;
    synergy?: string;
    entityMulti?: number;
    available?: number;
    equippedQty?: number;
    totalQty?: number;
}

// ─── Helpers internes ────────────────────────────────────────────────────────

function getSequenceColor(index: number): string {
    const colorObj = GENERAL_COLORS[index % GENERAL_COLORS.length];
    const key = Object.keys(colorObj)[0];
    return (colorObj as any)[key];
}

export function getDpsColor(dps: number): string {
    if (!dps || dps <= 0) return "rgb(255, 80, 80)";

    const milestones = [
        { limit: 10,          color: [255, 80,  80]  },
        { limit: 1000,        color: [255, 165,  0]  },
        { limit: 100000,      color: [255, 235, 50]  },
        { limit: 10000000,    color: [80,  255, 80]  },
    ];

    if (dps >= 10000000) return "rgb(80, 255, 80)";

    for (let i = 0; i < milestones.length - 1; i++) {
        const lower = milestones[i];
        const upper = milestones[i + 1];
        if (dps >= lower.limit && dps <= upper.limit) {
            const percent = (dps - lower.limit) / (upper.limit - lower.limit);
            const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * percent);
            const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * percent);
            const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * percent);
            return `rgb(${r}, ${g}, ${b})`;
        }
    }
    return "rgb(255, 80, 80)";
}

export function generateStatHtml(
    name: string,
    value: string | number,
    colorIndex: number,
    options: { prefix?: string; suffix?: string; extraHtml?: string; isPlayerStat?: boolean } = {}
): string {
    const color      = getSequenceColor(colorIndex);
    const displayVal = typeof value === "number" ? formatNumber(value) : String(value);
    const prefix     = options.prefix   || "";
    const suffix     = options.suffix   || "";
    const extra      = options.extraHtml || "";

    if (options.isPlayerStat) {
        return `<div class="florr-text" style="font-size: 1.1em; margin-bottom: 4px; letter-spacing: 0.5px;"><span style="color: ${color};">${name}</span>: ${prefix}${displayVal}${suffix}${extra}</div>`;
    } else {
        return `<div style="margin-bottom: 2px;"><strong style="color: ${color};">${name}:</strong> ${prefix}${displayVal}${suffix}${extra}</div>`;
    }
}

function handleTooltipFlip(e: Event) {
    const slot = e.currentTarget as HTMLElement;
    slot.classList.remove("tooltip-flip");
    setTimeout(() => {
        const content = slot.querySelector(".tooltip-content");
        if (content) {
            const rect = content.getBoundingClientRect();
            if (rect.top < 10 && rect.top !== 0) slot.classList.add("tooltip-flip");
        }
    }, 10);
}

// ─── createCard ──────────────────────────────────────────────────────────────

export function createCard(config: CardConfig): HTMLDivElement {
    const div = document.createElement("div");

    if (config.type === 'empty') {
        div.className = "card-slot card-small";
        div.innerHTML = `<div class="card-visuals" style="border-style: solid; border-color: #cbcbcb; background-color: #ffffff;"></div>`;
        return div;
    }

    const isTarget = config.type === 'target';

    let extraClass = '';
    if (config.type === 'inventory')   extraClass = 'inventory-card';
    if (config.type === 'catalog')     extraClass = 'catalog-card';
    if (config.type === 'mob-catalog') extraClass = 'mob-catalog-card';

    div.className = `card-slot ${isTarget ? 'card-large' : 'card-small'} ${extraClass}`;

    const tierData   = TIERS[config.displayTier!] || { Name: `T${config.displayTier}`, Background: "#fafafa", Border: "#ccc" };
    let visualStyles = `background-color: ${tierData.Background}; `;
    let borderColor  = tierData.Border;

    if (config.isInactive) {
        visualStyles += `opacity: 0.5; filter: grayscale(80%); border-style: dashed; `;
    } else if (config.synergy) {
        if (config.synergy.includes("fusion"))   borderColor = "#3498db";
        if (config.synergy.includes("mimic"))    borderColor = "#9b59b6";
        if (config.synergy.includes("fission"))  borderColor = "#ff9ff3";
        if (config.synergy.includes("joystick")) borderColor = "#f63c39";
        visualStyles += `box-shadow: inset 0 0 10px ${borderColor}50; `;
    } else {
        if (config.type === 'inventory' && (config.available || 0) <= 0) {
            visualStyles += `opacity: 0.5; `;
        } else if (config.type === 'catalog' && (config.totalQty || 0) <= 0) {
            visualStyles += `opacity: 0.5; `;
        }
    }
    visualStyles += `border-color: ${borderColor}; `;

    // ── Stats tooltip ────────────────────────────────────────────────────────
    const statParts: string[] = [];
    let statIndex = 0;

    if (config.health !== undefined && config.health !== 0)
        statParts.push(generateStatHtml("Health", config.health, statIndex++));
    if (config.damage !== undefined && config.damage !== 0)
        statParts.push(generateStatHtml("Damage", config.damage, statIndex++));
    if (config.armor !== undefined && config.armor !== 0)
        statParts.push(generateStatHtml("Armor", config.armor, statIndex++));

    if (config.petName) {
        const pCount    = config.entityCount || 1;
        const pTier     = config.petTier !== undefined ? config.petTier : config.statTier!;
        const pTierData = TIERS[pTier] || { Name: `T${pTier}`, Background: "#fff" };
        const extra     = ` (<span style="color: ${pTierData.Background}; font-weight: bold;">${pTierData.Name}</span>)`;
        statParts.push(generateStatHtml("Pet", `x${pCount} ${config.petName}`, statIndex++, { extraHtml: extra }));
    } else if (config.entityCount !== undefined && config.entityCount !== 1) {
        statParts.push(generateStatHtml("Entities", config.entityCount, statIndex++, { prefix: "x" }));
    }

    if (config.effects) {
        for (const effect of config.effects) {
            if (effect.value !== undefined && effect.value !== 0) {
                let displayVal = typeof effect.value === "object" && effect.value !== null
                    ? `${effect.value.chance}% (x${effect.value.multiplier})`
                    : (typeof effect.value === "number" ? formatNumber(effect.value) : String(effect.value));

                let suffix = "";
                if (effect.subExplosion !== undefined) suffix = ` (x${1 + effect.subExplosion} hits)`;

                let effectName = effect.type.split('.').pop() || effect.type;
                effectName = effectName.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase()).trim();

                statParts.push(generateStatHtml(effectName, displayVal, statIndex++, { suffix }));
            }
        }
    }

    const statsHtml = statParts.length > 0
        ? `<div style="display: flex; flex-direction: column; font-size: 0.95em;">${statParts.join('')}</div>`
        : ``;

    // ── Mana flow ────────────────────────────────────────────────────────────
    let manaFlowHtml = "";
    if (!isTarget) {
        let manaPerSec = 0;

        if (Array.isArray(config.effects)) {
            for (const effect of config.effects) {
                if (typeof effect.type === "string" && effect.type.toLowerCase().includes("mana")) {
                    if (typeof effect.value === "number" && !isNaN(effect.value)) {
                        manaPerSec += effect.value;
                    }
                }
            }
        }

        if (typeof config.manaPrice === "number" && config.manaPrice > 0) {
            const reload = (config.reload || 0) + (config.secondReload || 0);
            if (reload > 0) manaPerSec -= config.manaPrice / reload;
        }

        if (manaPerSec !== 0) {
            const sign  = manaPerSec > 0 ? "+" : "";
            const color = manaPerSec > 0 ? "#42e3f5" : "#e74c3c";
            manaFlowHtml = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dotted rgba(255,255,255,0.2); display:flex; justify-content:space-between; color:#fff;">
                <span>Mana Flow:</span>
                <strong style="color:${color}; text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;">${sign}${formatNumber(manaPerSec)}/s <span style="color:#42e3f5;">●</span></strong>
            </div>`;
        }
    }

    // ── DPS breakdown ────────────────────────────────────────────────────────
    let dpsBreakdown = "";
    if (config.dpsCategory && config.dpsCategory.length > 0 && !isTarget) {
        const breakdownText = config.dpsCategory.map((cat: any) =>
            `<div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                <span>${cat.type}:</span>
                <strong style="color: ${getDpsColor(cat.dps)}; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">${formatNumber(cat.dps)}</strong>
            </div>`
        ).join('');
        dpsBreakdown = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dotted rgba(255,255,255,0.2); color: #fff;">${breakdownText}</div>`;
    }

    // ── Header tooltip (nom + tier) ──────────────────────────────────────────
    const displayTierName  = tierData.Name;
    const displayTierColor = tierData.Background;

    let titleName = config.effectiveName;
    if (config.synergy) {
        let synText = "";
        if (config.synergy.includes("fusion"))   synText = "Fusion";
        else if (config.synergy.includes("mimic"))   synText = "Mimic";
        else if (config.synergy.includes("fission")) synText = "Fission";

        if (config.synergy.includes("joystick")) {
            synText = synText !== "" ? synText + " ➔ Joystick" : `${config.originalName || "Stick"} ➔ Joystick`;
        } else {
            synText += ` ➔ ${config.effectiveName}`;
        }
        titleName = synText;
    }

    let tierStatusText = displayTierName;
    if (config.isInactive) {
        if (config.inactiveReason === "fusion")       tierStatusText += " (Ingrédient)";
        else if (config.inactiveReason === "unstackable") tierStatusText += " (Non-cumulable)";
        else                                           tierStatusText += " (Qté Insuffisante)";
    }
    if (config.statTier !== config.displayTier) tierStatusText += ` (Stats T${config.statTier})`;

    // ── Right header (manaPrice + reload) ────────────────────────────────────
    let rightHeaderHtml = '';
    const headerElements: string[] = [];

    if (config.manaPrice !== undefined && config.manaPrice > 0) {
        headerElements.push(`${formatNumber(config.manaPrice)} <span style="color: #42e3f5; font-size: 1.1em; line-height: 1; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">●</span>`);
    }

    if ((config.reload !== undefined && config.reload > 0) || (config.secondReload !== undefined && config.secondReload > 0)) {
        const r1 = config.reload || 0;
        const r2 = config.secondReload || 0;
        let reloadText = "";
        if (r1 > 0 && r2 > 0)   reloadText = `${formatNumber(r1)}s + ${formatNumber(r2)}s`;
        else if (r1 > 0)         reloadText = `${formatNumber(r1)}s`;
        else if (r2 > 0)         reloadText = `${formatNumber(r2)}s`;
        headerElements.push(`${reloadText} ↻`);
    }

    if (headerElements.length > 0) {
        rightHeaderHtml = `<div style="font-size: 0.95em; font-weight: bold; color: #fff; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; white-space: nowrap; display: flex; align-items: center; gap: 6px;">
            ${headerElements.join(' <span style="color: #fff; font-size: 1.1em;">+</span> ')}
        </div>`;
    }

    // ── Taille dynamique du nom ───────────────────────────────────────────────
    const nameLen = config.effectiveName!.length;
    let dynamicSize = isTarget ? 14 : 11;
    if (!isTarget) {
        if (nameLen >= 12) dynamicSize = 8;
        else if (nameLen >= 9) dynamicSize = 9;
        else if (nameLen >= 7) dynamicSize = 10;
    }

    // ── Assemblage HTML ───────────────────────────────────────────────────────
    let innerHTML = `<div class="card-visuals" style="${visualStyles}">`;

    if (config.entityMulti && config.entityMulti > 1 && !config.isInactive && config.type === 'equipped') {
        innerHTML += `<div class="entity-badge">x${config.entityMulti}</div>`;
    }

    innerHTML += `<div class="card-name" style="font-size: ${dynamicSize}px;">${config.effectiveName}</div>`;

    if (!isTarget && config.type !== 'catalog' && config.type !== 'mob-catalog') {
        innerHTML += `<div class="card-dps" style="display: ${(config.dps || 0) > 0 ? 'block' : 'none'}; background-color: ${borderColor}; color: ${getDpsColor(config.dps || 0)} !important; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 1px 2px rgba(0,0,0,0.8) !important;">
            ${formatNumber(config.dps || 0)}
        </div>`;
    }
    innerHTML += `</div>`;

    if (config.type === 'catalog') {
        innerHTML += `<div class="edit-overlay">
            <button class="cat-add-btn add-btn">Add</button>
            <button class="cat-rem-btn del-btn">Del</button>
        </div>`;
    }

    innerHTML += `<div class="tooltip-content ${config.type === 'inventory' ? 'tooltip-left' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid rgba(255,255,255,0.1); gap: 15px;">
            <div>
                <div style="font-size: 1.3em; font-weight: 900; color: #fff; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 2px rgba(0,0,0,0.5);">${titleName}</div>
                <div style="color: ${displayTierColor}; font-weight: 900; font-size: 0.95em; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">${tierStatusText}</div>
            </div>
            ${rightHeaderHtml}
        </div>
        ${statsHtml}
        ${manaFlowHtml}
        ${dpsBreakdown}
    </div>`;

    if (config.type === 'inventory' && config.totalQty !== undefined) {
        innerHTML += `<div class="qty-badge">${config.equippedQty}/${config.totalQty}</div>`;
    } else if (config.type === 'catalog' && config.totalQty !== undefined && config.totalQty > 0) {
        innerHTML += `<div class="qty-badge">${config.totalQty}</div>`;
    }

    div.innerHTML = innerHTML;

    const tooltipContent = div.querySelector('.tooltip-content');
    if (tooltipContent) tooltipContent.addEventListener('click', (e) => e.stopPropagation());

    div.addEventListener('mouseenter', handleTooltipFlip);

    return div;
}