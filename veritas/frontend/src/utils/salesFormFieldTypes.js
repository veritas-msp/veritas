import { getSiteDisplayName, getSiteId, normalizeClientSites } from "./clientSites";

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
      matchMode: field?.visibilityRules?.matchMode === "any" ? "any" : field?.visibilityRules?.matchMode === "mixed" ? "mixed" : "all",
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
 * Move a field in a displayOrder-sorted list. Sections move with all their child fields.
 */
export function reorderSalesFormFields(fields = [], activeId, overId) {
  const sorted = [...(Array.isArray(fields) ? fields : [])].sort((a, b) => Number(a?.displayOrder || 0) - Number(b?.displayOrder || 0));
  const activeIdx = sorted.findIndex(field => String(field.id) === String(activeId));
  const overIdx = sorted.findIndex(field => String(field.id) === String(overId));
  if (activeIdx < 0 || overIdx < 0 || activeIdx === overIdx) return Array.isArray(fields) ? fields : [];
  const active = sorted[activeIdx];
  const withOrders = list => list.map((field, index) => ({
    ...field,
    displayOrder: (index + 1) * 10
  }));

  if (active?.fieldType === "section") {
    // Build ordered blocks: each section + its fields (and any leading ungrouped fields).
    const blocks = [];
    let current = [];
    for (const field of sorted) {
      if (field.fieldType === "section") {
        if (current.length) blocks.push(current);
        current = [field];
      } else {
        current.push(field);
      }
    }
    if (current.length) blocks.push(current);
    const from = blocks.findIndex(block => block.some(field => String(field.id) === String(activeId)));
    const to = blocks.findIndex(block => block.some(field => String(field.id) === String(overId)));
    if (from < 0 || to < 0 || from === to) return Array.isArray(fields) ? fields : [];
    const nextBlocks = [...blocks];
    const [moved] = nextBlocks.splice(from, 1);
    nextBlocks.splice(to, 0, moved);
    return withOrders(nextBlocks.flat());
  }

  const reordered = [...sorted];
  const [item] = reordered.splice(activeIdx, 1);
  reordered.splice(overIdx, 0, item);
  return withOrders(reordered);
}

/**
 * Same visual order as the builder canvas / runtime form.
 */
