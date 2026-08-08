import { pool } from "../database/db.js";
import { decryptSetting } from "./settingsHelper.js";

export const TICKET_TABLE_COLUMNS_SECTION = "tickets";
export const DIRECTORY_TABLE_COLUMNS_SECTION = "clients";
export const TICKET_TABLE_COLUMNS_PAGE_SCOPES = Object.freeze(["ticket", "ticket_sales", "enterprises", "contacts"]);

export const TICKET_TABLE_COLUMN_IDS_BY_SCOPE = Object.freeze({
  ticket: Object.freeze([
    "ticket_number",
    "title",
    "channel",
    "type",
    "requester",
    "client",
    "assigned",
    "followers",
    "status",
    "priority",
    "sla",
    "created_at",
    "updated_at"
  ]),
  ticket_sales: Object.freeze([
    "ticket_number",
    "title",
    "type",
    "category",
    "client",
    "requester",
    "assigned",
    "status",
    "tasks",
    "progress",
    "created_at",
    "updated_at"
  ]),
  enterprises: Object.freeze([
    "client_number",
    "company",
    "primary_contact",
    "commercial",
    "modules",
    "expiration",
    "equipment",
    "tags"
  ]),
  contacts: Object.freeze([
    "contact",
    "gender",
    "status",
    "enterprise",
    "role",
    "email",
    "phone",
    "portal"
  ])
});

export const DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE = Object.freeze({
  ticket: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.ticket]),
  ticket_sales: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.ticket_sales]),
  enterprises: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.enterprises]),
  contacts: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.contacts])
});

export const TICKET_TABLE_COLUMNS_PUBLIC_KEYS = Object.freeze({
  ticket: "ticket_table_columns_public",
  ticket_sales: "ticket_sales_table_columns_public",
  enterprises: "enterprises_table_columns_public",
  contacts: "contacts_table_columns_public"
});

export const TICKET_TABLE_COLUMNS_PRIVATE_KEYS = Object.freeze({
  ticket: "ticket_table_columns_private",
  ticket_sales: "ticket_sales_table_columns_private",
  enterprises: "enterprises_table_columns_private",
  contacts: "contacts_table_columns_private"
});

const TABLE_COLUMNS_SECTION_BY_SCOPE = Object.freeze({
  ticket: TICKET_TABLE_COLUMNS_SECTION,
  ticket_sales: TICKET_TABLE_COLUMNS_SECTION,
  enterprises: DIRECTORY_TABLE_COLUMNS_SECTION,
  contacts: DIRECTORY_TABLE_COLUMNS_SECTION
});

const TABLE_COLUMNS_PUBLIC_LABEL_BY_SCOPE = Object.freeze({
  ticket: "Ticket table public columns",
  ticket_sales: "Sales ticket table public columns",
  enterprises: "Enterprises table public columns",
  contacts: "Contacts table public columns"
});

/** @deprecated Prefer scope-aware helpers. */
export const TICKET_TABLE_COLUMNS_PUBLIC_KEY = TICKET_TABLE_COLUMNS_PUBLIC_KEYS.ticket;
/** @deprecated Prefer scope-aware helpers. */
export const TICKET_TABLE_COLUMNS_PRIVATE_SETTING_KEY = TICKET_TABLE_COLUMNS_PRIVATE_KEYS.ticket;
/** @deprecated Prefer scope-aware helpers. */
export const TICKET_TABLE_COLUMN_IDS = TICKET_TABLE_COLUMN_IDS_BY_SCOPE.ticket;
/** @deprecated Prefer scope-aware helpers. */
export const DEFAULT_TICKET_TABLE_COLUMNS = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.ticket;

export function normalizeTicketTableColumnsPageScope(raw) {
  const value = String(raw || "ticket").trim().toLowerCase();
  if (value === "ticket_sales") return "ticket_sales";
  if (value === "enterprises" || value === "companies" || value === "clients") return "enterprises";
  if (value === "contacts" || value === "contact") return "contacts";
  return "ticket";
}

function allowedSetForScope(pageScope) {
  const scope = normalizeTicketTableColumnsPageScope(pageScope);
  return new Set(TICKET_TABLE_COLUMN_IDS_BY_SCOPE[scope] || TICKET_TABLE_COLUMN_IDS_BY_SCOPE.ticket);
}

function defaultsForScope(pageScope) {
  const scope = normalizeTicketTableColumnsPageScope(pageScope);
  return [...(DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE[scope] || DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.ticket)];
}

function sectionForScope(pageScope) {
  const scope = normalizeTicketTableColumnsPageScope(pageScope);
  return TABLE_COLUMNS_SECTION_BY_SCOPE[scope] || TICKET_TABLE_COLUMNS_SECTION;
}

/**
 * @param {unknown} raw
 * @param {{ allowEmpty?: boolean, fallback?: string[] | null, pageScope?: string }} [options]
 * @returns {string[] | null}
 */
