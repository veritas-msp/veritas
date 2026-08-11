import Papa from "papaparse";
import {
  addClient,
  addContact,
  createClientModuleItem,
  deleteClient,
  deleteClientModuleItem,
  deleteContact,
  fetchClientsList,
  updateClient
} from "../../api/clients";
import { deleteClientFile, uploadClientFile } from "../../api/clientFiles";
import { createTicket, permanentlyDeleteTicket } from "../../api/tickets";
import { interpolate } from "../../i18n/translate";

const DEFAULT_INJECTION_ERRORS = {
  missingName: "Missing name",
  missingNom: "Missing last name (nom)",
  missingTitle: "Missing title",
  missingFamilyOrName: "Missing family or name",
  unknownFamily: "Unknown family: {family}. Use a valid key (servers, internet, switch, firewall, wifi, stockage, alimentation, routeur, toip, ordinateurs).",
  missingFilename: "Missing filename",
  clientNotFound: "Company not found: {value}",
  fileNotSelected: "File not selected: {filename}",
  missingFile: "Missing file: {filename}",
  unknownEntity: "Unknown entity: {entity}",
  validationAborted: "Injection cancelled: fix validation errors — nothing was injected.",
  rollbackAborted: "Injection cancelled after error — {count} created item(s) rolled back. Nothing was kept.",
  userCancelled: "Injection cancelled by user — {count} created item(s) rolled back. Nothing was kept.",
  ok: "OK"
};

function injectionError(messages, key, params = {}) {
  const template = messages?.[key] || DEFAULT_INJECTION_ERRORS[key] || key;
  return interpolate(template, params);
}

export function createInjectionControl() {
  let cancelled = false;
  let paused = false;
  const waiters = new Set();

  const wake = () => {
    for (const resolve of waiters) resolve();
    waiters.clear();
  };

  return {
    get cancelled() {
      return cancelled;
    },
    get paused() {
      return paused;
    },
    pause() {
      if (cancelled) return;
      paused = true;
    },
    resume() {
      paused = false;
      wake();
    },
    cancel() {
      cancelled = true;
      paused = false;
      wake();
    },
    async checkpoint() {
      while (paused && !cancelled) {
        await new Promise(resolve => {
          waiters.add(resolve);
        });
      }
      if (cancelled) {
        const err = new Error("INJECTION_CANCELLED");
        err.code = "INJECTION_CANCELLED";
        throw err;
      }
    }
  };
}

function isInjectionCancelledError(err) {
  return err?.code === "INJECTION_CANCELLED" || err?.message === "INJECTION_CANCELLED";
}

export const INJECTION_ENTITIES = ["companies", "contacts", "documents", "equipment", "tickets"];

export const CSV_TEMPLATES = {
  companies: [
    "client_number",
    "name",
    "legal_identifier",
    "industry_sector",
    "account_manager_id",
    "contract_start",
    "contract_end",
    "options",
    "contact_firstname",
    "contact_name",
    "contact_mail",
    "contact_number",
    "contact_job",
    "sites"
  ].join(",") + "\n" + [
    "C-001",
    "Acme SAS",
    "12345678900012",
    "Services",
    "1",
    "2026-01-01",
    "2027-01-01",
    `"${JSON.stringify(["Support", "Curatif", "Monitoring"]).replace(/"/g, '""')}"`,
    "Alice",
    "Dupont",
    "alice.dupont@acme.example",
    "+33123456789",
    "IT Manager",
    `"${JSON.stringify([{
      name: "HQ",
      addressStreet: "10 rue de Paris",
      addressPostalCode: "75001",
      addressCity: "Paris",
      addressCountry: "France",
      isPrimary: true
    }]).replace(/"/g, '""')}"`
  ].join(",") + "\n",
  contacts: [
    "contact_name",
    "contact_firstname",
    "contact_mail",
    "contact_number",
    "contact_job",
    "client_name",
    "gender",
    "status"
  ].join(",") + "\n" + [
    "Dupont",
    "Alice",
    "alice.dupont@acme.example",
    "+33123456789",
    "IT Manager",
    "Acme SAS",
    "",
    "active"
  ].join(",") + "\n",
  equipment: [
    "client_name",
    "family",
    "name",
    "item_key",
    "ip",
    "os",
    "notes",
    "is_active",
    "data_site",
    "data_brand",
    "data_model",
    "data_serial_number",
    "data_type",
    "data_system",
    "data_processor",
    "data_memory",
    "data_vlan",
    "data_firmware",
    "data_mac_address",
    "data_vendor",
    "data_category",
    "data_bandwidth",
    "data_json"
  ].join(",") + "\n" + [
    ["Acme SAS", "servers", "SRV-AD-01", "srv-ad-01", "10.0.0.10", "", "Domain controller", "true", "HQ", "Dell", "PowerEdge R650", "SN-SRV-001", "physical", "Windows Server 2022 Standard", "Xeon Gold", "64 GB", "10", "", "", "", "", "", ""].join(","),
    ["Acme SAS", "switch", "SW-CORE-01", "sw-core-01", "10.0.0.2", "", "", "true", "HQ", "Cisco", "C9300-48P", "SN-SW-001", "", "", "", "", "20", "17.3.4", "aa:bb:cc:dd:ee:01", "", "", "", ""].join(","),
    ["Acme SAS", "firewall", "FW-EDGE-01", "fw-edge-01", "10.0.0.1", "", "", "true", "HQ", "Fortinet", "FortiGate 100F", "SN-FW-001", "hardware", "", "", "", "10", "7.2.5", "", "", "", "", ""].join(","),
    ["Acme SAS", "wifi", "AP-LOBBY", "ap-lobby", "10.0.0.50", "", "", "true", "Lobby", "Ubiquiti", "U6-Pro", "SN-AP-001", "", "", "", "", "30", "6.5", "aa:bb:cc:dd:ee:50", "", "", "", ""].join(","),
    ["Acme SAS", "internet", "Primary fiber link", "inet-fibre-01", "203.0.113.10", "", "", "true", "HQ", "", "", "", "Fiber", "", "", "", "", "", "", "Orange", "Primary", "1 Gbit/s", ""].join(","),
    ["Acme SAS", "storage", "NAS-01", "nas-01", "10.0.0.20", "", "", "true", "HQ", "Synology", "RS1221+", "SN-NAS-001", "NAS", "", "", "", "10", "", "", "", "", "", ""].join(","),
    ["Acme SAS", "power", "UPS-RACK-01", "ups-rack-01", "10.0.0.30", "", "", "true", "HQ", "APC", "Smart-UPS 3000", "SN-UPS-001", "UPS", "", "", "", "10", "", "", "", "", "", ""].join(","),
    ["Acme SAS", "router", "RTR-EDGE-01", "rtr-edge-01", "10.0.0.254", "", "", "true", "HQ", "Cisco", "ISR 4331", "SN-RTR-001", "Router", "", "", "", "10", "17.6", "aa:bb:cc:dd:ee:fe", "", "", "", ""].join(","),
    ["Acme SAS", "toip", "PBX-01", "pbx-01", "10.0.0.40", "", "", "true", "HQ", "3CX", "Enterprise", "SN-PBX-001", "IP-PBX", "", "", "", "10", "", "", "", "", "", ""].join(","),
    ["Acme SAS", "workstations", "PC-ACCOUNTING-01", "pc-accounting-01", "10.0.1.45", "Windows 11 Pro", "", "true", "Accounting", "Lenovo", "ThinkPad T14", "SN-PC-001", "", "Windows 11 Pro", "i7", "16 GB", "40", "", "aa:bb:cc:dd:ee:45", "", "", "", ""].join(",")
  ].join("\n") + "\n",
  tickets: "client_name,title,description,priority,status,type,category,channel,is_major_incident,assigned_user_id,requester_contact_id\nAcme SAS,Backup failed,Veeam job failed,high,new,incident,Infrastructure,web,false,,\n"
};

