/**
 * Safe phrase-level FR→EN for Monitoring UI (long/unambiguous phrases only).
 */
import fs from 'fs';
import path from 'path';

const ROOT = 'src/components/Monitoring';

// Longer phrases first. Never include short ambiguous words (de, le, et…).
const PAIRS = [
  ["Veuillez remplir les champs requis", "Please fill in the required fields"],
  ["Référence du résumé non disponible", "Summary reference not available"],
  ["Configuration non disponible", "Configuration not available"],
  ["Aucun rapport n'a pu être généré", "No report could be generated"],
  ["Graphique non disponible dans l'export", "Chart not available in export"],
  ["Graphique en cours de chargement", "Chart loading"],
  ["Graphique exporté", "Exported chart"],
  ["Erreur lors de la conversion de l'image", "Error converting image"],
  ["Erreur lors de la conversion du graphique", "Error converting chart"],
  ["Erreur lors de la conversion SVG", "Error converting SVG"],
  ["Erreur conversion image en base64", "Error converting image to base64"],
  ["Erreur lors de la génération du ZIP", "Error generating ZIP"],
  ["Erreur lors de l'export ZIP", "Error exporting ZIP"],
  ["Téléchargement du ZIP", "Downloading ZIP"],
  ["Téléchargement déclenché", "Download started"],
  ["RAPPORTS MONITORING", "MONITORING REPORTS"],
  ["CYBERSÉCURITÉ", "CYBERSECURITY"],
  ["Cybersécurité", "Cybersecurity"],
  ["Services Managés", "Managed Services"],
  ["SERVICES MANAGÉS", "MANAGED SERVICES"],
  ["Noms de domaine", "Domain Names"],
  ["Bornes WiFi", "WiFi Access Points"],
  ["Règles de filtrage", "Filtering rules"],
  ["Règles de pare-feu", "Firewall rules"],
  ["Topologie et état de vos serveurs par site", "Topology and status of your servers by site"],
  ["Topologie et capacité de vos stockages par site", "Topology and capacity of your storage by site"],
  ["Topologie et état de vos switchs par site", "Topology and status of your switches by site"],
  ["Topologie et état de vos bornes WiFi par site", "Topology and status of your WiFi access points by site"],
  ["Vue d'ensemble de vos connexions Internet par site", "Overview of your Internet connections by site"],
  ["État de santé et statistiques de vos pare-feu", "Health status and statistics of your firewalls"],
  ["Protection et restauration des données", "Data protection and restoration"],
  ["Protection et détection des menaces", "Threat protection and detection"],
  ["Filtrage et protection des emails", "Email filtering and protection"],
  ["Gestion et suivi de vos noms de domaine", "Management and tracking of your domain names"],
  ["Services cloud et collaboration Microsoft", "Microsoft cloud and collaboration services"],
  ["VOS CONNEXIONS INTERNET", "YOUR INTERNET CONNECTIONS"],
  ["VOS SERVEURS", "YOUR SERVERS"],
  ["VOS STOCKAGES", "YOUR STORAGE"],
  ["VOS FIREWALLS", "YOUR FIREWALLS"],
  ["VOS SWITCHS", "YOUR SWITCHES"],
  ["VOS BORNES WIFI", "YOUR WIFI ACCESS POINTS"],
  ["Réinitialiser", "Reset"],
  ["Précédent", "Previous"],
  ["Suivant", "Next"],
  ["Terminer", "Finish"],
  ["Annuler", "Cancel"],
  ["Enregistrer", "Save"],
  ["Enregistrement…", "Saving…"],
  ["Enregistrement...", "Saving..."],
  ["Supprimer", "Delete"],
  ["Modifier", "Edit"],
  ["Ajouter", "Add"],
  ["Fermer", "Close"],
  ["Retour", "Back"],
  ["Rechercher", "Search"],
  ["Chargement…", "Loading…"],
  ["Chargement...", "Loading..."],
  ["Aucune donnée disponible", "No data available"],
  ["Aucune donnée", "No data"],
  ["Aucun résultat", "No results"],
  ["Aucune connexion", "No connection"],
  ["Non défini", "Not defined"],
  ["Non définie", "Not defined"],
  ["Dernière synchronisation", "Last sync"],
  ["Synchronisation", "Synchronization"],
  ["Synchroniser", "Sync"],
  ["Actualiser", "Refresh"],
  ["Télécharger", "Download"],
  ["Exporter", "Export"],
  ["Importer", "Import"],
  ["Confirmer", "Confirm"],
  ["Avertissement", "Warning"],
  ["Indisponible", "Unavailable"],
  ["Disponible", "Available"],
  ["En ligne", "Online"],
  ["Hors ligne", "Offline"],
  ["Tableau de bord", "Dashboard"],
  ["Vue d'ensemble", "Overview"],
  ["Vue d’ensemble", "Overview"],
  ["Score de santé", "Health score"],
  ["Dernier statut", "Last status"],
  ["Dernière exécution", "Last run"],
  ["Prochaine exécution", "Next run"],
  ["Aucune instance", "No instance"],
  ["Aucun job", "No job"],
  ["Aucun serveur", "No server"],
  ["Aucun stockage", "No storage"],
  ["Aucun switch", "No switch"],
  ["Aucune borne", "No access point"],
  ["Aucun firewall", "No firewall"],
  ["Aucun antivirus", "No antivirus"],
  ["Aucun antispam", "No antispam"],
  ["Aucune sauvegarde", "No backup"],
  ["Aucun domaine", "No domain"],
  ["Clients connectés", "Connected clients"],
  ["Adresse IP", "IP address"],
  ["Perte de paquets", "Packet loss"],
  ["Temps de réponse", "Response time"],
  ["Bande passante", "Bandwidth"],
  ["Espace libre", "Free space"],
  ["Espace utilisé", "Used space"],
  ["Boîtes mail", "Mailboxes"],
  ["Boîte mail", "Mailbox"],
  ["Expire le", "Expires on"],
  ["expire le", "expires on"],
  ["Enregistré chez", "Registered with"],
  ["Coffre-fort", "Vault"],
  ["coffre-fort", "vault"],
  ["Sauvegarder dans le coffre", "Save to vault"],
  ["RAPPORT D'", "REPORT "],
  ["RAPPORT DE ", "REPORT "],
  ["RAPPORT ", "REPORT "],
  ["lang=\"fr\"", "lang=\"en\""],
  ["'fr-FR'", "'en-US'"],
  ['"fr-FR"', '"en-US"'],
  // Quoted UI labels that must match sectionMap
  ["'Serveurs'", "'Servers'"],
  ['"Serveurs"', '"Servers"'],
  ["'Stockage'", "'Storage'"],
  ['"Stockage"', '"Storage"'],
  ["'Pare-feu'", "'Firewalls'"],
  ['"Pare-feu"', '"Firewalls"'],
  ["'Switchs'", "'Switches'"],
  ['"Switchs"', '"Switches"'],
  ["'Bornes WiFi'", "'WiFi Access Points'"],
  ['"Bornes WiFi"', '"WiFi Access Points"'],
  ["'Sauvegarde'", "'Backup'"],
  ['"Sauvegarde"', '"Backup"'],
  ["'Noms de domaine'", "'Domain Names'"],
  ['"Noms de domaine"', '"Domain Names"'],
  ["'Résumé'", "'Summary'"],
  ['"Résumé"', '"Summary"'],
  ["'Switch'", "'Switches'"],
  ['"Switch"', '"Switches"'],
  ["'Wi‑Fi'", "'WiFi Access Points'"],
  ['"Wi‑Fi"', '"WiFi Access Points"'],
  ["'Wi-Fi'", "'WiFi Access Points'"],
  ['"Wi-Fi"', '"WiFi Access Points"'],
  // months
  ["janvier", "January"],
  ["février", "February"],
  ["mars", "March"],
  ["avril", "April"],
  ["mai", "May"],
  ["juin", "June"],
  ["juillet", "July"],
  ["août", "August"],
  ["septembre", "September"],
  ["octobre", "October"],
  ["novembre", "November"],
  ["décembre", "December"],
  ["Janvier", "January"],
  ["Février", "February"],
  ["Mars", "March"],
  ["Avril", "April"],
  ["Mai", "May"],
  ["Juin", "June"],
  ["Juillet", "July"],
  ["Août", "August"],
  ["Septembre", "September"],
  ["Octobre", "October"],
  ["Novembre", "November"],
  ["Décembre", "December"],
];

