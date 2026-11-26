// ISSRA web : lecture hors ligne. Pages : reseau d abord, cache en secours (chaque page ouverte reste lisible).
// Fichiers statiques : cache d abord. Aucun appel hors de ihyinspiration.net.
const V = "issra-__VERSION__"; // remplace par apres-build.mjs (empreinte des fichiers statiques)
const PAGES = "issra-pages-1";
const STATIQUES = ["/issra/AmiriQuran.woff2", "/issra/icone-96.png", "/issra/favicon-32.png", "/issra/fr/coran/", "/issra/en/quran/"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(STATIQUES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k !== PAGES).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || !u.pathname.startsWith("/issra/")) return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then((r) => {
      if (r.ok && !r.redirected) { const c = r.clone(); caches.open(PAGES).then((k) => k.put(u.pathname, c)); }
      return r;
    }).catch(() => caches.match(u.pathname, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((x) => {
    if (x.ok && !x.redirected && /\.(woff2|png|css|js)$/.test(u.pathname)) { const c = x.clone(); caches.open(V).then((k) => k.put(e.request, c)); }
    return x;
  })));
});
