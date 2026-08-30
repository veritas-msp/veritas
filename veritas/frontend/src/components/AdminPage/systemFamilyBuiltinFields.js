import { EQUIPMENT_INJECTION_FAMILIES } from "./adminInjectionEquipmentFields";

const INJECTION_ID_BY_SYSTEM_KEY = {
  Servers: "servers",
  Internet: "internet",
  Switch: "switch",
  Firewalls: "firewall",
  BorneWifi: "wifi",
  Storage: "stockage",
  Alimentation: "alimentation",
  Routeur: "routeur",
  TOIP: "toip",
  Ordinateurs: "ordinateurs"
};

const COMMON_FIELDS = [
  { key: "name", fieldType: "text", label: { fr: "Nom", en: "Name", de: "Name", it: "Nome", es: "Nombre" } },
  { key: "ip", fieldType: "text", label: { fr: "Adresse IP", en: "IP address", de: "IP-Adresse", it: "Indirizzo IP", es: "Dirección IP" } },
  { key: "is_active", fieldType: "boolean", label: { fr: "Actif", en: "Active", de: "Aktiv", it: "Attivo", es: "Activo" } }
];

const DATE_KEYS = new Set(["purchaseDate", "installDate", "expirationGarantie", "dateMiseEnService", "dateBatterie"]);
const BOOLEAN_KEYS = new Set(["ipNonFixe", "manageable", "poeSupport", "alimentationPoE", "empilage"]);
const NUMBER_KEYS = new Set(["vlan", "nbDisquesActuels", "nbDisquesMax", "capaciteVA", "capaciteW", "nbPrises", "nombreExtensions"]);
const TEXTAREA_KEYS = new Set(["commentaire", "notes"]);

function pickLocale(map, locale) {
  if (typeof map === "string") return map;
  const key = String(locale || "fr").toLowerCase().slice(0, 2);
  return map?.[key] || map?.fr || map?.en || "";
}

function inferFieldType(key) {
  if (DATE_KEYS.has(key)) return "date";
  if (BOOLEAN_KEYS.has(key)) return "boolean";
  if (NUMBER_KEYS.has(key)) return "number";
  if (TEXTAREA_KEYS.has(key)) return "textarea";
  return "text";
}

export function getSystemFamilyBuiltinFields(familyKey, locale = "fr") {
  const injectionId = INJECTION_ID_BY_SYSTEM_KEY[familyKey];
  const family = EQUIPMENT_INJECTION_FAMILIES.find(item => item.id === injectionId);
  const seen = new Set();
  const fields = [];
  COMMON_FIELDS.forEach(field => {
    seen.add(field.key);
    fields.push({
      fieldKey: field.key,
      label: pickLocale(field.label, locale),
      fieldType: field.fieldType,
      required: field.key === "name",
      builtin: true
    });
  });
  (family?.fields || []).forEach(field => {
    const key = String(field.key || "").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    fields.push({
      fieldKey: key,
      label: pickLocale(field.label, locale),
      fieldType: inferFieldType(key),
      required: false,
      builtin: true
    });
  });
  return fields;
}
