export const TICKET_TABLE_COLUMNS_PRIVATE_SETTING_KEY = "ticket_table_columns_private";
export const TICKET_SALES_TABLE_COLUMNS_PRIVATE_SETTING_KEY = "ticket_sales_table_columns_private";
export const ENTERPRISES_TABLE_COLUMNS_PRIVATE_SETTING_KEY = "enterprises_table_columns_private";
export const CONTACTS_TABLE_COLUMNS_PRIVATE_SETTING_KEY = "contacts_table_columns_private";
export const PRESTATAIRES_TABLE_COLUMNS_PRIVATE_SETTING_KEY = "prestataires_table_columns_private";
export const ENTERPRISE_VAULT_TABLE_COLUMNS_PRIVATE_SETTING_KEY = "enterprise_vault_table_columns_private";
export const ENTERPRISE_LOGS_TABLE_COLUMNS_PRIVATE_SETTING_KEY = "enterprise_logs_table_columns_private";

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
    "tags",
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
    "tags",
    "status",
    "tasks",
    "progress",
    "created_at",
    "updated_at"
  ]),
  enterprises: Object.freeze([
    "company_status",
    "client_number",
    "company",
    "primary_contact",
    "commercial",
    "modules",
    "expiration",
    "tags"
  ]),
  contacts: Object.freeze([
    "status",
    "contact",
    "gender",
    "enterprise",
    "role",
    "email",
    "phone",
    "portal",
    "support_tickets_total",
    "support_tickets_in_progress"
  ]),
  prestataires: Object.freeze([
    "status",
    "name",
    "type",
    "contact",
    "email",
    "phone",
    "enterprises"
  ]),
  enterprise_vault: Object.freeze([
    "name",
    "description",
    "visibility",
    "size",
    "date"
  ]),
  enterprise_logs: Object.freeze([
    "action",
    "field",
    "user",
    "date"
  ])
});

/** Colonnes configurables support (hors checkbox / actions corbeille). */
export const TICKET_TABLE_COLUMN_IDS = TICKET_TABLE_COLUMN_IDS_BY_SCOPE.ticket;

export const DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE = Object.freeze({
  ticket: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.ticket]),
  ticket_sales: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.ticket_sales]),
  enterprises: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.enterprises]),
  // Colonnes tickets support optionnelles : activables via le modal colonnes.
  contacts: Object.freeze([
    "status",
    "contact",
    "gender",
    "enterprise",
    "role",
    "email",
    "phone",
    "portal"
  ]),
  prestataires: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.prestataires]),
  enterprise_vault: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.enterprise_vault]),
  enterprise_logs: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.enterprise_logs])
});

export const DEFAULT_TICKET_TABLE_COLUMNS = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.ticket;
export const DEFAULT_TICKET_SALES_TABLE_COLUMNS = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.ticket_sales;
export const DEFAULT_ENTERPRISES_TABLE_COLUMNS = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.enterprises;
export const DEFAULT_CONTACTS_TABLE_COLUMNS = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.contacts;
export const DEFAULT_PRESTATAIRES_TABLE_COLUMNS = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.prestataires;
export const DEFAULT_ENTERPRISE_VAULT_TABLE_COLUMNS = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.enterprise_vault;
export const DEFAULT_ENTERPRISE_LOGS_TABLE_COLUMNS = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.enterprise_logs;

