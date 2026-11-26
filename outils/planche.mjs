// Compose planche.png (O68/O70) depuis les captures d un dossier de planche.
// Usage : node outils/planche.mjs <dossier>  (attend 1-avant..6-leader-index.png)
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const D = process.argv[2];
const img = (f) => `data:image/png;base64,${readFileSync(join(D, f)).toString("base64")}`;
const col = (t, f) => `<figure><figcaption>${t}</figcaption><img src="${img(f)}"></figure>`;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:24px;background:#eef1f5;font:15px system-ui;color:#14202e}h1{margin:0 0 4px;font-size:22px}p{margin:0 0 16px;color:#4a5868}
.r{display:flex;gap:16px;margin-bottom:24px}figure{margin:0;width:390px}figcaption{font-weight:700;margin-bottom:6px}img{width:390px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.15)}</style>
<h1>ISSRA web – W1a : /issra/fr/coran/ (390 px, telephone)</h1>
<p>Arabe seul (traductions en attente de licence). AVANT = page absente (404 renvoyee vers l accueil IHY). LEADER = Quran.com, meme vue, releve du 26/11/2026.</p>
<div class="r">${col("AVANT (production : page absente, renvoi accueil IHY)", "1-avant-404.png")}${col("APRES – sourate, clair", "2-apres-sourate-clair.png")}${col("APRES – sourate, sombre", "3-apres-sourate-sombre.png")}${col("LEADER – Quran.com, sourate 18", "4-leader-sourate.png")}</div>
<div class="r">${col("APRES – index des 114 sourates", "5-apres-index.png")}${col("LEADER – Quran.com, index", "6-leader-index.png")}</div>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1720, height: 900 } });
await p.setContent(html, { waitUntil: "load" });
await p.screenshot({ path: join(D, "planche.png"), fullPage: true });
await b.close();