const OPTION_KEY_ALIASES = {
  break_fix: "Curatif",
  breakfix: "Curatif",
  curative: "Curatif",
  curatif: "Curatif",
  preventive: "Preventif",
  preventif: "Preventif",
  hosting: "Hebergement",
  hebergement: "Hebergement",
  support: "Support",
  monitoring: "Monitoring"
};

const EQUIPMENT_DATA_FIELD_ALIASES = {
  brand: "marque",
  marque: "marque",
  model: "modele",
  modele: "modele",
  serial_number: "numeroSerie",
  serialnumber: "numeroSerie",
  serial: "numeroSerie",
  numeroserie: "numeroSerie",
  system: "systeme",
  systeme: "systeme",
  processor: "processeur",
  cpu: "processeur",
  processeur: "processeur",
  memory: "memoire",
  ram: "memoire",
  memoire: "memoire",
  mac_address: "adresseMac",
  macaddress: "adresseMac",
  mac: "adresseMac",
  adressemac: "adresseMac",
  vendor: "fournisseur",
  supplier: "fournisseur",
  isp: "fournisseur",
  fournisseur: "fournisseur",
  category: "categorie",
  categorie: "categorie",
  bandwidth: "debit",
  speed: "debit",
  debit: "debit",
  download_bandwidth: "debitDownload",
  download: "debitDownload",
  debitdownload: "debitDownload",
  upload_bandwidth: "debitUpload",
  upload: "debitUpload",
  debitupload: "debitUpload",
  comment: "commentaire",
  commentaire: "commentaire",
  warranty_end: "expirationGarantie",
  warranty: "expirationGarantie",
  expirationgarantie: "expirationGarantie",
  capacity: "capacite",
  capacite: "capacite",
  current_drives: "nbDisquesActuels",
  nbdisquesactuels: "nbDisquesActuels",
  max_drives: "nbDisquesMax",
  nbdisquesmax: "nbDisquesMax",
  capacity_va: "capaciteVA",
  capaciteva: "capaciteVA",
  capacity_w: "capaciteW",
  capacitew: "capaciteW",
  outlet_count: "nbPrises",
  outlets: "nbPrises",
  nbprises: "nbPrises",
  battery_date: "dateBatterie",
  datebatterie: "dateBatterie",
  stacking: "empilage",
  empilage: "empilage",
  poe_powered: "alimentationPoE",
  alimentationpoe: "alimentationPoE",
  non_static_ip: "ipNonFixe",
  ipnonfixe: "ipNonFixe",
  line_number: "numeroLigne",
  numeroligne: "numeroLigne",
  contract_ref: "referenceContrat",
  referencecontrat: "referenceContrat",
  support_phone: "supportTelephone",
  supporttelephone: "supportTelephone",
  go_live_date: "dateMiseEnService",
  datemiseenservice: "dateMiseEnService",
  box_model: "boxModele",
  boxmodele: "boxModele",
  extension_count: "nombreExtensions",
  nombreextensions: "nombreExtensions",
  sip_domain: "domaineSip",
  domainesip: "domaineSip",
  domain: "domaine",
  domaine: "domaine",
  disk_storage: "stockage",
  storage: "stockage",
  stockage: "stockage",
  managed: "manageable",
  manageable: "manageable",
  admin_url: "adminUrl",
  adminurl: "adminUrl",
  poe: "poeSupport",
  poesupport: "poeSupport",
  remote_access: "remoteAccessSolution",
  remoteaccesssolution: "remoteAccessSolution",
  remote_access_id: "remoteAccessId",
  remoteaccessid: "remoteAccessId",
  quick_connect: "quickConnect",
  quickconnect: "quickConnect",
  hostname: "netbios",
  netbios: "netbios",
  site: "site",
  type: "type",
  vlan: "vlan",
  firmware: "firmware",
  gateway: "gateway",
  role: "role",
  raid: "raid",
  hypervisor: "hypervisor"
};

