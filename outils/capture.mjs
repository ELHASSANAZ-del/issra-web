// usage: node capture.mjs <url> <sortie-prefixe> [sombre]
import { chromium } from "playwright";
const [url, out, sombre] = process.argv.slice(2);
const b = await chromium.launch();
for (const w of [390, 1440]) {
  const c = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, deviceScaleFactor: w === 390 ? 2 : 1, colorScheme: sombre ? "dark" : "light", locale: "fr-FR" });
  const p = await c.newPage();
  await p.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}-${w}.png` });
  await p.screenshot({ path: `${out}-${w}-page.png`, fullPage: true }).catch(()=>{});
  if (w === 1440) console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("header a, header button, nav a, h1, h2, button")].slice(0, 60).map(e => (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 50)).filter(Boolean))));
  await c.close();
}
await b.close();
