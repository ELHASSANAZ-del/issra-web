// Genere les points d entree Astro par langue (FR coran, EN quran). Usage : node outils/pages.mjs
import { mkdirSync, writeFileSync } from "node:fs";
for (const [l, seg] of [["fr", "coran"], ["en", "quran"]]) {
  const d = new URL(`../src/pages/${l}/${seg}/`, import.meta.url);
  mkdirSync(d, { recursive: true });
  writeFileSync(new URL("index.astro", d), `---\nimport Index from "../../../components/Index.astro";\n---\n<Index lang="${l}" />\n`);
  writeFileSync(new URL("[sourate].astro", d), `---\nimport Sourate from "../../../components/Sourate.astro";\nimport { INDEX } from "../../../donnees.mjs";\nexport function getStaticPaths() {\n  return INDEX.map((s) => ({ params: { sourate: \`\${s.n}-\${s.slug}\` }, props: { n: s.n } }));\n}\nconst { n } = Astro.props;\n---\n<Sourate lang="${l}" n={n} />\n`);
}