function canonicalizeEquipmentDataField(field) {
  const raw = String(field || "").trim();
  if (!raw) return raw;
  return EQUIPMENT_DATA_FIELD_ALIASES[normKey(raw)] || raw;
}

function normalizeContactStatus(value) {
  const raw = String(value || "").trim();
  if (!raw) return "actif";
  const key = normKey(raw);
  if (["active", "actif", "enabled", "1", "true", "yes", "oui"].includes(key)) return "actif";
  if (["inactive", "inactif", "disabled", "0", "false", "no", "non"].includes(key)) return "inactif";
  return raw;
}

function canonicalizeOptionKey(key) {
  const raw = String(key || "").trim();
  if (!raw) return raw;
  const mapped = OPTION_KEY_ALIASES[normKey(raw)];
  return mapped || raw;
}

function normalizeOptionsMap(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) return options;
  const out = {};
  for (const [key, value] of Object.entries(options)) {
    out[canonicalizeOptionKey(key)] = value;
  }
  return out;
}

const CANONICAL_EQUIPMENT_FAMILIES = new Set([
  "servers",
  "internet",
  "switch",
  "firewall",
  "wifi",
  "stockage",
  "alimentation",
  "routeur",
  "toip",
  "ordinateurs"
]);

const FAMILY_ALIASES = {
  servers: "servers",
  serveurs: "servers",
  serveur: "servers",
  internet: "internet",
  switch: "switch",
  switches: "switch",
  firewall: "firewall",
  firewalls: "firewall",
  wifi: "wifi",
  bornewifi: "wifi",
  "borne-wifi": "wifi",
  "wifi-ap": "wifi",
  accesspoint: "wifi",
  accesspoints: "wifi",
  stockage: "stockage",
  storage: "stockage",
  storages: "stockage",
  nas: "stockage",
  alimentation: "alimentation",
  power: "alimentation",
  ups: "alimentation",
  routeur: "routeur",
  router: "routeur",
  routers: "routeur",
  toip: "toip",
  voip: "toip",
  "voip toip": "toip",
  voiptoip: "toip",
  ordinateurs: "ordinateurs",
  computers: "ordinateurs",
  computer: "ordinateurs",
  workstations: "ordinateurs",
  workstation: "ordinateurs"
};

function normKey(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function cell(row, ...keys) {
  for (const key of keys) {
    const direct = row[key];
    if (direct != null && String(direct).trim() !== "") return String(direct).trim();
    const found = Object.keys(row || {}).find(k => normKey(k) === normKey(key));
    if (found && String(row[found]).trim() !== "") return String(row[found]).trim();
  }
  return "";
}

function parseBool(value, fallback = undefined) {
  if (value == null || String(value).trim() === "") return fallback;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "oui", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "non", "n", "off"].includes(v)) return false;
  return fallback;
}

