/**
 * Bulk FR->EN for hardcoded UI strings in src/components (excl. AdminPage) + src/styles.
 * - *I18n* / *Translations* / locale *.fr.js: only translate values under en: / en =
 * - Other .js/.jsx: phrase dictionary (longer first), with API key restorations
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, '_bulk-translate-out.txt');
const COMP_ROOT = path.join(ROOT, 'src', 'components');
const STYLES_ROOT = path.join(ROOT, 'src', 'styles');

const PAIRS = [
  ["Veuillez remplir les champs requis", "Please fill in the required fields"],
  ["Veuillez synchroniser les données", "Please sync the data"],
  ["Veuillez sélectionner", "Please select"],
  ["Veuillez entrer", "Please enter"],
  ["Veuillez renseigner", "Please fill in"],
  ["Veuillez patienter", "Please wait"],
  ["Veuillez confirmer", "Please confirm"],
  ["Configuration non disponible", "Configuration not available"],
  ["Aucun rapport n'a pu être généré", "No report could be generated"],
  ["Graphique non disponible dans l'export", "Chart not available in export"],
  ["Graphique en cours de chargement", "Chart loading"],
  ["Erreur lors de la conversion de l'image", "Error converting image"],
  ["Erreur lors de la conversion du graphique", "Error converting chart"],
  ["Erreur lors de la conversion SVG", "Error converting SVG"],
  ["Erreur conversion image en base64", "Error converting image to base64"],
  ["Erreur lors de la génération du ZIP", "Error generating ZIP"],
  ["Erreur lors de l'export ZIP", "Error exporting ZIP"],
  ["Erreur lors de l'enregistrement", "Error while saving"],
  ["Erreur lors de la suppression", "Error while deleting"],
  ["Erreur lors du chargement", "Error while loading"],
  ["Erreur lors de la synchronisation", "Error while syncing"],
  ["Erreur lors de l'import", "Error while importing"],
  ["Erreur lors de l'export", "Error while exporting"],
  ["Téléchargement du ZIP", "Downloading ZIP"],
  ["Téléchargement déclenché", "Download started"],
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
  ["Aucune donnée de sécurité disponible", "No security data available"],
  ["Aucune donnée disponible", "No data available"],
  ["Aucune donnée", "No data"],
  ["Aucun résultat trouvé", "No results found"],
  ["Aucun résultat", "No results"],
  ["Aucune connexion", "No connection"],
  ["Aucune instance de sauvegarde configurée pour ce client.", "No backup instance configured for this client."],
  ["Aucun serveur configuré pour ce client.", "No server configured for this client."],
  ["Aucun serveur ne correspond aux filtres sélectionnés.", "No server matches the selected filters."],
  ["Aucun stockage configuré pour ce client.", "No storage configured for this client."],
  ["Aucun stockage ne correspond aux filtres sélectionnés.", "No storage matches the selected filters."],
  ["Aucun switch configuré pour ce client.", "No switch configured for this client."],
  ["Aucun switch ne correspond aux filtres sélectionnés.", "No switch matches the selected filters."],
  ["Aucune borne WiFi configurée pour ce client.", "No WiFi access point configured for this client."],
  ["Aucune borne WiFi ne correspond aux filtres sélectionnés.", "No WiFi access point matches the selected filters."],
  ["Aucun antispam configuré pour ce client.", "No antispam configured for this client."],
  ["Aucun antivirus configuré pour ce client.", "No antivirus configured for this client."],
  ["Aucun utilisateur ne correspond aux critères de recherche.", "No user matches the search criteria."],
  ["Aucun utilisateur disponible", "No user available"],
  ["Aucun utilisateur importé", "No user imported"],
  ["Aucune statistique importée", "No statistics imported"],
  ["Aucune règle de filtrage importée", "No filtering rule imported"],
  ["Aucune règle NAT importée", "No NAT rule imported"],
  ["Aucun objet importé", "No object imported"],
  ["Aucun événement critique", "No critical event"],
  ["Aucune licence configurée", "No license configured"],
  ["Aucune cassette configurée", "No cartridge configured"],
  ["Aucun LUN configuré", "No LUN configured"],
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
  ["Aucun équipement", "No equipment"],
  ["Aucun client", "No client"],
  ["Aucun contact", "No contact"],
  ["Aucun ticket", "No ticket"],
  ["Aucun fichier", "No file"],
  ["Aucun document", "No document"],
  ["Aucun élément sélectionné", "No item selected"],
  ["Aucun élément", "No item"],
  ["Aucune alerte", "No alert"],
  ["Aucune notification", "No notification"],
  ["Êtes-vous sûr de vouloir supprimer", "Are you sure you want to delete"],
  ["Êtes-vous sûr", "Are you sure"],
  ["Cette action est irréversible", "This action is irreversible"],
  ["Opération réussie", "Operation successful"],
  ["Enregistrement réussi", "Saved successfully"],
  ["Suppression réussie", "Deleted successfully"],
  ["Modification réussie", "Updated successfully"],
  ["Chargement en cours", "Loading"],
  ["Enregistrement...", "Saving..."],
  ["Enregistrement…", "Saving…"],
  ["Chargement...", "Loading..."],
  ["Chargement…", "Loading…"],
  ["Dernière synchronisation", "Last sync"],
  ["Dernière exécution", "Last run"],
  ["Prochaine exécution", "Next run"],
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
  ["Sauvegarder dans le coffre", "Save to vault"],
  ["Coffre-fort", "Vault"],
  ["coffre-fort", "vault"],
  ["Tableau de bord", "Dashboard"],
  ["Vue d'ensemble", "Overview"],
  ["Score de santé", "Health score"],
  ["Dernier statut", "Last status"],
  ["Non défini", "Not defined"],
  ["Non définie", "Not defined"],
  ["Non renseigné", "Not specified"],
  ["Non renseignée", "Not specified"],
  ["Non disponible", "Unavailable"],
  ["Indisponible", "Unavailable"],
  ["Disponible", "Available"],
  ["En ligne", "Online"],
  ["Hors ligne", "Offline"],
  ["En cours", "In progress"],
  ["Terminé", "Completed"],
  ["Terminée", "Completed"],
  ["Échoué", "Failed"],
  ["Échouée", "Failed"],
  ["Règles de filtrage", "Filtering rules"],
  ["Règles de pare-feu", "Firewall rules"],
  ["Noms de domaine", "Domain Names"],
  ["Bornes WiFi", "WiFi Access Points"],
  ["Services Managés", "Managed Services"],
  ["SERVICES MANAGÉS", "MANAGED SERVICES"],
  ["Cybersécurité", "Cybersecurity"],
  ["CYBERSÉCURITÉ", "CYBERSECURITY"],
  ["RAPPORTS MONITORING", "MONITORING REPORTS"],
  ["VOS CONNEXIONS INTERNET", "YOUR INTERNET CONNECTIONS"],
  ["VOS SERVEURS", "YOUR SERVERS"],
  ["VOS STOCKAGES", "YOUR STORAGE"],
  ["VOS FIREWALLS", "YOUR FIREWALLS"],
  ["VOS SWITCHS", "YOUR SWITCHES"],
  ["VOS BORNES WIFI", "YOUR WIFI ACCESS POINTS"],
  ["Utilisateurs bloqués", "Blocked users"],
  ["Utilisateurs licenciés", "Licensed users"],
  ["Utilisateurs protégés", "Protected users"],
  ["Jobs en succès", "Successful jobs"],
  ["Jobs en échec", "Failed jobs"],
  ["Taux de réussite", "Success rate"],
  ["Taux d'échec", "Failure rate"],
  ["Statistiques des 30 derniers jours", "Statistics for the last 30 days"],
  ["sur la période observée", "over the observed period"],
  ["sur la période du rapport", "over the report period"],
  ["sur la période", "over the period"],
  ["Rétention:", "Retention:"],
  ["Régularité:", "Schedule:"],
  ["Importez le fichier", "Import the file"],
  ["Sélectionner un fichier", "Select a file"],
  ["Glissez-déposez", "Drag and drop"],
  ["ou cliquez pour parcourir", "or click to browse"],
  ["Champs obligatoires", "Required fields"],
  ["Champ obligatoire", "Required field"],
  ["Informations générales", "General information"],
  ["Paramètres généraux", "General settings"],
  ["Paramètres", "Settings"],
  ["Mot de passe oublié", "Forgot password"],
  ["Réinitialiser le mot de passe", "Reset password"],
  ["Changer le mot de passe", "Change password"],
  ["Mot de passe", "Password"],
  ["Nom d'utilisateur", "Username"],
  ["Adresse e-mail", "Email address"],
  ["Adresse email", "Email address"],
  ["Téléphone", "Phone"],
  ["Pièces jointes", "Attachments"],
  ["Pièce jointe", "Attachment"],
  ["Priorité", "Priority"],
  ["Catégorie", "Category"],
  ["Date de création", "Created date"],
  ["Date de modification", "Modified date"],
  ["Créé le", "Created on"],
  ["Modifié le", "Modified on"],
  ["Mis à jour", "Updated"],
  ["Tout sélectionner", "Select all"],
  ["Tout désélectionner", "Deselect all"],
  ["Éléments sélectionnés", "Selected items"],
  ["Réinitialiser les filtres", "Reset filters"],
  ["Appliquer les filtres", "Apply filters"],
  ["Afficher plus", "Show more"],
  ["Afficher moins", "Show less"],
  ["Voir plus", "See more"],
  ["Voir détails", "View details"],
  ["Télécharger le rapport", "Download report"],
  ["Générer le rapport", "Generate report"],
  ["Période du rapport", "Report period"],
  ["Période", "Period"],
  ["Aujourd'hui", "Today"],
  ["Hier", "Yesterday"],
  ["Cette semaine", "This week"],
  ["Ce mois", "This month"],
  ["Personnalisé", "Custom"],
  ["Personnalisée", "Custom"],
  ["Par défaut", "Default"],
  ["Activer", "Enable"],
  ["Désactiver", "Disable"],
  ["Activé", "Enabled"],
  ["Désactivé", "Disabled"],
  ["Activée", "Enabled"],
  ["Désactivée", "Disabled"],
  ["janvier", "January"],
  ["février", "February"],
  ["août", "August"],
  ["septembre", "September"],
  ["octobre", "October"],
  ["novembre", "November"],
  ["décembre", "December"],
  ["Janvier", "January"],
  ["Février", "February"],
  ["Août", "August"],
  ["Septembre", "September"],
  ["Octobre", "October"],
  ["Novembre", "November"],
  ["Décembre", "December"],
  ["Réinitialiser", "Reset"],
  ["Précédent", "Previous"],
  ["Suivant", "Next"],
  ["Terminer", "Finish"],
  ["Annuler", "Cancel"],
  ["Enregistrer", "Save"],
  ["Supprimer", "Delete"],
  ["Modifier", "Edit"],
  ["Ajouter", "Add"],
  ["Créer", "Create"],
  ["Fermer", "Close"],
  ["Retour", "Back"],
  ["Rechercher", "Search"],
  ["Confirmer", "Confirm"],
  ["Valider", "Validate"],
  ["Appliquer", "Apply"],
  ["Actualiser", "Refresh"],
  ["Synchroniser", "Sync"],
  ["Synchronisation", "Synchronization"],
  ["Exporter", "Export"],
  ["Importer", "Import"],
  ["Configurer", "Configure"],
  ["Configuration", "Configuration"],
  ["Avertissement", "Warning"],
  ["Attention", "Warning"],
  ["Succès", "Success"],
  ["Échec de", "Failed to"],
  ["Échec", "Failure"],
  ["Erreur", "Error"],
  ["Informations", "Information"],
  ["Détails", "Details"],
  ["Historique", "History"],
  ["Utilisateurs", "Users"],
  ["Utilisateur", "User"],
  ["Licences", "Licenses"],
  ["Licence", "License"],
  ["Sécurité", "Security"],
  ["Disponibilité", "Availability"],
  ["Pare-feu", "Firewalls"],
  ["Stockage", "Storage"],
  ["Équipements", "Equipment"],
  ["Équipement", "Equipment"],
  ["Événements", "Events"],
  ["Événement", "Event"],
  ["Résumé", "Summary"],
  ["Accueil", "Home"],
  ["Entreprises", "Companies"],
  ["Entreprise", "Company"],
  ["Commentaires", "Comments"],
  ["Commentaire", "Comment"],
  ["Documents", "Documents"],
  ["Document", "Document"],
  ["Fichiers", "Files"],
  ["Fichier", "File"],
  ["Dossiers", "Folders"],
  ["Dossier", "Folder"],
  ["Critiques", "Critical"],
  ["Critique", "Critical"],
  ["Copier", "Copy"],
  ["Coller", "Paste"],
  ["Déplacer", "Move"],
  ["Renommer", "Rename"],
  ["Affectation", "Assignment"],
  ["Assigné à", "Assigned to"],
  ["Non assigné", "Unassigned"],
  ["Observabilité", "Observability"],
  ["Supervision", "Monitoring"],
  ["Rapports", "Reports"],
  ["Rapport", "Report"],
  ["Graphiques", "Charts"],
  ["Graphique", "Chart"],
  ["données", "data"],
  ["Données", "Data"],
  ["inconnu", "unknown"],
  ["Inconnu", "Unknown"],
  ["inconnue", "unknown"],
  ["Inconnue", "Unknown"],
  ["depuis", "since"],
  ["Depuis", "Since"],
  ["jusqu'à", "until"],
  ["Jusqu'à", "Until"],
  ["Impossible de", "Unable to"],
  ["Impossible", "Unable"],
  ["Réussi", "Successful"],
  ["Réussie", "Successful"],
  ["En attente", "Pending"],
  ["Brouillon", "Draft"],
  ["Publié", "Published"],
  ["Archivé", "Archived"],
  ["Actif", "Active"],
  ["Inactive", "Inactive"],
  ["Inactif", "Inactive"],
  ["Obligatoire", "Required"],
  ["Facultatif", "Optional"],
  ["Optionnel", "Optional"],
  ["Recherche", "Search"],
  ["Filtres", "Filters"],
  ["Filtrer", "Filter"],
  ["Actions", "Actions"],
  ["Options", "Options"],
  ["Statut", "Status"],
  ["État", "Status"],
  ["Ouvrir", "Open"],
  ["Télécharger", "Download"],
  ["Sauvegarder", "Save"],
  ["Aucun", "None"],
  ["Aucune", "None"],
  ["Nouveau", "New"],
  ["Nouvelle", "New"],
  ["Libellé", "Label"],
  ["Notifications", "Notifications"],
  ["Notification", "Notification"],
  ["Alertes", "Alerts"],
  ["Alerte", "Alert"],
  ["Règles", "Rules"],
  ["Règle", "Rule"],
  ["Profils", "Profiles"],
  ["Profil", "Profile"],
  ["Équipes", "Teams"],
  ["Équipe", "Team"],
  ["Rôles", "Roles"],
  ["Rôle", "Role"],
  ["Permissions", "Permissions"],
  ["Permission", "Permission"],
  ["Connexion", "Login"],
  ["Déconnexion", "Logout"],
  ["Se connecter", "Sign in"],
  ["Se déconnecter", "Sign out"],
  ["Mon compte", "My account"],
  ["Compte", "Account"],
  ["Préférences", "Preferences"],
  ["Langue", "Language"],
  ["Français", "French"],
  ["Anglais", "English"],
  ["Confirmation", "Confirmation"],
  ["Annulation", "Cancellation"],
  ["Veuillez", "Please"],
  ["Merci", "Thank you"],
  ["'Serveurs'", "'Servers'"],
  ["\"Serveurs\"", "\"Servers\""],
  ["'Stockage'", "'Storage'"],
  ["\"Stockage\"", "\"Storage\""],
  ["'Pare-feu'", "'Firewalls'"],
  ["\"Pare-feu\"", "\"Firewalls\""],
  ["'Switchs'", "'Switches'"],
  ["\"Switchs\"", "\"Switches\""],
  ["'Bornes WiFi'", "'WiFi Access Points'"],
  ["\"Bornes WiFi\"", "\"WiFi Access Points\""],
  ["'Sauvegarde'", "'Backup'"],
  ["\"Sauvegarde\"", "\"Backup\""],
  ["'Noms de domaine'", "'Domain Names'"],
  ["\"Noms de domaine\"", "\"Domain Names\""],
  ["'Résumé'", "'Summary'"],
  ["\"Résumé\"", "\"Summary\""],
  ["'Cybersécurité'", "'Cybersecurity'"],
  ["\"Cybersécurité\"", "\"Cybersecurity\""],
  ["Sauvegarde", "Backup"],
  ["Serveurs", "Servers"],
  ["lang=\"fr\"", "lang=\"en\""],
  ["'fr-FR'", "'en-US'"],
  ["\"fr-FR\"", "\"en-US\""],
  ["RAPPORT D'", "REPORT"],
  ["RAPPORT DE ", "REPORT"],
  ["RAPPORT ", "REPORT"]
];

PAIRS.sort((a, b) => b[0].length - a[0].length);

const I18N_FILE = /(I18n|Translations|i18n)/i;
const LOCALE_FR = /\.fr\.js$/i;

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'AdminPage') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function isI18nFile(filePath) {
  const base = path.basename(filePath);
  return I18N_FILE.test(base) || LOCALE_FR.test(base);
}

function translateEnBranches(src) {
  const re = /\ben\s*[:=]\s*\{/g;
  const matches = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    matches.push(m.index + m[0].length - 1);
  }
  if (matches.length === 0) {
    return src.replace(/^(\s*en\s*:\s*)(['"`])([\s\S]*?)\2/gm, (full, pre, q, body) => {
      let t = body;
      for (const [fr, en] of PAIRS) {
        if (t.includes(fr)) t = t.split(fr).join(en);
      }
      return pre + q + t + q;
    });
  }
  let out = '';
  let last = 0;
  for (const start of matches) {
    out += src.slice(last, start);
    let depth = 0;
    let j = start;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === '"' || c === "'" || c === '`') {
        const q = c;
        j++;
        while (j < src.length) {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === q) break;
          j++;
        }
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) { j++; break; }
      }
    }
    let block = src.slice(start, j);
    for (const [fr, en] of PAIRS) {
      if (block.includes(fr)) block = block.split(fr).join(en);
    }
    out += block;
    last = j;
  }
  out += src.slice(last);
  return out;
}

function applyDictionary(src) {
  let s = src;
  for (const [fr, en] of PAIRS) {
    if (s.includes(fr)) s = s.split(fr).join(en);
  }
  return s;
}

function restoreProtected(src, filePath) {
  let s = src;
  s = s.replace(/key:\s*['"]Servers['"]/g, "key: 'Serveurs'");
  s = s.replace(/key:\s*['"]Backup['"]/g, "key: 'Sauvegarde'");
  s = s.replace(/key:\s*['"]WiFi Access Points['"]/g, "key: 'BorneWifi'");
  s = s.replace(/key:\s*['"]Wifi Access Points['"]/g, "key: 'BorneWifi'");
  s = s.replace(/equipements\?\.Servers\b/g, 'equipements?.Serveurs');
  s = s.replace(/equipements\.Servers\b/g, 'equipements.Serveurs');
  s = s.replace(/equipements\?\.Backup\b/g, 'equipements?.Sauvegarde');
  s = s.replace(/equipements\.Backup\b/g, 'equipements.Sauvegarde');
  s = s.replace(/family:\s*['"]Servers['"]/g, "family: 'servers'");
  s = s.replace(/modules_monitoring\.Backup\b/g, 'modules_monitoring.Sauvegarde');
  s = s.replace(/modules_monitoring\?\.Backup\b/g, 'modules_monitoring?.Sauvegarde');
  s = s.replace(/modules_monitoring\.Servers\b/g, 'modules_monitoring.Serveurs');
  s = s.replace(/modules_monitoring\?\.Servers\b/g, 'modules_monitoring?.Serveurs');
  s = s.replace(/(infrastructureTypes\s*[:=]\s*\[[^\]]*)'Servers'/g, "$1'Serveurs'");
  s = s.replace(/(infrastructureTypes\s*[:=]\s*\[[^\]]*)"Servers"/g, '$1"Serveurs"');
  s = s.replace(/(infrastructureTypes\s*[:=]\s*\[[^\]]*)'Backup'/g, "$1'Sauvegarde'");
  s = s.replace(/(infrastructureTypes\s*[:=]\s*\[[^\]]*)"Backup"/g, '$1"Sauvegarde"');
  s = s.replace(/(infrastructureTypes\s*[:=]\s*\[[^\]]*)'WiFi Access Points'/g, "$1'BorneWifi'");
  s = s.replace(/(infrastructureTypes\s*[:=]\s*\[[^\]]*)"WiFi Access Points"/g, '$1"BorneWifi"');

  if (filePath.includes('exportMonitoringUtils')) {
    s = s.replace(/(['"])Serveurs\1\s*:/g, "'Servers':");
    s = s.replace(/(['"])Stockage\1\s*:/g, "'Storage':");
    s = s.replace(/(['"])Pare-feu\1\s*:/g, "'Firewalls':");
    s = s.replace(/(['"])Switchs\1\s*:/g, "'Switches':");
    s = s.replace(/(['"])Bornes WiFi\1\s*:/g, "'WiFi Access Points':");
    s = s.replace(/(['"])Sauvegarde\1\s*:/g, "'Backup':");
    s = s.replace(/(['"])Noms de domaine\1\s*:/g, "'Domain Names':");
    s = s.replace(/(['"])Office365\1\s*:/g, "'Office 365':");
  }
  return s;
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let src = original;
  if (isI18nFile(filePath)) {
    src = translateEnBranches(src);
  } else {
    src = applyDictionary(src);
    src = restoreProtected(src, filePath);
  }
  if (src !== original) {
    fs.writeFileSync(filePath, src, 'utf8');
    return true;
  }
  return false;
}

const files = [...walk(COMP_ROOT), ...walk(STYLES_ROOT)];
const modifiedFiles = [];
for (const f of files) {
  if (processFile(f)) modifiedFiles.push(f);
}

const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');
const lines = [
  'Modified file count: ' + modifiedFiles.length,
  '',
  ...modifiedFiles.map(rel).sort(),
  '',
];
fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log('Modified', modifiedFiles.length, 'files');
console.log('Wrote', OUT);
