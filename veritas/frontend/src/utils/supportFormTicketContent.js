/**
 * Resolve ticket title / description from support-form field values
 * when the fixed subject/description inputs are hidden.
 */

const SUBJECT_HINT = /sujet|subject|objet|title|titre/i;
const DESCRIPTION_HINT = /description|detail|détail|details|message|contenu|content|body/i;

function normalizeHaystack(field) {
  return `${field?.fieldKey || ""} ${field?.label || ""}`.trim();
}

export function findFormSubjectField(fields = []) {
  const list = Array.isArray(fields) ? fields : [];
  return (
    list.find(field => field && !["section", "file", "checkbox", "rating"].includes(String(field.fieldType || "")) && SUBJECT_HINT.test(normalizeHaystack(field))) ||
    null
  );
}

export function findFormDescriptionField(fields = []) {
  const list = Array.isArray(fields) ? fields : [];
  return (
    list.find(field => field && !["section", "file", "checkbox", "rating"].includes(String(field.fieldType || "")) && DESCRIPTION_HINT.test(normalizeHaystack(field))) ||
    null
  );
}

function stringifyFormValue(raw) {
  if (raw == null) return "";
  if (Array.isArray(raw)) {
    return raw
      .map(item => {
        if (item && typeof item === "object") return item.fileName || item.name || item.label || "";
        return String(item ?? "");
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  return String(raw).trim();
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
    (subjectFieldKey && visible.find(field => String(field.fieldKey) === String(subjectFieldKey))) ||
    findFormSubjectField(visible);
  const descriptionField =
    (descriptionFieldKey && visible.find(field => String(field.fieldKey) === String(descriptionFieldKey))) ||
    findFormDescriptionField(visible);

  const subjectKey = subjectField?.fieldKey || null;
  const descriptionKey = descriptionField?.fieldKey || null;

  const titleFromField = subjectKey
    ? String(displayValues?.[subjectKey] || stringifyFormValue(values?.[subjectKey]) || "").trim()
    : "";
  const descriptionFromField = descriptionKey
    ? String(displayValues?.[descriptionKey] || stringifyFormValue(values?.[descriptionKey]) || "").trim()
    : "";

  const title =
    titleFromField ||
    String(fallbackTitle || "").trim() ||
    String(formLabel || "").trim() ||
    "Ticket";

  let description = descriptionFromField || String(fallbackDescription || "").trim();
  if (!description) {
    const lines = visible
      .filter(field => field.fieldKey !== subjectKey)
      .map(field => {
        const label = String(field.label || field.fieldKey).trim();
        const value = String(displayValues?.[field.fieldKey] || stringifyFormValue(values?.[field.fieldKey]) || "").trim();
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
  return (Array.isArray(fields) ? fields : []).filter(field => {
    if (!field?.fieldKey) return false;
    const type = String(field.fieldType || "");
    return !["section", "file", "checkbox", "rating", "user", "contact", "client", "equipment", "multiselect"].includes(type);
  });
}
