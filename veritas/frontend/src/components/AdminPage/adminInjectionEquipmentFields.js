/** Catalogue des champs métier CSV équipements (colonnes data_* → data.<clé>). */

function L(fr, en, de, it, es) {
  return { fr, en, de: de || en, it: it || en, es: es || en };
}

function pickLocale(map, locale) {
  const key = String(locale || "en").toLowerCase().slice(0, 2);
  return map?.[key] || map?.en || map?.fr || "";
}

/** English CSV suffix for a French (or mixed) data.* key. */
export const EQUIPMENT_CSV_KEY_BY_DATA_KEY = {
  marque: "brand",
  modele: "model",
  numeroSerie: "serial_number",
  systeme: "system",
  processeur: "processor",
  memoire: "memory",
  adresseMac: "mac_address",
  fournisseur: "vendor",
  categorie: "category",
  debit: "bandwidth",
  debitDownload: "download_bandwidth",
  debitUpload: "upload_bandwidth",
  purchaseDate: "purchase_date",
  invoiceNumber: "invoice_number",
  installDate: "install_date",
  commentaire: "comment",
  expirationGarantie: "warranty_end",
  capacite: "capacity",
  nbDisquesActuels: "current_drives",
  nbDisquesMax: "max_drives",
  capaciteVA: "capacity_va",
  capaciteW: "capacity_w",
  nbPrises: "outlet_count",
  dateBatterie: "battery_date",
  empilage: "stacking",
  alimentationPoE: "poe_powered",
  ipNonFixe: "non_static_ip",
  numeroLigne: "line_number",
  referenceContrat: "contract_ref",
  supportTelephone: "support_phone",
  dateMiseEnService: "go_live_date",
  boxModele: "box_model",
  nombreExtensions: "extension_count",
  domaineSip: "sip_domain",
  domaine: "domain",
  stockage: "disk_storage",
  gateway: "gateway",
  manageable: "managed",
  adminUrl: "admin_url",
  poeSupport: "poe",
  remoteAccessSolution: "remote_access",
  remoteAccessId: "remote_access_id",
  quickConnect: "quick_connect",
  supportReference: "support_reference",
  supportContract: "support_contract",
  netbios: "hostname"
};

export function equipmentCsvColumnForDataKey(dataKey) {
  const key = String(dataKey || "").trim();
  const csv = EQUIPMENT_CSV_KEY_BY_DATA_KEY[key] || key;
  return `data_${csv}`;
}

const SHARED_HARDWARE = [
  { key: "site", label: L("Site / emplacement", "Site / location"), values: L("Texte libre, ex. HQ, Accueil, Salle serveur", "Free text, e.g. HQ, Lobby, Server room") },
  { key: "purchaseDate", label: L("Date d'achat", "Purchase date"), values: L("Date, ex. 2026-01-15", "Date, e.g. 2026-01-15") },
  { key: "invoiceNumber", label: L("Numero de facture", "Invoice number"), values: L("Texte, ex. FAC-2026-001", "Text, e.g. INV-2026-001") },
  { key: "installDate", label: L("Date d'installation", "Installation date"), values: L("Date, ex. 2026-02-01", "Date, e.g. 2026-02-01") },
  { key: "marque", label: L("Marque", "Brand"), values: L("Texte libre, ex. Dell, Cisco, Fortinet, Lenovo", "Free text, e.g. Dell, Cisco, Fortinet, Lenovo") },
  { key: "modele", label: L("Modèle", "Model"), values: L("Texte libre, ex. PowerEdge R650, ThinkPad T14", "Free text, e.g. PowerEdge R650, ThinkPad T14") },
  { key: "numeroSerie", label: L("N° de série", "Serial number"), values: L("Texte libre, ex. SN-SRV-001", "Free text, e.g. SN-SRV-001") },
  { key: "vlan", label: L("VLAN", "VLAN"), values: L("Numéro, ex. 10", "Number, e.g. 10") },
  { key: "expirationGarantie", label: L("Fin de garantie", "Warranty end"), values: L("Date, ex. 2027-12-31", "Date, e.g. 2027-12-31") },
  { key: "commentaire", label: L("Commentaire", "Comment"), values: L("Texte libre, ex. Contrôleur de domaine", "Free text, e.g. Domain controller") }
];

