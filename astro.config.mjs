import { defineConfig } from "astro/config";
// Site ISSRA servi sous https://ihyinspiration.net/issra/ (decision D202611260644181122, option A).
export default defineConfig({
  site: "https://ihyinspiration.net",
  base: "/issra",
  trailingSlash: "always",
  outDir: "dist/issra",
  build: { format: "directory", inlineStylesheets: "always", assets: "_a" },
  compressHTML: true,
  devToolbar: { enabled: false },
});
