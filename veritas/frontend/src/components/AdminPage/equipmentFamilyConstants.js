import { EQUIPMENT_MODULE_LABELS } from "../EquipementPage/equipmentFormConfig";
import { HARDWARE_TYPE_ORDER } from "../EnterprisesPage/infraHoneycombLayout";
import { INFRA_TYPE_ICONS } from "../EnterprisesPage/infraMapUtils";

export function slugifyEquipmentFieldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 72);
}

export function uniqueEquipmentFieldKeys(fields = []) {
  const used = new Set();
  return (Array.isArray(fields) ? fields : []).map(field => {
    const label = String(field?.label || "").trim();
    const base = slugifyEquipmentFieldKey(label) || slugifyEquipmentFieldKey(field?.fieldKey) || "champ";
    let fieldKey = base;
    let n = 2;
    while (used.has(fieldKey)) {
      fieldKey = `${base}_${n++}`.slice(0, 72);
    }
    used.add(fieldKey);
    return {
      ...field,
      fieldKey
    };
  });
}
export const EQUIPMENT_FAMILY_FORM_SECTIONS = [{
  id: "identity",
  label: "Identity",
  description: "Name and display",
  icon: "mdi:identifier"
}, {
  id: "fields",
  label: "Fields",
  description: "Entry form",
  icon: "mdi:form-select"
}, {
  id: "map",
  label: "Mapping",
  description: "Hexagon and position",
  icon: "mdi:hexagon-outline"
}];
export const EQUIPMENT_FIELD_TYPES = [{
  value: "text",
  label: "Text"
}, {
  value: "textarea",
  label: "Long text"
}, {
  value: "date",
  label: "Date"
}, {
  value: "number",
  label: "Number"
}, {
  value: "boolean",
  label: "Yes / No"
}];
export const EQUIPMENT_DISPLAY_MODES = [{
  value: "hexagon",
  label: "Hexagon (mapping)"
}, {
  value: "brick",
  label: "Side brick"
}];
function buildSystemFamily(familyKey, sortOrder) {
  return {
    id: `system-${familyKey.toLowerCase()}`,
    familyKey,
    label: EQUIPMENT_MODULE_LABELS[familyKey] || familyKey,
    icon: INFRA_TYPE_ICONS[familyKey] || "mdi:devices",
    displayMode: familyKey === "Ordinateurs" ? "brick" : "hexagon",
    isSystem: true,
    enabled: true,
    sortOrder,
    fields: [],
    itemCount: null
  };
}
export function getDefaultEquipmentFamilies() {
  // Same order as EnterpriseDetailPage peripherals (EquipmentPage / HARDWARE_TYPE_ORDER).
  return HARDWARE_TYPE_ORDER.map((familyKey, index) => buildSystemFamily(familyKey, (index + 1) * 10));
}
export function buildActiveEquipmentCountColumns(defaultFamilies = [], customFamilies = []) {
  const custom = (Array.isArray(customFamilies) ? customFamilies : []).filter(family => family.enabled !== false);
  const merged = [...(Array.isArray(defaultFamilies) ? defaultFamilies : []), ...custom.map(family => ({
    ...family,
    isSystem: false
  }))];
  return merged.filter(family => family.enabled !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.label || a.familyKey || "").localeCompare(String(b.label || b.familyKey || ""), "fr")).map(family => ({
    key: family.familyKey,
    icon: INFRA_TYPE_ICONS[family.familyKey] || family.icon || "mdi:devices",
    label: family.label || family.familyKey
  }));
}
export function buildDefaultEquipmentFamilyDraft() {
  return {
    familyKey: "",
    label: "",
    icon: "mdi:devices",
    displayMode: "hexagon",
    enabled: true,
    sortOrder: "100",
    honeycombQ: "",
    honeycombR: "",
    layoutTiles: [],
    fields: [{
      fieldKey: "marque",
      label: "Brand",
      fieldType: "text",
      required: false
    }, {
      fieldKey: "modele",
      label: "Model",
      fieldType: "text",
      required: false
    }, {
      fieldKey: "numero_serie",
      label: "Serial number",
      fieldType: "text",
      required: false
    }, {
      fieldKey: "date_facturation",
      label: "Invoice date",
      fieldType: "date",
      required: false
    }, {
      fieldKey: "numero_facture",
      label: "Invoice number",
      fieldType: "text",
      required: false
    }]
  };
}
export function buildEquipmentFamilyDraftFromFamily(family) {
  return {
    familyKey: family.familyKey || "",
    label: family.label || "",
    icon: family.icon || "mdi:devices",
    displayMode: family.displayMode || "hexagon",
    enabled: family.enabled !== false,
    sortOrder: String(family.sortOrder ?? "100"),
    honeycombQ: family.honeycombQ == null ? "" : String(family.honeycombQ),
    honeycombR: family.honeycombR == null ? "" : String(family.honeycombR),
    layoutTiles: Array.isArray(family.layoutTiles) ? family.layoutTiles : [],
    fields: (family.fields || []).map(field => ({
      id: field.id,
      fieldKey: field.fieldKey || "",
      label: field.label || "",
      fieldType: field.fieldType || "text",
      required: Boolean(field.required),
      displayOrder: field.displayOrder
    }))
  };
}