const FAMILY_COLUMN_VALUES = {
  servers: L("servers | serveurs, ex. servers", "servers | serveurs, e.g. servers"),
  internet: L("internet, ex. internet", "internet, e.g. internet"),
  switch: L("switch | switches, ex. switch", "switch | switches, e.g. switch"),
  firewall: L("firewall | firewalls, ex. firewall", "firewall | firewalls, e.g. firewall"),
  wifi: L("wifi | accesspoint, ex. wifi", "wifi | accesspoint, e.g. wifi"),
  stockage: L("stockage | storage | nas, ex. storage", "stockage | storage | nas, e.g. storage"),
  alimentation: L("alimentation | power | ups, ex. power", "alimentation | power | ups, e.g. power"),
  routeur: L("routeur | router, ex. router", "routeur | router, e.g. router"),
  toip: L("toip | voip, ex. toip", "toip | voip, e.g. toip"),
  ordinateurs: L("ordinateurs | workstations | computers, ex. workstations", "ordinateurs | workstations | computers, e.g. workstations")
};

function equipmentBaseFields(familyId) {
  return [
    { key: "_client_name", csvColumn: "client_name", label: L("Entreprise", "Company"), values: L("Nom exact, ex. Acme SAS (sinon client_id)", "Exact name, e.g. Acme SAS (or client_id)") },
    { key: "_client_id", csvColumn: "client_id", label: L("ID entreprise", "Company ID"), values: L("Identifiant numérique, ex. 42", "Numeric id, e.g. 42") },
    { key: "_family", csvColumn: "family", label: L("Famille d'équipement", "Equipment family"), values: FAMILY_COLUMN_VALUES[familyId] || L(familyId, familyId) },
    { key: "_name", csvColumn: "name", label: L("Nom de l'équipement", "Equipment name"), values: L("Texte, ex. SRV-AD-01, PC-COMPTA-01", "Text, e.g. SRV-AD-01, PC-COMPTA-01") },
    { key: "_item_key", csvColumn: "item_key", label: L("Clé interne", "Internal key"), values: L("Optionnel, ex. srv-ad-01", "Optional, e.g. srv-ad-01") },
    { key: "_ip", csvColumn: "ip", label: L("Adresse IP", "IP address"), values: L("Ex. 10.0.0.10", "e.g. 10.0.0.10") },
    { key: "_os", csvColumn: "os", label: L("Système d'exploitation", "Operating system"), values: L("Ex. Windows 11 Pro, Windows Server 2022", "e.g. Windows 11 Pro, Windows Server 2022") },
    { key: "_notes", csvColumn: "notes", label: L("Notes", "Notes"), values: L("Texte libre, ex. Contrôleur de domaine", "Free text, e.g. Domain controller") },
    { key: "_is_active", csvColumn: "is_active", label: L("Actif", "Active"), values: L("true | false, ex. true", "true | false, e.g. true") }
  ];
}

