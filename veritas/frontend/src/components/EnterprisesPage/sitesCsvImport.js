import Papa from "papaparse";
import { createEmptySite, getSiteLocationValue } from "../../utils/clientSites";

const HEADER_ALIASES = {
  name: ["nom", "name", "lieu", "site", "location", "intitule"],
  addressStreet: ["adresse", "address", "addressstreet", "address_street", "street", "rue"],
  addressPostalCode: ["codepostal", "code_postal", "postalcode", "postal_code", "cp", "zip", "zipcode"],
  addressCity: ["ville", "city", "addresscity", "address_city"],
  addressCountry: ["pays", "country", "addresscountry", "address_country"],
  notes: ["notes", "note", "commentaire", "comment"],
  isPrimary: ["principal", "primary", "isprimary", "is_primary"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lon", "lng", "long"]
};

function normalizeHeader(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function buildHeaderMap(fields) {
  const map = {};
  for (const original of fields || []) {
    const normalized = normalizeHeader(original);
    if (!normalized) continue;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (map[field]) continue;
      if (aliases.some(alias => normalizeHeader(alias) === normalized)) {
        map[field] = original;
        break;
      }
    }
  }
  return map;
}

function cell(row, headerMap, field) {
  const key = headerMap[field];
  if (!key) return "";
  return String(row?.[key] ?? "").trim();
}

function parseBool(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "oui", "yes", "x", "principal", "primary"].includes(normalized);
}

function parseCoord(value) {
  if (value == null || String(value).trim() === "") return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function downloadSitesCsvTemplate(locale = "fr") {
  const isFr = String(locale || "fr").toLowerCase().startsWith("fr");
  const header = isFr
    ? "nom;adresse;code_postal;ville;pays;principal;notes"
    : "name;address;postal_code;city;country;primary;notes";
  const rows = isFr
    ? [
      "Siège;12 rue de la République;75001;Paris;France;oui;Accueil principal",
      "Entrepôt Lyon;ZAC du Port;69003;Lyon;France;;Quai de livraison",
      "Agence Bordeaux;45 cours de l'Intendance;33000;Bordeaux;France;;"
    ]
    : [
      "Headquarters;10 Downing Street;SW1A 2AA;London;United Kingdom;yes;Main office",
      "Warehouse;12 Dock Road;E16 1AH;London;United Kingdom;;",
      "Manchester branch;1 Spinningfields;M3 3EB;Manchester;United Kingdom;;"
    ];
  const blob = new Blob([`\uFEFF${header}\n${rows.join("\n")}\n`], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = isFr ? "veritas-lieux.csv" : "veritas-sites.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseSitesCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: header => String(header || "").replace(/^\uFEFF/, "").trim(),
      complete: result => {
        const rows = (result.data || []).filter(row => Object.values(row || {}).some(value => String(value || "").trim() !== ""));
        resolve({
          rows,
          fields: result.meta?.fields || [],
          errors: result.errors || []
        });
      },
      error: err => reject(err)
    });
  });
}

export function buildSitesCsvPreview(rows, existingSites = [], {
  maxSites = null,
  defaultCountry = "France"
} = {}) {
  const fields = rows.length > 0 ? Object.keys(rows[0] || {}) : [];
  const headerMap = buildHeaderMap(fields);
  const existingNames = new Set(
    (Array.isArray(existingSites) ? existingSites : [])
      .map(site => getSiteLocationValue(site).toLowerCase())
      .filter(Boolean)
  );
  const seenNames = new Set();
  const preview = [];

  rows.forEach((row, index) => {
    const name = cell(row, headerMap, "name");
    const site = createEmptySite({
      name,
      addressStreet: cell(row, headerMap, "addressStreet"),
      addressPostalCode: cell(row, headerMap, "addressPostalCode"),
      addressCity: cell(row, headerMap, "addressCity"),
      addressCountry: cell(row, headerMap, "addressCountry") || defaultCountry,
      notes: cell(row, headerMap, "notes"),
      isPrimary: parseBool(cell(row, headerMap, "isPrimary")),
      latitude: parseCoord(cell(row, headerMap, "latitude")),
      longitude: parseCoord(cell(row, headerMap, "longitude"))
    });
    const nameKey = name.toLowerCase();
    let status = "ready";
    if (!name) status = "invalid";
    else if (existingNames.has(nameKey) || seenNames.has(nameKey)) status = "duplicate";
    if (nameKey) seenNames.add(nameKey);
    preview.push({
      id: `csv-${index}-${nameKey || "empty"}`,
      status,
      selected: status === "ready",
      site
    });
  });

  if (maxSites != null) {
    const remaining = Math.max(0, maxSites - existingSites.length);
    let kept = 0;
    preview.forEach(item => {
      if (item.status !== "ready") return;
      if (kept < remaining) {
        kept += 1;
        return;
      }
      item.status = "limit";
      item.selected = false;
    });
  }

  return {
    headerMap,
    items: preview
  };
}

export function getSelectedImportSites(items) {
  return (Array.isArray(items) ? items : [])
    .filter(item => item.selected && item.status === "ready")
    .map(item => item.site);
}