export function compareSalesFormFields(a, b) {
  const orderA = Number(a?.displayOrder || 0);
  const orderB = Number(b?.displayOrder || 0);
  if (orderA !== orderB) return orderA - orderB;
  return String(a?.id || a?.fieldKey || "").localeCompare(String(b?.id || b?.fieldKey || ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

export function sortSalesFormFields(fields = []) {
  return [...(Array.isArray(fields) ? fields : [])].sort(compareSalesFormFields);
}

/**
 * Group fields by section markers. Fields after a `section` belong to it until the next section.
 * Order follows displayOrder.
 */
export function groupFieldsBySection(fields = []) {
  const sorted = sortSalesFormFields(fields);
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

/**
 * Build condition field pickers in form order, grouped by section (for optgroups).
 * Duplicate labels inside a group get ` · fieldKey` appended.
 */
export function buildConditionFieldOptionGroups(fields = [], {
  excludeFieldKey = "",
  excludeFiles = true
} = {}) {
  const groups = groupFieldsBySection(fields);
  const result = [];
  for (const group of groups) {
    let selectable = (group.fields || []).filter(field => field?.fieldKey && String(field.fieldKey) !== String(excludeFieldKey || ""));
    if (excludeFiles) selectable = selectable.filter(field => !isFileField(field));
    if (!selectable.length) continue;
    const labelCounts = {};
    selectable.forEach(field => {
      const label = String(field.label || field.fieldKey || "").trim() || field.fieldKey;
      labelCounts[label] = (labelCounts[label] || 0) + 1;
    });
    const sectionLabel = group.section ? String(group.section.label || "").trim() || "Untitled section" : "No section";
    result.push({
      sectionKey: group.section ? String(group.section.id || group.section.fieldKey || sectionLabel) : "__none__",
      sectionLabel,
      options: selectable.map(field => {
        const baseLabel = String(field.label || field.fieldKey || "").trim() || field.fieldKey;
        return {
          id: field.fieldKey,
          label: labelCounts[baseLabel] > 1 ? `${baseLabel} · ${field.fieldKey}` : baseLabel,
          field
        };
      })
    });
  }
  return result;
}

/**
 * Flat condition options in exact form order (section context in the label when useful).
 */
export function buildConditionFieldOptions(fields = [], options = {}) {
  const groups = buildConditionFieldOptionGroups(fields, options);
  const hasNamedSections = groups.some(group => group.sectionKey !== "__none__");
  return groups.flatMap(group => group.options.map(option => ({
    ...option,
    sectionLabel: group.sectionLabel,
    label: hasNamedSections ? `${group.sectionLabel} · ${option.label}` : option.label
  })));
}

export function flattenConditionFieldOptions(groups = []) {
  return (Array.isArray(groups) ? groups : []).flatMap(group => group.options || []);
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
    labelFr: "Oui / Non",
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
    labelFr: "Utilisateur",
    icon: "mdi:account-outline",
    group: "variables"
  },
  {
    type: "client",
    label: "Company",
    labelFr: "Entreprise",
    icon: "mdi:office-building-outline",
    group: "variables"
  },
  {
    type: "contact",
    label: "Contact",
    labelFr: "Contact",
    icon: "mdi:card-account-details-outline",
    group: "variables"
  },
  {
    type: "equipment",
    label: "Equipment",
    labelFr: "Équipement",
    icon: "mdi:desktop-classic",
    group: "variables"
  },
  {
    type: "site",
    label: "Site",
    labelFr: "Lieu",
    icon: "mdi:map-marker-outline",
    group: "variables"
  }
];

/** Entity lookup fields that need authenticated entity lists (not for anonymous public forms). */
export const ENTITY_LOOKUP_FIELD_TYPES = new Set(["user", "client", "contact", "equipment", "site"]);

export function isEntityLookupField(fieldOrType) {
  const type = typeof fieldOrType === "string" ? fieldOrType : fieldOrType?.fieldType;
  return ENTITY_LOOKUP_FIELD_TYPES.has(String(type || ""));
}

/** First company field key in a form (used to scope equipment choices). */
export function findFormClientFieldKey(fields = []) {
  const field = (Array.isArray(fields) ? fields : []).find(item => String(item?.fieldType || "") === "client" && item?.fieldKey);
  return field?.fieldKey || null;
}

export function findFormEquipmentFieldKeys(fields = []) {
  return (Array.isArray(fields) ? fields : [])
    .filter(item => String(item?.fieldType || "") === "equipment" && item?.fieldKey)
    .map(item => item.fieldKey);
}

export function findFormSiteFieldKeys(fields = []) {
  return (Array.isArray(fields) ? fields : [])
    .filter(item => String(item?.fieldType || "") === "site" && item?.fieldKey)
    .map(item => item.fieldKey);
}

/** Sites of a company for a form "site" (lieu) field. */
export function getFormSiteOptionsForClient(clients = [], clientId = null) {
  if (clientId == null || clientId === "") return [];
  const client = (Array.isArray(clients) ? clients : []).find(c => String(c.id) === String(clientId));
  return normalizeClientSites(client?.sites).map(site => ({
    id: getSiteId(site),
    label: getSiteDisplayName(site),
    name: getSiteDisplayName(site)
  }));
}

/**
 * Resolve which company scopes equipment picks:
 * form company field value first, else fallback (ticket/portal active client).
 */
export function resolveFormScopedClientId(fields = [], values = {}, fallbackClientId = null) {
  const clientKey = findFormClientFieldKey(fields);
  if (clientKey) {
    const fromForm = values?.[clientKey];
    if (fromForm != null && String(fromForm).trim() !== "") return String(fromForm).trim();
    return null;
  }
  if (fallbackClientId != null && String(fallbackClientId).trim() !== "") return String(fallbackClientId).trim();
  return null;
}

export function filterEquipmentsForClientScope(equipments = [], clientId = null) {
  const rows = Array.isArray(equipments) ? equipments : [];
  if (!clientId) return [];
  const needle = String(clientId);
  return rows.filter(eq => {
    const eqClient = eq?.clientId ?? eq?.client_id ?? null;
    if (eqClient == null || eqClient === "") return true;
    return String(eqClient) === needle;
  });
}

export function isContactField(fieldOrType) {
  const type = typeof fieldOrType === "string" ? fieldOrType : fieldOrType?.fieldType;
  return String(type || "") === "contact";
}

export const DEFAULT_CONTACT_FIELD_CONFIG = {
  source: "contacts",
  scopeByClient: false,
  profileNames: [],
  userIds: []
};

export function getContactFieldConfig(fieldOrOptions) {
  const options = Array.isArray(fieldOrOptions) ? fieldOrOptions : Array.isArray(fieldOrOptions?.options) ? fieldOrOptions.options : [];
  const raw = options.find(item => item && typeof item === "object" && (item.__contactConfig || item.source != null || item.scopeByClient != null || item.profileNames != null || item.userIds != null)) || null;
  const source = String(raw?.source || "").toLowerCase() === "agents" ? "agents" : "contacts";
  const profileNames = Array.isArray(raw?.profileNames)
    ? [...new Set(raw.profileNames.map(name => String(name || "").trim()).filter(Boolean))]
    : [];
  const userIds = Array.isArray(raw?.userIds)
    ? [...new Set(raw.userIds.map(id => String(id || "").trim()).filter(Boolean))]
    : [];
  return {
    __contactConfig: true,
    source,
    scopeByClient: raw?.scopeByClient === true,
    profileNames,
    userIds
  };
}

export function buildContactFieldOptionsFromDraft(draft = {}) {
  return [getContactFieldConfig({
    options: [{
      __contactConfig: true,
      source: draft.contactSource,
      scopeByClient: draft.contactScopeByClient,
      profileNames: draft.contactProfileNames,
      userIds: draft.contactUserIds
    }]
  })];
}

export function contactBelongsToClient(contact, clientId) {
  if (!contact || clientId == null || clientId === "") return false;
  const cid = String(clientId);
  if (String(contact.client_id ?? contact.clientId ?? "") === cid) return true;
  const memberships = Array.isArray(contact.clients) ? contact.clients : [];
  return memberships.some(m => String(m.client_id ?? m.id ?? "") === cid);
}

export function userMatchesProfiles(user, profileNames = []) {
  const wanted = (Array.isArray(profileNames) ? profileNames : []).map(name => String(name || "").trim().toLowerCase()).filter(Boolean);
  if (!wanted.length) return true;
  const userProfiles = [
    user?.profile,
    ...(Array.isArray(user?.profiles) ? user.profiles : [])
  ].map(name => String(name || "").trim().toLowerCase()).filter(Boolean);
  if (!userProfiles.length) return false;
  return wanted.some(name => userProfiles.includes(name));
}

/**
 * Filter contact-field options according to __contactConfig.
 * source=contacts → contacts list (optionally scoped by company)
 * source=agents → users list (optionally by profiles / userIds)
 */
export function filterContactFieldChoices({
  field,
  contacts = [],
  users = [],
  clientId = null,
  hasClientField = false
} = {}) {
  const cfg = getContactFieldConfig(field);
  if (cfg.source === "agents") {
    let rows = Array.isArray(users) ? users : [];
    if (cfg.profileNames.length) {
      rows = rows.filter(user => userMatchesProfiles(user, cfg.profileNames));
    }
    if (cfg.userIds.length) {
      const allowed = new Set(cfg.userIds.map(String));
      rows = rows.filter(user => allowed.has(String(user?.id)));
    }
    return {
      source: "agents",
      rows,
      needsClient: false,
      waitingForClient: false
    };
  }
  let rows = Array.isArray(contacts) ? contacts : [];
  const shouldScope = cfg.scopeByClient === true && hasClientField;
  if (shouldScope) {
    if (!clientId) {
      return {
        source: "contacts",
        rows: [],
        needsClient: true,
        waitingForClient: true
      };
    }
    rows = rows.filter(contact => contactBelongsToClient(contact, clientId));
  }
  return {
    source: "contacts",
    rows,
    needsClient: shouldScope,
    waitingForClient: false
  };
}

export function findFormContactFieldKeysScopedByClient(fields = []) {
  return (Array.isArray(fields) ? fields : [])
    .filter(item => isContactField(item) && item?.fieldKey && getContactFieldConfig(item).scopeByClient === true && getContactFieldConfig(item).source === "contacts")
    .map(item => item.fieldKey);
}

export const FIELD_TYPE_OPTIONS = PALETTE_FIELD_TYPES.map(({
  type,
  label
}) => ({
  value: type,
  label
}));

/** Localized Yes/No labels for checkbox fields (builder + runtime). */
export function getCheckboxFieldCopy(locale = "fr") {
  const copies = {
    fr: {
      yes: "Oui",
      no: "Non",
      typeLabel: "Oui / Non"
    },
    en: {
      yes: "Yes",
      no: "No",
      typeLabel: "Yes / No"
    },
    de: {
      yes: "Ja",
      no: "Nein",
      typeLabel: "Ja / Nein"
    },
    it: {
      yes: "Sì",
      no: "No",
      typeLabel: "Sì / No"
    },
    es: {
      yes: "Sí",
      no: "No",
      typeLabel: "Sí / No"
    }
  };
  return copies[locale] || copies.fr;
}

/** Localized palette / type-dropdown label for a field type. */
export function getFieldTypeLabel(type, locale = "fr") {
  if (String(type || "") === "checkbox") return getCheckboxFieldCopy(locale).typeLabel;
  const item = PALETTE_FIELD_TYPES.find(entry => entry.type === type);
  if (!item) return type || "";
  if (locale === "en") return item.label;
  return item.labelFr || item.label;
}

export function getFieldTypeOptions(locale = "fr") {
  return PALETTE_FIELD_TYPES.map(({
    type
  }) => ({
    value: type,
    label: getFieldTypeLabel(type, locale)
  }));
}

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
