// Serveur de test de dist/ avec les en-tetes de production du site IHY (firebase.json de ihy-site, regle "**"),
// plus la regle /issra/** proposee dans la PR d integration (worker-src 'self' pour le service worker).
// Usage : node outils/serveur.mjs [port] [--csp-actuelle]   (--csp-actuelle = CSP du site sans la regle /issra/**)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const port = +(process.argv[2] || 4391);
const actuelle = process.argv.includes("--csp-actuelle");
const DIST = join(process.cwd(), "dist");
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
export const CSP_ISSRA = CSP.replace("script-src 'unsafe-inline';", "script-src 'unsafe-inline'; worker-src 'self';");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".css": "text/css" };

createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  let p = normalize(decodeURIComponent(u.pathname));
  if (p.includes("..")) { res.writeHead(400).end(); return; }
  let f = join(DIST, p);
  try { if ((await stat(f)).isDirectory()) f = join(f, "index.html"); } catch { /* 404 plus bas */ }
  try {
    const corps = await readFile(f);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(f)] || "application/octet-stream",
      "Content-Security-Policy": !actuelle && p.startsWith("/issra/") ? CSP_ISSRA : CSP,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    res.end(corps);
  } catch { res.writeHead(404, { "Content-Type": "text/plain" }).end("404"); }
}).listen(port, "127.0.0.1", () => console.log(`dist/ sur http://localhost:${port} (CSP ${actuelle ? "actuelle" : "avec /issra/**"})`));