export const EQUIPMENT_INJECTION_FAMILIES = [
  {
    id: "servers",
    icon: "mdi:server",
    label: L("Serveurs", "Servers", "Server", "Server", "Servidores"),
    fields: [
      { key: "type", label: L("Type", "Type"), values: L("physique | virtuel, ex. physical", "physique | virtuel, e.g. physical") },
      ...SHARED_HARDWARE,
      { key: "systeme", label: L("Système / OS", "OS"), values: L("Texte, ex. Windows Server 2022 Standard", "Text, e.g. Windows Server 2022 Standard") },
      { key: "processeur", label: L("Processeur / vCPU", "CPU / vCPU"), values: L("Texte, ex. Xeon Gold, 8 vCPU", "Text, e.g. Xeon Gold, 8 vCPU") },
      { key: "memoire", label: L("Mémoire / RAM", "Memory / RAM"), values: L("Texte, ex. 64 Go", "Text, e.g. 64 GB") },
      { key: "stockage", label: L("Stockage disque", "Disk storage"), values: L("Texte, ex. 2 To", "Text, e.g. 2 TB") },
      { key: "hypervisor", label: L("Hyperviseur (VM)", "Hypervisor (VM)"), values: L("Texte, ex. VMware ESXi, Hyper-V", "Text, e.g. VMware ESXi, Hyper-V") },
      { key: "remoteAccessSolution", label: L("Accès distant", "Remote access"), values: L("anydesk | teamviewer | autre, ex. anydesk", "anydesk | teamviewer | other, e.g. anydesk") },
      { key: "remoteAccessId", label: L("ID accès distant", "Remote access ID"), values: L("Identifiant, ex. 123 456 789", "ID, e.g. 123 456 789") }
    ],
    jsonHint: L(
      "JSON, ex. {\"role\":[\"AD\",\"DNS\"],\"modeHA\":true}",
      "JSON, e.g. {\"role\":[\"AD\",\"DNS\"],\"modeHA\":true}"
    )
  },
  {
    id: "internet",
    icon: "mdi:wan",
    label: L("Internet", "Internet"),
    fields: [
      { key: "type", label: L("Type de lien", "Link type"), values: L("Fibre | ADSL | 4G | 5G | Satellite…, ex. Fibre", "Fibre | ADSL | 4G | 5G | Satellite…, e.g. Fibre") },
      { key: "fournisseur", label: L("Fournisseur", "ISP"), values: L("Texte, ex. Orange, SFR", "Text, e.g. Orange, SFR") },
      { key: "categorie", label: L("Catégorie", "Category"), values: L("Primary | Backup, ex. Primary", "Primary | Backup, e.g. Primary") },
      { key: "debit", label: L("Débit", "Bandwidth"), values: L("Texte, ex. 1 Gbit/s", "Text, e.g. 1 Gbps") },
      { key: "debitDownload", label: L("Débit desc.", "Download"), values: L("Texte, ex. 1 Gbit/s", "Text, e.g. 1 Gbps") },
      { key: "debitUpload", label: L("Débit mont.", "Upload"), values: L("Texte, ex. 200 Mbit/s", "Text, e.g. 200 Mbps") },
      { key: "ipNonFixe", label: L("IP non fixe", "Non-static IP"), values: L("true | false, ex. false", "true | false, e.g. false") },
      { key: "numeroLigne", label: L("N° de ligne", "Line number"), values: L("Texte, ex. 09 70 12 34 56", "Text, e.g. 09 70 12 34 56") },
      { key: "referenceContrat", label: L("Réf. contrat", "Contract ref."), values: L("Texte, ex. CTR-FIBRE-001", "Text, e.g. CTR-FIBRE-001") },
      { key: "supportTelephone", label: L("Tél. support", "Support phone"), values: L("Texte, ex. 3900", "Text, e.g. 3900") },
      { key: "dateMiseEnService", label: L("Mise en service", "Go-live date"), values: L("Date, ex. 2024-03-15", "Date, e.g. 2024-03-15") },
      { key: "boxModele", label: L("Modèle box", "Box model"), values: L("Texte, ex. Livebox 6", "Text, e.g. Livebox 6") },
      { key: "gateway", label: L("Passerelle", "Gateway"), values: L("IP ou hostname, ex. 192.168.1.1", "IP or hostname, e.g. 192.168.1.1") },
      { key: "site", label: L("Site", "Site"), values: L("Texte libre, ex. HQ", "Free text, e.g. HQ") },
      { key: "commentaire", label: L("Commentaire", "Comment"), values: L("Texte libre, ex. Lien principal", "Free text, e.g. Primary link") }
    ]
  },
  {
    id: "switch",
    icon: "mdi:switch",
    label: L("Switch", "Switches", "Switches", "Switch", "Switches"),
    fields: [
      ...SHARED_HARDWARE,
      { key: "firmware", label: L("Firmware", "Firmware"), values: L("Version, ex. 17.3.4", "Version, e.g. 17.3.4") },
      { key: "adresseMac", label: L("Adresse MAC", "MAC address"), values: L("Ex. aa:bb:cc:dd:ee:01", "e.g. aa:bb:cc:dd:ee:01") },
      { key: "manageable", label: L("Manageable", "Managed"), values: L("true | false, ex. true", "true | false, e.g. true") },
      { key: "adminUrl", label: L("URL admin", "Admin URL"), values: L("URL, ex. https://10.0.0.2", "URL, e.g. https://10.0.0.2") },
      { key: "poeSupport", label: L("PoE", "PoE"), values: L("true | false, ex. true", "true | false, e.g. true") },
      { key: "empilage", label: L("Empilage / stack", "Stacking"), values: L("true | false, ex. false", "true | false, e.g. false") }
    ]
  },
  {
    id: "firewall",
    icon: "mdi:firewall",
    label: L("Firewall", "Firewall"),
    fields: [
      { key: "type", label: L("Type", "Type"), values: L("materiel | virtuel | cloud | logiciel | autre, ex. materiel", "materiel | virtuel | cloud | logiciel | autre, e.g. materiel") },
      ...SHARED_HARDWARE,
      { key: "firmware", label: L("Firmware", "Firmware"), values: L("Version, ex. 7.2.5", "Version, e.g. 7.2.5") }
    ],
    jsonHint: L(
      "JSON, ex. {\"licences\":[{\"nom\":\"FortiCare\",\"expiration\":\"2027-01-01\"}],\"modeHA\":true}",
      "JSON, e.g. {\"licences\":[{\"nom\":\"FortiCare\",\"expiration\":\"2027-01-01\"}],\"modeHA\":true}"
    )
  },
  {
    id: "wifi",
    icon: "mdi:wifi",
    label: L("Borne Wi‑Fi", "Wi‑Fi access points", "WLAN-APs", "Access point Wi‑Fi", "Puntos Wi‑Fi"),
    fields: [
      ...SHARED_HARDWARE,
      { key: "firmware", label: L("Firmware", "Firmware"), values: L("Version, ex. 6.5", "Version, e.g. 6.5") },
      { key: "adresseMac", label: L("Adresse MAC", "MAC address"), values: L("Ex. aa:bb:cc:dd:ee:50", "e.g. aa:bb:cc:dd:ee:50") },
      { key: "alimentationPoE", label: L("Alim. PoE", "PoE powered"), values: L("true | false, ex. true", "true | false, e.g. true") }
    ],
    jsonHint: L(
      "JSON, ex. {\"ssids\":[\"ssid-accueil\"]}",
      "JSON, e.g. {\"ssids\":[\"ssid-lobby\"]}"
    )
  },
  {
    id: "stockage",
    icon: "mdi:nas",
    label: L("Stockage / NAS", "Storage / NAS", "Storage / NAS", "Storage / NAS", "Almacenamiento / NAS"),
    fields: [
      { key: "type", label: L("Type", "Type"), values: L("NAS | SAN | Virtual storage | Cloud storage | Robot de sauvegarde | Disque dur externe, ex. NAS", "NAS | SAN | Virtual storage | Cloud storage | Robot de sauvegarde | Disque dur externe, e.g. NAS") },
      ...SHARED_HARDWARE,
      { key: "role", label: L("Rôle", "Role"), values: L("Texte libre, ex. Backup cible", "Free text, e.g. Backup target") },
      { key: "raid", label: L("RAID", "RAID"), values: L("RAID 1 | RAID 5 | RAID 10…, ex. RAID 5", "RAID 1 | RAID 5 | RAID 10…, e.g. RAID 5") },
      { key: "capacite", label: L("Capacité", "Capacity"), values: L("Texte, ex. 20 To", "Text, e.g. 20 TB") },
      { key: "nbDisquesActuels", label: L("Disques actuels", "Current drives"), values: L("Nombre, ex. 4", "Number, e.g. 4") },
      { key: "nbDisquesMax", label: L("Disques max", "Max drives"), values: L("Nombre, ex. 8", "Number, e.g. 8") },
      { key: "quickConnect", label: L("QuickConnect (Synology)", "QuickConnect (Synology)"), values: L("Identifiant, ex. acme-nas", "ID, e.g. acme-nas") }
    ],
    jsonHint: L(
      "JSON, ex. {\"disques\":[{\"nom\":\"Disk 1\",\"taille\":\"4 To\"}]}",
      "JSON, e.g. {\"disques\":[{\"nom\":\"Disk 1\",\"taille\":\"4 TB\"}]}"
    )
  },
  {
    id: "alimentation",
    icon: "mdi:power-plug",
    label: L("Alimentation / UPS", "Power / UPS", "Strom / USV", "Alimentazione / UPS", "Alimentación / UPS"),
    fields: [
      { key: "type", label: L("Type", "Type"), values: L("Onduleur | PDU, ex. Onduleur", "Onduleur | PDU, e.g. Onduleur") },
      ...SHARED_HARDWARE,
      { key: "firmware", label: L("Firmware", "Firmware"), values: L("Version, ex. 3.1", "Version, e.g. 3.1") },
      { key: "capaciteVA", label: L("Capacité VA", "Capacity VA"), values: L("Nombre, ex. 3000", "Number, e.g. 3000") },
      { key: "capaciteW", label: L("Puissance W", "Power W"), values: L("Nombre, ex. 2700", "Number, e.g. 2700") },
      { key: "nbPrises", label: L("Nb prises (PDU)", "Outlets (PDU)"), values: L("Nombre, ex. 12", "Number, e.g. 12") },
      { key: "dateBatterie", label: L("Date batterie", "Battery date"), values: L("Date, ex. 2025-06-01", "Date, e.g. 2025-06-01") },
      { key: "adresseMac", label: L("Adresse MAC", "MAC address"), values: L("Ex. aa:bb:cc:dd:ee:30", "e.g. aa:bb:cc:dd:ee:30") },
      { key: "manageable", label: L("Manageable", "Managed"), values: L("true | false, ex. true", "true | false, e.g. true") },
      { key: "adminUrl", label: L("URL admin", "Admin URL"), values: L("URL, ex. https://10.0.0.30", "URL, e.g. https://10.0.0.30") }
    ]
  },
  {
    id: "routeur",
    icon: "mdi:router-wireless",
    label: L("Routeur / SD-WAN", "Router / SD-WAN"),
    fields: [
      { key: "type", label: L("Type", "Type"), values: L("Routeur | SD-WAN, ex. Routeur", "Routeur | SD-WAN, e.g. Routeur") },
      ...SHARED_HARDWARE,
      { key: "firmware", label: L("Firmware", "Firmware"), values: L("Version, ex. 17.6", "Version, e.g. 17.6") },
      { key: "adresseMac", label: L("Adresse MAC", "MAC address"), values: L("Ex. aa:bb:cc:dd:ee:fe", "e.g. aa:bb:cc:dd:ee:fe") },
      { key: "adminUrl", label: L("URL admin", "Admin URL"), values: L("URL, ex. https://10.0.0.254", "URL, e.g. https://10.0.0.254") }
    ]
  },
  {
    id: "toip",
    icon: "mdi:phone-in-talk",
    label: L("TOIP / VoIP", "VoIP / TOIP"),
    fields: [
      { key: "type", label: L("Type", "Type"), values: L("IP-PBX | Passerelle | SBC | Phone IP | Autre, ex. IP-PBX", "IP-PBX | Passerelle | SBC | Phone IP | Autre, e.g. IP-PBX") },
      ...SHARED_HARDWARE,
      { key: "firmware", label: L("Firmware", "Firmware"), values: L("Version, ex. 18", "Version, e.g. 18") },
      { key: "nombreExtensions", label: L("Nb extensions", "Extensions count"), values: L("Nombre, ex. 24", "Number, e.g. 24") },
      { key: "domaineSip", label: L("Domaine SIP", "SIP domain"), values: L("Texte, ex. sip.acme.test", "Text, e.g. sip.acme.test") },
      { key: "adresseMac", label: L("Adresse MAC", "MAC address"), values: L("Ex. aa:bb:cc:dd:ee:40", "e.g. aa:bb:cc:dd:ee:40") },
      { key: "manageable", label: L("Manageable", "Managed"), values: L("true | false, ex. true", "true | false, e.g. true") },
      { key: "adminUrl", label: L("URL admin", "Admin URL"), values: L("URL, ex. https://10.0.0.40", "URL, e.g. https://10.0.0.40") }
    ]
  },
  {
    id: "ordinateurs",
    icon: "mdi:desktop-classic",
    label: L("Ordinateurs", "Workstations", "Workstations", "Computer", "Equipos"),
    fields: [
      { key: "type", label: L("Type d'ordinateur", "Computer type"), values: L("laptop | desktop | all-in-one | mini-pc | tablet | other, ex. portable", "laptop | desktop | all-in-one | mini-pc | tablet | other, e.g. laptop") },
      ...SHARED_HARDWARE,
      { key: "netbios", label: L("Hostname / NetBIOS", "Hostname / NetBIOS"), values: L("Texte, ex. PC-COMPTA-01", "Text, e.g. PC-COMPTA-01") },
      { key: "systeme", label: L("OS", "OS"), values: L("Texte, ex. Windows 11 Pro", "Text, e.g. Windows 11 Pro") },
      { key: "domaine", label: L("Domaine AD", "AD domain"), values: L("Texte, ex. acme.local", "Text, e.g. acme.local") },
      { key: "processeur", label: L("Processeur", "CPU"), values: L("Texte, ex. i7", "Text, e.g. i7") },
      { key: "memoire", label: L("Mémoire", "Memory"), values: L("Texte, ex. 16 Go", "Text, e.g. 16 GB") },
      { key: "adresseMac", label: L("Adresse MAC", "MAC address"), values: L("Ex. aa:bb:cc:dd:ee:45", "e.g. aa:bb:cc:dd:ee:45") }
    ]
  }
];

