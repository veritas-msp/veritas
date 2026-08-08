import { formatDateFr, getMaintenanceLicenseExpiration } from "./constants/firewallLicenceUtils";
import { buildInitialFormData, getEquipmentFormSections, getFirewallTypeLabel, normalizeFirewallType, getServerFormProfile, getServerTypeLabel, getStorageFormProfile, isToipVoipSectionVisible, normalizeServerType } from "./equipmentFormConfig";
import { getFormFields } from "./equipmentFormFieldsI18n";
import { getServerRemoteAccessSolutionDef } from "./constants/serverRemoteAccessUtils";
import { formatInternetDebitDisplay } from "./internetConnectionUtils";
import { formatRmmRam, getRmmChassisInfo, getRmmInventoryFromEquipment, getRmmNetbiosName, getRmmOsEditionInfo, isRmmManagedEquipment } from "./rmmMonitoringUtils";
import { isSynologyBrand } from "./synologyEquipmentUtils";
import { getEquipmentDetailFieldLabel, getEquipmentDetailCopy, localizeEquipmentDetailSection } from "./equipmentDetailPageI18n";
import { formatAssignedSsidsDisplay, buildBorneWifiSsidFormState, normalizeWifiSsidCatalog } from "./wifiApSsidUtils";
import { shouldShowStorageDiskBays } from "./storageDiskUtils";
const EMPTY = "-";
function resolveModuleKey(equipment) {
  if (!equipment) return "Servers";
  if (equipment.type === "NAS" || equipment.type === "SAN") return "Storage";
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
  storageType: f => f.type || f.storageType,
  manufacturer: f => f.manufacturer,
  model: f => f.model,
  serial: f => f.serial,
  expirationGarantie: f => formatDateFr(f.expirationGarantie) || f.expirationGarantie,
  firmware: f => f.firmware || f.version,
  adresseMac: f => f.adresseMac || f.mac,
  mac: f => f.mac || f.adresseMac,
  systeme: f => f.systeme,
  editionWindows: f => f.editionWindows,
  windowsFeatureVersion: f => f.windowsFeatureVersion,
  windowsBuild: f => f.windowsBuild,
  windowsLicenseStatus: f => f.windowsLicenseStatus,
  domaine: (f, eq) => f.domaine || eq?.domaine,
  processeur: f => f.processeur,
  memoire: f => f.memoire,
  stockage: f => f.stockage,
  hypervisor: f => f.hypervisor,
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
  role: "Roles",
  remoteAccessSolution: "Prise en main",
  quickConnect: "QuickConnect",
  raid: "RAID",
  capacite: "Total capacity",
  nbDisquesActuels: "Installed disks",
  nbDisquesMax: "Disques max.",
  luns: "LUN / volumes",
  numeroDisque: "N° disque",
  modeHA: "Mode haute dispo.",
  roleHA: "Role HA",
  firewallHAName: "Pair HA",
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
  identity: ["name", "location", "firewallType", "routeurType", "toipType", "alimentationType", "typeServer", "storageType"],
  internetType: ["internetType"],
  internetLink: ["fournisseur", "debit", "debitDownload", "debitUpload", "categorie"],
  internetNetwork: ["ip", "gateway", "boxModele"],
  internetContract: ["numeroLigne", "referenceContrat", "supportTelephone", "dateMiseEnService"],
  internetNotes: ["commentaire"],
  hardware: ["manufacturer", "model", "serial", "expirationGarantie", "firmware", "adresseMac", "poeSupport", "empilage"],
  network: ["ip", "vlan", "mac", "stormshieldWanUrl"],
  system: ["editionWindows", "windowsFeatureVersion", "windowsBuild", "windowsLicenseStatus", "systeme", "domaine", "processeur", "memoire", "stockage", "hypervisor", "role", "quickConnect"],
  remote: ["remoteAccessSolution"],
  storage: ["raid", "capacite", "nbDisquesActuels", "nbDisquesMax", "luns", "numeroDisque", "role"],
  ha: ["modeHA", "roleHA", "firewallHAName"],
  licences: ["licenceMaintenance", "autresLicenses"],
  management: ["manageable", "adminUrl"],
  wifi: ["alimentationPoE", "assignedSsids"],
  power: ["capaciteVA", "capaciteW", "nbPrises", "dateBatterie"],
  voip: ["nombreExtensions", "domaineSip", "firmware"],
  notes: ["commentaire"]
};
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
  identity: ["name", "netbios", "location"],
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
  identity: ["clientName", "name", "location"],
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
    editionWindows: formData.editionWindows || editionInfo.edition || "",
    windowsFeatureVersion: formData.windowsFeatureVersion || editionInfo.displayVersion || "",
    windowsBuild: formData.windowsBuild || editionInfo.build || "",
    windowsLicenseStatus: formData.windowsLicenseStatus || editionInfo.licenseLabel || (editionInfo.licenseName ? editionInfo.licenseName : ""),
    systeme: formData.systeme || editionInfo.osCaption || inventory.systeme || inventory.os?.name || "",
    domaine: formData.domaine || inventory.domaine || inventory.domain?.name || "",
    mac: formData.mac || inventory.mac || inventory.network?.mac || "",
    ip: formData.ip || inventory.ip || inventory.network?.ip || "",
    manufacturer: formData.manufacturer || chassis.manufacturer || "",
    model: formData.model || chassis.model || "",
    serial: formData.serial || chassis.serial || "",
    processeur: formData.processeur || inventory.hardware?.cpu || inventory.processeur || "",
    memoire: formData.memoire || ram || inventory.memoire || "",
    netbios: formData.netbios || getRmmNetbiosName(equipment) || ""
  };
}
function shouldShowField(fieldKey, formData, equipment) {
  const moduleKey = resolveModuleKey(equipment);
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
  if (["processeur", "memoire", "stockage"].includes(fieldKey) && moduleKey === "Servers") {
    return getServerFormProfile(formData.typeServer).showHardware;
  }
  if (["manufacturer", "model", "serial", "expirationGarantie"].includes(fieldKey) && moduleKey === "Servers") {
    return getServerFormProfile(formData.typeServer).showHardware;
  }
  if (["manufacturer", "model", "serial"].includes(fieldKey) && moduleKey === "Storage") {
    return getStorageFormProfile(formData.storageType || formData.type).showHardware;
  }
  if (fieldKey === "stormshieldWanUrl" && moduleKey === "Firewalls") {
    return Boolean(formData.stormshieldWanUrl);
  }
  if (fieldKey === "roleHA" || fieldKey === "firewallHAName") {
    return Boolean(formData.modeHA);
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
  if (locale) return getEquipmentDetailFieldLabel(fieldKey, locale, equipment);
  if (equipment?.type === "Ordinateurs" && fieldKey === "name") return "Nom Veritas";
  return FIELD_LABELS[fieldKey] || fieldKey;
}
function buildSectionFields(sectionId, formData, equipment, fieldKeys, locale) {
  const keys = fieldKeys || SECTION_FIELDS[sectionId] || [];
  const fields = [];
  const seenValues = new Set();
  keys.forEach(fieldKey => {
    if (!shouldShowField(fieldKey, formData, equipment)) return;
    const value = formatField(fieldKey, formData, equipment, locale);
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
    role: moduleKey === "Storage" ? base.role || equipment?.role || "" : base.role || equipment?.role || []
  };
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
  const displayData = equipment?.type === "Ordinateurs" ? mergeRmmIntoFormData(equipment, formData) : formData;
  const sectionOptions = {
    firewallType: displayData.firewallType,
    routeurType: displayData.routeurType,
    serverType: displayData.typeServer,
    storageType: displayData.storageType || displayData.type,
    toipType: displayData.toipType
  };
  let sections = [];
  if (equipment?.type === "Ordinateurs") {
    const rmmManaged = isRmmManagedEquipment(equipment);
    const sectionDefs = rmmManaged ? ORDINATEUR_RMM_MANAGED_SECTIONS : ORDINATEUR_SECTIONS;
    const sectionFields = rmmManaged ? ORDINATEUR_RMM_MANAGED_SECTION_FIELDS : ORDINATEUR_SECTION_FIELDS;
    sections = sectionDefs.map(section => {
      const localized = locale ? localizeEquipmentDetailSection(section, "Ordinateurs", sectionOptions, locale) : section;
      return {
        ...localized,
        fields: buildSectionFields(section.id, displayData, equipment, sectionFields[section.id], locale)
      };
    });
  } else {
    const formSections = getEquipmentFormSections(moduleKey, sectionOptions);
    sections = formSections.map(section => {
      const localized = locale ? localizeEquipmentDetailSection(section, moduleKey, sectionOptions, locale) : section;
      return {
        id: localized.id,
        label: localized.label,
        icon: localized.icon,
        description: localized.description,
        fields: buildSectionFields(section.id, displayData, equipment, undefined, locale)
      };
    });
  }
  return sections.filter(section => section.fields.length > 0);
}
export function getEquipmentTypeLabel(equipment) {
  const moduleKey = resolveModuleKey(equipment);
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
