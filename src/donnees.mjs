import { readFileSync } from "node:fs";
import { join } from "node:path";
// Lu a la construction depuis la racine du depot (astro build est lance a la racine).
const lire = (f) => JSON.parse(readFileSync(join(process.cwd(), "data", "coran", f), "utf8"));
export const INDEX = lire("index.json");
export const sourate = (n) => lire(`${String(n).padStart(3, "0")}.json`);
