// ZERO-IQRA : aucun lien /apps/iqra ni /iqra dans les sources (O76, PREVENTION).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const MOTIF = /\/(apps\/)?iqra(?![\w-])/i;

function fichiers(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? fichiers(p) : [p];
  });
}

test("motif : detecte les variantes, ignore l identifiant Play", () => {
  for (const s of ["/apps/iqra/", "/iqra/", "/ar/apps/iqra/x", "/APPS/IQRA/", "/apps/iqra", "/apps/iqra?x=1", "/iqra#a", "https://x.app/apps/iqra", "\"/iqra\""]) {
    assert.ok(MOTIF.test(s), s);
  }
  for (const s of ["id=net.ihyinspiration.iqra", "/iqralab", "/apps/issra/"]) {
    assert.ok(!MOTIF.test(s), s);
  }
});

test("src, public, data : aucun lien /apps/iqra ni /iqra", () => {
  const fautes = ["src", "public", "data"]
    .map((d) => join(process.cwd(), d))
    .filter((d) => existsSync(d))
    .flatMap(fichiers)
    .filter((f) => !/\.(png|jpe?g|webp|ico|woff2?|gif|avif)$/i.test(f))
    .filter((f) => MOTIF.test(readFileSync(f, "utf8")));
  assert.deepEqual(fautes, []);
});