function parseNumber(value) {
  if (value == null || String(value).trim() === "") return undefined;
  const n = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function parseJsonCell(value) {
  if (value == null || String(value).trim() === "") return undefined;
  const raw = String(value).trim();
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function coerceValue(raw) {
  if (raw == null) return undefined;
  const text = String(raw).trim();
  if (!text) return undefined;
  const asBool = parseBool(text);
  if (asBool !== undefined && ["true", "false", "1", "0", "yes", "no", "oui", "non", "y", "n", "on", "off"].includes(text.toLowerCase())) {
    return asBool;
  }
  if (/^-?\d+([.,]\d+)?$/.test(text)) {
    const n = parseNumber(text);
    if (n !== undefined) return n;
  }
  if (text.startsWith("{") || text.startsWith("[")) {
    const json = parseJsonCell(text);
    if (json !== undefined) return json;
  }
  return text;
}

function setPath(target, pathParts, value) {
  if (!pathParts.length) return;
  let cursor = target;
  for (let i = 0; i < pathParts.length - 1; i += 1) {
    const part = pathParts[i];
    if (!cursor[part] || typeof cursor[part] !== "object") cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[pathParts[pathParts.length - 1]] = value;
}

function collectPrefixedFields(row, prefix, {
  excludePrefix
} = {}) {
  const out = {};
  const needle = `${normKey(prefix)}_`;
  const exclude = excludePrefix ? `${normKey(excludePrefix)}_` : null;
  for (const [rawKey, rawValue] of Object.entries(row || {})) {
    const key = normKey(rawKey);
    if (!key.startsWith(needle)) continue;
    if (exclude && key.startsWith(exclude)) continue;
    const header = String(rawKey);
    const idx = header.toLowerCase().indexOf(`${prefix.toLowerCase()}_`);
    const suffix = idx >= 0 ? header.slice(idx + prefix.length + 1) : key.slice(needle.length);
    if (!suffix) continue;
    const value = coerceValue(rawValue);
    if (value === undefined) continue;
    if (suffix.includes(".") || suffix.includes("__")) {
      setPath(out, suffix.replace(/__/g, ".").split(".").filter(Boolean), value);
    } else {
      out[suffix] = value;
    }
  }
  return out;
}

function buildContratFromRow(row) {
  const fromJson = parseJsonCell(cell(row, "contrat", "contract"));
  const contrat = fromJson && typeof fromJson === "object" && !Array.isArray(fromJson) ? {
    ...fromJson
  } : {};
  // Contract type is not imported via CSV injection
  if (contrat.type !== undefined) delete contrat.type;

  const debut = cell(row, "contrat_debut", "contract_start", "contract_begin", "contrat.debut", "debut", "start_date");
  const expiration = cell(row, "contrat_expiration", "contract_end", "contract_expiration", "contrat.expiration", "expiration", "contrat_fin", "end_date");
  const suspendu = parseBool(cell(row, "contrat_suspendu", "contract_suspended", "contrat.suspendu", "suspendu", "suspended"));

  if (debut) contrat.debut = debut;
  if (expiration) contrat.expiration = expiration;
  if (suspendu !== undefined) contrat.suspendu = suspendu;

  const slaEnabled = parseBool(cell(row, "contrat_sla_enabled", "contract_sla_enabled", "contrat.sla.enabled"));
  const priorities = ["urgent", "high", "normal", "low"];
  let hasSla = slaEnabled !== undefined;
  const byPriority = {};
  for (const p of priorities) {
    const first = parseNumber(cell(row, `contrat_sla_${p}_first_response_hours`, `contract_sla_${p}_first_response_hours`, `contrat.sla.byPriority.${p}.firstResponseHours`));
    const resolution = parseNumber(cell(row, `contrat_sla_${p}_resolution_hours`, `contract_sla_${p}_resolution_hours`, `contrat.sla.byPriority.${p}.resolutionHours`));
    if (first !== undefined || resolution !== undefined) {
      hasSla = true;
      byPriority[p] = {};
      if (first !== undefined) byPriority[p].firstResponseHours = first;
      if (resolution !== undefined) byPriority[p].resolutionHours = resolution;
    }
  }
  if (hasSla) {
    contrat.sla = {
      ...(contrat.sla && typeof contrat.sla === "object" ? contrat.sla : {}),
      ...(slaEnabled !== undefined ? {
        enabled: slaEnabled
      } : {}),
      ...(Object.keys(byPriority).length ? {
        byPriority: {
          ...(contrat.sla?.byPriority || {}),
          ...byPriority
        }
      } : {})
    };
  }

  // Any other contrat_* / contract_* columns
  for (const [rawKey, rawValue] of Object.entries(row || {})) {
    const key = normKey(rawKey);
    const isContrat = key.startsWith("contrat_");
    const isContract = key.startsWith("contract_");
    if (!isContrat && !isContract) continue;
    if (["contrat_debut", "contrat_expiration", "contrat_fin", "contrat_type", "contrat_suspendu", "contract_start", "contract_begin", "contract_end", "contract_expiration", "contract_type", "contract_suspended"].includes(key)) continue;
    if (key.startsWith("contrat_sla_") || key.startsWith("contract_sla_")) continue;
    if (key === "contrat_type" || key === "contract_type" || key === "type") continue;
    const prefixLen = isContrat ? "contrat_".length : "contract_".length;
    const suffix = String(rawKey).slice(String(rawKey).toLowerCase().indexOf(isContrat ? "contrat_" : "contract_") + prefixLen);
    const value = coerceValue(rawValue);
    if (value === undefined) continue;
    // Ignore legacy contract type columns
    if (String(suffix).toLowerCase() === "type") continue;
    // Map common English suffixes to French contrat keys
    const mapped = suffix === "start" || suffix === "begin" ? "debut" : suffix === "end" || suffix === "expiration" ? "expiration" : suffix === "suspended" ? "suspendu" : suffix;
    setPath(contrat, String(mapped).split(/[._]/).filter(Boolean), value);
  }

  return Object.keys(contrat).length ? contrat : undefined;
}

function buildOptionsFromRow(row) {
  const fromJson = parseJsonCell(cell(row, "options"));
  const options = {};

  // Preferred: JSON array of active option keys → listed = active
  if (Array.isArray(fromJson)) {
    for (const entry of fromJson) {
      const key = String(entry || "").trim();
      if (key) options[key] = true;
    }
  } else if (fromJson && typeof fromJson === "object") {
    Object.assign(options, fromJson);
  }

  // Legacy: options_<Key> columns still accepted
  Object.assign(options, collectPrefixedFields(row, "options"));

  const normalized = normalizeOptionsMap(options);
  const out = {};
  for (const [key, value] of Object.entries(normalized)) {
    if (parseBool(value, false)) out[key] = true;
  }
  return Object.keys(out).length ? out : undefined;
}

function buildContactPayloadFromCompanyRow(row) {
  const nom = cell(row, "contact_name", "contact_nom", "contact_lastname");
  if (!nom) return undefined;
  const prenom = cell(row, "contact_firstname", "contact_prenom", "contact_first_name") || undefined;
  const email = cell(row, "contact_mail", "contact_email", "contact_courriel") || undefined;
  const telephone = cell(row, "contact_number", "contact_phone", "contact_telephone", "contact_tel") || undefined;
  const poste = cell(row, "contact_job", "contact_fonction", "contact_poste", "contact_role", "contact_title") || undefined;
  const sexe = cell(row, "contact_sexe", "contact_gender") || undefined;
  const statut = normalizeContactStatus(cell(row, "contact_statut", "contact_status", "status"));
  return {
    nom,
    ...(prenom ? {
      prenom
    } : {}),
    ...(email ? {
      email
    } : {}),
    ...(telephone ? {
      telephone
    } : {}),
    ...(poste ? {
      poste
    } : {}),
    ...(sexe ? {
      sexe
    } : {}),
    statut
  };
}

function buildSitesFromRow(row) {
  const fromJson = parseJsonCell(cell(row, "sites", "locations"));
  if (Array.isArray(fromJson)) return fromJson;
  const addressStreet = cell(row, "site_address_street", "site_street", "location_address", "address_street", "adresse_rue");
  const addressPostalCode = cell(row, "site_address_postal_code", "site_postal_code", "location_postal_code", "postal_code", "code_postal");
  const addressCity = cell(row, "site_address_city", "site_city", "location_city", "city", "ville");
  const addressCountry = cell(row, "site_address_country", "site_country", "location_country", "country", "pays") || "France";
  const name = cell(row, "site_name", "site", "location_name") || (addressStreet || addressCity ? "Primary" : "");
  if (!name && !addressStreet && !addressCity && !addressPostalCode) return undefined;
  return [{
    name: name || "Primary",
    id: cell(row, "site_id") || undefined,
    addressStreet: addressStreet || undefined,
    addressPostalCode: addressPostalCode || undefined,
    addressCity: addressCity || undefined,
    addressCountry,
    latitude: parseNumber(cell(row, "site_latitude", "location_latitude")),
    longitude: parseNumber(cell(row, "site_longitude", "location_longitude")),
    notes: cell(row, "site_notes", "location_notes") || undefined,
    isPrimary: parseBool(cell(row, "site_is_primary", "location_is_primary"), true),
    sortOrder: parseNumber(cell(row, "site_sort_order")) ?? 0
  }];
}

function buildCompanyPayload(row) {
  const name = cell(row, "name", "company_name", "nom", "entreprise", "company");
  const payload = {
    name
  };
  const clientNumber = cell(row, "client_number", "clientNumber", "numero", "numero_client");
  const address = cell(row, "address", "adresse");
  const siret = cell(row, "legal_identifier", "legal_id", "siret", "siren");
  const secteur = cell(row, "industry_sector", "industry", "secteur", "sector");
  const commercialId = cell(row, "commercial_id", "commercialId", "account_manager_id", "account_manager", "commercial");
  if (clientNumber) payload.clientNumber = clientNumber;
  if (address) payload.address = address;
  if (siret) payload.siret = siret;
  if (secteur) payload.secteur = secteur;
  if (commercialId) payload.commercialId = commercialId;

  // If no flat company address, compose one from the primary location.
  if (!payload.address) {
    const street = cell(row, "site_address_street", "location_address", "address_street");
    const postal = cell(row, "site_address_postal_code", "location_postal_code", "postal_code");
    const city = cell(row, "site_address_city", "location_city", "city");
    const composed = [street, [postal, city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    if (composed) payload.address = composed;
  }

  const contrat = buildContratFromRow(row);
  if (contrat) payload.contrat = contrat;
  const options = buildOptionsFromRow(row);
  if (options) payload.options = options;
  const sites = buildSitesFromRow(row);
  if (sites) payload.sites = sites;

  return payload;
}

function buildCompanyUpdateExtras(row) {
  const extras = {};
  // Note: v_b_clients has no email/phone columns — do not send them on update.
  const ssids = parseJsonCell(cell(row, "ssids", "ssid"));
  const office365 = parseJsonCell(cell(row, "office365_data")) ?? (cell(row, "office365_data") || undefined);
  if (ssids !== undefined) extras.ssids = ssids;
  if (office365 !== undefined) extras.office365_data = office365;
  return extras;
}

export function parseInjectionCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: h => String(h || "").trim(),
      complete: result => {
        const rows = (result.data || []).filter(row => Object.values(row || {}).some(v => String(v || "").trim() !== ""));
        resolve({
          rows,
          meta: result.meta,
          errors: result.errors || []
        });
      },
      error: err => reject(err)
    });
  });
}

