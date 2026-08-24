const SHARED_EQUIPMENT_FIELD_DEFS = [
  { key: "site", type: "text", labels: { fr: "Site", en: "Site" } },
  { key: "purchaseDate", type: "date", labels: { fr: "Date d'achat", en: "Purchase date" } },
  { key: "invoiceNumber", type: "text", labels: { fr: "Numero de facture", en: "Invoice number" } },
  { key: "installDate", type: "date", labels: { fr: "Date d'installation", en: "Installation date" } },
  { key: "expirationGarantie", type: "date", labels: { fr: "Fin de garantie", en: "Warranty end" } },
  { key: "supportReference", type: "text", labels: { fr: "Reference support", en: "Support reference" } },
  { key: "supportContract", type: "text", labels: { fr: "Contrat support", en: "Support contract" } },
  { key: "commentaire", type: "textarea", labels: { fr: "Notes", en: "Notes" } }
];

export const SHARED_EQUIPMENT_FIELD_KEYS = SHARED_EQUIPMENT_FIELD_DEFS.map(field => field.key);

export function getSharedEquipmentFieldDefs() {
  return SHARED_EQUIPMENT_FIELD_DEFS.map(field => ({ ...field }));
}

export function getSharedEquipmentFieldLabel(fieldKey, locale = "fr") {
  const normalized = String(locale || "fr").toLowerCase().slice(0, 2);
  const field = SHARED_EQUIPMENT_FIELD_DEFS.find(entry => entry.key === fieldKey);
  if (!field) return fieldKey;
  return field.labels[normalized] || field.labels.fr || field.labels.en || fieldKey;
}

export function readSharedEquipmentFieldValue(source, key) {
  const layers = [
    source,
    source?.data,
    source?.rawData,
    source?.rawData?.data,
    source?.fields
  ].filter(layer => layer && typeof layer === "object");
  for (const layer of layers) {
    const value = layer[key];
    if (value != null && String(value).trim() !== "") {
      return typeof value === "string" ? value.trim() : value;
    }
  }
  return "";
}

export function buildSharedEquipmentFormData(source) {
  return {
    purchaseDate: String(readSharedEquipmentFieldValue(source, "purchaseDate") || "").slice(0, 10),
    invoiceNumber: String(readSharedEquipmentFieldValue(source, "invoiceNumber") || ""),
    installDate: String(readSharedEquipmentFieldValue(source, "installDate") || "").slice(0, 10),
    expirationGarantie: String(readSharedEquipmentFieldValue(source, "expirationGarantie") || "").slice(0, 10),
    supportReference: String(readSharedEquipmentFieldValue(source, "supportReference") || ""),
    supportContract: String(readSharedEquipmentFieldValue(source, "supportContract") || ""),
    commentaire: String(readSharedEquipmentFieldValue(source, "commentaire") || "")
  };
}

export function applySharedEquipmentFields(target, values = {}) {
  const next = { ...(target || {}) };
  SHARED_EQUIPMENT_FIELD_KEYS.forEach(key => {
    if (values[key] === undefined) return;
    next[key] = values[key];
  });
  return next;
}

export function mergeCustomEquipmentFamilyFields(familyFields = []) {
  const existingKeys = new Set(
    (Array.isArray(familyFields) ? familyFields : [])
      .map(field => String(field?.fieldKey || "").trim())
      .filter(Boolean)
  );
  const sharedFields = getSharedEquipmentFieldDefs()
    .filter(field => !existingKeys.has(field.key))
    .map(field => ({
      fieldKey: field.key,
      fieldType: field.type,
      label: field.labels.fr,
      required: false,
      isShared: true
    }));
  return [...sharedFields, ...(Array.isArray(familyFields) ? familyFields : [])];
}
