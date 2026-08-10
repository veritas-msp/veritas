/** Shared sales-form field type metadata (palette + renderer + API whitelist helpers). */

/** Field types that store options (one per line in the properties panel). */
export const OPTION_BASED_FIELD_TYPES = new Set(["select", "radio", "multiselect"]);

/** Layout markers (no user input value). */
export const LAYOUT_FIELD_TYPES = new Set(["section"]);

/** Input-like types that use the ticket field shell chrome. */
export const SHELL_FIELD_TYPES = new Set(["text", "number", "date", "email", "phone", "url", "time", "datetime", "currency"]);

/** Align with ticket attachment upload limits on the backend. */
export const FILE_FIELD_SERVER_MAX_SIZE_MB = 15;
export const FILE_FIELD_SERVER_MAX_FILES = 10;
export const FILE_FIELD_ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".csv", ".xls", ".xlsx", ".mp4", ".3gp", ".mp3", ".mpeg", ".ogg", ".aac", ".amr", ".m4a"];

export const DEFAULT_FILE_FIELD_CONFIG = {
  maxSizeMb: 10,
  maxFiles: 5,
  extensions: [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx", ".csv"]
};

export function isFileField(fieldOrType) {
  const type = typeof fieldOrType === "string" ? fieldOrType : fieldOrType?.fieldType;
  return String(type || "") === "file";
}

export function normalizeFileExtensions(raw) {
  const source = Array.isArray(raw) ? raw : String(raw || "").split(/[\s,;]+/);
  const allowed = new Set(FILE_FIELD_ALLOWED_EXTENSIONS);
  const out = [];
  const seen = new Set();
  source.forEach(item => {
    let ext = String(item || "").trim().toLowerCase();
    if (!ext) return;
    if (!ext.startsWith(".")) ext = `.${ext}`;
    if (!allowed.has(ext) || seen.has(ext)) return;
    seen.add(ext);
    out.push(ext);
  });
  return out.length ? out : [...DEFAULT_FILE_FIELD_CONFIG.extensions];
}

export function getFileFieldConfig(fieldOrOptions) {
  const options = Array.isArray(fieldOrOptions) ? fieldOrOptions : Array.isArray(fieldOrOptions?.options) ? fieldOrOptions.options : [];
  const raw = options.find(item => item && typeof item === "object" && (item.__fileConfig || item.maxSizeMb != null || item.maxFiles != null || item.extensions != null)) || null;
  const maxSizeMb = Math.min(FILE_FIELD_SERVER_MAX_SIZE_MB, Math.max(1, Number(raw?.maxSizeMb) || DEFAULT_FILE_FIELD_CONFIG.maxSizeMb));
  const maxFiles = Math.min(FILE_FIELD_SERVER_MAX_FILES, Math.max(1, Number(raw?.maxFiles) || DEFAULT_FILE_FIELD_CONFIG.maxFiles));
  return {
    __fileConfig: true,
    maxSizeMb,
    maxFiles,
    extensions: normalizeFileExtensions(raw?.extensions || DEFAULT_FILE_FIELD_CONFIG.extensions)
  };
}

export function buildFileFieldOptionsFromDraft(draft = {}) {
  return [getFileFieldConfig({
    options: [{
      __fileConfig: true,
      maxSizeMb: draft.fileMaxSizeMb,
      maxFiles: draft.fileMaxFiles,
      extensions: draft.fileExtensionsText
    }]
  })];
}

export function formatFileFieldAccept(config) {
  return getFileFieldConfig({
    options: [config]
  }).extensions.join(",");
}

export function validateSalesFormFile(file, config, {
  currentCount = 0
} = {}) {
  const cfg = getFileFieldConfig({
    options: [config]
  });
  if (!file) return "No file selected";
  if (currentCount >= cfg.maxFiles) return `Maximum ${cfg.maxFiles} file(s)`;
  const ext = `.${String(file.name || "").split(".").pop() || ""}`.toLowerCase();
  if (!cfg.extensions.includes(ext)) return `Extension not allowed (${cfg.extensions.join(", ")})`;
  const maxBytes = cfg.maxSizeMb * 1024 * 1024;
  if (Number(file.size || 0) > maxBytes) return `File too large (max ${cfg.maxSizeMb} MB)`;
  return null;
}

export function isLayoutField(fieldOrType) {
  const type = typeof fieldOrType === "string" ? fieldOrType : fieldOrType?.fieldType;
  return LAYOUT_FIELD_TYPES.has(String(type || ""));
}

export function isInputField(fieldOrType) {
  return !isLayoutField(fieldOrType);
}

/** Deep-clone a field as a new local (unsaved) item with a unique key. */
export function cloneSalesFormField(field, {
  displayOrder = 0,
  labelSuffix = " (copy)"
} = {}) {
  const suffix = `${Date.now().toString(36).slice(-4)}${Math.random().toString(16).slice(2, 5)}`;
  const rawKey = String(field?.fieldKey || field?.fieldType || "field").trim() || "field";
  const baseKey = rawKey.replace(/_copy_[a-z0-9]+$/i, "");
  const baseLabel = String(field?.label || "").trim();
  const nextLabel = baseLabel ? baseLabel.endsWith(labelSuffix) ? baseLabel : `${baseLabel}${labelSuffix}` : field?.fieldType === "section" ? `Section${labelSuffix}` : baseLabel;
  return {
    ...field,
    id: `temp-${suffix}`,
    fieldKey: `${baseKey}_copy_${suffix}`,
    label: nextLabel,
    displayOrder: Number(displayOrder) || 0,
    required: field?.fieldType === "section" ? false : field?.required === true,
    placeholder: String(field?.placeholder || ""),
    options: Array.isArray(field?.options) ? field.options.map(opt => typeof opt === "string" ? opt : {
      ...opt
    }) : [],
    visibilityRules: {
      matchMode: field?.visibilityRules?.matchMode === "any" ? "any" : "all",
      conditions: Array.isArray(field?.visibilityRules?.conditions) ? field.visibilityRules.conditions.map(condition => ({
        ...condition
      })) : []
    }
  };
}

/**
 * Fields belonging to a section: the section marker + following fields until the next section.
 * For a non-section field, returns only that field.
 */
export function getDuplicableFieldBlock(fields = [], sourceField) {
  if (!sourceField) return [];
  const sorted = [...(Array.isArray(fields) ? fields : [])].sort((a, b) => Number(a?.displayOrder || 0) - Number(b?.displayOrder || 0));
  const startIdx = sorted.findIndex(field => String(field.id) === String(sourceField.id));
  if (startIdx < 0) return [];
  if (sourceField.fieldType !== "section") return [sorted[startIdx]];
  const block = [sorted[startIdx]];
  for (let i = startIdx + 1; i < sorted.length; i += 1) {
    if (sorted[i]?.fieldType === "section") break;
    block.push(sorted[i]);
  }
  return block;
}

/**
 * Group fields by section markers. Fields after a `section` belong to it until the next section.
 * Order follows displayOrder.
 */
export function groupFieldsBySection(fields = []) {
  const sorted = [...(Array.isArray(fields) ? fields : [])].sort((a, b) => Number(a?.displayOrder || 0) - Number(b?.displayOrder || 0));
  const groups = [];
  let current = {
    section: null,
    fields: []
  };
  for (const field of sorted) {
    if (isLayoutField(field) && field.fieldType === "section") {
      if (current.section || current.fields.length) groups.push(current);
      current = {
        section: field,
        fields: []
      };
      continue;
    }
    if (isLayoutField(field)) continue;
    current.fields.push(field);
  }
  if (current.section || current.fields.length) groups.push(current);
  return groups;
}

export const PALETTE_FIELD_TYPES = [
  // Layout
  {
    type: "section",
    label: "Section",
    icon: "mdi:view-agenda-outline",
    group: "layout"
  },
  // Basic
  {
    type: "text",
    label: "Short text",
    icon: "mdi:form-textbox",
    group: "basic"
  },
  {
    type: "textarea",
    label: "Long text",
    icon: "mdi:text-long",
    group: "basic"
  },
  {
    type: "email",
    label: "Email",
    icon: "mdi:email-outline",
    group: "basic"
  },
  {
    type: "phone",
    label: "Phone",
    icon: "mdi:phone-outline",
    group: "basic"
  },
  {
    type: "url",
    label: "URL / Link",
    icon: "mdi:link-variant",
    group: "basic"
  },
  {
    type: "number",
    label: "Number",
    icon: "mdi:numeric",
    group: "basic"
  },
  {
    type: "currency",
    label: "Currency",
    icon: "mdi:currency-eur",
    group: "basic"
  },
  {
    type: "date",
    label: "Date",
    icon: "mdi:calendar-outline",
    group: "basic"
  },
  {
    type: "time",
    label: "Time",
    icon: "mdi:clock-outline",
    group: "basic"
  },
  {
    type: "datetime",
    label: "Date & time",
    icon: "mdi:calendar-clock",
    group: "basic"
  },
  {
    type: "select",
    label: "Dropdown",
    icon: "mdi:form-dropdown",
    group: "basic"
  },
  {
    type: "radio",
    label: "Single choice",
    icon: "mdi:radiobox-marked",
    group: "basic"
  },
  {
    type: "multiselect",
    label: "Multiple choice",
    icon: "mdi:checkbox-multiple-marked-outline",
    group: "basic"
  },
  {
    type: "checkbox",
    label: "Yes / No",
    icon: "mdi:toggle-switch-outline",
    group: "basic"
  },
  {
    type: "rating",
    label: "Rating",
    icon: "mdi:star-outline",
    group: "basic"
  },
  {
    type: "file",
    label: "File upload",
    icon: "mdi:paperclip",
    group: "basic"
  },
  // Variables (dynamic lookups)
  {
    type: "user",
    label: "User",
    icon: "mdi:account-outline",
    group: "variables"
  },
  {
    type: "client",
    label: "Company",
    icon: "mdi:office-building-outline",
    group: "variables"
  },
  {
    type: "contact",
    label: "Contact",
    icon: "mdi:card-account-details-outline",
    group: "variables"
  }
];

export const FIELD_TYPE_OPTIONS = PALETTE_FIELD_TYPES.map(({
  type,
  label
}) => ({
  value: type,
  label
}));

export const PALETTE_GROUPS = [{
  id: "layout",
  title: "Layout"
}, {
  id: "basic",
  title: "Basic"
}, {
  id: "variables",
  title: "Variables"
}];

export const SALES_FORM_FIELD_TYPES = new Set(PALETTE_FIELD_TYPES.map(item => item.type));