export function normalizeTicketTableColumnsPageScope(raw) {
  const value = String(raw || "ticket").trim().toLowerCase();
  if (value === "ticket_sales") return "ticket_sales";
  if (value === "enterprises" || value === "companies" || value === "clients") return "enterprises";
  if (value === "contacts" || value === "contact") return "contacts";
  if (value === "prestataires" || value === "prestataire" || value === "providers" || value === "provider") return "prestataires";
  if (value === "enterprise_vault" || value === "vault" || value === "coffre" || value === "files") return "enterprise_vault";
  if (value === "enterprise_logs" || value === "logs" || value === "activity_journal" || value === "journal") return "enterprise_logs";
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

export const TICKET_TABLE_COLUMN_SORT_KEYS = Object.freeze({
  ticket_number: "ticket_number",
  title: "title",
  channel: "channel",
  type: "type",
  category: "category",
  requester: "requester",
  client: "client",
  assigned: "assigned",
  followers: "followers",
  status: "status",
  priority: "priority",
  sla: "sla",
  tasks: null,
  progress: "progress_percent",
  created_at: "created_at",
  updated_at: "updated_at",
  client_number: "clientNumber",
  company: "name",
  company_status: "companyStatus",
  primary_contact: "primaryContact",
  commercial: "commercial",
  modules: null,
  expiration: "expiration",
  tags: null,
  contact: "nom",
  gender: "sexe",
  enterprise: "client",
  role: "poste",
  email: "email",
  phone: "telephone",
  portal: null,
  support_tickets_total: "support_tickets_total",
  support_tickets_in_progress: "support_tickets_in_progress",
  name: "nom",
  enterprises: "entreprises"
});

export const ENTERPRISES_COLUMN_LABEL_KEYS = Object.freeze({
  client_number: "clientNumber",
  company: "company",
  company_status: "companyStatus",
  primary_contact: "primaryContact",
  commercial: "commercial",
  modules: "modules",
  expiration: "expiration",
  tags: "tags"
});

export const CONTACTS_COLUMN_LABEL_KEYS = Object.freeze({
  contact: "contact",
  gender: "gender",
  status: "status",
  enterprise: "enterprise",
  role: "role",
  email: "email",
  phone: "phone",
  portal: "portal",
  support_tickets_total: "supportTicketsTotal",
  support_tickets_in_progress: "supportTicketsInProgress"
});

export const PRESTATAIRES_COLUMN_LABEL_KEYS = Object.freeze({
  name: "name",
  type: "type",
  status: "status",
  contact: "contact",
  email: "email",
  phone: "phone",
  enterprises: "enterprises"
});

/** Épingler une colonne en tête (ex. statut à gauche). */
export function pinColumnLeft(columns, columnId) {
  if (!columnId || !Array.isArray(columns)) return Array.isArray(columns) ? [...columns] : [];
  if (!columns.includes(columnId)) return [...columns];
  return [columnId, ...columns.filter(id => id !== columnId)];
}

export function normalizeTicketTableColumns(raw, {
  allowNull = false,
  fallback,
  pageScope = "ticket"
} = {}) {
  const scopeDefaults = defaultsForScope(pageScope);
  const resolvedFallback = fallback === undefined ? scopeDefaults : fallback;
  const allowed = allowedSetForScope(pageScope);
  if (raw == null) return allowNull ? null : [...(resolvedFallback || scopeDefaults)];
  let list = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return allowNull ? null : [...(resolvedFallback || scopeDefaults)];
    }
  }
  if (list && typeof list === "object" && !Array.isArray(list) && Array.isArray(list.columns)) {
    list = list.columns;
  }
  if (!Array.isArray(list)) {
    return allowNull ? null : [...(resolvedFallback || scopeDefaults)];
  }
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const id = String(item || "").trim();
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  if (out.length === 0) {
    return allowNull ? null : [...(resolvedFallback || scopeDefaults)];
  }
  return out;
}

export function filterColumnsForEdition(columns, { isCommunity = false, pageScope = "ticket" } = {}) {
  const list = Array.isArray(columns) ? columns : defaultsForScope(pageScope);
  if (!isCommunity) return [...list];
  return list.filter(id => id !== "sla");
}

export function getConfigurableTicketColumns({ isCommunity = false, pageScope = "ticket" } = {}) {
  const scope = normalizeTicketTableColumnsPageScope(pageScope);
  const catalog = [...(TICKET_TABLE_COLUMN_IDS_BY_SCOPE[scope] || TICKET_TABLE_COLUMN_IDS_BY_SCOPE.ticket)];
  return filterColumnsForEdition(catalog, { isCommunity, pageScope: scope });
}

export function resolveEffectiveTicketTableColumns({
  publicColumns,
  privateColumns,
  isCommunity = false,
  pageScope = "ticket"
} = {}) {
  const scope = normalizeTicketTableColumnsPageScope(pageScope);
  const publicNormalized = filterColumnsForEdition(
    normalizeTicketTableColumns(publicColumns, { fallback: defaultsForScope(scope), pageScope: scope }),
    { isCommunity, pageScope: scope }
  );
  const privateNormalized = privateColumns == null
    ? null
    : filterColumnsForEdition(
      normalizeTicketTableColumns(privateColumns, { allowNull: true, fallback: null, pageScope: scope }),
      { isCommunity, pageScope: scope }
    );
  if (!privateNormalized || privateNormalized.length === 0) {
    return {
      public: publicNormalized,
      private: null,
      effective: publicNormalized,
      source: "public",
      pageScope: scope
    };
  }
  return {
    public: publicNormalized,
    private: privateNormalized,
    effective: privateNormalized,
    source: "private",
    pageScope: scope
  };
}

export function toggleColumnInList(columns, columnId, enabled, pageScope = "ticket") {
  const allowed = allowedSetForScope(pageScope);
  const id = String(columnId || "").trim();
  if (!allowed.has(id)) return Array.isArray(columns) ? [...columns] : [];
  const current = Array.isArray(columns) ? columns.filter(item => allowed.has(item)) : [];
  if (enabled) {
    if (current.includes(id)) return current;
    return [...current, id];
  }
  return current.filter(item => item !== id);
}

/** Ordre d’édition : colonnes visibles (ordre sauvegardé) puis colonnes masquées (catalogue). */
export function buildColumnEditorOrder(visibleColumns, availableColumns) {
  const available = Array.isArray(availableColumns) ? availableColumns : [];
  const availableSet = new Set(available);
  const seen = new Set();
  const order = [];
  for (const raw of Array.isArray(visibleColumns) ? visibleColumns : []) {
    const id = String(raw || "").trim();
    if (!id || !availableSet.has(id) || seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }
  for (const id of available) {
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }
  return order;
}

/** Colonnes visibles dérivées de l’ordre éditeur + ensemble activé. */
export function visibleColumnsFromEditorOrder(columnOrder, enabledColumns) {
  const enabled =
    enabledColumns instanceof Set
      ? enabledColumns
      : new Set(Array.isArray(enabledColumns) ? enabledColumns : []);
  return (Array.isArray(columnOrder) ? columnOrder : []).filter(id => enabled.has(id));
}
