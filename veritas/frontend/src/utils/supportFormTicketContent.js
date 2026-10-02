/**
 * Resolve ticket title / description from support-form field values
 * when the fixed subject/description inputs are hidden.
 */

const SUBJECT_HINT = /\b(sujet|subject|objet|title|titre)\b/i;
const DESCRIPTION_HINT = /description|detail|détail|details|message|contenu|content|body/i;
const CATEGORY_HINT = /cat[eé]gor|category/i;
const IMPACTED_USERS_HINT = /utilisateurs?\s*impact|impacted\s*users|nombre\s+d['’]?\s*utilisateurs/i;
const NON_TEXT_FIELD_TYPES = new Set(["section", "file", "checkbox", "rating", "user", "client", "contact", "equipment", "multiselect"]);
const HIDDEN_SUPPORT_FORM_DETAIL_TYPES = new Set(["user", "client", "contact", "equipment"]);

function normalizeHaystack(fieldOrKey, label = "") {
  if (fieldOrKey && typeof fieldOrKey === "object") {
    return `${fieldOrKey.fieldKey || ""} ${fieldOrKey.label || ""}`.trim();
  }
  return `${fieldOrKey || ""} ${label || ""}`.trim();
}

function isMappableTextField(field) {
  if (!field?.fieldKey) return false;
  return !NON_TEXT_FIELD_TYPES.has(String(field.fieldType || "").toLowerCase());
}

function scoreSubjectField(field) {
  const hay = normalizeHaystack(field);
  if (!SUBJECT_HINT.test(hay) || DESCRIPTION_HINT.test(hay)) return 0;
  if (/titre|title/i.test(hay)) return 3;
  if (/sujet|subject/i.test(hay)) return 2;
  if (/\bobjet\b/i.test(hay)) return 1;
  return 0;
}

export function findFormSubjectField(fields = []) {
  const list = (Array.isArray(fields) ? fields : []).filter(isMappableTextField);
  let best = null;
  let bestScore = 0;
  for (const field of list) {
    const score = scoreSubjectField(field);
    if (score > bestScore) {
      best = field;
      bestScore = score;
    }
  }
  return best;
}

export function findFormDescriptionField(fields = []) {
  const list = (Array.isArray(fields) ? fields : []).filter(isMappableTextField);
  return list.find(field => DESCRIPTION_HINT.test(normalizeHaystack(field)) && !SUBJECT_HINT.test(normalizeHaystack(field))) || null;
}

export function stringifyFormValue(raw) {
  if (raw == null) return "";
  if (Array.isArray(raw)) {
    return raw
      .map(item => {
        if (item && typeof item === "object") {
          return item.fileName || item.name || item.label || item.displayName || item.email || item.id || "";
        }
        return String(item ?? "");
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (typeof raw === "object") {
    return (
      raw.label ||
      raw.name ||
      raw.displayName ||
      raw.fileName ||
      raw.email ||
      raw.title ||
      raw.value ||
      (raw.id != null ? String(raw.id) : "")
    );
  }
  const text = String(raw).trim();
  return text === "[object Object]" ? "" : text;
}

function readFormFieldText(formData, key) {
  if (!formData || !key) return "";
  const display = formData.displayValues?.[key];
  if (display != null && String(display).trim() && String(display).trim() !== "[object Object]") {
    return String(display).trim();
  }
  return stringifyFormValue(formData.values?.[key]);
}

/** Titre métier issu des champs formulaire (ex. « Titre de l'incident »). */
export function extractSupportFormSubjectTitle(formData, extraLabelMap = {}) {
  if (!formData || typeof formData !== "object") return "";
  const labelMap = {
    ...(formData.fieldLabels && typeof formData.fieldLabels === "object" ? formData.fieldLabels : {}),
    ...(extraLabelMap && typeof extraLabelMap === "object" ? extraLabelMap : {})
  };
  const keys = new Set([
    ...Object.keys(formData.displayValues && typeof formData.displayValues === "object" ? formData.displayValues : {}),
    ...Object.keys(formData.values && typeof formData.values === "object" ? formData.values : {}),
    ...Object.keys(labelMap)
  ]);
  let best = "";
  let bestScore = 0;
  for (const key of keys) {
    const label = labelMap[key] || key;
    const score = scoreSubjectField({ fieldKey: key, label, fieldType: "text" });
    if (score <= bestScore) continue;
    const value = readFormFieldText(formData, key);
    if (!value) continue;
    best = value;
    bestScore = score;
  }
  return best;
}

/**
 * Prefers the explicit form title when the stored ticket title looks like a
 * description dump / concatenation (common with misconfigured title templates).
 */
export function pickTicketDisplayTitle(storedTitle, formTitle, description = "") {
  const stored = String(storedTitle || "").trim();
  const form = String(formTitle || "").trim();
  if (!form) return stored;
  if (!stored || /^\[object Object\]$/i.test(stored)) return form;
  const descLine = String(description || "")
    .split("\n")
    .map(line => line.trim())
    .find(Boolean) || "";
  const descProbe = descLine.replace(/^[^:]+:\s*/, "").slice(0, 40);
  if (form && stored.includes(form) && stored.length > form.length + 10) {
    if (!descProbe || stored.includes(descProbe) || stored.startsWith(descProbe)) return form;
  }
  if (descProbe && stored.startsWith(descProbe) && stored.length > form.length) return form;
  return stored;
}

/** Champs déjà visibles ailleurs (chat, propriétés, contact) — à masquer dans la colonne Formulaire. */
export function shouldHideSupportFormDetailField(row, typeMap = {}) {
  if (!row) return true;
  const key = String(row.key || "");
  const label = String(row.label || "");
  const hay = normalizeHaystack(key, label);
  const type = String(typeMap?.[key] || "").toLowerCase();
  if (HIDDEN_SUPPORT_FORM_DETAIL_TYPES.has(type)) return true;
  if (/^(user|client|contact|equipment|company|entreprise)_/i.test(key)) return true;
  if (SUBJECT_HINT.test(hay)) return true;
  if (DESCRIPTION_HINT.test(hay)) return true;
  if (CATEGORY_HINT.test(hay)) return true;
  if (IMPACTED_USERS_HINT.test(hay)) return true;
  if (/^(user|company|entreprise|client)$/i.test(label.trim())) return true;
  return false;
}

/**
 * @returns {{ title: string, description: string, subjectFieldKey: string|null, descriptionFieldKey: string|null }}
 */
export function resolveTicketContentFromSupportForm({
  fields = [],
  values = {},
  displayValues = {},
  formLabel = "",
  fallbackTitle = "",
  fallbackDescription = "",
  subjectFieldKey = null,
  descriptionFieldKey = null
} = {}) {
  const visible = (Array.isArray(fields) ? fields : []).filter(field => field?.fieldKey && field.fieldType !== "section" && field.fieldType !== "file");
  const subjectField =
    (subjectFieldKey && visible.find(field => String(field.fieldKey) === String(subjectFieldKey) && isMappableTextField(field))) ||
    findFormSubjectField(visible);
  const descriptionField =
    (descriptionFieldKey && visible.find(field => String(field.fieldKey) === String(descriptionFieldKey) && isMappableTextField(field))) ||
    findFormDescriptionField(visible);

  const subjectKey = subjectField?.fieldKey || null;
  const descriptionKey = descriptionField?.fieldKey || null;

  const readValue = key => {
    const fromDisplay = displayValues?.[key];
    if (fromDisplay != null && String(fromDisplay).trim() && String(fromDisplay).trim() !== "[object Object]") {
      return String(fromDisplay).trim();
    }
    return stringifyFormValue(values?.[key]);
  };

  const titleFromField = subjectKey ? readValue(subjectKey) : "";
  const descriptionFromField = descriptionKey ? readValue(descriptionKey) : "";

  const title =
    titleFromField ||
    String(fallbackTitle || "").trim() ||
    String(formLabel || "").trim() ||
    "Ticket";

  let description = descriptionFromField || String(fallbackDescription || "").trim();
  if (!description) {
    const lines = visible
      .filter(field => field.fieldKey !== subjectKey && field.fieldKey !== descriptionKey)
      .filter(field => !HIDDEN_SUPPORT_FORM_DETAIL_TYPES.has(String(field.fieldType || "").toLowerCase()))
      .map(field => {
        const label = String(field.label || field.fieldKey).trim();
        const value = readValue(field.fieldKey);
        if (!value) return null;
        return `${label}: ${value}`;
      })
      .filter(Boolean);
    description = lines.join("\n");
  }

  return {
    title: title.slice(0, 200),
    description: description.slice(0, 5000),
    subjectFieldKey: subjectKey,
    descriptionFieldKey: descriptionKey
  };
}

export function collectSupportFormFiles(fields = [], values = {}) {
  const files = [];
  const meta = [];
  (Array.isArray(fields) ? fields : []).forEach(field => {
    if (String(field?.fieldType || "") !== "file" || !field.fieldKey) return;
    const raw = values?.[field.fieldKey];
    if (!Array.isArray(raw)) return;
    raw.forEach(item => {
      if (item?.file instanceof File) {
        meta.push({
          fieldKey: field.fieldKey,
          name: item.name || item.file.name
        });
        files.push(item.file);
      }
    });
  });
  return { files, meta };
}

/** Text-like fields usable as subject/description mapping targets in supervision rules. */
export function listMappableSupportFormFields(fields = []) {
  return (Array.isArray(fields) ? fields : []).filter(isMappableTextField);
}