export function downloadCsvTemplate(entity) {
  const content = CSV_TEMPLATES[entity] || "";
  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `veritas-injection-${entity}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function buildClientIndex() {
  const list = await fetchClientsList();
  const byId = new Map();
  const byName = new Map();
  for (const client of Array.isArray(list) ? list : []) {
    const id = Number(client.id);
    if (!Number.isFinite(id)) continue;
    byId.set(id, client);
    const name = String(client.name || "").trim().toLowerCase();
    if (name) byName.set(name, client);
  }
  return {
    byId,
    byName
  };
}

function resolveClient(row, index) {
  const idRaw = cell(row, "client_id", "clientId", "id_client");
  if (idRaw) {
    const id = Number(idRaw);
    if (index.byId.has(id)) return index.byId.get(id);
    return {
      id,
      name: cell(row, "client_name", "clientName", "entreprise") || `#${id}`
    };
  }
  const name = cell(row, "client_name", "clientName", "entreprise", "company");
  if (!name) return null;
  return index.byName.get(name.toLowerCase()) || null;
}

function resolveFamily(raw) {
  const key = String(raw || "").trim().toLowerCase().replace(/\s+/g, "");
  if (!key) return "";
  return FAMILY_ALIASES[key] || key;
}

function isKnownEquipmentFamily(family) {
  return CANONICAL_EQUIPMENT_FAMILIES.has(String(family || "").trim().toLowerCase());
}

