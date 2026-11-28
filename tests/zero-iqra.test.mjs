// ZERO-IQRA : aucun lien /apps/iqra/ ni /iqra/ dans les sources (O76, PREVENTION).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function fichiers(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? fichiers(p) : [p];
  });
}

test("src : aucun lien /apps/iqra/ ni /iqra/", () => {
  const fautes = fichiers(join(process.cwd(), "src")).filter((f) => /\/(apps\/)?iqra\//i.test(readFileSync(f, "utf8")));
  assert.deepEqual(fautes, []);
});
