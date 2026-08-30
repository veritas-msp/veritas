import { getEquipmentColumnLabel } from "./equipmentPageI18n";
import { getSharedEquipmentFieldLabel } from "./sharedEquipmentFields";

/** Columns that are UI-only and never belong in a CSV export. */
export const CSV_EXPORT_EXCLUDED_KEYS = new Set(["brandIcon", "mapping", "checkmkMapping"]);

const BILLING_KEYS = ["purchaseDate", "invoiceNumber", "installDate", "expirationGarantie"];

const COMMON_IDENTITY = ["name", "location", "manufacturer", "model", "serial"];
const COMMON_NETWORK = ["ip", "vlan", "mac"];
const COMMON_NOTES = ["commentaire"];

const EXPORT_KEYS_BY_TYPE = {
  Servers: [
    ...COMMON_IDENTITY,
    "typeServer",
    "role",
    "systeme",
    "processeur",
    "memoire",
    "stockage",
    "firmware",
    "remoteAccessSolution",
    "remoteAccessId",
    "modeHA",
    "roleHA",
    "serverHAName",
    "hypervisor",
    "hostServerName",
    ...COMMON_NETWORK,
    ...BILLING_KEYS,
    "monitoring",
    ...COMMON_NOTES
  ],
  Firewalls: [
    ...COMMON_IDENTITY,
    "firewallType",
    "firmware",
    "maintenanceLicense",
    "licenceMaintenance",
    "stormshieldWanUrl",
    "modeHA",
    "roleHA",
    "firewallHAName",
    ...COMMON_NETWORK,
    ...BILLING_KEYS,
    "monitoring",
    ...COMMON_NOTES
  ],
  Storage: [
    ...COMMON_IDENTITY,
    "storageType",
    "raid",
    "capacite",
    "nbDisquesActuels",
    "nbDisquesMax",
    "quickConnect",
    "modeHA",
    "roleHA",
    "storageHAName",
    ...COMMON_NETWORK,
    ...BILLING_KEYS,
    "monitoring",
    ...COMMON_NOTES
  ],
  Ordinateurs: [
    "name",
    "computerType",
    "location",
    "manufacturer",
    "model",
    "serial",
    "systeme",
    "domaine",
    "processeur",
    "memoire",
    "agentStatus",
    ...COMMON_NETWORK,
    ...BILLING_KEYS,
    ...COMMON_NOTES
  ],
  Switch: [
    ...COMMON_IDENTITY,
    "firmware",
    "manageable",
    "poeSupport",
    "empilage",
    "adminUrl",
    ...COMMON_NETWORK,
    ...BILLING_KEYS,
    "monitoring",
    ...COMMON_NOTES
  ],
  BorneWifi: [
    ...COMMON_IDENTITY,
    "firmware",
    "alimentationPoE",
    "assignedSsids",
    "ssidCount",
    ...COMMON_NETWORK,
    "purchaseDate",
    "invoiceNumber",
    "installDate",
    "monitoring",
    ...COMMON_NOTES
  ],
  Routeur: [
    ...COMMON_IDENTITY,
    "routeurType",
    "firmware",
    "adminUrl",
    ...COMMON_NETWORK,
    ...BILLING_KEYS,
    "monitoring",
    ...COMMON_NOTES
  ],
  Alimentation: [
    ...COMMON_IDENTITY,
    "alimentationType",
    "capaciteVA",
    "capaciteW",
    "nbPrises",
    "dateBatterie",
    "powerRating",
    "manageable",
    "adminUrl",
    ...COMMON_NETWORK,
    ...BILLING_KEYS,
    "monitoring",
    ...COMMON_NOTES
  ],
  TOIP: [
    ...COMMON_IDENTITY,
    "toipType",
    "firmware",
    "nombreExtensions",
    "domaineSip",
    "manageable",
    "adminUrl",
    ...COMMON_NETWORK,
    ...BILLING_KEYS,
    "monitoring",
    ...COMMON_NOTES
  ],
  Internet: [
    "name",
    "location",
    "internetType",
    "fournisseur",
    "categorie",
    "debit",
    "debitDownload",
    "debitUpload",
    "numeroLigne",
    "referenceContrat",
    "supportTelephone",
    "dateMiseEnService",
    "boxModele",
    "ip",
    "ha",
    ...BILLING_KEYS,
    ...COMMON_NOTES
  ],
  Backup: ["name", "server", "version", "logiciel", "jobsCount", "mappedJobsCount", ...COMMON_NOTES],
  "Security camera": [
    ...COMMON_IDENTITY,
    "firmware",
    ...COMMON_NETWORK,
    ...BILLING_KEYS,
    "monitoring",
    ...COMMON_NOTES
  ]
};