export async function runInjection({
  entity,
  rows,
  filesByName = new Map(),
  onProgress,
  messages,
  control
}) {
  const report = createEmptyReport();
  const push = makePusher(report, onProgress, rows.length);
  const msg = messages || DEFAULT_INJECTION_ERRORS;

  if (entity === "companies") {
    return runAtomicBatch({
      rows,
      onProgress,
      report,
      push,
      messages: msg,
      control,
      validateRow: (row, line) => {
        const payload = buildCompanyPayload(row);
        if (!payload.name) return { error: injectionError(msg, "missingName") };
        return {
          prepared: {
            payload,
            extras: buildCompanyUpdateExtras(row),
            contactPayload: buildContactPayloadFromCompanyRow(row),
            label: payload.name
          }
        };
      },
      executePrepared: async prepared => {
        const created = await addClient(prepared.payload);
        let contactId = null;
        if (prepared.contactPayload && created?.id) {
          const contact = await addContact({
            ...prepared.contactPayload,
            client_id: created.id
          });
          contactId = contact?.id || null;
        }
        const extras = prepared.extras && typeof prepared.extras === "object" ? prepared.extras : {};
        if (created?.id && Object.keys(extras).length) {
          try {
            await updateClient(created.id, extras);
          } catch (err) {
            // email/phone (etc.) may be absent from v_b_clients — creation already succeeded.
            const msg = String(err?.message || err || "");
            if (!/no data to update/i.test(msg)) throw err;
          }
        }
        return {
          id: created?.id,
          contactId,
          label: prepared.label
        };
      },
      rollbackCreated: async created => {
        if (created?.contactId) {
          await deleteContact(created.contactId).catch(() => {});
        }
        if (!created?.id) return;
        try {
          await deleteClient(created.id);
        } catch {
          await deleteClient(created.id, { force: true }).catch(() => {});
        }
      }
    });
  }

  const clientIndex = await buildClientIndex();

  if (entity === "contacts") {
    return runAtomicBatch({
      rows,
      onProgress,
      report,
      push,
      messages: msg,
      control,
      validateRow: (row, line) => {
        const nom = cell(row, "contact_name", "nom", "lastname", "last_name");
        if (!nom) return { error: injectionError(msg, "missingNom") };
        const client = resolveClient(row, clientIndex);
        if (!client?.id && cell(row, "client_name", "clientName", "entreprise")) {
          return {
            error: injectionError(msg, "clientNotFound", {
              value: cell(row, "client_name", "clientName", "entreprise")
            })
          };
        }
        const communications = parseJsonCell(cell(row, "communications"));
        return {
          prepared: {
            payload: {
              nom,
              prenom: cell(row, "contact_firstname", "contact_prenom", "prenom", "firstname", "first_name") || undefined,
              sexe: cell(row, "contact_sexe", "contact_gender", "sexe", "gender") || undefined,
              email: cell(row, "contact_mail", "contact_email", "email") || undefined,
              telephone: cell(row, "contact_number", "contact_phone", "contact_telephone", "telephone", "phone", "tel") || undefined,
              poste: cell(row, "contact_job", "contact_poste", "poste", "job_title", "role") || undefined,
              statut: normalizeContactStatus(cell(row, "contact_statut", "contact_status", "statut", "status")),
              client_id: client?.id || null,
              ...(client?.id ? {
                memberships: [{
                  client_id: client.id,
                  poste: cell(row, "contact_job", "contact_poste", "poste", "job_title", "role") || null,
                  is_primary: String(cell(row, "contact_job", "contact_poste", "poste", "job_title", "role") || "").toLowerCase().includes("principal")
                }]
              } : {}),
              ...(communications !== undefined ? { communications } : {})
            },
            label: `${nom}${client?.name ? ` · ${client.name}` : ""}`
          }
        };
      },
      executePrepared: async prepared => {
        const created = await addContact(prepared.payload);
        return {
          id: created?.id,
          label: prepared.label
        };
      },
      rollbackCreated: async created => {
        if (created?.id) await deleteContact(created.id);
      }
    });
  }

  if (entity === "documents") {
    return runDocumentsInjectionFromCsv({ rows, filesByName, clientIndex, onProgress, messages: msg, control });
  }

  if (entity === "equipment") {
    return runAtomicBatch({
      rows,
      onProgress,
      report,
      push,
      messages: msg,
      control,
      validateRow: (row, line) => {
        const client = resolveClient(row, clientIndex);
        if (!client?.id) {
          return {
            error: injectionError(msg, "clientNotFound", {
              value: cell(row, "client_name", "clientName", "client_id") || "?"
            })
          };
        }
        const family = resolveFamily(cell(row, "family", "famille", "type"));
        const name = cell(row, "name", "nom", "hostname");
        if (!family || !name) return { error: injectionError(msg, "missingFamilyOrName") };
        if (!isKnownEquipmentFamily(family)) {
          return {
            error: injectionError(msg, "unknownFamily", {
              family: cell(row, "family", "famille", "type") || family
            })
          };
        }
        const dataJson = parseJsonCell(cell(row, "data_json", "data"));
        const data = dataJson && typeof dataJson === "object" ? { ...dataJson } : { nom: name };
        if (!data.nom) data.nom = name;
        const ip = cell(row, "ip", "adresse_ip");
        const os = cell(row, "os", "system", "systeme");
        const notes = cell(row, "notes", "note", "description", "commentaire");
        if (ip) data.ip = ip;
        if (os) {
          data.os = os;
          if (!data.systeme) data.systeme = os;
        }
        if (notes) {
          data.notes = notes;
          if (!data.commentaire) data.commentaire = notes;
        }
        for (const [rawKey, rawValue] of Object.entries(row || {})) {
          const key = normKey(rawKey);
          if (!key.startsWith("data_") || key === "data_json") continue;
          const field = canonicalizeEquipmentDataField(
            String(rawKey).slice(String(rawKey).toLowerCase().indexOf("data_") + 5)
          );
          const value = coerceValue(rawValue);
          if (value !== undefined) data[field] = value;
        }
        return {
          prepared: {
            clientId: client.id,
            family,
            item: {
              name,
              item_key: cell(row, "item_key", "itemKey", "key") || undefined,
              data,
              is_active: parseBool(cell(row, "is_active", "active"), true)
            },
            label: `${family}/${name} → ${client.name}`
          }
        };
      },
      executePrepared: async prepared => {
        const created = await createClientModuleItem(prepared.clientId, prepared.family, prepared.item);
        return {
          id: created?.id,
          clientId: prepared.clientId,
          family: prepared.family,
          label: prepared.label
        };
      },
      rollbackCreated: async created => {
        if (created?.id && created?.clientId && created?.family) {
          await deleteClientModuleItem(created.clientId, created.family, created.id);
        }
      }
    });
  }

  if (entity === "tickets") {
    return runAtomicBatch({
      rows,
      onProgress,
      report,
      push,
      messages: msg,
      control,
      validateRow: (row, line) => {
        const title = cell(row, "title", "titre", "subject");
        if (!title) return { error: injectionError(msg, "missingTitle") };
        const client = resolveClient(row, clientIndex);
        if (cell(row, "client_name", "clientName", "client_id") && !client?.id) {
          return {
            error: injectionError(msg, "clientNotFound", {
              value: cell(row, "client_name", "clientName", "client_id")
            })
          };
        }
        const assignedUserId = cell(row, "assigned_user_id", "assignedUserId", "assignee");
        const requesterContactId = cell(row, "requester_contact_id", "requesterContactId", "contact_id");
        return {
          prepared: {
            payload: {
              title,
              description: cell(row, "description", "desc") || "",
              priority: cell(row, "priority", "priorite") || "normal",
              status: cell(row, "status", "statut") || "new",
              type: cell(row, "type") || "incident",
              category: cell(row, "category", "categorie") || "",
              channel: cell(row, "channel", "canal") || "web",
              clientId: client?.id || null,
              isMajorIncident: parseBool(cell(row, "is_major_incident", "isMajorIncident", "major"), false),
              ...(assignedUserId ? { assignedUserId } : {}),
              ...(requesterContactId ? {
                requesterContactId: Number(requesterContactId) || requesterContactId
              } : {})
            },
            label: title
          }
        };
      },
      executePrepared: async prepared => {
        const created = await createTicket(prepared.payload);
        return {
          id: created?.id,
          label: prepared.label
        };
      },
      rollbackCreated: async created => {
        if (!created?.id) return;
        try {
          await permanentlyDeleteTicket(created.id);
        } catch {
          await permanentlyDeleteTicket(created.id).catch(() => {});
        }
      }
    });
  }

  push("error", 0, injectionError(msg, "unknownEntity", { entity }));
  return report;
}

