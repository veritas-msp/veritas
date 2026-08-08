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
  netbios: "hostname"
};

export function equipmentCsvColumnForDataKey(dataKey) {
  const key = String(dataKey || "").trim();
  const csv = EQUIPMENT_CSV_KEY_BY_DATA_KEY[key] || key;
  return `data_${csv}`;
}

const SHARED_HARDWARE = [
  { key: "site", label: L("Site / emplacement", "Site / location"), values: L("Texte libre", "Free text") },
  { key: "marque", label: L("Marque", "Brand"), values: L("Dell, Cisco, Fortinet…", "Dell, Cisco, Fortinet…") },
  { key: "modele", label: L("Modèle", "Model"), values: L("Texte libre", "Free text") },
  { key: "numeroSerie", label: L("N° de série", "Serial number"), values: L("Texte libre", "Free text") },
  { key: "vlan", label: L("VLAN", "VLAN"), values: L("Ex. 10", "e.g. 10") },
  { key: "expirationGarantie", label: L("Fin de garantie", "Warranty end"), values: L("YYYY-MM-DD", "YYYY-MM-DD") },
  { key: "commentaire", label: L("Commentaire", "Comment"), values: L("Texte libre (sinon colonne notes)", "Free text (or notes column)") }
];

export const EQUIPMENT_INJECTION_FAMILIES = [
  {
    id: "servers",
    icon: "mdi:server",
    label: L("Serveurs", "Servers", "Server", "Server", "Servidores"),
    fields: [
      { key: "type", required: true, label: L("Type", "Type"), values: L("physique | virtuel", "physique | virtuel") },
      ...SHARED_HARDWARE,
      { key: "systeme", label: L("Système / OS", "OS"), values: L("Windows Server 2022… (sinon colonne os)", "Windows Server 2022… (or os column)") },
      { key: "processeur", label: L("Processeur / vCPU", "CPU / vCPU"), values: L("Texte libre", "Free text") },
      { key: "memoire", label: L("Mémoire / RAM", "Memory / RAM"), values: L("Ex. 64 Go", "e.g. 64 GB") },
      { key: "stockage", label: L("Stockage disque", "Disk storage"), values: L("Ex. 2 To", "e.g. 2 TB") },
      { key: "hypervisor", label: L("Hyperviseur (VM)", "Hypervisor (VM)"), values: L("VMware ESXi, Hyper-V…", "VMware ESXi, Hyper-V…") },
      { key: "remoteAccessSolution", label: L("Accès distant", "Remote access"), values: L("anydesk | teamviewer | autre", "anydesk | teamviewer | other") },
      { key: "remoteAccessId", label: L("ID accès distant", "Remote access ID"), values: L("Identifiant", "ID") }
    ],
    jsonHint: L(
      "Tableaux / booléens : role (ex. [\"AD\",\"DNS\"]), modeHA, roleHA, serverHA — via data_json.",
      "Arrays / booleans: role (e.g. [\"AD\",\"DNS\"]), modeHA, roleHA, serverHA — via data_json."
    )
  },
  {
    id: "internet",
    icon: "mdi:wan",
    label: L("Internet", "Internet"),
    fields: [
      { key: "type", label: L("Type de lien", "Link type"), values: L("Fibre | ADSL | 4G | 5G | Satellite…", "Fibre | ADSL | 4G | 5G | Satellite…") },
      { key: "fournisseur", label: L("Fournisseur", "ISP"), values: L("Orange, SFR…", "Orange, SFR…") },
      { key: "categorie", label: L("Catégorie", "Category"), values: L("Primary | Backup", "Primary | Backup") },
      { key: "debit", label: L("Débit", "Bandwidth"), values: L("Ex. 1 Gbit/s", "e.g. 1 Gbps") },
      { key: "debitDownload", label: L("Débit desc.", "Download"), values: L("Optionnel", "Optional") },
      { key: "debitUpload", label: L("Débit mont.", "Upload"), values: L("Optionnel", "Optional") },
      { key: "ipNonFixe", label: L("IP non fixe", "Non-static IP"), values: L("true | false", "true | false") },
      { key: "numeroLigne", label: L("N° de ligne", "Line number"), values: L("Texte", "Text") },
      { key: "referenceContrat", label: L("Réf. contrat", "Contract ref."), values: L("Texte", "Text") },
      { key: "supportTelephone", label: L("Tél. support", "Support phone"), values: L("Texte", "Text") },
      { key: "dateMiseEnService", label: L("Mise en service", "Go-live date"), values: L("YYYY-MM-DD", "YYYY-MM-DD") },
      { key: "boxModele", label: L("Modèle box", "Box model"), values: L("Texte", "Text") },
      { key: "gateway", label: L("Passerelle", "Gateway"), values: L("IP ou hostname", "IP or hostname") },
      { key: "site", label: L("Site", "Site"), values: L("Texte libre", "Free text") },
      { key: "commentaire", label: L("Commentaire", "Comment"), values: L("Texte libre", "Free text") }
    ]
  },
  {
    id: "switch",
    icon: "mdi:switch",
    label: L("Switch", "Switches", "Switches", "Switch", "Switches"),
    fields: [
      ...SHARED_HARDWARE,
      { key: "firmware", label: L("Firmware", "Firmware"), values: L("Version", "Version") },
      { key: "adresseMac", label: L("Adresse MAC", "MAC address"), values: L("aa:bb:…", "aa:bb:…") },
      { key: "manageable", label: L("Manageable", "Managed"), values: L("true | false", "true | false") },
      { key: "adminUrl", label: L("URL admin", "Admin URL"), values: L("https://…", "https://…") },
      { key: "poeSupport", label: L("PoE", "PoE"), values: L("true | false", "true | false") },
      { key: "empilage", label: L("Empilage / stack", "Stacking"), values: L("true | false", "true | false") }
    ]
  },
  {
    id: "firewall",
    icon: "mdi:firewall",
    label: L("Firewall", "Firewall"),
    fields: [
      { key: "type", label: L("Type", "Type"), values: L("materiel | virtuel | cloud | logiciel | autre", "materiel | virtuel | cloud | logiciel | autre") },
      ...SHARED_HARDWARE,
      { key: "firmware", label: L("Firmware", "Firmware"), values: L("Version", "Version") }
    ],
    jsonHint: L(
      "Complexes : licences ([{nom,expiration,type}]), modeHA, roleHA — via data_json.",
      "Complex: licences ([{nom,expiration,type}]), modeHA, roleHA — via data_json."
    )
  },
  {
    id: "wifi",
    icon: "mdi:wifi",
    label: L("Borne Wi‑Fi", "Wi‑Fi access points", "WLAN-APs", "Access point Wi‑Fi", "Puntos Wi‑Fi"),
    fields: [
      ...SHARED_HARDWARE,
      { key: "firmware", label: L("Firmware", "Firmware"), values: L("Version", "Version") },
      { key: "adresseMac", label: L("Adresse MAC", "MAC address"), values: L("aa:bb:…", "aa:bb:…") },
      { key: "alimentationPoE", label: L("Alim. PoE", "PoE powered"), values: L("true | false", "true | false") }
    ],
    jsonHint: L(
      "SSIDs liés au catalogue client : ssids (tableau) via data_json.",
      "Client SSID catalog links: ssids (array) via data_json."
    )
  },
  {
    id: "stockage",
    icon: "mdi:nas",
    label: L("Stockage / NAS", "Storage / NAS", "Storage / NAS", "Storage / NAS", "Almacenamiento / NAS"),
    fields: [
      { key: "type", label: L("Type", "Type"), values: L("NAS | SAN | Virtual storage | Cloud storage | Robot de sauvegarde | Disque dur externe", "NAS | SAN | Virtual storage | Cloud storage | Robot de sauvegarde | Disque dur externe") },
      ...SHARED_HARDWARE,
      { key: "role", label: L("Rôle", "Role"), values: L("Texte libre", "Free text") },
      { key: "raid", label: L("RAID", "RAID"), values: L("RAID 1 | RAID 5 | RAID 10…", "RAID 1 | RAID 5 | RAID 10…") },
      { key: "capacite", label: L("Capacité", "Capacity"), values: L("Ex. 20 To", "e.g. 20 TB") },
      { key: "nbDisquesActuels", label: L("Disques actuels", "Current drives"), values: L("Nombre", "Number") },
      { key: "nbDisquesMax", label: L("Disques max", "Max drives"), values: L("Nombre", "Number") },
      { key: "quickConnect", label: L("QuickConnect (Synology)", "QuickConnect (Synology)"), values: L("Identifiant", "ID") }
    ],
    jsonHint: L(
      "Tableaux : disques, luns, cassettesRDX — via data_json.",
      "Arrays: disques, luns, cassettesRDX — via data_json."
    )
  },
  {
    id: "alimentation",
    icon: "mdi:power-plug",
    label: L("Alimentation / UPS", "Power / UPS", "Strom / USV", "Alimentazione / UPS", "Alimentación / UPS"),
    fields: [
      { key: "type", label: L("Type", "Type"), values: L("Onduleur | PDU", "Onduleur | PDU") },
      ...SHARED_HARDWARE,
      { key: "firmware", label: L("Firmware", "Firmware"), values: L("Version", "Version") },
      { key: "capaciteVA", label: L("Capacité VA", "Capacity VA"), values: L("Ex. 3000", "e.g. 3000") },
      { key: "capaciteW", label: L("Puissance W", "Power W"), values: L("Ex. 2700", "e.g. 2700") },
      { key: "nbPrises", label: L("Nb prises (PDU)", "Outlets (PDU)"), values: L("Nombre", "Number") },
      { key: "dateBatterie", label: L("Date batterie", "Battery date"), values: L("YYYY-MM-DD", "YYYY-MM-DD") },
      { key: "adresseMac", label: L("Adresse MAC", "MAC address"), values: L("aa:bb:…", "aa:bb:…") },
      { key: "manageable", label: L("Manageable", "Managed"), values: L("true | false", "true | false") },
      { key: "adminUrl", label: L("URL admin", "Admin URL"), values: L("https://…", "https://…") }
    ]
  },
  {
    id: "routeur",
    icon: "mdi:router-wireless",
    label: L("Routeur / SD-WAN", "Router / SD-WAN"),
    fields: [
      { key: "type", label: L("Type", "Type"), values: L("Routeur | SD-WAN", "Routeur | SD-WAN") },
      ...SHARED_HARDWARE,
      { key: "firmware", label: L("Firmware", "Firmware"), values: L("Version", "Version") },
      { key: "adresseMac", label: L("Adresse MAC", "MAC address"), values: L("aa:bb:…", "aa:bb:…") },
      { key: "adminUrl", label: L("URL admin", "Admin URL"), values: L("https://…", "https://…") }
    ]
  },
  {
    id: "toip",
    icon: "mdi:phone-in-talk",
    label: L("TOIP / VoIP", "VoIP / TOIP"),
    fields: [
      { key: "type", label: L("Type", "Type"), values: L("IP-PBX | Passerelle | SBC | Phone IP | Autre", "IP-PBX | Passerelle | SBC | Phone IP | Autre") },
      ...SHARED_HARDWARE,
      { key: "firmware", label: L("Firmware", "Firmware"), values: L("Version", "Version") },
      { key: "nombreExtensions", label: L("Nb extensions", "Extensions count"), values: L("Nombre", "Number") },
      { key: "domaineSip", label: L("Domaine SIP", "SIP domain"), values: L("ex. sip.acme.test", "e.g. sip.acme.test") },
      { key: "adresseMac", label: L("Adresse MAC", "MAC address"), values: L("aa:bb:…", "aa:bb:…") },
      { key: "manageable", label: L("Manageable", "Managed"), values: L("true | false", "true | false") },
      { key: "adminUrl", label: L("URL admin", "Admin URL"), values: L("https://…", "https://…") }
    ]
  },
  {
    id: "ordinateurs",
    icon: "mdi:desktop-classic",
    label: L("Ordinateurs", "Workstations", "Workstations", "Computer", "Equipos"),
    fields: [
      ...SHARED_HARDWARE,
      { key: "netbios", label: L("Hostname / NetBIOS", "Hostname / NetBIOS"), values: L("PC-COMPTA-01", "PC-COMPTA-01") },
      { key: "systeme", label: L("OS", "OS"), values: L("Windows 11 Pro… (sinon colonne os)", "Windows 11 Pro… (or os column)") },
      { key: "domaine", label: L("Domaine AD", "AD domain"), values: L("acme.local", "acme.local") },
      { key: "processeur", label: L("Processeur", "CPU"), values: L("Texte", "Text") },
      { key: "memoire", label: L("Mémoire", "Memory"), values: L("Ex. 16 Go", "e.g. 16 GB") },
      { key: "adresseMac", label: L("Adresse MAC", "MAC address"), values: L("aa:bb:…", "aa:bb:…") }
    ]
  }
];

export function getEquipmentInjectionFamilies(locale) {
  return EQUIPMENT_INJECTION_FAMILIES.map(family => ({
    id: family.id,
    icon: family.icon || "mdi:devices",
    label: pickLocale(family.label, locale),
    jsonHint: family.jsonHint ? pickLocale(family.jsonHint, locale) : "",
    fields: family.fields.map(field => ({
      key: field.key,
      csvColumn: equipmentCsvColumnForDataKey(field.key),
      required: Boolean(field.required),
      label: pickLocale(field.label, locale),
      values: pickLocale(field.values, locale)
    }))
  }));
}