const FIELD_LABEL_FALLBACKS = {
  fr: {
    purchaseDate: "Date d'achat",
    invoiceNumber: "Numéro de facture",
    installDate: "Date d'installation",
    commentaire: "Notes",
    typeServer: "Type de serveur",
    firewallType: "Type de firewall",
    storageType: "Type de stockage",
    routeurType: "Type de routeur",
    toipType: "Type TOIP",
    alimentationType: "Type d'alimentation",
    remoteAccessSolution: "Prise en main",
    remoteAccessId: "ID prise en main",
    modeHA: "Mode HA",
    roleHA: "Rôle HA",
    serverHAName: "Pair HA serveur",
    firewallHAName: "Pair HA firewall",
    storageHAName: "Pair HA stockage",
    hypervisor: "Hyperviseur",
    hostServerName: "Serveur hôte",
    stormshieldWanUrl: "URL Stormshield WAN",
    licenceMaintenance: "Licence maintenance",
    adminUrl: "URL d'administration",
    manageable: "Manageable",
    poeSupport: "PoE",
    empilage: "Empilage",
    alimentationPoE: "Alimentation PoE",
    assignedSsids: "SSID assignés",
    quickConnect: "QuickConnect",
    capaciteVA: "Capacité VA",
    capaciteW: "Puissance W",
    nbPrises: "Nombre de prises",
    dateBatterie: "Date batterie",
    nombreExtensions: "Extensions",
    domaineSip: "Domaine SIP",
    debitDownload: "Débit download",
    debitUpload: "Débit upload",
    numeroLigne: "Numéro de ligne",
    referenceContrat: "Référence contrat",
    supportTelephone: "Support téléphone",
    dateMiseEnService: "Mise en service",
    boxModele: "Modèle box",
    monitoring: "MK",
    agentStatus: "Agent RMM",
    activeStatus: "Actif",
    maintenanceLicense: "Date licence maintenance"
  },
  en: {
    purchaseDate: "Purchase date",
    invoiceNumber: "Invoice number",
    installDate: "Installation date",
    commentaire: "Notes",
    typeServer: "Server type",
    firewallType: "Firewall type",
    storageType: "Storage type",
    routeurType: "Router type",
    toipType: "TOIP type",
    alimentationType: "Power type",
    remoteAccessSolution: "Remote access",
    remoteAccessId: "Remote access ID",
    modeHA: "HA mode",
    roleHA: "HA role",
    serverHAName: "HA server peer",
    firewallHAName: "HA firewall peer",
    storageHAName: "HA storage peer",
    hypervisor: "Hypervisor",
    hostServerName: "Host server",
    stormshieldWanUrl: "Stormshield WAN URL",
    licenceMaintenance: "Maintenance license",
    adminUrl: "Admin URL",
    manageable: "Manageable",
    poeSupport: "PoE",
    empilage: "Stacking",
    alimentationPoE: "PoE power",
    assignedSsids: "Assigned SSIDs",
    quickConnect: "QuickConnect",
    capaciteVA: "VA capacity",
    capaciteW: "Power W",
    nbPrises: "Outlet count",
    dateBatterie: "Battery date",
    nombreExtensions: "Extensions",
    domaineSip: "SIP domain",
    debitDownload: "Download speed",
    debitUpload: "Upload speed",
    numeroLigne: "Line number",
    referenceContrat: "Contract reference",
    supportTelephone: "Support phone",
    dateMiseEnService: "Service start",
    boxModele: "Box model",
    monitoring: "MK",
    agentStatus: "RMM agent",
    activeStatus: "Active",
    maintenanceLicense: "Maintenance license date"
  }
};