PAIRS.sort((a, b) => b[0].length - a[0].length);

function walk(d) {
  let r = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) r = r.concat(walk(p));
    else if (/\.(js|jsx)$/.test(e.name)) r.push(p);
  }
  return r;
}

function translateFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  const original = src;
  for (const [fr, en] of PAIRS) {
    if (src.includes(fr)) src = src.split(fr).join(en);
  }
  // Restore API/DB keys that must stay French
  src = src.replace(/key:\s*['"]Servers['"]/g, "key: 'Serveurs'");
  src = src.replace(/key:\s*['"]Backup['"]/g, "key: 'Sauvegarde'");
  src = src.replace(/equipements\?\.Servers\b/g, 'equipements?.Serveurs');
  src = src.replace(/equipements\.Servers\b/g, 'equipements.Serveurs');
  src = src.replace(/equipements\?\.Backup\b/g, 'equipements?.Sauvegarde');
  src = src.replace(/equipements\.Backup\b/g, 'equipements.Sauvegarde');
  src = src.replace(/\.Backup\b(?=\s*[,;\)\|\?\.])/g, (m, offset, str) => {
    // Only restore if looks like equipements path - already handled above
    return m;
  });
  // Restore family route keys
  src = src.replace(/family:\s*['"]Servers['"]/g, "family: 'servers'");
  // ZIP date pattern regex in exportMonitoringUtils - restore FR match pattern for old data
  // Keep matching both FROM/TO and DU/AU
  if (filePath.includes('exportMonitoringUtils')) {
    src = src.replace(
      /reportPeriod\.match\(\/FROM\\s\+\(\\d\{2\}-\\d\{2\}-\\d\{2,4\}\)\\s\+TO\\s\+\(\\d\{2\}-\\d\{2\}-\\d\{2,4\}\)\/i\)/,
      "reportPeriod.match(/DU\\s+(\\d{2}-\\d{2}-\\d{2,4})\\s+AU\\s+(\\d{2}-\\d{2}-\\d{2,4})|FROM\\s+(\\d{2}-\\d{2}-\\d{2,4})\\s+TO\\s+(\\d{2}-\\d{2}-\\d{2,4})/i)"
    );
  }

  if (src !== original) {
    fs.writeFileSync(filePath, src, 'utf8');
    return true;
  }
  return false;
}

const files = walk(ROOT);
let modified = 0;
const modifiedFiles = [];
for (const f of files) {
  if (translateFile(f)) {
    modified++;
    modifiedFiles.push(f);
  }
}
console.log('Modified', modified, 'files');
for (const f of modifiedFiles) console.log(f);
