// Apres astro build : manifestes PWA, sitemap, controles de coherence (check), puis archive + sha256 si demande.
// Echoue (code 1) sur tout defaut. Refuse d archiver une construction d apercu (ISSRA_APERCU=1).
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const RACINE = new URL("..", import.meta.url).pathname;
const DIST = join(RACINE, "dist");
const SITE = join(DIST, "issra");
const BASE = "https://ihyinspiration.net";
const erreurs = [];

for (const [l, nom, seg, desc] of [["fr", "ISSRA – Le Coran", "coran", "Lire le Coran, gratuit et sans publicité."], ["en", "ISSRA – The Quran", "quran", "Read the Quran, free and ad-free."]]) {
  writeFileSync(join(SITE, `manifest-${l}.webmanifest`), JSON.stringify({
    name: nom, short_name: "ISSRA", description: desc, lang: l, dir: "ltr", start_url: `/issra/${l}/${seg}/`, scope: "/issra/",
    display: "standalone", background_color: "#fbf7ee", theme_color: "#0f2b4c",
    icons: [{ src: "/issra/icone-192.png", sizes: "192x192", type: "image/png" }, { src: "/issra/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  }, null, 1) + "\n");
}

const fichiers = [];
(function parcourir(d) { for (const f of readdirSync(d).sort()) { const p = join(d, f); statSync(p).isDirectory() ? parcourir(p) : fichiers.push(p); } })(SITE);
const pages = fichiers.filter((f) => f.endsWith("index.html"));
const urlDe = (f) => `${BASE}/${relative(DIST, f).replace(/index\.html$/, "")}`;
const existe = new Set(pages.map(urlDe));
const titres = new Map(), descs = new Map(), hreflangs = new Map();

for (const f of pages) {
  const h = readFileSync(f, "utf8"), u = urlDe(f);
  const titre = h.match(/<title>([^<]*)<\/title>/)?.[1];
  const desc = h.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!titre) erreurs.push(`${u} : titre absent`);
  if (!desc) erreurs.push(`${u} : description absente`);
  if (titres.has(titre)) erreurs.push(`${u} : titre identique a ${titres.get(titre)}`); else titres.set(titre, u);
  if (descs.has(desc)) erreurs.push(`${u} : description identique a ${descs.get(desc)}`); else descs.set(desc, u);
  if (!/<main[^>]*>[\s\S]*\S[\s\S]*<\/main>/.test(h)) erreurs.push(`${u} : page vide`);
  const canon = h.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canon !== u) erreurs.push(`${u} : canonique ${canon}`);
  hreflangs.set(u, Object.fromEntries([...h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]])));
  for (const m of h.matchAll(/href="(\/issra\/[^"#]*)/g)) {
    const cible = BASE + m[1];
    if (!existe.has(cible) && !existsSync(join(DIST, m[1]))) erreurs.push(`${u} : lien interne mort ${m[1]}`);
  }
  if (/https?:\/\/(?!ihyinspiration\.net|tanzil\.net|quranenc\.com|play\.google\.com|apps\.apple\.com|schema\.org|creativecommons\.org)[a-z0-9.-]+/i.test(h.replace(/<a [^>]*>/g, ""))) erreurs.push(`${u} : hote externe hors liens`);
}
for (const [u, alt] of hreflangs) for (const [l, cible] of Object.entries(alt)) {
  if (l === "x-default") continue;
  if (!existe.has(cible)) erreurs.push(`${u} : hreflang ${l} vers page absente ${cible}`);
  else if (!Object.values(hreflangs.get(cible)).includes(u)) erreurs.push(`${u} : hreflang ${l} non reciproque`);
}

const apercu = readFileSync(join(RACINE, "data", "coran", "001.json"), "utf8").includes('"apercu":true');
writeFileSync(join(SITE, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...existe].sort().map((u) => `<url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`);
writeFileSync(join(SITE, "robots-issra.txt"), `Sitemap: ${BASE}/issra/sitemap.xml\n`);

if (pages.length !== 2 * 115 + 1) erreurs.push(`nombre de pages ${pages.length}, attendu 231`);
if (erreurs.length) { console.error(erreurs.slice(0, 40).join("\n")); console.error(`ECHEC : ${erreurs.length} defaut(s)`); process.exit(1); }
console.log(`check ok : ${pages.length} pages, ${fichiers.length + 3} fichiers, liens et hreflang coherents`);

if (process.argv.includes("--archive")) {
  if (apercu) { console.error("REFUS : construction d apercu (traductions non autorisees) : pas d archive publiable"); process.exit(1); }
  const version = process.argv[process.argv.indexOf("--archive") + 1];
  const sortie = join(RACINE, `issra-web-${version}.tar.gz`);
  // Archive deterministe : ordre trie, dates et proprietaires fixes.
  execFileSync("tar", ["--sort=name", "--mtime=2026-01-01 00:00:00Z", "--owner=0", "--group=0", "--numeric-owner", "-C", DIST, "-cf", sortie.replace(/\.gz$/, ""), "issra"], { env: { ...process.env, LC_ALL: "C" } });
  execFileSync("gzip", ["-n", "-9", "-f", sortie.replace(/\.gz$/, "")]);
  const h = createHash("sha256").update(readFileSync(sortie)).digest("hex");
  writeFileSync(sortie + ".sha256", `${h}  issra-web-${version}.tar.gz\n`);
  console.log(`archive ${sortie} sha256 ${h}`);
}