const FIELD_GROUPS = [
  {
    id: "identity",
    keys: new Set([
      "name",
      "location",
      "clientName",
      "computerType",
      "typeServer",
      "firewallType",
      "storageType",
      "routeurType",
      "toipType",
      "alimentationType",
      "manufacturer",
      "model",
      "serial",
      "role"
    ])
  },
  {
    id: "billing",
    keys: new Set(BILLING_KEYS)
  },
  {
    id: "technical",
    keys: new Set([
      "systeme",
      "domaine",
      "processeur",
      "memoire",
      "stockage",
      "firmware",
      "version",
      "raid",
      "capacite",
      "nbDisques",
      "nbDisquesActuels",
      "nbDisquesMax",
      "disksUsage",
      "powerRating",
      "capaciteVA",
      "capaciteW",
      "nbPrises",
      "dateBatterie",
      "nombreExtensions",
      "domaineSip",
      "hypervisor",
      "hostServerName",
      "quickConnect",
      "remoteAccessSolution",
      "remoteAccessId",
      "modeHA",
      "roleHA",
      "serverHAName",
      "firewallHAName",
      "storageHAName",
      "licenceMaintenance",
      "maintenanceLicense",
      "manageable",
      "poeSupport",
      "empilage",
      "alimentationPoE",
      "assignedSsids",
      "ssidCount",
      "internetType",
      "fournisseur",
      "categorie",
      "debit",
      "debitDownload",
      "debitUpload",
      "numeroLigne",
      "referenceContrat",
      "supportTelephone",
      "dateMiseEnService",
      "boxModele",
      "server",
      "logiciel",
      "jobsCount",
      "mappedJobsCount",
      "ha"
    ])
  },
  {
    id: "network",
    keys: new Set(["ip", "vlan", "mac", "adresseMac", "gateway", "adminUrl", "stormshieldWanUrl"])
  },
  {
    id: "status",
    keys: new Set(["monitoring", "agentStatus", "activeStatus"])
  },
  {
    id: "notes",
    keys: new Set(["commentaire"])
  }
];

function uniqueKeys(keys) {
  const seen = new Set();
  return keys.filter(key => {
    if (!key || CSV_EXPORT_EXCLUDED_KEYS.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getCustomFieldKeys(customFields = []) {
  return (Array.isArray(customFields) ? customFields : [])
    .map(field => field?.fieldKey || field?.key)
    .filter(Boolean);
}

function getCustomFieldLabel(customFields, key, locale) {
  const lang = String(locale || "fr").toLowerCase().startsWith("en") ? "en" : "fr";
  const field = (Array.isArray(customFields) ? customFields : []).find(
    entry => (entry?.fieldKey || entry?.key) === key
  );
  if (!field) return null;
  if (typeof field.label === "string" && field.label.trim()) return field.label;
  if (field.labels && typeof field.labels === "object") {
    return field.labels[lang] || field.labels.fr || field.labels.en || null;
  }
  return null;
}

export function getCsvExportKeysForType(type, customFields = []) {
  const normalized = String(type || "");
  if (normalized.startsWith("Custom:")) {
    return uniqueKeys(["name", "location", ...getCustomFieldKeys(customFields), ...BILLING_KEYS, ...COMMON_NOTES]);
  }
  return uniqueKeys([
    ...(EXPORT_KEYS_BY_TYPE[normalized] || EXPORT_KEYS_BY_TYPE.Servers),
    ...getCustomFieldKeys(customFields)
  ]);
}

export function getCsvExportFieldLabel(locale, type, key, customFields = []) {
  const lang = String(locale || "fr").toLowerCase().startsWith("en") ? "en" : "fr";
  const customLabel = getCustomFieldLabel(customFields, key, locale);
  if (customLabel) return customLabel;
  const shared = getSharedEquipmentFieldLabel(key, lang);
  if (shared && shared !== key) return shared;
  const columnLabel = getEquipmentColumnLabel(locale, type, key);
  if (columnLabel && columnLabel !== key) return columnLabel;
  return FIELD_LABEL_FALLBACKS[lang]?.[key] || FIELD_LABEL_FALLBACKS.fr[key] || key;
}

export function buildCsvExportFieldOptions(locale, type, customFields = []) {
  return getCsvExportKeysForType(type, customFields).map(key => ({
    key,
    label: getCsvExportFieldLabel(locale, type, key, customFields),
    group: FIELD_GROUPS.find(group => group.keys.has(key))?.id || (getCustomFieldKeys(customFields).includes(key) ? "technical" : "technical")
  }));
}

export function getDefaultCsvExportKeys(type, visibleColumnKeys = [], customFields = []) {
  const available = new Set(getCsvExportKeysForType(type, customFields));
  const fromVisible = uniqueKeys(visibleColumnKeys).filter(key => available.has(key));
  if (fromVisible.length > 0) return fromVisible;
  return getCsvExportKeysForType(type, customFields).slice(0, 8);
}

export function getCsvExportGroupOrder() {
  return FIELD_GROUPS.map(group => group.id);
}
