// data/index.ts
import petals from "./petals.json";
import mobs from "./mobs.json";
import spills from "./spills.json";
import eggs from "./eggs.json";
import utilities from "./utilities.json";
import radiation from "./radiation.json";
import magic from "./magic.json";

export const allData: Record<string, any> = {
    ...petals,
    ...mobs,
    ...spills,
    ...eggs,
    ...utilities,
    ...radiation,
    ...magic
};

export { petals, mobs, spills, eggs, utilities, radiation, magic };