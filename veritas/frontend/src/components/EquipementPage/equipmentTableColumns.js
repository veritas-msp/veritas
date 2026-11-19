export const EQUIPMENT_INFRA_COLUMNS_SETTING_KEY = "equipment_infra_table_columns";

const SHARED_OPTIONAL_KEYS = ["purchaseDate", "invoiceNumber", "installDate", "expirationGarantie", "commentaire"];
const CUSTOM_FIELD_SKIP = new Set(["actif", "active", "is_active", "isActive", "name", "nom"]);

export function uniqueColumnKeys(list) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const id = String(item || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function customFamilyColumnId(fieldKey) {
  const key = String(fieldKey || "").trim();
  if (!key) return "";
  return `cf:${key}`;
}

export function customFamilyFieldKeyFromColumnId(columnId) {
  const id = String(columnId || "");
  return id.startsWith("cf:") ? id.slice(3) : id;
}

export function isCustomFamilyDataField(field) {
  if (!field || field.fieldType === "section") return false;
  const key = String(field.fieldKey || field.key || "").trim();
  if (!key || CUSTOM_FIELD_SKIP.has(key)) return false;
  return true;
}

/**
 * Ordre par défaut = rendu actuel des tables infrastructure.
 * `visible` : colonnes affichées sans préférence.
 * `available` : catalogue du modal (défaut + champs natifs + champs partagés + extensions).
 */
export function buildDefaultColumnLayout({
  type,
  embeddedDefaults = [],
  typeKeys = [],
  extensionKeys = [],
  customFieldKeys = [],
  isCustom = false
} = {}) {
  if (isCustom) {
    const visible = uniqueColumnKeys(["activeStatus", "brandIcon", "name", ...customFieldKeys, "mapping"]);
    return { available: visible, visible };
  }

  let visible = uniqueColumnKeys((embeddedDefaults || []).filter(key => key !== "client"));
  if (type !== "Backup" && !visible.includes("mapping")) visible = [...visible, "mapping"];
  if (type !== "Backup" && type !== "Servers" && !visible.includes("location")) {
    const ipIndex = visible.indexOf("ip");
    const insertAt = ipIndex >= 0 ? ipIndex + 1 : Math.min(1, visible.length);
    visible = [...visible.slice(0, insertAt), "location", ...visible.slice(insertAt)];
  }
  const ext = uniqueColumnKeys(extensionKeys);
  if (ext.length) {
    const mappingIndex = visible.indexOf("mapping");
    const toInsert = ext.filter(key => !visible.includes(key));
    visible = mappingIndex >= 0
      ? [...visible.slice(0, mappingIndex), ...toInsert, ...visible.slice(mappingIndex)]
      : [...visible, ...toInsert];
  }
  if (type !== "Servers" && !visible.includes("brandIcon")) {
    const statusIdx = visible.indexOf("activeStatus");
    visible = statusIdx >= 0
      ? [...visible.slice(0, statusIdx + 1), "brandIcon", ...visible.slice(statusIdx + 1)]
      : ["brandIcon", ...visible];
  }

  const catalogExtras = type === "Backup" ? [] : SHARED_OPTIONAL_KEYS;
  const available = uniqueColumnKeys([
    ...visible,
    "brandIcon",
    ...(typeKeys || []).filter(key => key !== "client"),
    ...catalogExtras,
    ...ext
  ]);
  return { available, visible: uniqueColumnKeys(visible) };
}

function insertBeforeActions(order, key) {
  const actionsIdx = order.indexOf("mapping");
  if (actionsIdx >= 0) order.splice(actionsIdx, 0, key);
  else order.push(key);
}

/** Colonnes affichées : ordre sauvegardé, masquées retirées, nouvelles colonnes insérées avant Actions. */
export function resolveVisibleColumnKeys(available, defaultVisible, saved) {
  const availableSet = new Set(uniqueColumnKeys(available));
  const defaults = uniqueColumnKeys(defaultVisible).filter(key => availableSet.has(key));
  if (!saved || typeof saved !== "object") return defaults;

  const hidden = new Set(uniqueColumnKeys(saved.hidden).filter(key => availableSet.has(key)));
  const known = new Set([...uniqueColumnKeys(saved.order), ...uniqueColumnKeys(saved.hidden)]);
  const order = [];
  const seen = new Set();
  for (const key of uniqueColumnKeys(saved.order)) {
    if (!availableSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    order.push(key);
  }
  for (const key of defaults) {
    if (known.has(key) || seen.has(key)) continue;
    insertBeforeActions(order, key);
    seen.add(key);
  }
  const visible = order.filter(key => !hidden.has(key));
  if (visible.length) return visible;
  if (defaults.length) return [defaults[0]];
  const first = uniqueColumnKeys(available)[0];
  return first ? [first] : [];
}

/** Ordre de l’éditeur : visibles et masquées, nouvelles colonnes au même endroit que dans le tableau. */
export function editorStateFromPrefs(available, defaultVisible, saved) {
  const catalog = uniqueColumnKeys(available);
  const availableSet = new Set(catalog);
  const visible = resolveVisibleColumnKeys(catalog, defaultVisible, saved);
  if (!saved?.order?.length) {
    return { order: uniqueColumnKeys([...visible, ...catalog]), enabled: visible };
  }
  const known = new Set([...uniqueColumnKeys(saved.order), ...uniqueColumnKeys(saved.hidden)]);
  const order = [];
  const seen = new Set();
  for (const key of uniqueColumnKeys(saved.order)) {
    if (!availableSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    order.push(key);
  }
  for (const key of uniqueColumnKeys(defaultVisible)) {
    if (!availableSet.has(key) || known.has(key) || seen.has(key)) continue;
    insertBeforeActions(order, key);
    seen.add(key);
  }
  for (const key of catalog) {
    if (seen.has(key)) continue;
    order.push(key);
  }
  return { order, enabled: visible };
}

export function normalizeEquipmentColumnPrefs(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const source = raw.families && typeof raw.families === "object" && !Array.isArray(raw.families) ? raw.families : raw;
  const out = {};
  for (const [familyId, entry] of Object.entries(source)) {
    if (!familyId || familyId === "families") continue;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const order = uniqueColumnKeys(entry.order);
    const hidden = uniqueColumnKeys(entry.hidden);
    if (!order.length && !hidden.length) continue;
    out[familyId] = { order, hidden };
  }
  return out;
}

export function columnFromLogicalKey(logicalKey, baseColumns, extensionFields, actionsLabel) {
  if (logicalKey === "brandIcon") {
    return { label: "", key: "brandIcon", logicalKey };
  }
  if (String(logicalKey).startsWith("ext:")) {
    const fieldKey = String(logicalKey).slice(4);
    const field = (extensionFields || []).find(entry => entry?.fieldKey === fieldKey);
    return {
      key: logicalKey,
      logicalKey,
      label: field?.label || fieldKey,
      field
    };
  }
  const col = baseColumns?.[logicalKey];
  if (!col) return null;
  if (logicalKey === "mapping") {
    return { ...col, logicalKey, label: actionsLabel || col.label };
  }
  return { ...col, logicalKey };
}
