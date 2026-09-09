export function buildEquipmentFieldOptionsText(options) {
  if (!Array.isArray(options)) return "";
  return options
    .map(option => {
      if (typeof option === "string") return option.trim();
      if (option && typeof option === "object") {
        return String(option.label ?? option.value ?? "").trim();
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function parseEquipmentFieldOptionsText(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 100);
}

export function normalizeEquipmentFieldOptions(field) {
  const fromText = parseEquipmentFieldOptionsText(field?.optionsText);
  if (fromText.length) return fromText;
  if (Array.isArray(field?.options)) {
    return field.options
      .map(option => {
        if (typeof option === "string") return option.trim();
        if (option && typeof option === "object") {
          return String(option.label ?? option.value ?? "").trim();
        }
        return "";
      })
      .filter(Boolean)
      .slice(0, 100);
  }
  return [];
}

export function getEquipmentFieldSelectOptions(field) {
  return normalizeEquipmentFieldOptions(field);
}

export function ensureEquipmentFieldClientIds(fields = []) {
  return (Array.isArray(fields) ? fields : []).map((field, index) => ({
    ...field,
    clientId: field.clientId || (field.id ? `field-${field.id}` : `field-new-${index}`)
  }));
}

export function createEmptyEquipmentFieldDraft() {
  return {
    clientId: `field-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fieldKey: "",
    label: "",
    fieldType: "text",
    required: false,
    options: [],
    optionsText: ""
  };
}

export function createEmptyEquipmentSectionDraft() {
  return {
    clientId: `section-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fieldKey: "",
    label: "",
    fieldType: "section",
    required: false,
    options: [],
    optionsText: ""
  };
}

export function isEquipmentLayoutField(fieldOrType) {
  const type = typeof fieldOrType === "string" ? fieldOrType : fieldOrType?.fieldType;
  return String(type || "") === "section";
}

export function isEquipmentInputField(fieldOrType) {
  return !isEquipmentLayoutField(fieldOrType);
}

/** Group ordered family fields by section markers (same pattern as sales forms). */
export function groupEquipmentFieldsBySection(fields = []) {
  const list = Array.isArray(fields) ? fields : [];
  const groups = [];
  let current = {
    section: null,
    fields: []
  };
  for (const field of list) {
    if (isEquipmentLayoutField(field)) {
      if (current.section || current.fields.length) groups.push(current);
      current = {
        section: field,
        fields: []
      };
      continue;
    }
    current.fields.push(field);
  }
  if (current.section || current.fields.length) groups.push(current);
  return groups;
}

export function reorderEquipmentFields(fields, activeId, overId) {
  if (!activeId || !overId || activeId === overId) return fields;
  const items = [...fields];
  const oldIndex = items.findIndex(field => field.clientId === activeId);
  const newIndex = items.findIndex(field => field.clientId === overId);
  if (oldIndex < 0 || newIndex < 0) return fields;
  const [moved] = items.splice(oldIndex, 1);
  items.splice(newIndex, 0, moved);
  return items;
}
