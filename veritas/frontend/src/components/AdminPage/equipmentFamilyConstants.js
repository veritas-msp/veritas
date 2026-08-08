import { EQUIPMENT_MODULE_ICONS, EQUIPMENT_MODULE_LABELS } from "../EquipementPage/equipmentFormConfig";
import { HONEYCOMB_TABLE_TYPE_ORDER } from "../EnterprisesPage/infraHoneycombLayout";
import { INFRA_TYPE_ICONS } from "../EnterprisesPage/infraMapUtils";
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
const SYSTEM_BRICK_FAMILIES = [{
  familyKey: "Ordinateurs",
  label: "Computers",
  icon: "mdi:laptop",
  sortOrder: 5
}];
function buildSystemHexFamily(familyKey, sortOrder) {
  return {
    id: `system-${familyKey.toLowerCase()}`,
    familyKey,
    label: EQUIPMENT_MODULE_LABELS[familyKey] || familyKey,
    icon: EQUIPMENT_MODULE_ICONS[familyKey] || INFRA_TYPE_ICONS[familyKey] || "mdi:devices",
    displayMode: "hexagon",
    isSystem: true,
    enabled: true,
    sortOrder,
    fields: [],
    itemCount: null
  };
}
function buildSystemBrickFamily({
  familyKey,
  label,
  icon,
  sortOrder
}) {
  return {
    id: `system-${familyKey.toLowerCase()}`,
    familyKey,
    label,
    icon,
    displayMode: "brick",
    isSystem: true,
    enabled: true,
    sortOrder,
    fields: [],
    itemCount: null
  };
}
export function getDefaultEquipmentFamilies() {
  const bricks = SYSTEM_BRICK_FAMILIES.map(entry => buildSystemBrickFamily(entry));
  const hex = HONEYCOMB_TABLE_TYPE_ORDER.map((familyKey, index) => buildSystemHexFamily(familyKey, 20 + index * 10));
  return [...bricks, ...hex];
}
export function buildActiveEquipmentCountColumns(defaultFamilies = [], customFamilies = []) {
  const custom = (Array.isArray(customFamilies) ? customFamilies : []).filter(family => family.enabled !== false);
  const merged = [...(Array.isArray(defaultFamilies) ? defaultFamilies : []), ...custom.map(family => ({
    ...family,
    isSystem: false
  }))];
  return merged.filter(family => family.enabled !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.label || a.familyKey || "").localeCompare(String(b.label || b.familyKey || ""), "fr")).map(family => ({
    key: family.familyKey,
    icon: family.icon || "mdi:devices",
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
    fields: (family.fields || []).map(field => ({
      fieldKey: field.fieldKey || "",
      label: field.label || "",
      fieldType: field.fieldType || "text",
      required: Boolean(field.required),
      displayOrder: field.displayOrder
    }))
  };
}
