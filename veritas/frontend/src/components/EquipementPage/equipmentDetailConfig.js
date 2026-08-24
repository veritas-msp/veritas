import { formatDateFr, getMaintenanceLicenseExpiration } from "./constants/firewallLicenceUtils";
import { buildInitialFormData, getEquipmentFormSections, getFirewallTypeLabel, normalizeFirewallType, getServerFormProfile, getServerTypeLabel, getComputerTypeLabel, getStorageFormProfile, inferComputerTypeFromInventory, isToipVoipSectionVisible, normalizeServerType, canonicalizeComputerType } from "./equipmentFormConfig";
import { getFormFields } from "./equipmentFormFieldsI18n";
import { getServerRemoteAccessSolutionDef } from "./constants/serverRemoteAccessUtils";
import { formatInternetDebitDisplay } from "./internetConnectionUtils";
import { formatRmmRam, getRmmChassisInfo, getRmmInventoryFromEquipment, getRmmNetbiosName, getRmmOsEditionInfo, isRmmManagedEquipment } from "./rmmMonitoringUtils";
import { repairOsLabel } from "./osIconUtils";
import { isSynologyBrand } from "./synologyEquipmentUtils";
import { getEquipmentDetailFieldLabel, getEquipmentDetailCopy, localizeEquipmentDetailSection } from "./equipmentDetailPageI18n";
import { formatAssignedSsidsDisplay, buildBorneWifiSsidFormState, normalizeWifiSsidCatalog } from "./wifiApSsidUtils";
import { shouldShowStorageDiskBays } from "./storageDiskUtils";
import { getSharedEquipmentFieldLabel } from "./sharedEquipmentFields";
import { parseCustomFamilyType } from "../../api/equipmentFamilies";
const EMPTY = "-";
function resolveModuleKey(equipment) {
  if (!equipment) return "Servers";
  if (parseCustomFamilyType(equipment.type)) return "Custom";
  if (equipment.type === "NAS" || equipment.type === "SAN") return "Storage";
  if (equipment.type === "Serveurs") return "Servers";
  return equipment.type || "Servers";
}
function isTruthy(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
function formatBool(value, {
  yes = "Yes",
  no = "No"
} = {}) {
  if (value === null || value === undefined || value === "") return null;
  return value ? yes : no;
}
function formatList(value, separator = ", ") {
  if (!value) return null;
  if (Array.isArray(value)) {
    const items = value.map(item => {
      if (typeof item === "string") return item;
      if (item?.nom) return item.nom;
      if (item?.name) return item.name;
      return null;
    }).filter(Boolean);
    return items.length ? items.join(separator) : null;
  }
  if (typeof value === "string") return value.trim() || null;
  return String(value);
}
function formatLuns(luns) {
  if (!Array.isArray(luns) || !luns.length) return null;
  return luns.map((lun, index) => {
    const name = lun?.nom || lun?.iqn || `LUN ${index + 1}`;
    const cap = lun?.capacite ? ` (${lun.capacite} Go)` : "";
    return `${name}${cap}`;
  }).join(", ");
}
function formatLicenses(licences) {
  if (!Array.isArray(licences) || !licences.length) return null;
  return licences.map((lic, index) => {
    const label = lic?.nom || `License ${index + 1}`;
    const exp = lic?.expiration ? ` · ${formatDateFr(lic.expiration)}` : "";
    return `${label}${exp}`;
  }).join(", ");
}
function formatOtherLicenses(licences) {
  if (!Array.isArray(licences) || !licences.length) return null;
  const filtered = licences.filter(lic => {
    const nom = String(lic?.nom || "").toLowerCase();
    const type = String(lic?.type || "").toLowerCase();
    return !nom.includes("maintenance") && !type.includes("maintenance");
  });
  return formatList(filtered.map(lic => lic.nom || lic.name));
}
const FIELD_FORMATTERS = {
  name: f => f.name,
  clientName: (_f, equipment) => equipment?.clientName || null,
  netbios: (f, equipment) => f.netbios || getRmmNetbiosName(equipment) || null,
  location: f => f.location,
  ip: (f, eq) => {
    if (eq?.type === "Internet" && f.ipNonFixe) return "Non-fixed IP";
    return f.ip;
  },
  vlan: f => f.vlan,
  internetType: f => f.internetType,
  fournisseur: f => f.fournisseur,
  purchaseDate: f => formatDateFr(f.purchaseDate) || f.purchaseDate,
  invoiceNumber: f => f.invoiceNumber,
  installDate: f => formatDateFr(f.installDate) || f.installDate,
  debit: f => f.debit || formatInternetDebitDisplay(f),
  debitDownload: f => f.debitDownload,
  debitUpload: f => f.debitUpload,
  categorie: f => f.categorie || "Primary",
  numeroLigne: f => f.numeroLigne,
  referenceContrat: f => f.referenceContrat,
  supportTelephone: f => f.supportTelephone,
  dateMiseEnService: f => formatDateFr(f.dateMiseEnService) || f.dateMiseEnService,
  boxModele: f => f.boxModele,
  gateway: f => f.gateway,
  firewallType: f => getFirewallTypeLabel(f.firewallType) || null,
  routeurType: f => f.routeurType,
  toipType: f => f.toipType,
  alimentationType: f => f.alimentationType,
  typeServer: f => getServerTypeLabel(f.typeServer) || null,
  computerType: f => getComputerTypeLabel(f.computerType) || null,
  storageType: f => f.type || f.storageType,
  manufacturer: f => f.manufacturer,
  model: f => f.model,
  serial: f => f.serial,
  expirationGarantie: f => formatDateFr(f.expirationGarantie) || f.expirationGarantie,
  firmware: f => f.firmware || f.version,
  adresseMac: f => f.adresseMac || f.mac,
  mac: f => f.mac || f.adresseMac,
  systeme: f => repairOsLabel(f.systeme) || f.systeme,
  editionWindows: f => repairOsLabel(f.editionWindows) || f.editionWindows,
  windowsFeatureVersion: f => f.windowsFeatureVersion,
  windowsBuild: f => f.windowsBuild,
  windowsLicenseStatus: f => f.windowsLicenseStatus,
  domaine: (f, eq) => f.domaine || eq?.domaine,
  processeur: f => f.processeur,
  memoire: f => f.memoire,
  stockage: f => f.stockage,
  hypervisor: f => f.hypervisor,
  hostServerName: f => f.hostServerName,
  role: f => formatList(f.role),
  remoteAccessSolution: f => {
    if (!f.remoteAccessSolution) return null;
    const def = getServerRemoteAccessSolutionDef(f.remoteAccessSolution);
    const label = def?.label || f.remoteAccessSolution;
    return f.remoteAccessId ? `${label} · ${f.remoteAccessId}` : label;
  },
  quickConnect: f => f.quickConnect,
  raid: f => f.raid,
  capacite: f => f.capacite ? `${f.capacite} Go` : null,
  nbDisquesActuels: f => f.nbDisquesActuels != null && f.nbDisquesActuels !== "" ? String(f.nbDisquesActuels) : null,
  nbDisquesMax: f => f.nbDisquesMax != null && f.nbDisquesMax !== "" ? String(f.nbDisquesMax) : null,
  luns: f => formatLuns(f.luns),
  numeroDisque: f => f.numeroDisque,
  modeHA: f => formatBool(f.modeHA),
  roleHA: f => f.roleHA,
  firewallHAName: f => f.firewallHAName,
  serverHAName: f => f.serverHAName,
  storageHAName: f => f.storageHAName,
  stormshieldWanUrl: f => f.stormshieldWanUrl,
  licenceMaintenance: f => formatDateFr(getMaintenanceLicenseExpiration(f.licences)),
  autresLicenses: f => formatOtherLicenses(f.licences),
  manageable: f => formatBool(f.manageable),
  adminUrl: f => f.adminUrl,
  poeSupport: f => formatBool(f.poeSupport),
  empilage: f => formatBool(f.empilage),
  alimentationPoE: f => formatBool(f.alimentationPoE),
  nombreExtensions: f => f.nombreExtensions,
  domaineSip: f => f.domaineSip,
  capaciteVA: f => f.capaciteVA ? `${f.capaciteVA} VA` : null,
  capaciteW: f => f.capaciteW ? `${f.capaciteW} W` : null,
  nbPrises: f => f.nbPrises,
  dateBatterie: f => formatDateFr(f.dateBatterie) || f.dateBatterie,
  commentaire: f => f.commentaire,
  assignedSsids: f => formatAssignedSsidsDisplay(f)
};
const FIELD_LABELS = {
  clientName: "Company",
  name: "Nom",
  netbios: "Nom NetBIOS",
  location: "Lieu",
  ip: "IP address",
  vlan: "VLAN",
  internetType: "Type de connexion",
  fournisseur: "Fournisseur",
  debit: "Bandwidth",
  debitDownload: "Download speed",
  debitUpload: "Upload speed",
  categorie: "Category",
  numeroLigne: "N° de ligne",
  referenceContrat: "Contract reference",
  supportTelephone: "Support phone",
  dateMiseEnService: "Mise en service",
  boxModele: "Model box",
  gateway: "Gateway",
  firewallType: "Deployment type",
  routeurType: "Type",
  toipType: "Type VoIP",
  alimentationType: "Type",
  typeServer: "Type serveur",
  computerType: "Type d'ordinateur",
  storageType: "Type de stockage",
  manufacturer: "Brand",
  model: "Model",
  serial: "Serial number",
  expirationGarantie: "Fin de garantie",
  firmware: "Firmware",
  adresseMac: "MAC address",
  mac: "MAC address",
  systeme: "Operating system",
  editionWindows: "Windows edition",
  windowsFeatureVersion: "Version Windows",
  windowsBuild: "Build Windows",
  windowsLicenseStatus: "License Windows",
  domaine: "Domaine",
  processeur: "Processeur",
  memoire: "Memory",
  stockage: "Storage",
  hypervisor: "Hyperviseur",
  hostServerName: "Serveur hôte",
  role: "Roles",
  remoteAccessSolution: "Prise en main",
  quickConnect: "QuickConnect",
  purchaseDate: "Date d'achat",
  invoiceNumber: "Numero de facture",
  installDate: "Date d'installation",
  raid: "RAID",
  capacite: "Total capacity",
  nbDisquesActuels: "Installed disks",
  nbDisquesMax: "Disques max.",
  luns: "LUN / volumes",
  numeroDisque: "N° disque",
  modeHA: "Mode haute dispo.",
  roleHA: "Role HA",
  firewallHAName: "Pair HA",
  serverHAName: "Pair HA",
  storageHAName: "Pair HA",
  stormshieldWanUrl: "URL Stormshield WAN",
  licenceMaintenance: "Maintenance license",
  autresLicenses: "Autres licences",
  manageable: "Manageable",
  adminUrl: "Interface d'administration",
  poeSupport: "PoE",
  empilage: "Empilage",
  alimentationPoE: "PoE power",
  nombreExtensions: "Extensions",
  domaineSip: "Domaine SIP",
  capaciteVA: "VA capacity",
  capaciteW: "Puissance W",
  nbPrises: "Number of outlets",
  dateBatterie: "Date batterie",
  commentaire: "Notes",
  assignedSsids: "SSID"
};
const SECTION_FIELDS = {
  billingInstallation: ["clientName", "location", "purchaseDate", "invoiceNumber", "installDate", "expirationGarantie"],
  supportLifecycle: ["remoteAccessSolution", "licenceMaintenance", "autresLicenses"],
  technique: ["firewallType", "routeurType", "toipType", "alimentationType", "typeServer", "computerType", "storageType", "manufacturer", "model", "serial", "firmware", "systeme", "editionWindows", "windowsFeatureVersion", "windowsBuild", "windowsLicenseStatus", "domaine", "processeur", "memoire", "stockage", "hypervisor", "hostServerName", "role", "quickConnect", "raid", "capacite", "nbDisquesActuels", "nbDisquesMax", "luns", "numeroDisque", "modeHA", "roleHA", "firewallHAName", "serverHAName", "storageHAName", "manageable", "poeSupport", "empilage", "alimentationPoE", "nombreExtensions", "domaineSip", "capaciteVA", "capaciteW", "nbPrises", "dateBatterie"],
  reseau: ["ip", "gateway", "vlan", "mac", "adresseMac", "stormshieldWanUrl", "adminUrl", "assignedSsids", "fournisseur", "internetType", "debit", "debitDownload", "debitUpload", "categorie", "numeroLigne", "referenceContrat", "supportTelephone", "dateMiseEnService", "boxModele"],
  notes: ["commentaire"]
};
const BILLING_ALWAYS_VISIBLE_FIELDS = new Set(["purchaseDate", "invoiceNumber", "installDate", "expirationGarantie"]);
const UNIFIED_DETAIL_SECTIONS = [
  { id: "billingInstallation", label: "Facturation et installation", icon: "mdi:file-document-outline", description: "Client, site, achat et installation" },
  { id: "supportLifecycle", label: "Support / cycle de vie", icon: "mdi:lifebuoy", description: "Prise en main et licences" },
  { id: "technique", label: "Technique", icon: "mdi:cog-outline", description: "Caracteristiques techniques et systeme" },
  { id: "reseau", label: "Reseau", icon: "mdi:lan", description: "Adressage, acces et connectivite" },
  { id: "notes", label: "Notes", icon: "mdi:note-text-outline", description: "Commentaires et informations utiles" }
];
const ORDINATEUR_SECTIONS = [{
  id: "identity",
  label: "Identity",
  icon: "mdi:tag-text-outline"
}, {
  id: "hardware",
  label: "Hardware",
  icon: "mdi:laptop"
}, {
  id: "network",
  label: "Network",
  icon: "mdi:lan"
}, {
  id: "system",
  label: "System",
  icon: "mdi:microsoft-windows"
}, {
  id: "notes",
  label: "Notes",
  icon: "mdi:note-text-outline"
}];
const ORDINATEUR_SECTION_FIELDS = {
  identity: ["name", "netbios", "computerType", "location"],
  hardware: ["manufacturer", "model", "serial"],
  network: ["ip", "vlan", "mac"],
  system: ["editionWindows", "windowsFeatureVersion", "windowsBuild", "windowsLicenseStatus", "systeme", "domaine", "processeur", "memoire"],
  notes: ["commentaire"]
};
const ORDINATEUR_RMM_MANAGED_SECTIONS = [{
  id: "identity",
  label: "Identity",
  icon: "mdi:tag-text-outline"
}, {
  id: "network",
  label: "Network",
  icon: "mdi:lan"
}, {
  id: "notes",
  label: "Notes",
  icon: "mdi:note-text-outline"
}];
const ORDINATEUR_RMM_MANAGED_SECTION_FIELDS = {
  identity: ["clientName", "name", "computerType", "location"],
  network: ["vlan"],
  notes: ["commentaire"]
};
const RMM_FIELD_KEYS = new Set(["manufacturer", "model", "serial", "systeme", "editionWindows", "windowsFeatureVersion", "windowsBuild", "windowsLicenseStatus", "domaine", "mac", "ip", "processeur", "memoire"]);
function mergeRmmIntoFormData(equipment, formData) {
  if (equipment?.type !== "Ordinateurs" || !isRmmManagedEquipment(equipment)) {
    return formData;
  }
  const inventory = getRmmInventoryFromEquipment(equipment);
  const chassis = getRmmChassisInfo(inventory);
  const ram = formatRmmRam(inventory, equipment);
  const editionInfo = getRmmOsEditionInfo(inventory, equipment);
  return {
    ...formData,
    editionWindows: repairOsLabel(formData.editionWindows || editionInfo.edition || "") || "",
    windowsFeatureVersion: formData.windowsFeatureVersion || editionInfo.displayVersion || "",
    windowsBuild: formData.windowsBuild || editionInfo.build || "",
    windowsLicenseStatus: formData.windowsLicenseStatus || editionInfo.licenseLabel || (editionInfo.licenseName ? editionInfo.licenseName : ""),
    systeme: repairOsLabel(formData.systeme || editionInfo.osCaption || inventory.systeme || inventory.os?.name || "") || "",
    domaine: formData.domaine || inventory.domaine || inventory.domain?.name || "",
    mac: formData.mac || inventory.mac || inventory.network?.mac || "",
    ip: formData.ip || inventory.ip || inventory.network?.ip || "",
    manufacturer: formData.manufacturer || chassis.manufacturer || "",
    model: formData.model || chassis.model || "",
    serial: formData.serial || chassis.serial || "",
    processeur: formData.processeur || inventory.hardware?.cpu || inventory.processeur || "",
    memoire: formData.memoire || ram || inventory.memoire || "",
    netbios: formData.netbios || getRmmNetbiosName(equipment) || "",
    computerType: canonicalizeComputerType(formData.computerType) || inferComputerTypeFromInventory(inventory) || ""
  };
}
const FIELD_ALLOWED_MODULES = {
  modeHA: ["Firewalls", "Servers", "Storage"],
  roleHA: ["Firewalls", "Servers", "Storage"],
  firewallHAName: ["Firewalls"],
  serverHAName: ["Servers"],
  storageHAName: ["Storage"],
  manageable: ["Switch", "Alimentation", "TOIP"],
  poeSupport: ["Switch"],
  empilage: ["Switch"],
  alimentationPoE: ["BorneWifi"],
  adminUrl: ["Switch", "Routeur", "Alimentation", "TOIP"],
  firewallType: ["Firewalls"],
  routeurType: ["Routeur"],
  toipType: ["TOIP"],
  alimentationType: ["Alimentation"],
  typeServer: ["Servers"],
  computerType: ["Ordinateurs"],
  storageType: ["Storage"],
  hypervisor: ["Servers"],
  hostServerName: ["Servers"],
  raid: ["Storage"],
  capacite: ["Storage"],
  nbDisquesActuels: ["Storage"],
  nbDisquesMax: ["Storage"],
  luns: ["Storage"],
  numeroDisque: ["Storage"],
  nombreExtensions: ["TOIP"],
  domaineSip: ["TOIP"],
  capaciteVA: ["Alimentation"],
  capaciteW: ["Alimentation"],
  nbPrises: ["Alimentation"],
  dateBatterie: ["Alimentation"],
  stormshieldWanUrl: ["Firewalls"],
  licenceMaintenance: ["Firewalls"],
  autresLicenses: ["Firewalls"],
  remoteAccessSolution: ["Servers"],
  assignedSsids: ["BorneWifi"],
  quickConnect: ["Storage"]
};
function shouldShowField(fieldKey, formData, equipment) {
  const moduleKey = resolveModuleKey(equipment);
  const allowedModules = FIELD_ALLOWED_MODULES[fieldKey];
  if (allowedModules && !allowedModules.includes(moduleKey)) return false;
  if (fieldKey === "expirationGarantie" && equipment?.type === "BorneWifi") return false;
  if (fieldKey === "adresseMac") {
    const sections = getEquipmentFormSections(moduleKey, {
      firewallType: formData.firewallType,
      routeurType: formData.routeurType,
      serverType: formData.typeServer,
      storageType: formData.storageType || formData.type,
      toipType: formData.toipType
    });
    const showsMacInNetwork = sections.some(section => section.id === "network") && (SECTION_FIELDS.network || []).includes("mac");
    if (showsMacInNetwork) return false;
  }
  if (fieldKey === "hypervisor" && moduleKey === "Servers") {
    return getServerFormProfile(formData.typeServer).showHypervisor;
  }
  if (fieldKey === "hostServerName" && moduleKey === "Servers") {
    return getServerFormProfile(formData.typeServer).showHypervisor && Boolean(formData.hostServerName);
  }
  if (["processeur", "memoire", "stockage"].includes(fieldKey) && moduleKey === "Servers") {
    return true;
  }
  if (["manufacturer", "model", "serial"].includes(fieldKey) && moduleKey === "Servers") {
    return getServerFormProfile(formData.typeServer).showHardware;
  }
  if (["manufacturer", "model", "serial"].includes(fieldKey) && moduleKey === "Storage") {
    return getStorageFormProfile(formData.storageType || formData.type).showHardware;
  }
  if (fieldKey === "stormshieldWanUrl" && moduleKey === "Firewalls") {
    return Boolean(formData.stormshieldWanUrl);
  }
  if (fieldKey === "roleHA") {
    return Boolean(formData.modeHA);
  }
  if (fieldKey === "firewallHAName") {
    return moduleKey === "Firewalls" && Boolean(formData.modeHA);
  }
  if (fieldKey === "serverHAName") {
    return moduleKey === "Servers" && Boolean(formData.modeHA);
  }
  if (fieldKey === "storageHAName") {
    return moduleKey === "Storage" && Boolean(formData.modeHA);
  }
  if (fieldKey === "capaciteVA" || fieldKey === "capaciteW" || fieldKey === "dateBatterie") {
    return formData.alimentationType !== "PDU";
  }
  if (fieldKey === "nbPrises") {
    return formData.alimentationType === "PDU";
  }
  if (fieldKey === "nombreExtensions" || fieldKey === "domaineSip") {
    return isToipVoipSectionVisible(formData.toipType);
  }
  if (fieldKey === "netbios") {
    return isRmmManagedEquipment(equipment) && Boolean(getRmmNetbiosName(equipment));
  }
  if (fieldKey === "quickConnect") {
    return isSynologyBrand(formData.manufacturer);
  }
  if ((fieldKey === "nbDisquesActuels" || fieldKey === "nbDisquesMax") && moduleKey === "Storage") {
    const profile = getStorageFormProfile(formData.storageType || formData.type);
    return !shouldShowStorageDiskBays(formData, {
      showDisques: profile.showDisques
    });
  }
  if (fieldKey === "raid" && moduleKey === "Storage") {
    return getStorageFormProfile(formData.storageType || formData.type).showRaid;
  }
  if (fieldKey === "capacite" && moduleKey === "Storage") {
    return getStorageFormProfile(formData.storageType || formData.type).showCapacite;
  }
  if (fieldKey === "numeroDisque" && moduleKey === "Storage") {
    const profile = getStorageFormProfile(formData.storageType || formData.type);
    return profile.showDisques === false && Boolean(formData.numeroDisque);
  }
  return true;
}
function resolveFieldSource(fieldKey, formData, equipment) {
  if (fieldKey === "netbios") return "rmm";
  if (equipment?.type === "Ordinateurs" && RMM_FIELD_KEYS.has(fieldKey) && isRmmManagedEquipment(equipment)) {
    const inventory = getRmmInventoryFromEquipment(equipment);
    const chassis = getRmmChassisInfo(inventory);
    const editionInfo = getRmmOsEditionInfo(inventory, equipment);
    const manual = buildInitialFormData(equipment, "Ordinateurs");
    const rmmValue = fieldKey === "manufacturer" ? chassis.manufacturer : fieldKey === "model" ? chassis.model : fieldKey === "serial" ? chassis.serial : fieldKey === "editionWindows" ? editionInfo.edition : fieldKey === "windowsFeatureVersion" ? editionInfo.displayVersion : fieldKey === "windowsBuild" ? editionInfo.build : fieldKey === "windowsLicenseStatus" ? editionInfo.licenseLabel || editionInfo.licenseName : fieldKey === "systeme" ? editionInfo.osCaption || inventory.systeme || inventory.os?.name : fieldKey === "domaine" ? inventory.domaine : fieldKey === "mac" ? inventory.mac || inventory.network?.mac : fieldKey === "ip" ? inventory.ip || inventory.network?.ip : fieldKey === "processeur" ? inventory.hardware?.cpu : fieldKey === "memoire" ? formatRmmRam(inventory) : null;
    const manualValue = manual[fieldKey];
    if (isTruthy(rmmValue) && (!isTruthy(manualValue) || String(manualValue) === String(formData[fieldKey]))) {
      return "rmm";
    }
  }
  return "manual";
}
function formatHaRole(value, locale) {
  if (!value) return null;
  const isEn = locale === "en";
  if (value === "Primary") return isEn ? "Primary" : "Principal";
  if (value === "Secondary") return isEn ? "Secondary" : "Secondaire";
  return value;
}
function formatServerType(value, locale) {
  const key = normalizeServerType(value);
  if (!key) return null;
  if (locale) {
    const localized = getFormFields(locale).typeOptions?.server?.[key]?.label;
    if (localized) return localized;
  }
  return getServerTypeLabel(value) || value;
}
function formatFirewallType(value, locale) {
  const key = normalizeFirewallType(value);
  if (!key) return null;
  if (locale) {
    const localized = getFormFields(locale).typeOptions?.firewall?.[key]?.label;
    if (localized) return localized;
  }
  return getFirewallTypeLabel(value) || value;
}
function formatComputerType(value, locale) {
  const key = canonicalizeComputerType(value);
  if (!key) return value || null;
  if (locale) {
    const localized = getFormFields(locale).typeOptions?.computer?.[key]?.label;
    if (localized) return localized;
  }
  return getComputerTypeLabel(value) || value;
}
function formatField(fieldKey, formData, equipment, locale) {
  const formatter = FIELD_FORMATTERS[fieldKey];
  let raw = formatter ? formatter(formData, equipment) : formData[fieldKey];
  if (fieldKey === "roleHA" && raw) {
    raw = formatHaRole(raw, locale);
  }
  if (fieldKey === "typeServer" && raw) {
    raw = formatServerType(formData.typeServer || raw, locale);
  }
  if (fieldKey === "firewallType" && raw) {
    raw = formatFirewallType(formData.firewallType || raw, locale);
  }
  if (fieldKey === "computerType" && raw) {
    raw = formatComputerType(formData.computerType || raw, locale);
  }
  if ((fieldKey === "systeme" || fieldKey === "editionWindows") && raw) {
    raw = repairOsLabel(raw) || raw;
  }
  if (locale && fieldKey === "ip" && equipment?.type === "Internet" && formData.ipNonFixe) {
    raw = getEquipmentDetailCopy(locale).formatValues.ipNonFixe;
  }
  if (locale && fieldKey === "categorie" && !raw) {
    raw = getEquipmentDetailCopy(locale).formatValues.principale;
  }
  if (!isTruthy(raw)) return null;
  return String(raw);
}
function getFieldLabel(fieldKey, equipment, locale) {
  const customField = equipment?.customFamily?.fields?.find?.(field => field?.fieldKey === fieldKey);
  if (customField?.label) return customField.label;
  if (locale) {
    const localized = getEquipmentDetailFieldLabel(fieldKey, locale, equipment);
    if (localized && localized !== fieldKey) return localized;
  }
  if (["purchaseDate", "invoiceNumber", "installDate", "expirationGarantie"].includes(fieldKey)) {
    return getSharedEquipmentFieldLabel(fieldKey, locale);
  }
  if (equipment?.type === "Ordinateurs" && fieldKey === "name") return "Nom Veritas";
  return FIELD_LABELS[fieldKey] || fieldKey;
}
function buildSectionFields(sectionId, formData, equipment, fieldKeys, locale) {
  const keys = fieldKeys || SECTION_FIELDS[sectionId] || [];
  const fields = [];
  const seenValues = new Set();
  keys.forEach(fieldKey => {
    if (!shouldShowField(fieldKey, formData, equipment)) return;
    const value = formatField(fieldKey, formData, equipment, locale) || (sectionId === "billingInstallation" && BILLING_ALWAYS_VISIBLE_FIELDS.has(fieldKey) ? EMPTY : null);
    if (!value) return;
    const label = getFieldLabel(fieldKey, equipment, locale);
    const dedupeKey = `${label}::${value}`;
    if (seenValues.has(dedupeKey)) return;
    seenValues.add(dedupeKey);
    fields.push({
      key: fieldKey,
      label,
      value,
      mono: ["ip", "vlan", "mac", "adresseMac", "serial", "gateway", "adminUrl", "stormshieldWanUrl", "quickConnect", "windowsBuild", "netbios"].includes(fieldKey),
      source: resolveFieldSource(fieldKey, formData, equipment)
    });
  });
  return fields;
}
export function buildDetailFormData(equipment, options = {}) {
  const moduleKey = resolveModuleKey(equipment);
  const customFamily = options.customFamily ?? equipment?.customFamily ?? null;
  const clientSites = options.clientSites ?? equipment?.clientSites;
  const clientSsids = options.clientSsids ?? equipment?.clientSsids ?? equipment?.client?.ssids ?? equipment?.client?.ssid;
  const base = buildInitialFormData(equipment, moduleKey, {
    client: equipment?.clientId ? {
      sites: clientSites,
      ssids: Array.isArray(clientSsids) ? clientSsids : []
    } : null
  });
  const merged = {
    ...base,
    domaine: base.domaine || equipment?.domaine || equipment?.rawData?.domaine || "",
    mac: base.mac || equipment?.mac || base.adresseMac || "",
    luns: base.luns || equipment?.luns || equipment?.rawData?.luns || [],
    disques: base.disques || equipment?.disques || equipment?.rawData?.disques || [],
    licences: base.licences || equipment?.licences || equipment?.rawData?.licences || [],
    role: moduleKey === "Storage" ? base.role || equipment?.role || "" : base.role || equipment?.role || [],
    purchaseDate: base.purchaseDate || equipment?.purchaseDate || equipment?.rawData?.purchaseDate || "",
    invoiceNumber: base.invoiceNumber || equipment?.invoiceNumber || equipment?.rawData?.invoiceNumber || "",
    installDate: base.installDate || equipment?.installDate || equipment?.dateInstallation || equipment?.rawData?.installDate || equipment?.rawData?.dateInstallation || "",
  };
  if (moduleKey === "Custom") {
    const fieldDefs = Array.isArray(customFamily?.fields) ? customFamily.fields : Array.isArray(equipment?.customFields) ? equipment.customFields : [];
    const customData = equipment?.fields && typeof equipment.fields === "object" ? equipment.fields : equipment?.data && typeof equipment.data === "object" ? equipment.data : equipment?.rawData?.data && typeof equipment.rawData.data === "object" ? equipment.rawData.data : equipment?.rawData && typeof equipment.rawData === "object" ? equipment.rawData : {};
    const detail = {
      ...merged,
      clientName: equipment?.clientName || equipment?.client?.name || equipment?.companyName || "",
      name: equipment?.name || equipment?.nom || merged.name || ""
    };
    fieldDefs.forEach(field => {
      if (!field?.fieldKey) return;
      const value = customData[field.fieldKey];
      if (value == null) return;
      detail[field.fieldKey] = field.fieldType === "date" ? String(value).slice(0, 10) : value;
    });
    return detail;
  }
  if (equipment?.type === "Ordinateurs") {
    return mergeRmmIntoFormData(equipment, {
      ...merged,
      systeme: merged.systeme || equipment?.systeme || "",
      manufacturer: merged.manufacturer || equipment?.manufacturer || "",
      model: merged.model || equipment?.model || "",
      serial: merged.serial || equipment?.serial || ""
    });
  }
  if (equipment?.type === "BorneWifi") {
    const catalog = normalizeWifiSsidCatalog(Array.isArray(clientSsids) ? clientSsids : merged.clientSsids || []);
    const rawSsids = equipment?.ssids ?? equipment?.rawData?.data?.ssids ?? equipment?.rawData?.ssids ?? merged.ssids ?? [];
    const {
      clientSsids: mergedCatalog,
      assignedSsidIds
    } = buildBorneWifiSsidFormState({
      ...equipment,
      ssids: rawSsids
    }, {
      ssids: catalog
    });
    return {
      ...merged,
      ssids: Array.isArray(rawSsids) ? rawSsids : [],
      clientSsids: mergedCatalog,
      assignedSsidIds
    };
  }
  return merged;
}
export function buildEquipmentDetailSections(equipment, formData, locale) {
  const moduleKey = resolveModuleKey(equipment);
  const customFamily = equipment?.customFamily || null;
  const displayData = equipment?.type === "Ordinateurs" ? mergeRmmIntoFormData(equipment, formData) : formData;
  const sections = UNIFIED_DETAIL_SECTIONS.map(section => {
    const localized = locale
      ? localizeEquipmentDetailSection(
          section.id === "billingInstallation" ? { ...section, id: "common" } : section,
          moduleKey,
          {},
          locale
        )
      : section;
    return {
      ...localized,
      id: section.id,
      fields: buildSectionFields(section.id, displayData, equipment, undefined, locale)
    };
  });
  if (moduleKey === "Custom") {
    const specificFieldKeys = (customFamily?.fields || [])
      .map(field => String(field?.fieldKey || "").trim())
      .filter(Boolean)
      .filter(fieldKey => !["site", "purchaseDate", "invoiceNumber", "installDate", "expirationGarantie", "supportReference", "supportContract", "commentaire"].includes(fieldKey));
    sections.push({
      id: "customSpecific",
      label: "Champs specifiques",
      icon: customFamily?.icon || "mdi:shape-outline",
      description: "Champs propres a cette famille",
      fields: buildSectionFields("customSpecific", displayData, equipment, specificFieldKeys, locale)
    });
  }
  return sections.filter(section => section.fields.length > 0);
}
export function getEquipmentTypeLabel(equipment) {
  const moduleKey = resolveModuleKey(equipment);
  if (moduleKey === "Custom") {
    return equipment?.customFamily?.label || parseCustomFamilyType(equipment?.type) || equipment?.type || "Custom";
  }
  if (equipment?.type === "Internet" && equipment?.rawData?.type) {
    return `Internet · ${equipment.rawData.type}`;
  }
  if (moduleKey === "Storage") {
    const storageType = equipment?.rawData?.type || equipment?.type || "NAS";
    return storageType === "NAS" ? "Storage NAS" : storageType;
  }
  return equipment?.type || moduleKey;
}
export { EMPTY as DETAIL_EMPTY_VALUE };
