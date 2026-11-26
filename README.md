# ISSRA web

Site statique d ISSRA servi sous https://ihyinspiration.net/issra/ (Le Coran : 114 sourates, texte Tanzil verifie).

- `npm run build` : donnees (sources epinglees sha256 -> `data/coran/`), `astro build`, controles (`scripts/apres-build.mjs`).
- `npm test` : texte arabe reconstruit octet pour octet, licences, hors ligne, 0 cookie, 0 hote tiers, JS <= 60 Ko gzip (serveur local sur `dist/`, port 4391).
- Publication : etiquette `vX.Y.Z` -> Release GitHub (archive + sha256), integree par build.py du site IHY.
- Traductions : livrees seulement si `data/LICENCES-ISSRA.csv` les marque `autorise` (usage commercial prouve). `ISSRA_APERCU=1` = construction locale de planche, jamais archivable.

Editeur : I.H.Y. Inspiration SRL. Code : MIT. Texte du Coran : Tanzil Project, CC BY 3.0, sans modification. Police Amiri Quran : SIL OFL 1.1.
