export const SYSTEM_FAMILY_KEYS = [
  "Internet",
  "Firewalls",
  "Routeur",
  "Servers",
  "Storage",
  "Ordinateurs",
  "Switch",
  "BorneWifi",
  "TOIP",
  "Alimentation"
];

const SYSTEM_FAMILY_ALIASES = {
  Serveurs: "Servers",
  Server: "Servers",
  servers: "Servers",
  NAS: "Storage",
  Stockage: "Storage",
  stockage: "Storage",
  Firewall: "Firewalls",
  firewall: "Firewalls",
  BorneWiFi: "BorneWifi",
  Wifi: "BorneWifi",
  WiFi: "BorneWifi"
};

export function canonicalizeSystemFamilyKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.startsWith("Custom:")) return null;
  if (SYSTEM_FAMILY_ALIASES[raw]) return SYSTEM_FAMILY_ALIASES[raw];
  const hit = SYSTEM_FAMILY_KEYS.find((key) => key.toLowerCase() === raw.toLowerCase());
  return hit || null;
}

export function readExtensionFieldValue(source, fieldKey) {
  const key = String(fieldKey || "").trim();
  if (!key) return "";
  const layers = [
    source,
    source?.data,
    source?.rawData,
    source?.rawData?.data,
    source?.fields,
    source?.extensionFields
  ].filter((layer) => layer && typeof layer === "object");
  for (const layer of layers) {
    if (layer[key] !== undefined && layer[key] !== null && layer[key] !== "") {
      return layer[key];
    }
  }
  return "";
}

export function formatExtensionFieldValue(field, value, labels = {}) {
  if (field?.fieldType === "number") {
    if (value === false) return "0";
    if (value === true) return "1";
    if (value == null || value === "") return "-";
    return String(value);
  }
  if (value == null || value === "") return "-";
  if (field?.fieldType === "boolean") {
    const truthy = value === true || ["true", "1", "yes", "oui", "on"].includes(String(value).trim().toLowerCase());
    return truthy ? labels.yes || "Oui" : labels.no || "Non";
  }
  if (field?.fieldType === "date") {
    try {
      return new Date(value).toLocaleDateString("fr-FR");
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function applySystemExtensionFields(payload, formData, fields = []) {
  const next = { ...(payload || {}) };
  (Array.isArray(fields) ? fields : []).forEach((field) => {
    const key = field?.fieldKey;
    if (!key || !formData || !Object.prototype.hasOwnProperty.call(formData, key)) return;
    next[key] = formData[key];
  });
  return next;
}

export function buildExtensionFormValues(source, fields = []) {
  const values = {};
  (Array.isArray(fields) ? fields : []).forEach((field) => {
    const raw = readExtensionFieldValue(source, field.fieldKey);
    if (field.fieldType === "boolean") {
      values[field.fieldKey] = raw === true || ["true", "1", "yes", "oui", "on"].includes(String(raw).trim().toLowerCase());
    } else if (field.fieldType === "date") {
      values[field.fieldKey] = raw ? String(raw).slice(0, 10) : "";
    } else if (field.fieldType === "number") {
      values[field.fieldKey] = raw === "" || raw == null ? "" : String(raw);
    } else {
      values[field.fieldKey] = raw == null ? "" : String(raw);
    }
  });
  return values;
}

export function buildExtensionDistributions(items = [], fields = []) {
  return (Array.isArray(fields) ? fields : [])
    .filter((field) => field?.fieldKey && field.fieldType !== "textarea")
    .map((field) => {
      const counts = {};
      (Array.isArray(items) ? items : []).forEach((item) => {
        const raw = readExtensionFieldValue(item, field.fieldKey);
        let name = "Non renseigné";
        if (field.fieldType === "boolean") {
          const truthy = raw === true || ["true", "1", "yes", "oui", "on"].includes(String(raw).trim().toLowerCase());
          name = raw === "" || raw == null ? "Non renseigné" : truthy ? "Oui" : "Non";
        } else if (raw != null && String(raw).trim() !== "") {
          name = String(raw).trim();
        }
        counts[name] = (counts[name] || 0) + 1;
      });
      return {
        fieldKey: field.fieldKey,
        label: field.label || field.fieldKey,
        items: Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      };
    })
    .filter((entry) => entry.items.some((item) => item.name !== "Non renseigné"));
}
