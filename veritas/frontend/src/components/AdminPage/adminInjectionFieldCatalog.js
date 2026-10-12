/** English-only CSV import field catalog (Admin → Data injection). */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   columns: string[],
 *   type: "text" | "number" | "date" | "boolean" | "id" | "json" | "enum",
 *   required?: boolean,
 *   note?: string,
 *   values?: string
 * }} InjectionFieldRow
 */

const TICKET_STATUS_VALUES = "new, open, in_progress, pending, resolved, closed";
const TICKET_PRIORITY_VALUES = "low, normal, high, urgent";
const TICKET_CHANNEL_VALUES = "web, phone, email, chat, api, whatsapp";
const TICKET_SUPPORT_TYPE_VALUES = "incident, demande, probleme, changement";
const TICKET_SALES_TYPE_VALUES = "prestation, installation";

const TICKET_COMMON_FIELDS = [
  { id: "title", label: "Title", columns: ["title"], type: "text", required: true },
  {
    id: "client",
    label: "Company",
    columns: ["client_name", "client_id"],
    type: "text",
    note: "Match by company name (client_name) or ID (client_id)"
  },
  { id: "description", label: "Description", columns: ["description"], type: "text" },
  {
    id: "priority",
    label: "Priority",
    columns: ["priority"],
    type: "enum",
    values: TICKET_PRIORITY_VALUES
  },
  {
    id: "status",
    label: "Status",
    columns: ["status"],
    type: "enum",
    values: TICKET_STATUS_VALUES
  },
  {
    id: "channel",
    label: "Channel",
    columns: ["channel"],
    type: "enum",
    values: TICKET_CHANNEL_VALUES
  },
  { id: "category", label: "Category", columns: ["category"], type: "text" },
  {
    id: "created_at",
    label: "Created at",
    columns: ["created_at"],
    type: "date",
    values: "ISO 8601 or DD/MM/YYYY[ HH:mm]",
    note: "Optional historical creation date"
  },
  {
    id: "assigned_user_id",
    label: "Assignee (UUID)",
    columns: ["assigned_user_id"],
    type: "id",
    note: "Primary assignee user UUID"
  },
  {
    id: "assigned_user",
    label: "Assignee (email / username)",
    columns: ["assigned_user", "assigned_user_email"],
    type: "text",
    note: "Resolved against Veritas users (email or username)"
  },
  {
    id: "assignee_user_ids",
    label: "Assignees (multi)",
    columns: ["assignee_user_ids", "assignees"],
    type: "text",
    values: "uuid,email,username — comma-separated",
    note: "Additional assignees (UUID and/or email/username)"
  },
  { id: "requester_contact_id", label: "Requester contact", columns: ["requester_contact_id"], type: "id" },
  {
    id: "resolved_at",
    label: "Resolved at",
    columns: ["resolved_at"],
    type: "date",
    values: "ISO 8601 or DD/MM/YYYY[ HH:mm]"
  },
  {
    id: "closed_at",
    label: "Closed at",
    columns: ["closed_at"],
    type: "date",
    values: "ISO 8601 or DD/MM/YYYY[ HH:mm]"
  },
  {
    id: "resolution_reason",
    label: "Solution / resolution reason",
    columns: ["resolution_reason", "solution"],
    type: "text",
    note: "Required with intervention_type + action_type to import a completed resolution"
  },
  {
    id: "intervention_type",
    label: "Intervention type",
    columns: ["intervention_type"],
    type: "text",
    values: "e.g. À distance, Sur site, En atelier…",
    note: "Must match a solution catalog intervention label"
  },
  {
    id: "action_type",
    label: "Action / solution type",
    columns: ["action_type"],
    type: "text",
    values: "e.g. Configuration, Mise à jour…",
    note: "Must match a solution catalog action label"
  }
];

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
    {
      id: "gender",
      label: "Gender",
      columns: ["gender"],
      type: "enum",
      values: "male, female, other (or local aliases)"
    },
    {
      id: "status",
      label: "Status",
      columns: ["status"],
      type: "enum",
      values: "active, inactive"
    }
  ],
  tickets_support: [
    TICKET_COMMON_FIELDS[0],
    TICKET_COMMON_FIELDS[1],
    TICKET_COMMON_FIELDS[2],
    TICKET_COMMON_FIELDS[3],
    TICKET_COMMON_FIELDS[4],
    {
      id: "type",
      label: "Type",
      columns: ["type"],
      type: "enum",
      values: TICKET_SUPPORT_TYPE_VALUES,
      note: "Support ticket kinds only (not prestation / installation)"
    },
    TICKET_COMMON_FIELDS[5],
    TICKET_COMMON_FIELDS[6],
    TICKET_COMMON_FIELDS[7],
    {
      id: "is_major_incident",
      label: "Major incident",
      columns: ["is_major_incident"],
      type: "boolean",
      values: "true, false"
    },
    TICKET_COMMON_FIELDS[8],
    TICKET_COMMON_FIELDS[9],
    TICKET_COMMON_FIELDS[10],
    TICKET_COMMON_FIELDS[11],
    TICKET_COMMON_FIELDS[12],
    TICKET_COMMON_FIELDS[13],
    TICKET_COMMON_FIELDS[14],
    TICKET_COMMON_FIELDS[15],
    TICKET_COMMON_FIELDS[16]
  ],
  tickets_sales: [
    TICKET_COMMON_FIELDS[0],
    TICKET_COMMON_FIELDS[1],
    TICKET_COMMON_FIELDS[2],
    TICKET_COMMON_FIELDS[3],
    TICKET_COMMON_FIELDS[4],
    {
      id: "type",
      label: "Type",
      columns: ["type"],
      type: "enum",
      required: true,
      values: TICKET_SALES_TYPE_VALUES,
      note: "Required to create a service / installation ticket"
    },
    {
      id: "category",
      label: "Category",
      columns: ["category"],
      type: "text",
      note: "Optional; legacy prefixes prestation-* / installation-* also mark sales tickets"
    },
    TICKET_COMMON_FIELDS[5],
    TICKET_COMMON_FIELDS[7],
    TICKET_COMMON_FIELDS[8],
    TICKET_COMMON_FIELDS[9],
    TICKET_COMMON_FIELDS[10],
    TICKET_COMMON_FIELDS[11],
    TICKET_COMMON_FIELDS[12],
    TICKET_COMMON_FIELDS[13],
    TICKET_COMMON_FIELDS[14],
    TICKET_COMMON_FIELDS[15],
    TICKET_COMMON_FIELDS[16]
  ]
};

/** @deprecated Use tickets_support — kept for older bookmarks */
INJECTION_FIELD_CATALOG.tickets = INJECTION_FIELD_CATALOG.tickets_support;

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
    note: row.note || "",
    values: row.values || ""
  }));
}

export function hasInjectionFieldCatalog(entity) {
  return Array.isArray(INJECTION_FIELD_CATALOG[entity]) && INJECTION_FIELD_CATALOG[entity].length > 0;
}
