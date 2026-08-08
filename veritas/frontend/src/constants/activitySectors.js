import { pickLocaleMessages } from "../i18n/translate";
export const ACTIVITY_SECTOR_KEYS = ["agriculture", "industry", "construction", "retail", "business_services", "healthcare", "education", "hospitality", "real_estate", "transport", "finance", "it_telecom", "associations", "public_sector", "other"];
const SECTOR_LABELS = {
  fr: {
    agriculture: "Agriculture / Viticulture",
    industry: "Industrie",
    construction: "BTP / Construction",
    retail: "Commerce / Distribution",
    business_services: "Services aux entreprises",
    healthcare: "Santé",
    education: "Éducation / Formation",
    hospitality: "Hôtellerie / Restauration",
    real_estate: "Immobilier",
    transport: "Transport / Logistique",
    finance: "Finance / Assurance",
    it_telecom: "Informatique / Télécoms",
    associations: "Associations",
    public_sector: "Secteur public",
    other: "Autre"
  },
  en: {
    agriculture: "Agriculture / Viticulture",
    industry: "Industry",
    construction: "Construction / Building",
    retail: "Retail / Distribution",
    business_services: "Business services",
    healthcare: "Healthcare",
    education: "Education / Training",
    hospitality: "Hospitality / Food service",
    real_estate: "Real estate",
    transport: "Transport / Logistics",
    finance: "Finance / Insurance",
    it_telecom: "IT / Telecom",
    associations: "Non-profits / Associations",
    public_sector: "Public sector",
    other: "Other"
  },
  de: {
    agriculture: "Landwirtschaft / Weinbau",
    industry: "Industrie",
    construction: "Bau / Construction",
    retail: "Handel / Vertrieb",
    business_services: "Unternehmensdienstleistungen",
    healthcare: "Gesundheitswesen",
    education: "Bildung / Ausbildung",
    hospitality: "Gastgewerbe / Restauration",
    real_estate: "Immobilien",
    transport: "Transport / Logistik",
    finance: "Finanzen / Versicherung",
    it_telecom: "IT / Telekommunikation",
    associations: "Vereine / Non-Profit",
    public_sector: "Öffentlicher Sektor",
    other: "Sonstiges"
  },
  it: {
    agriculture: "Agricoltura / Viticoltura",
    industry: "Industria",
    construction: "Edilizia / Costruzioni",
    retail: "Commercio / Distribuzione",
    business_services: "Servizi alle imprese",
    healthcare: "Sanità",
    education: "Istruzione / Formazione",
    hospitality: "Hotellerie / Ristorazione",
    real_estate: "Immobiliare",
    transport: "Trasporti / Logistica",
    finance: "Finanza / Assicurazioni",
    it_telecom: "Informatica / Telecom",
    associations: "Associazioni",
    public_sector: "Settore pubblico",
    other: "Altro"
  },
  es: {
    agriculture: "Agricultura / Viticultura",
    industry: "Industria",
    construction: "Construcción / Obras",
    retail: "Comercio / Distribución",
    business_services: "Servicios a empresas",
    healthcare: "Sanidad",
    education: "Educación / Formación",
    hospitality: "Hostelería / Restauración",
    real_estate: "Inmobiliaria",
    transport: "Transporte / Logística",
    finance: "Finanzas / Seguros",
    it_telecom: "Informática / Telecomunicaciones",
    associations: "Asociaciones",
    public_sector: "Sector público",
    other: "Otro"
  }
};
const UI_COPY = {
  fr: {
    placeholder: "Rechercher ou choisir un secteur…",
    empty: "Aucun secteur correspondant"
  },
  en: {
    placeholder: "Search or choose a sector…",
    empty: "No matching sector"
  },
  de: {
    placeholder: "Branche suchen oder auswählen…",
    empty: "Keine passende Branche"
  },
  it: {
    placeholder: "Cerca o scegli un settore…",
    empty: "Nessun settore corrispondente"
  },
  es: {
    placeholder: "Buscar o elegir un sector…",
    empty: "Ningún sector coincidente"
  }
};
const LABEL_TO_KEY = (() => {
  const map = new Map();
  for (const key of ACTIVITY_SECTOR_KEYS) {
    map.set(key, key);
    for (const locale of Object.keys(SECTOR_LABELS)) {
      const label = SECTOR_LABELS[locale][key];
      if (label) map.set(label.trim().toLowerCase(), key);
    }
  }
  return map;
})();
export const ACTIVITY_SECTORS = ACTIVITY_SECTOR_KEYS.map(key => SECTOR_LABELS.fr[key]);
export function getActivitySectorUiCopy(locale) {
  return pickLocaleMessages(UI_COPY, locale);
}
export function resolveActivitySectorKey(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (ACTIVITY_SECTOR_KEYS.includes(trimmed)) return trimmed;
  return LABEL_TO_KEY.get(trimmed.toLowerCase()) || "";
}
export function getActivitySectorLabel(value, locale) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const labels = pickLocaleMessages(SECTOR_LABELS, locale);
  const key = resolveActivitySectorKey(trimmed);
  if (key) return labels[key] || trimmed;
  return trimmed;
}
export function normalizeActivitySectorDisplay(value, locale) {
  return getActivitySectorLabel(value, locale);
}
export function getActivitySectorOptions(locale, currentValue) {
  const labels = pickLocaleMessages(SECTOR_LABELS, locale);
  const options = ACTIVITY_SECTOR_KEYS.map(key => labels[key]);
  const value = String(currentValue || "").trim();
  if (!value) return options;
  const displayValue = getActivitySectorLabel(value, locale);
  if (displayValue && !options.includes(displayValue)) {
    return [...options, displayValue];
  }
  return options;
}
