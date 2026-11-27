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
const MODELES = ["/issra/fr/coran/", "/issra/en/quran/", "/issra/fr/coran/18-al-kahf/", "/issra/en/quran/2-al-baqara/"];

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

test("hors ligne : Al-Kahf rechargee sans reseau reste lisible (service worker actif sous la CSP servie)", { timeout: 30000 }, async () => {
  const b = await chromium.launch();
  try {
    const c = await b.newContext();
    const page = await c.newPage();
    await page.goto(BASE + "/issra/fr/coran/18-al-kahf/", { waitUntil: "networkidle" });
    const pret = await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((r) => setTimeout(() => r(false), 8000))]));
    assert.ok(pret, "service worker non actif (CSP worker-src ?)");
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

test("recherche de l index : saisies courantes", async () => {
  const b = await chromium.launch();
  try {
    const page = await b.newPage();
    await page.goto(BASE + "/issra/fr/coran/");
    for (const [q, n] of [["al kahf", 18], ["Al-Kahf", 18], ["ya sin", 36], ["yasin", 36], ["caverne", 18], ["الكهف", 18], ["18", 18]]) {
      await page.fill("#q", q);
      const vis = await page.locator("#liste li:not([hidden]) .num span").allTextContents();
      assert.ok(vis.includes(String(n)), `« ${q} » ne trouve pas la sourate ${n} (${vis.slice(0, 5)})`);
    }
    await page.fill("#q", "zzzz");
    assert.ok(await page.locator("#vide").isVisible());
  } finally { await b.close(); }
});

test("ancre de verset visible sous l en-tete collant", async () => {
  const b = await chromium.launch();
  try {
    const page = await b.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(BASE + "/issra/fr/coran/18-al-kahf/#v10");
    const [haut, entete] = await page.evaluate(() => [document.getElementById("v10").getBoundingClientRect().top, document.querySelector(".entete").getBoundingClientRect().bottom]);
    assert.ok(haut >= entete, `verset a ${haut} px, en-tete jusqu a ${entete} px`);
  } finally { await b.close(); }
});

test("anneau de focus contraste (>= 3:1) sur l en-tete et le contenu, clair et sombre", async () => {
  const b = await chromium.launch();
  try {
    for (const scheme of ["light", "dark"]) {
      const page = await b.newPage({ colorScheme: scheme });
      await page.goto(BASE + "/issra/fr/coran/18-al-kahf/");
      for (const sel of [".marque", ".entete nav a", ".navs a", ".bascule button"]) {
        await page.focus(sel);
        await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
        const r = await page.evaluate((sel) => {
          const e = document.activeElement; const lum = (c) => { const [r, g, b] = c.match(/\d+/g).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
          let f = e.parentElement, bg = "rgba(0, 0, 0, 0)";
          while (f && (bg = getComputedStyle(f).backgroundColor).endsWith(", 0)")) f = f.parentElement;
          if (!f || bg.includes("gradient")) bg = getComputedStyle(document.body).backgroundColor;
          if (getComputedStyle(e.closest(".entete") || document.body).backgroundImage.includes("gradient") && e.closest(".entete")) bg = "rgb(15, 43, 76)";
          const a = lum(getComputedStyle(e).outlineColor), c = lum(bg);
          return { sel, style: getComputedStyle(e).outlineStyle, ratio: (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05) };
        }, sel);
        assert.ok(r.style !== "none" && r.ratio >= 3, `${scheme} ${sel} : anneau ${r.style} ${r.ratio.toFixed(2)}:1`);
      }
      await page.close();
    }
  } finally { await b.close(); }
});