function mapInjectionField(field, locale) {
  return {
    key: field.key,
    csvColumn: field.csvColumn || equipmentCsvColumnForDataKey(field.key),
    required: Boolean(field.required),
    label: pickLocale(field.label, locale),
    values: pickLocale(field.values, locale)
  };
}

const FIELD_TYPE_VALUES = {
  text: L("Texte libre", "Free text"),
  textarea: L("Texte long", "Long text"),
  date: L("Date, ex. 2026-12-31", "Date, e.g. 2026-12-31"),
  number: L("Nombre", "Number"),
  boolean: L("true | false", "true | false")
};

export function getEquipmentInjectionFamilies(locale) {
  const jsonLabel = L("Données JSON", "JSON payload");
  const jsonFallback = L("JSON optionnel pour tableaux / objets", "Optional JSON for arrays / objects");
  return EQUIPMENT_INJECTION_FAMILIES.map(family => {
    const jsonField = {
      key: "_data_json",
      csvColumn: "data_json",
      label: jsonLabel,
      values: family.jsonHint || jsonFallback
    };
    return {
      id: family.id,
      icon: family.icon || "mdi:devices",
      label: pickLocale(family.label, locale),
      isCustom: false,
      familyKey: family.id,
      fields: [
        ...equipmentBaseFields(family.id).map(field => mapInjectionField(field, locale)),
        ...family.fields.map(field => mapInjectionField(field, locale)),
        mapInjectionField(jsonField, locale)
      ]
    };
  });
}