export function normalizeTicketTableColumns(raw, {
  allowEmpty = false,
  fallback,
  pageScope = "ticket"
} = {}) {
  const scopeDefaults = defaultsForScope(pageScope);
  const resolvedFallback = fallback === undefined ? scopeDefaults : fallback;
  const allowed = allowedSetForScope(pageScope);
  if (raw == null) return null;
  let list = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return resolvedFallback ? [...resolvedFallback] : null;
    }
  }
  if (list && typeof list === "object" && !Array.isArray(list) && Array.isArray(list.columns)) {
    list = list.columns;
  }
  if (!Array.isArray(list)) return resolvedFallback ? [...resolvedFallback] : null;

  const seen = new Set();
  const out = [];
  for (const item of list) {
    const id = String(item || "").trim();
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  if (out.length === 0) {
    return allowEmpty ? [] : (resolvedFallback ? [...resolvedFallback] : null);
  }
  return out;
}

export function filterColumnsForEdition(columns, { isCommunityEdition = false, pageScope = "ticket" } = {}) {
  const list = Array.isArray(columns) ? columns : defaultsForScope(pageScope);
  if (!isCommunityEdition) return [...list];
  return list.filter(id => id !== "sla");
}

export async function loadPublicTicketTableColumns(pageScope = "ticket") {
  const scope = normalizeTicketTableColumnsPageScope(pageScope);
  const defaults = defaultsForScope(scope);
  const publicKey = TICKET_TABLE_COLUMNS_PUBLIC_KEYS[scope];
  const section = sectionForScope(scope);
  try {
    const tableCheck = await pool.query("SELECT to_regclass('public.v_b_settings') AS settings_table");
    if (!tableCheck.rows[0]?.settings_table) {
      return [...defaults];
    }
    const result = await pool.query(
      `SELECT key, value, value_encrypted, value_iv, value_auth_tag
       FROM v_b_settings
       WHERE section = $1 AND key = $2`,
      [section, publicKey]
    );
    if (!result.rows.length) {
      return [...defaults];
    }
    const raw = decryptSetting(result.rows[0]) ?? "";
    return normalizeTicketTableColumns(raw, { fallback: defaults, pageScope: scope })
      || [...defaults];
  } catch (err) {
    if (err?.code === "DATABASE_NOT_CONFIGURED" || err?.code === "42P01") {
      return [...defaults];
    }
    throw err;
  }
}

export async function savePublicTicketTableColumns(columns, pageScope = "ticket") {
  const scope = normalizeTicketTableColumnsPageScope(pageScope);
  const defaults = defaultsForScope(scope);
  const publicKey = TICKET_TABLE_COLUMNS_PUBLIC_KEYS[scope];
  const section = sectionForScope(scope);
  const normalized = normalizeTicketTableColumns(columns, { fallback: defaults, pageScope: scope })
    || [...defaults];
  await pool.query(
    `INSERT INTO v_b_settings (key, value, label, section)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       label = EXCLUDED.label,
       section = EXCLUDED.section`,
    [
      publicKey,
      JSON.stringify(normalized),
      TABLE_COLUMNS_PUBLIC_LABEL_BY_SCOPE[scope] || "Table public columns",
      section
    ]
  );
  return normalized;
}

export async function loadPrivateTicketTableColumns(userId, pageScope = "ticket") {
  if (!userId) return null;
  const scope = normalizeTicketTableColumnsPageScope(pageScope);
  const privateKey = TICKET_TABLE_COLUMNS_PRIVATE_KEYS[scope];
  const result = await pool.query(
    `SELECT setting_value
     FROM v_b_users_settings
     WHERE user_id = $1 AND setting_key = $2`,
    [userId, privateKey]
  );
  if (!result.rows.length) return null;
  const value = result.rows[0].setting_value;
  if (value == null || value === "null") return null;
  return normalizeTicketTableColumns(value, { allowEmpty: false, fallback: null, pageScope: scope });
}

export function resolveEffectiveTicketTableColumns({
  publicColumns,
  privateColumns,
  isCommunityEdition = false,
  pageScope = "ticket"
} = {}) {
  const scope = normalizeTicketTableColumnsPageScope(pageScope);
  const defaults = defaultsForScope(scope);
  const publicNormalized = filterColumnsForEdition(
    normalizeTicketTableColumns(publicColumns, { fallback: defaults, pageScope: scope })
      || [...defaults],
    { isCommunityEdition, pageScope: scope }
  );
  const hasPrivate = Array.isArray(privateColumns) && privateColumns.length > 0;
  if (!hasPrivate) {
    return {
      public: publicNormalized,
      private: null,
      effective: publicNormalized,
      source: "public",
      pageScope: scope
    };
  }
  const privateNormalized = filterColumnsForEdition(privateColumns, { isCommunityEdition, pageScope: scope });
  return {
    public: publicNormalized,
    private: privateNormalized,
    effective: privateNormalized,
    source: "private",
    pageScope: scope
  };
}

export function getPrivateTicketTableColumnsSettingKey(pageScope = "ticket") {
  return TICKET_TABLE_COLUMNS_PRIVATE_KEYS[normalizeTicketTableColumnsPageScope(pageScope)];
}
