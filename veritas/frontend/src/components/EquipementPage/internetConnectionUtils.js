export const INTERNET_DEBIT_PRESETS = ["10 Mbps", "20 Mbps", "25 Mbps", "50 Mbps", "100 Mbps", "200 Mbps", "300 Mbps", "500 Mbps", "1 Gbps", "2 Gbps", "5 Gbps", "10 Gbps"];
export const INTERNET_CONNECTION_TYPE_CATEGORIES = [{
  id: "wired",
  label: "Wired",
  typeIds: ["Fibre", "Câble", "ADSL", "SDSL", "VDSL"]
}, {
  id: "wireless",
  label: "Wireless",
  typeIds: ["4G", "5G", "Radio"]
}, {
  id: "satellite",
  label: "Satellite",
  typeIds: ["Satellite"]
}, {
  id: "sdwan",
  label: "SD-WAN",
  typeIds: ["SD-WAN"]
}, {
  id: "other",
  label: "Other",
  typeIds: ["Autre"]
}];
export const INTERNET_CONNECTION_TYPES = [{
  id: "Fibre",
  label: "Fiber",
  icon: "streamline-ultimate:fiber-access-1",
  category: "wired"
}, {
  id: "ADSL",
  label: "ADSL",
  icon: "mdi:ethernet-cable",
  category: "wired"
}, {
  id: "SDSL",
  label: "SDSL",
  icon: "mdi:ethernet",
  category: "wired"
}, {
  id: "VDSL",
  label: "VDSL",
  icon: "mdi:ethernet-cable",
  category: "wired"
}, {
  id: "4G",
  label: "4G",
  icon: "material-symbols:4g-mobiledata-badge",
  category: "wireless"
}, {
  id: "5G",
  label: "5G",
  icon: "material-symbols:5g-mobiledata-badge",
  category: "wireless"
}, {
  id: "Satellite",
  label: "Satellite",
  icon: "tabler:satellite",
  category: "satellite"
}, {
  id: "Câble",
  label: "Cable",
  icon: "mdi:ethernet-cable",
  category: "wired"
}, {
  id: "Radio",
  label: "Radio",
  icon: "mdi:radio-tower",
  category: "wireless"
}, {
  id: "SD-WAN",
  label: "SD-WAN",
  icon: "mdi:wan",
  category: "sdwan"
}, {
  id: "Autre",
  label: "Other",
  icon: "mdi:router-wireless",
  category: "other"
}];
export function getInternetConnectionTypesByCategory(formCopy = null) {
  const byId = new Map(INTERNET_CONNECTION_TYPES.map(entry => [entry.id, entry]));
  const categoryLabels = formCopy?.internetConnectionCategories || {};
  const typeLabels = formCopy?.internetConnectionTypes || {};
  return INTERNET_CONNECTION_TYPE_CATEGORIES.map(category => ({
    ...category,
    label: categoryLabels[category.id] || category.label,
    types: category.typeIds.map(typeId => {
      const entry = byId.get(typeId);
      if (!entry) return null;
      return {
        ...entry,
        label: typeLabels[entry.id] || entry.label
      };
    }).filter(Boolean)
  })).filter(category => category.types.length > 0);
}
export const INTERNET_DEBIT_QUICK = ["20 Mbps", "100 Mbps", "200 Mbps", "500 Mbps", "1 Gbps", "2 Gbps"];
export const INTERNET_DEBIT_DOWNLOAD_QUICK = INTERNET_DEBIT_QUICK;
export const INTERNET_DEBIT_UPLOAD_QUICK = INTERNET_DEBIT_QUICK;
export function getInternetConnectionTypeDef(typeId, formCopy = null) {
  const normalized = String(typeId || "").trim();
  const base = INTERNET_CONNECTION_TYPES.find(entry => entry.id === normalized) || INTERNET_CONNECTION_TYPES.find(entry => entry.id === "Autre");
  if (!formCopy?.internetConnectionTypes) return base;
  return {
    ...base,
    label: formCopy.internetConnectionTypes[base.id] || base.label
  };
}
function hasInternetFieldValue(value) {
  return Boolean(String(value ?? "").trim());
}
export function buildInternetSectionNavMeta(values = {}, {
  isAddMode = true,
  includeIdentity = false
} = {}) {
  const type = String(values.type ?? values.internetType ?? "").trim();
  const ipNonFixe = Boolean(values.ipNonFixe);
  const complete = {
    internetType: Boolean(type),
    internetLink: hasInternetFieldValue(values.fournisseur),
    internetNetwork: ipNonFixe || hasInternetFieldValue(values.ip),
    internetContract: hasInternetFieldValue(values.numeroLigne) && hasInternetFieldValue(values.referenceContrat) && hasInternetFieldValue(values.supportTelephone) && hasInternetFieldValue(values.dateMiseEnService) && hasInternetFieldValue(values.boxModele),
    internetNotes: hasInternetFieldValue(values.commentaire)
  };
  const requiredIncomplete = {
    internetType: !type,
    internetLink: !hasInternetFieldValue(values.fournisseur),
    internetNetwork: !ipNonFixe && !hasInternetFieldValue(values.ip),
    internetContract: false,
    internetNotes: false
  };
  if (includeIdentity) {
    complete.identity = hasInternetFieldValue(values.name);
    requiredIncomplete.identity = isAddMode && !hasInternetFieldValue(values.name);
  }
  return {
    complete,
    requiredIncomplete
  };
}
export function buildInternetDraftSectionMeta(values = {}) {
  return buildInternetSectionNavMeta(values, {
    isAddMode: true,
    includeIdentity: false
  }).complete;
}
export function createEmptyInternetConnection(type = "", site = "") {
  return {
    type,
    fournisseur: "",
    debit: "",
    debitDownload: "",
    debitUpload: "",
    ip: "",
    ipNonFixe: false,
    categorie: "Primary",
    site,
    numeroLigne: "",
    referenceContrat: "",
    supportTelephone: "",
    dateMiseEnService: "",
    boxModele: "",
    gateway: "",
    commentaire: ""
  };
}
export function formatInternetDebitDisplay(item) {
  if (!item || typeof item !== "object") return "";
  const down = String(item.debitDownload ?? "").trim();
  const up = String(item.debitUpload ?? "").trim();
  if (down && up) return `↓ ${down} / ↑ ${up}`;
  if (down) return `↓ ${down}`;
  if (up) return `↑ ${up}`;
  return String(item.debit ?? item.bandwidth ?? "").trim();
}
export function parseInternetDebitMbps(value) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const match = str.match(/^([\d.,]+)\s*(Mbps|Gbps|mbps|gbps)?/i);
  if (!match) return null;
  const num = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(num) || num <= 0) return null;
  const unit = String(match[2] || "Mbps").toLowerCase();
  return unit.startsWith("g") ? num * 1000 : num;
}
export function syncInternetLegacyDebit(values = {}) {
  const down = String(values.debitDownload ?? "").trim();
  const up = String(values.debitUpload ?? "").trim();
  let debit = String(values.debit ?? "").trim();
  if (!debit && (down || up)) {
    debit = down && up ? `${down} / ${up}` : down || up;
  }
  return {
    ...values,
    debit
  };
}
export function readInternetConnectionFields(source) {
  if (!source || typeof source !== "object") return createEmptyInternetConnection();
  const debit = String(source.debit ?? source.bandwidth ?? "").trim();
  const debitDownload = String(source.debitDownload ?? "").trim();
  const debitUpload = String(source.debitUpload ?? "").trim();
  return {
    ...createEmptyInternetConnection(),
    type: source.type ?? source.internetType ?? "",
    fournisseur: source.fournisseur ?? source.operateur ?? "",
    debit,
    debitDownload: debitDownload || (!debitUpload ? debit : ""),
    debitUpload,
    ip: source.ip ?? "",
    ipNonFixe: !!source.ipNonFixe,
    categorie: source.categorie ?? "Primary",
    site: source.site ?? source.location ?? "",
    numeroLigne: source.numeroLigne ?? "",
    referenceContrat: source.referenceContrat ?? "",
    supportTelephone: source.supportTelephone ?? "",
    dateMiseEnService: source.dateMiseEnService ?? "",
    boxModele: source.boxModele ?? "",
    gateway: source.gateway ?? "",
    commentaire: source.commentaire ?? ""
  };
}