/** Build injection guide entry from an admin custom equipment family definition. */
export function buildCustomEquipmentInjectionFamily(family, locale) {
  const familyKey = String(family?.familyKey || "").trim();
  if (!familyKey) return null;
  const mergedDefs = [...SHARED_HARDWARE.map(field => ({
    fieldKey: field.key,
    fieldType: ["purchaseDate", "installDate", "expirationGarantie"].includes(field.key) ? "date" : field.key === "commentaire" ? "textarea" : "text",
    label: pickLocale(field.label, locale),
    required: false
  })), ...(Array.isArray(family.fields) ? family.fields : [])];
  const seenFieldKeys = new Set();
  const fieldDefs = mergedDefs.filter(field => {
    const key = String(field?.fieldKey || "").trim();
    if (!key || seenFieldKeys.has(key)) return false;
    seenFieldKeys.add(key);
    return true;
  });
  const customFields = fieldDefs.map(field => {
    const key = String(field.fieldKey || "").trim();
    const type = String(field.fieldType || "text").toLowerCase();
    return mapInjectionField({
      key,
      csvColumn: `data_${key}`,
      required: Boolean(field.required),
      label: field.label || key,
      values: FIELD_TYPE_VALUES[type] || FIELD_TYPE_VALUES.text
    }, locale);
  });
  const familyValues = L(
    `${familyKey} (ou libellé « ${family.label || familyKey} »)`,
    `${familyKey} (or label “${family.label || familyKey}”)`
  );
  return {
    id: `custom:${familyKey}`,
    icon: family.icon || "mdi:devices",
    label: family.label || familyKey,
    isCustom: true,
    familyKey,
    fields: [
      ...equipmentBaseFields(familyKey).map(field => {
        if (field.key === "_family") {
          return mapInjectionField({ ...field, values: familyValues }, locale);
        }
        return mapInjectionField(field, locale);
      }),
      ...customFields
    ]
  };
}

export function mergeEquipmentInjectionFamilies(locale, customFamilies = []) {
  const system = getEquipmentInjectionFamilies(locale);
  const custom = (Array.isArray(customFamilies) ? customFamilies : [])
    .filter(family => family && family.enabled !== false && !family.isSystem)
    .map(family => buildCustomEquipmentInjectionFamily(family, locale))
    .filter(Boolean)
    .sort((a, b) => String(a.label).localeCompare(String(b.label), locale || "fr"));
  return [...system, ...custom];
}

/** CSV header + sample row for a selected injection family guide entry. */
export function buildEquipmentFamilyCsvTemplate(familyGuide) {
  if (!familyGuide?.fields?.length) return "";
  const headers = familyGuide.fields
    .map(field => field.csvColumn)
    .filter((col, index, all) => col && all.indexOf(col) === index);
  const sample = headers.map(col => {
    if (col === "client_name") return "Acme SAS";
    if (col === "family") return familyGuide.familyKey || familyGuide.id;
    if (col === "name") return "EQ-001";
    if (col === "item_key") return "eq-001";
    if (col === "is_active") return "true";
    if (col === "ip") return "10.0.0.100";
    return "";
  });
  return `${headers.join(",")}\n${sample.join(",")}\n`;
}
