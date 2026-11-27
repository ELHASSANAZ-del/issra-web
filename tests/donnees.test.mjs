// Oracles de donnees : texte du Coran octet pour octet, sha256 epingles, registre des licences.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { licences, traductionsActives } from "../scripts/donnees.mjs";

const R = process.cwd();
const src = (f) => readFileSync(join(R, "data", "source", f));

test("sources : sha256 epingles", () => {
  const S = JSON.parse(readFileSync(join(R, "data", "SOURCES.json"), "utf8"));
  const actives = traductionsActives();
  for (const [f, v] of Object.entries(S.fichiers)) if (/^quran-/.test(f) || existsSync(join(R, "data", "source", f)) || actives.length) assert.equal(createHash("sha256").update(src(f)).digest("hex"), v.sha256, f);
});

test("texte arabe reconstruit depuis les JSON = fichier Tanzil, octet pour octet", () => {
  const brut = src("quran-uthmani.txt").toString("utf8");
  const versets = brut.split("\n").filter((l) => l && !l.startsWith("#")).join("\n");
  const notice = brut.split("\n").filter((l) => l.startsWith("#")).join("\n");
  const lignes = [];
  for (let n = 1; n <= 114; n++) {
    const d = JSON.parse(readFileSync(join(R, "data", "coran", `${String(n).padStart(3, "0")}.json`), "utf8"));
    assert.equal(d.notice_tanzil, notice, `notice Tanzil sourate ${n}`);
    for (const v of d.liste) lignes.push(`${n}|${v.a}|${v.ar}`);
  }
  assert.equal(lignes.length, 6236);
  assert.equal(Buffer.compare(Buffer.from(lignes.join("\n")), Buffer.from(versets)), 0);
});

test("licences : toute source livree figure au registre, traduction livree seulement si autorisee", () => {
  const L = licences();
  const S = JSON.parse(readFileSync(join(R, "data", "SOURCES.json"), "utf8"));
  for (const f of Object.keys(S.fichiers)) assert.ok(L.find((l) => l.fichier === f), `${f} absent de LICENCES-ISSRA.csv`);
  for (const f of readdirSync(join(R, "public")).filter((f) => f.endsWith(".woff2"))) assert.ok(L.find((l) => l.fichier === f && l.statut === "autorise"), f);
  const autorisees = L.filter((l) => ["fr", "en"].includes(l.cle) && l.statut === "autorise" && l.usage_commercial === "oui").map((l) => l.cle);
  assert.deepEqual(traductionsActives(false).sort(), autorisees.sort());
  if (process.env.ISSRA_APERCU !== "1") {
    for (let n = 1; n <= 114; n++) {
      const d = JSON.parse(readFileSync(join(R, "data", "coran", `${String(n).padStart(3, "0")}.json`), "utf8"));
      for (const k of ["fr", "en"]) if (!autorisees.includes(k)) assert.ok(!d.sources[k] && d.liste.every((v) => !(k in v)), `sourate ${n} : traduction ${k} livree sans autorisation`);
    }
  }
});

test("texte arabe rendu dans le HTML (basmala separee incluse) = fichier Tanzil", { skip: !existsSync(join(R, "dist", "issra", "fr", "coran")) }, () => {
  const brut = src("quran-uthmani.txt").toString("utf8").split("\n").filter((l) => l && !l.startsWith("#"));
  const dec = (x) => x.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, "&");
  const idx = JSON.parse(readFileSync(join(R, "data", "coran", "index.json"), "utf8"));
  const lignes = [];
  for (const s of idx) {
    const h = readFileSync(join(R, "dist", "issra", "fr", "coran", `${s.n}-${s.slug}`, "index.html"), "utf8");
    const basmala = h.match(/<p class="basmala"[^>]*>([^<]*)<\/p>/)?.[1];
    [...h.matchAll(/<p class="ar" lang="ar" dir="rtl"[^>]*>([^<]*)<span/g)].forEach((m, i) => lignes.push(`${s.n}|${i + 1}|${i === 0 && basmala ? dec(basmala) + " " : ""}${dec(m[1])}`));
  }
  assert.equal(lignes.length, 6236);
  assert.deepEqual(lignes, brut);
});
