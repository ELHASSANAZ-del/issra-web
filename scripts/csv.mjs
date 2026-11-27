// Lecteur CSV RFC 4180 minimal (champs entre guillemets, guillemets doubles, retours a la ligne dans un champ).
export function lireCsv(texte) {
  const lignes = [];
  let ligne = [], champ = "", i = 0, guillemets = false;
  while (i < texte.length) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') { champ += '"'; i += 2; continue; }
        guillemets = false; i++; continue;
      }
      champ += c; i++; continue;
    }
    if (c === '"') { guillemets = true; i++; continue; }
    if (c === ",") { ligne.push(champ); champ = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { ligne.push(champ); lignes.push(ligne); ligne = []; champ = ""; i++; continue; }
    champ += c; i++;
  }
  if (champ !== "" || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes;
}
