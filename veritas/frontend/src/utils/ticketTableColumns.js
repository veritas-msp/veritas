export const TICKET_TABLE_COLUMNS_PRIVATE_SETTING_KEY = "ticket_table_columns_private";
export const TICKET_SALES_TABLE_COLUMNS_PRIVATE_SETTING_KEY = "ticket_sales_table_columns_private";
export const ENTERPRISES_TABLE_COLUMNS_PRIVATE_SETTING_KEY = "enterprises_table_columns_private";
export const CONTACTS_TABLE_COLUMNS_PRIVATE_SETTING_KEY = "contacts_table_columns_private";

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
    "company_status",
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

/** Colonnes configurables support (hors checkbox / actions corbeille). */
export const TICKET_TABLE_COLUMN_IDS = TICKET_TABLE_COLUMN_IDS_BY_SCOPE.ticket;

export const DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE = Object.freeze({
  ticket: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.ticket]),
  ticket_sales: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.ticket_sales]),
  enterprises: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.enterprises]),
  contacts: Object.freeze([...TICKET_TABLE_COLUMN_IDS_BY_SCOPE.contacts])
});

export const DEFAULT_TICKET_TABLE_COLUMNS = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.ticket;
export const DEFAULT_TICKET_SALES_TABLE_COLUMNS = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.ticket_sales;
export const DEFAULT_ENTERPRISES_TABLE_COLUMNS = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.enterprises;
export const DEFAULT_CONTACTS_TABLE_COLUMNS = DEFAULT_TICKET_TABLE_COLUMNS_BY_SCOPE.contacts;

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
  equipment: null,
  tags: null,
  contact: "nom",
  gender: "sexe",
  enterprise: "client",
  role: "poste",
  email: "email",
  phone: "telephone",
  portal: null
});

export const ENTERPRISES_COLUMN_LABEL_KEYS = Object.freeze({
  client_number: "clientNumber",
  company: "company",
  company_status: "companyStatus",
  primary_contact: "primaryContact",
  commercial: "commercial",
  modules: "modules",
  expiration: "expiration",
  equipment: "equipment",
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
  portal: "portal"
});

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
  return filterColumnsForEdition(defaultsForScope(pageScope), { isCommunity, pageScope });
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