function createEmptyReport() {
  return {
    ok: 0,
    failed: 0,
    skipped: 0,
    aborted: false,
    lines: []
  };
}

function makePusher(report, onProgress, total) {
  return (status, line, message) => {
    report.lines.push({
      status,
      line,
      message
    });
    if (status === "ok") report.ok += 1;
    else if (status === "skip") report.skipped += 1;
    else report.failed += 1;
    onProgress?.({
      ...report,
      current: Math.min(line || report.lines.length, total),
      total
    });
  };
}

/**
 * All-or-nothing injection:
 * 1) validate every row first — any error => inject nothing
 * 2) execute — on first API failure, rollback everything already created
 */
async function runAtomicBatch({
  rows,
  onProgress,
  report = createEmptyReport(),
  push = makePusher(report, onProgress, rows.length),
  validateRow,
  executePrepared,
  rollbackCreated,
  getLine = index => index + 2,
  messages,
  control
}) {
  const msg = messages || DEFAULT_INJECTION_ERRORS;
  const plans = [];
  let validationFailed = false;

  for (let i = 0; i < rows.length; i += 1) {
    await control?.checkpoint?.();
    const row = rows[i];
    const line = getLine(i, row);
    const result = validateRow(row, line) || {};
    if (result.error) {
      validationFailed = true;
      push("error", line, result.error);
      continue;
    }
    plans.push({
      line,
      prepared: result.prepared
    });
  }

  if (validationFailed) {
    report.aborted = true;
    report.ok = 0;
    push("error", 0, injectionError(msg, "validationAborted"));
    onProgress?.({
      ...report,
      current: rows.length,
      total: rows.length
    });
    return report;
  }

  const created = [];
  try {
    for (let i = 0; i < plans.length; i += 1) {
      await control?.checkpoint?.();
      const plan = plans[i];
      onProgress?.({
        ...report,
        current: i + 1,
        total: plans.length,
        ok: created.length,
        failed: 0,
        skipped: 0,
        paused: Boolean(control?.paused)
      });
      const createdItem = await executePrepared(plan.prepared);
      created.push({
        ...createdItem,
        line: plan.line,
        label: createdItem?.label || plan.prepared?.label || injectionError(msg, "ok")
      });
    }
    for (const item of created) {
      push("ok", item.line, item.label);
    }
    return report;
  } catch (err) {
    const cancelledByUser = isInjectionCancelledError(err);
    const message = cancelledByUser
      ? injectionError(msg, "userCancelled", { count: created.length })
      : err?.message || String(err);
    const failedLine = cancelledByUser
      ? plans[created.length]?.line || created[created.length - 1]?.line || 0
      : plans[created.length]?.line || created[created.length - 1]?.line || 0;
    for (let i = created.length - 1; i >= 0; i -= 1) {
      try {
        await rollbackCreated(created[i]);
      } catch (rollbackErr) {
        console.warn("[injection] rollback failed", created[i], rollbackErr);
      }
    }
    report.aborted = true;
    report.cancelled = cancelledByUser;
    report.ok = 0;
    report.failed = cancelledByUser ? 0 : 1;
    report.skipped = 0;
    report.lines = cancelledByUser
      ? [{
          status: "error",
          line: failedLine,
          message
        }]
      : [{
          status: "error",
          line: failedLine,
          message: err?.message || String(err)
        }, {
          status: "error",
          line: 0,
          message: injectionError(msg, "rollbackAborted", {
            count: created.length
          })
        }];
    onProgress?.({
      ...report,
      current: rows.length,
      total: rows.length
    });
    return report;
  }
}

