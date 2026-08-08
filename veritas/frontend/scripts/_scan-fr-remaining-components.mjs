import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../src/components");
const OUT = path.resolve(__dirname, "_fr-remaining.txt");

const ACCENT = /[\u00C0-\u00FF\u0152\u0153\u0178]/;

const FR_WORD_LIST = [
  "Annuler", "Enregistrer", "Supprimer", "Fermer", "Confirmer", "Chargement",
  "Aucun", "Aucune", "Rechercher", "Modifier", "Ajouter", "Précédent", "Precedent",
  "Suivant", "Veuillez", "Impossible", "Retour", "Erreur", "Succès", "Succes",
  "Échec", "Echec", "Paramètres", "Parametres", "Réinitialiser", "Reinitialiser",
  "Actualiser", "Exporter", "Importer", "Configurer", "Télécharger", "Telecharger",
  "Enregistrement", "données", "donnees", "Données", "Donnees", "graphique", "Graphique",
  "rapport", "Rapport", "période", "periode", "Période", "Periode", "depuis", "Depuis",
  "inconnu", "Inconnu", "équipement", "equipement", "Équipement", "Equipement",
  "équipements", "equipements", "Équipements", "Equipements", "résumé", "resume",
  "Résumé", "Resume", "accueil", "Accueil", "Disponible", "Indisponible", "Critiques",
  "Avertissement", "Informations", "Utilisateur", "Utilisateurs", "Licence", "Licences",
  "Sécurité", "Securite", "Stockage", "Pare-feu", "Règles", "Regles", "Domaine",
  "Domaines", "Disponibilité", "Disponibilite", "Performance", "Serveurs", "Sauvegarde",
  "Firewalls", "Switches", "Antivirus", "Antispam", "Internet", "Copier", "Affectation",
  "Êtes-vous", "Etes-vous", "Déplacer", "Deplacer"
];

const FR_WORDS = new RegExp(
  "\\b(" + FR_WORD_LIST.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
  "i"
);

function extractStringLiterals(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      let j = i + 1;
      let buf = "";
      let closed = false;
      while (j < src.length) {
        const d = src[j];
        if (d === "\\") {
          buf += src[j + 1] ?? "";
          j += 2;
          continue;
        }
        if (quote === "`" && d === "$" && src[j + 1] === "{") {
          out.push(buf);
          i = j;
          closed = true;
          break;
        }
        if (d === quote) {
          out.push(buf);
          i = j + 1;
          closed = true;
          break;
        }
        buf += d;
        j++;
      }
      if (!closed) i++;
      continue;
    }
    i++;
  }
  return out;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "AdminPage") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function hasFrenchUi(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  for (const lit of extractStringLiterals(src)) {
    if (ACCENT.test(lit) || FR_WORDS.test(lit)) return true;
  }
  return false;
}

const files = walk(ROOT);
const hits = [];
for (const f of files) {
  if (hasFrenchUi(f)) {
    hits.push(path.relative(path.resolve(__dirname, ".."), f).replace(/\\/g, "/"));
  }
}
hits.sort();

const body = [
  "Remaining French UI files outside AdminPage: " + hits.length,
  "Scanned .js/.jsx under src/components (AdminPage excluded): " + files.length,
  "",
  ...hits,
  "",
].join("\n");

fs.writeFileSync(OUT, body, "utf8");
console.log("Wrote " + OUT);
console.log("count=" + hits.length + " scanned=" + files.length);
