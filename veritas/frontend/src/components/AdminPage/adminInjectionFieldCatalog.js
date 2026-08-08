/** English-only CSV import field catalog (Admin → Data injection). */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   columns: string[],
 *   type: "text" | "number" | "date" | "boolean" | "id" | "json",
 *   required?: boolean,
 *   note?: string
 * }} InjectionFieldRow
 */

/** @type {Record<string, InjectionFieldRow[]>} */
export const INJECTION_FIELD_CATALOG = {
  companies: [
    {
      id: "client_number",
      label: "Client number",
      columns: ["client_number"],
      type: "text"
    },
    {
      id: "name",
      label: "Company name",
      columns: ["name"],
      type: "text",
      required: true
    },
    {
      id: "legal_identifier",
      label: "Legal identifier",
      columns: ["legal_identifier"],
      type: "text"
    },
    {
      id: "industry_sector",
      label: "Industry sector",
      columns: ["industry_sector"],
      type: "text"
    },
    {
      id: "account_manager",
      label: "Account manager",
      columns: ["account_manager_id"],
      type: "id"
    },
    {
      id: "contract_dates",
      label: "Contract start / end",
      columns: ["contract_start", "contract_end"],
      type: "date"
    },
    {
      id: "options",
      label: "Contract options",
      columns: ["options"],
      type: "json"
    },
    {
      id: "primary_contact",
      label: "Primary contact",
      columns: [
        "contact_firstname",
        "contact_name",
        "contact_mail",
        "contact_number",
        "contact_job"
      ],
      type: "text"
    },
    {
      id: "sites",
      label: "Sites",
      columns: ["sites"],
      type: "json"
    }
  ],
  contacts: [
    { id: "contact_name", label: "Last name", columns: ["contact_name"], type: "text", required: true },
    { id: "contact_firstname", label: "First name", columns: ["contact_firstname"], type: "text" },
    { id: "contact_mail", label: "Email", columns: ["contact_mail"], type: "text" },
    { id: "contact_number", label: "Phone", columns: ["contact_number"], type: "number" },
    { id: "contact_job", label: "Job title", columns: ["contact_job"], type: "text" },
    { id: "client", label: "Company", columns: ["client_name"], type: "text" },
    { id: "gender", label: "Gender", columns: ["gender"], type: "text" },
    { id: "status", label: "Status", columns: ["status"], type: "text", note: "active / inactive" }
  ],
  tickets: [
    { id: "title", label: "Title", columns: ["title"], type: "text", required: true },
    { id: "client", label: "Company", columns: ["client_name"], type: "text" },
    { id: "description", label: "Description", columns: ["description"], type: "text" },
    { id: "priority", label: "Priority", columns: ["priority"], type: "text" },
    { id: "status", label: "Status", columns: ["status"], type: "text" },
    { id: "type", label: "Type", columns: ["type"], type: "text" },
    { id: "category", label: "Category", columns: ["category"], type: "text" },
    { id: "channel", label: "Channel", columns: ["channel"], type: "text" },
    { id: "is_major_incident", label: "Major incident", columns: ["is_major_incident"], type: "boolean" },
    { id: "assigned_user_id", label: "Assigned agent", columns: ["assigned_user_id"], type: "id" },
    { id: "requester_contact_id", label: "Requester contact", columns: ["requester_contact_id"], type: "id" }
  ]
};

export const FIELDS_GUIDE_UI = {
  title: "Expected columns",
  toggle: "Show / hide field details",
  colField: "Field",
  colCsv: "CSV columns",
  colType: "Type",
  required: "required"
};

export function getInjectionFieldRows(entity) {
  const rows = INJECTION_FIELD_CATALOG[entity];
  if (!Array.isArray(rows) || !rows.length) return [];
  return rows.map(row => ({
    id: row.id,
    label: row.label,
    columns: row.columns || [],
    type: row.type || "text",
    required: Boolean(row.required),
    note: row.note || ""
  }));
}

export function hasInjectionFieldCatalog(entity) {
  return Array.isArray(INJECTION_FIELD_CATALOG[entity]) && INJECTION_FIELD_CATALOG[entity].length > 0;
}