async function runDocumentsInjectionFromCsv({ rows, filesByName, clientIndex, onProgress, messages, control }) {
  const report = createEmptyReport();
  const push = makePusher(report, onProgress, rows.length);
  const msg = messages || DEFAULT_INJECTION_ERRORS;
  return runAtomicBatch({
    rows,
    onProgress,
    report,
    push,
    messages: msg,
    control,
    validateRow: (row, line) => {
      const client = resolveClient(row, clientIndex);
      if (!client?.id) {
        return {
          error: injectionError(msg, "clientNotFound", {
            value: cell(row, "client_name", "clientName", "client_id") || "?"
          })
        };
      }
      const filename = cell(row, "filename", "file", "fichier");
      if (!filename) return { error: injectionError(msg, "missingFilename") };
      const file = filesByName.get(filename) || filesByName.get(filename.toLowerCase());
      if (!file) {
        return {
          error: injectionError(msg, "fileNotSelected", {
            filename
          })
        };
      }
      return {
        prepared: {
          upload: {
            clientId: client.id,
            clientName: client.name,
            category: cell(row, "category", "categorie") || "Autre",
            description: cell(row, "description") || "",
            file,
            visibleToClient: parseBool(cell(row, "visible_to_client", "visibleToClient", "visible_client"), false)
          },
          label: `${filename} → ${client.name}`
        }
      };
    },
    executePrepared: async prepared => {
      const created = await uploadClientFile(prepared.upload);
      return {
        id: created?.id,
        label: prepared.label
      };
    },
    rollbackCreated: async created => {
      if (created?.id) await deleteClientFile(created.id);
    }
  });
}

/** Inject pre-configured document drafts from the management modal (all-or-nothing). */
export async function runDocumentsInjection({ drafts, onProgress, messages, control } = {}) {
  const items = Array.isArray(drafts) ? drafts : [];
  const report = createEmptyReport();
  const push = makePusher(report, onProgress, items.length);
  const msg = messages || DEFAULT_INJECTION_ERRORS;
  const clients = await fetchClientsList().catch(() => []);
  const byId = new Map((clients || []).map(c => [String(c.id), c]));

  return runAtomicBatch({
    rows: items,
    onProgress,
    report,
    push,
    messages: msg,
    control,
    getLine: index => index + 1,
    validateRow: item => {
      const client = byId.get(String(item.clientId || ""));
      if (!client?.id) {
        return {
          error: injectionError(msg, "clientNotFound", {
            value: item.fileName || "?"
          })
        };
      }
      if (!item.file) {
        return {
          error: injectionError(msg, "missingFile", {
            filename: item.fileName || "?"
          })
        };
      }
      return {
        prepared: {
          upload: {
            clientId: client.id,
            clientName: client.name,
            category: item.category || "Autre",
            description: item.description || "",
            file: item.file,
            visibleToClient: Boolean(item.visibleToClient)
          },
          label: `${item.fileName || item.file.name} → ${client.name}`
        }
      };
    },
    executePrepared: async prepared => {
      const created = await uploadClientFile(prepared.upload);
      return {
        id: created?.id,
        label: prepared.label
      };
    },
    rollbackCreated: async created => {
      if (created?.id) await deleteClientFile(created.id);
    }
  });
}

