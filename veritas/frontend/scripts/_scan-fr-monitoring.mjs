import fs from 'fs';
import path from 'path';

function walk(d) {
  let r = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) r = r.concat(walk(p));
    else if (/\.(js|jsx)$/.test(e.name)) r.push(p);
  }
  return r;
}

const files = walk('src/components/Monitoring');
const re = /[àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]|\b(Annuler|Enregistrer|Chargement|Aucun|Aucune|Veuillez|Serveurs|Sauvegarde|Précédent|Suivant|Réinitialiser|Supprimer|Modifier|Ajouter|Fermer|Retour|Erreur|Succès)\b/;
let n = 0;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  if (re.test(t)) {
    n++;
    console.log(f);
  }
}
console.log('TOTAL', n, '/', files.length);
