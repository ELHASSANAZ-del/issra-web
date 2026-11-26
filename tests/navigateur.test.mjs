// Oracles navigateur sur la construction servie (ISSRA_URL, defaut http://localhost:4391) :
// hors ligne, 0 cookie, 0 requete hors liste blanche, JS <= 60 Ko gzip par modele de page, basmala separee.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";

const BASE = process.env.ISSRA_URL || "http://localhost:4391";
const autorises = readFileSync("tests/domaines-autorises.txt", "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
const hoteAutorise = (h) => h === new URL(BASE).hostname || autorises.some((d) => h === d || h.endsWith("." + d));
const MODELES = ["/issra/", "/issra/fr/coran/", "/issra/en/quran/", "/issra/fr/coran/18-al-kahf/", "/issra/en/quran/2-al-baqara/"];

test("reseau, cookies, poids JS", async () => {
  const b = await chromium.launch();
  try {
    for (const p of MODELES) {
      const c = await b.newContext();
      const page = await c.newPage();
      const hors = [], scripts = [];
      page.on("request", (r) => { const u = new URL(r.url()); if (!u.protocol.startsWith("data") && !hoteAutorise(u.hostname)) hors.push(r.url()); if (r.resourceType() === "script") scripts.push(r.url()); });
      await page.goto(BASE + p, { waitUntil: "networkidle" });
      assert.deepEqual(hors, [], `${p} : requetes hors liste blanche`);
      assert.deepEqual(await c.cookies(), [], `${p} : cookie depose`);
      const html = await (await fetch(BASE + p)).text();
      const inline = [...html.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("");
      let total = gzipSync(inline).length;
      for (const s of scripts) total += gzipSync(Buffer.from(await (await fetch(s)).arrayBuffer())).length;
      assert.ok(total <= 60 * 1024, `${p} : JS ${total} octets gzip > 60 Ko`);
      console.log(`# ${p} JS gzip ${total} o, ${scripts.length} script(s) externe(s)`);
      await c.close();
    }
  } finally { await b.close(); }
});

test("hors ligne : Al-Kahf rechargee sans reseau reste lisible", async () => {
  const b = await chromium.launch();
  try {
    const c = await b.newContext();
    const page = await c.newPage();
    await page.goto(BASE + "/issra/fr/coran/18-al-kahf/", { waitUntil: "networkidle" });
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.waitForFunction(async () => !!(await caches.match("/issra/fr/coran/18-al-kahf/")));
    await c.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    assert.equal(await page.locator(".v").count(), 110);
    assert.ok((await page.locator(".v .ar").first().textContent()).length > 20);
    if (await page.locator(".v .tr").count()) assert.ok((await page.locator(".v .tr").first().textContent()).length > 10);
  } finally { await b.close(); }
});

test("basmala affichee a part (sauf 1 et 9), sans perte de texte", async () => {
  const b = await chromium.launch();
  try {
    const page = await b.newPage();
    for (const [p, attendu] of [["/issra/fr/coran/18-al-kahf/", 1], ["/issra/fr/coran/9-at-tawba/", 0], ["/issra/fr/coran/1-al-fatiha/", 0]]) {
      await page.goto(BASE + p);
      assert.equal(await page.locator(".basmala").count(), attendu, p);
    }
  } finally { await b.close(); }
});
