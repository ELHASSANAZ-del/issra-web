// Generateur de donnees ISSRA : sources epinglees (sha256) -> data/coran/NNN.json (une sourate par fichier).
// Le texte arabe (Tanzil Uthmani) et les traductions (QuranEnc) sont recopies sans modification.
// Usage : node scripts/donnees.mjs   (echoue si une source ne correspond pas a son sha256 epingle)
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lireCsv } from "./csv.mjs";
import { NOMS_FR } from "./noms-fr.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(RACINE, "data", "source");
const SOURCES = JSON.parse(readFileSync(join(RACINE, "data", "SOURCES.json"), "utf8"));

function lire(nom) {
  const tampon = readFileSync(join(SRC, nom));
  const h = createHash("sha256").update(tampon).digest("hex");
  const attendu = SOURCES.fichiers[nom]?.sha256;
  if (h !== attendu) throw new Error(`sha256 inattendu pour ${nom} : ${h} (epingle : ${attendu})`);
  return tampon.toString("utf8");
}

// Tanzil : lignes "sourate|verset|texte", puis bloc de copyright en commentaires.
export function lireTanzil(texte) {
  const versets = [];
  let notice = [];
  for (const ligne of texte.split("\n")) {
    if (ligne.startsWith("#")) { notice.push(ligne); continue; }
    if (ligne === "") continue;
    const i = ligne.indexOf("|"), j = ligne.indexOf("|", i + 1);
    versets.push({ s: +ligne.slice(0, i), a: +ligne.slice(i + 1, j), ar: ligne.slice(j + 1) });
  }
  return { versets, notice: notice.join("\n") };
}

function lireMeta(js) {
  const bloc = js.slice(js.indexOf("QuranData.Sura = ["), js.indexOf("];", js.indexOf("QuranData.Sura = [")));
  const lignes = [...bloc.matchAll(/\[(\d+), (\d+), (\d+), (\d+), '([^']+)', "([^"]+)", '([^']+)', '(\w+)'\]/g)];
  const sajda = [...js.slice(js.indexOf("QuranData.Sajda = [")).matchAll(/\[(\d+), (\d+), '(\w+)'\]/g)].map((m) => `${m[1]}:${m[2]}`);
  return { sourates: lignes.map((m) => ({ versets: +m[2], ordre: +m[3], ar: m[5], translit: m[6], en: m[7], type: m[8] })), sajda };
}

function lireTraduction(nom) {
  const lignes = lireCsv(lire(nom));
  const entete = lignes[0][0]; // bloc d information QuranEnc a conserver
  const parCle = new Map();
  for (const l of lignes.slice(2)) parCle.set(`${l[1]}:${l[2]}`, { t: l[3], n: l[4] ?? "" });
  return { entete, parCle };
}

// Translitteration Tanzil -> nom d affichage et slug d URL (regle deterministe, sans retape).
export function nomLatin(t) {
  return t.replace(/aa/g, "a").replace(/ii/g, "i").replace(/uu/g, "u").replace(/'/g, "");
}
export function slug(t) {
  return nomLatin(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Registre des licences : une traduction n est livree que si son statut est "autorise".
// ISSRA_APERCU=1 l inclut quand meme pour une construction locale de planche (jamais publiee : apres-build.mjs refuse).
export function licences() {
  const [entete, ...lignes] = lireCsv(readFileSync(join(RACINE, "data", "LICENCES-ISSRA.csv"), "utf8")).filter((l) => l.length > 1);
  return lignes.map((l) => Object.fromEntries(entete.map((k, i) => [k, l[i]])));
}
export function traductionsActives(apercu = process.env.ISSRA_APERCU === "1") {
  return licences().filter((l) => (l.cle === "fr" || l.cle === "en") && (l.statut === "autorise" || apercu)).map((l) => l.cle);
}

export function generer() {
  const actives = traductionsActives();
  const { versets, notice } = lireTanzil(lire("quran-uthmani.txt"));
  const meta = lireMeta(lire("quran-data.js"));
  const fr = actives.includes("fr") ? lireTraduction("french_rashid.csv") : null;
  const en = actives.includes("en") ? lireTraduction("english_saheeh.csv") : null;
  if (versets.length !== 6236 || meta.sourates.length !== 114 || NOMS_FR.length !== 114) throw new Error("comptes inattendus");
  mkdirSync(join(RACINE, "data", "coran"), { recursive: true });
  const index = [];
  for (let s = 1; s <= 114; s++) {
    const m = meta.sourates[s - 1];
    const vs = versets.filter((v) => v.s === s);
    if (vs.length !== m.versets) throw new Error(`sourate ${s} : ${vs.length} versets, ${m.versets} attendus`);
    const entree = { n: s, slug: slug(m.translit), ar: m.ar, latin: nomLatin(m.translit), en: m.en, fr: NOMS_FR[s - 1], type: m.type === "Meccan" ? "mecquoise" : "medinoise", ordre: m.ordre, versets: m.versets };
    index.push(entree);
    const doc = {
      ...entree,
      sources: { texte: SOURCES.fichiers["quran-uthmani.txt"].cite, ...(actives.includes("fr") && { fr: SOURCES.fichiers["french_rashid.csv"].cite }), ...(actives.includes("en") && { en: SOURCES.fichiers["english_saheeh.csv"].cite }) },
      apercu: process.env.ISSRA_APERCU === "1",
      notice_tanzil: notice,
      liste: vs.map((v) => {
        const k = `${s}:${v.a}`;
        if ((fr && !fr.parCle.has(k)) || (en && !en.parCle.has(k))) throw new Error(`traduction manquante ${k}`);
        const tr = {};
        if (actives.includes("fr")) Object.assign(tr, { fr: fr.parCle.get(k).t, frN: fr.parCle.get(k).n });
        if (actives.includes("en")) Object.assign(tr, { en: en.parCle.get(k).t, enN: en.parCle.get(k).n });
        return { a: v.a, ar: v.ar, ...tr, sajda: meta.sajda.includes(k) };
      }),
    };
    writeFileSync(join(RACINE, "data", "coran", `${String(s).padStart(3, "0")}.json`), JSON.stringify(doc, null, 0) + "\n");
  }
  writeFileSync(join(RACINE, "data", "coran", "index.json"), JSON.stringify(index, null, 1) + "\n");
  return index;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const index = generer();
  console.log(`ok : ${index.length} sourates, ${index.reduce((t, s) => t + s.versets, 0)} versets`);
}
