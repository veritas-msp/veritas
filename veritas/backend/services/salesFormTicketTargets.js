import { pool } from "../database/db.js";
import { conditionsMatch, normalizeVisibilityRules } from "./salesFormConditions.js";
const PRIORITY_VALUES = new Set(["low", "normal", "high", "urgent"]);
const STATUS_VALUES = new Set(["open", "new", "pending", "in_progress", "resolved", "closed"]);
const CONDITION_OPERATORS = new Set(["equals", "not_equals", "contains", "checked", "not_checked"]);
const ASSIGNABLE_FIELD_TYPES = new Set(["user", "contact"]);
function uniqueIds(list = []) {
  return [...new Set(list.map(id => String(id || "").trim()).filter(Boolean))];
}
function uniqueKeys(list = []) {
  return [...new Set(list.map(key => String(key || "").trim()).filter(Boolean))];
}
function isLegacyFlatTargets(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  if (Array.isArray(raw.rules)) return false;
  return Object.prototype.hasOwnProperty.call(raw, "priority") || Object.prototype.hasOwnProperty.call(raw, "status") || Object.prototype.hasOwnProperty.call(raw, "assigneeUserIds") || Object.prototype.hasOwnProperty.call(raw, "watcherUserIds") || Object.prototype.hasOwnProperty.call(raw, "teamIds");
}
export function normalizeTicketTargets(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const priority = PRIORITY_VALUES.has(String(source.priority || "")) ? String(source.priority) : null;
  const status = STATUS_VALUES.has(String(source.status || "")) ? String(source.status) : null;
  return {
    priority,
    status,
    assigneeUserIds: uniqueIds(source.assigneeUserIds),
    watcherUserIds: uniqueIds(source.watcherUserIds),
    teamIds: uniqueIds(source.teamIds),
    assigneeFieldKeys: uniqueKeys(source.assigneeFieldKeys),
    watcherFieldKeys: uniqueKeys(source.watcherFieldKeys),
    titleSuffix: String(source.titleSuffix || "").trim() || null,
    titleTemplate: String(source.titleTemplate || "").trim() || null,
    descriptionTemplate: String(source.descriptionTemplate || "").trim() || null,
    categorySlug: String(source.categorySlug || "").trim() || null
  };
}
function normalizeCondition(raw = {}) {
  const operator = CONDITION_OPERATORS.has(String(raw.operator || "")) ? String(raw.operator) : "equals";
  return {
    fieldKey: String(raw.fieldKey || "").trim(),
    operator,
    value: raw.value === undefined || raw.value === null ? "" : String(raw.value)
  };
}
function normalizeRule(raw = {}, index = 0) {
  const conditions = Array.isArray(raw.conditions) ? raw.conditions.map(normalizeCondition).filter(c => c.fieldKey) : [];
  return {
    id: String(raw.id || `rule-${index + 1}`),
    label: String(raw.label || `Ticket ${index + 1}`).trim() || `Ticket ${index + 1}`,
    enabled: raw.enabled !== false,
    always: raw.always === true || conditions.length === 0,
    matchMode: raw.matchMode === "any" ? "any" : "all",
    conditions,
    targets: normalizeTicketTargets(raw.targets)
  };
}
export function normalizeTicketTargetsConfig(raw = {}) {
  if (isLegacyFlatTargets(raw)) {
    return {
      version: 2,
      rules: [normalizeRule({
        id: "default",
        label: "Primary ticket",
        enabled: true,
        always: true,
        conditions: [],
        targets: normalizeTicketTargets(raw)
      }, 0)]
    };
  }
  const source = raw && typeof raw === "object" ? raw : {};
  const rules = Array.isArray(source.rules) ? source.rules.map(normalizeRule) : [];
  if (rules.length === 0) {
    rules.push(normalizeRule({
      id: "default",
      label: "Primary ticket",
      enabled: true,
      always: true,
      conditions: [],
      targets: {}
    }, 0));
  }
  return {
    version: 2,
    rules
  };
}
export function parseTicketTargetsFromRow(row) {
  if (!row) return normalizeTicketTargetsConfig({});
  let raw = row.ticket_targets;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = {};
    }
  }
  return normalizeTicketTargetsConfig(raw);
}
export function describeTicketTargets(config = {}) {
  const normalized = normalizeTicketTargetsConfig(config);
  const enabledRules = normalized.rules.filter(rule => rule.enabled);
  if (enabledRules.length === 0) return "No target";
  if (enabledRules.length === 1) {
    const rule = enabledRules[0];
    const parts = [rule.label];
    const targets = rule.targets;
    if (targets.priority) parts.push(`Priority ${targets.priority}`);
    const assigneeCount = targets.assigneeUserIds.length + targets.assigneeFieldKeys.length;
    if (assigneeCount) parts.push(`${assigneeCount} assignee source(s)`);
    return parts.join(" · ");
  }
  return `${enabledRules.length} conditional target(s)`;
}
export function describeTicketTargetRule(rule) {
  if (!rule) return "";
  const parts = [rule.label];
  if (rule.always) {
    parts.push("always");
  } else if (rule.conditions.length) {
    parts.push(`${rule.conditions.length} condition(s)`);
  }
  return parts.join(" · ");
}
export function ruleMatches(rule, fieldValues = {}) {
  if (!rule || rule.enabled === false) return false;
  if (rule.always || !(rule.conditions || []).length) return true;
  return conditionsMatch({
    matchMode: rule.matchMode === "any" ? "any" : "all",
    conditions: rule.conditions || []
  }, fieldValues);
}
export function resolveMatchingRules(config = {}, fieldValues = {}) {
  const normalized = normalizeTicketTargetsConfig(config);
  return normalized.rules.filter(rule => ruleMatches(rule, fieldValues));
}
export async function loadFormTicketTargetsConfig(formId) {
  if (!formId) return normalizeTicketTargetsConfig({});
  try {
    const result = await pool.query(`SELECT ticket_targets FROM v_b_sales_form_definitions WHERE id = $1 AND enabled = TRUE`, [String(formId)]);
    if (!result.rows.length) return normalizeTicketTargetsConfig({});
    return parseTicketTargetsFromRow(result.rows[0]);
  } catch (err) {
    if (String(err?.code) === "42703") return normalizeTicketTargetsConfig({});
    throw err;
  }
}
export async function loadFormTicketTargets(formId) {
  const config = await loadFormTicketTargetsConfig(formId);
  const firstRule = config.rules.find(rule => rule.enabled) || config.rules[0];
  return firstRule?.targets || normalizeTicketTargets({});
}
export async function loadFormFieldMetaByKey(formId) {
  if (!formId) return {};
  try {
    const result = await pool.query(`SELECT field_key, field_type
       FROM v_b_sales_form_fields
       WHERE form_id = $1
         AND enabled = TRUE`, [String(formId)]);
    const map = {};
    for (const row of result.rows || []) {
      const fieldKey = String(row.field_key || "").trim();
      if (!fieldKey) continue;
      map[fieldKey] = {
        fieldKey,
        fieldType: String(row.field_type || "").trim().toLowerCase()
      };
    }
    return map;
  } catch (err) {
    if (String(err?.code) === "42P01" || String(err?.code) === "42703") return {};
    throw err;
  }
}
function looksLikeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}
async function resolveContactToAgentUserId(contactId) {
  const id = String(contactId || "").trim();
  if (!id) return null;
  try {
    const result = await pool.query(`SELECT c.email,
              c.portal_user_id,
              u_email.id AS email_user_id,
              u_email.role AS email_user_role,
              u_portal.id AS portal_id,
              u_portal.role AS portal_role
         FROM v_b_contacts c
         LEFT JOIN v_b_users u_email
           ON lower(trim(u_email.email)) = lower(trim(c.email))
          AND NULLIF(trim(c.email), '') IS NOT NULL
         LEFT JOIN v_b_users u_portal
           ON u_portal.id = c.portal_user_id
        WHERE c.id::text = $1
        LIMIT 1`, [id]);
    const row = result.rows?.[0];
    if (!row) return null;
    const isAgentRole = role => {
      const value = String(role || "").trim().toLowerCase();
      return value && value !== "client" && value !== "portal";
    };
    if (row.email_user_id && isAgentRole(row.email_user_role)) return String(row.email_user_id);
    if (row.portal_id && isAgentRole(row.portal_role)) return String(row.portal_id);
    return null;
  } catch (_error) {
    return null;
  }
}
async function resolveUserIdsFromFieldKeys(fieldKeys = [], context = {}) {
  const values = context.values && typeof context.values === "object" ? context.values : {};
  const fieldsByKey = context.fieldsByKey && typeof context.fieldsByKey === "object" ? context.fieldsByKey : {};
  const resolved = new Set();
  for (const fieldKey of fieldKeys) {
    const meta = fieldsByKey[fieldKey];
    const fieldType = String(meta?.fieldType || "").trim().toLowerCase();
    if (fieldType && !ASSIGNABLE_FIELD_TYPES.has(fieldType)) continue;
    const raw = values[fieldKey];
    if (raw === undefined || raw === null || raw === "") continue;
    const entries = Array.isArray(raw) ? raw : [raw];
    for (const entry of entries) {
      const value = String(entry || "").trim();
      if (!value) continue;
      const effectiveType = fieldType || (looksLikeUuid(value) ? "user" : "contact");
      if (effectiveType === "user") {
        if (looksLikeUuid(value)) resolved.add(value);
        continue;
      }
      if (effectiveType === "contact") {
        const userId = await resolveContactToAgentUserId(value);
        if (userId) resolved.add(userId);
      }
    }
  }
  return [...resolved];
}
export async function resolveAssigneeUserIds(targets = {}, context = {}) {
  const normalized = normalizeTicketTargets(targets);
  const userIds = new Set(normalized.assigneeUserIds);
  if (normalized.teamIds.length > 0) {
    const result = await pool.query(`SELECT DISTINCT user_id
       FROM v_b_team_members
       WHERE team_id = ANY($1::uuid[])`, [normalized.teamIds]);
    for (const row of result.rows || []) {
      if (row.user_id) userIds.add(String(row.user_id));
    }
  }
  const fromFields = await resolveUserIdsFromFieldKeys(normalized.assigneeFieldKeys, context);
  for (const userId of fromFields) userIds.add(userId);
  return [...userIds];
}
export async function resolveWatcherUserIds(targets = {}, context = {}) {
  const normalized = normalizeTicketTargets(targets);
  const userIds = new Set(normalized.watcherUserIds);
  const fromFields = await resolveUserIdsFromFieldKeys(normalized.watcherFieldKeys, context);
  for (const userId of fromFields) userIds.add(userId);
  return [...userIds];
}
async function hasTicketAssigneesTable() {
  const result = await pool.query(`SELECT to_regclass('public.v_b_ticket_assignees') IS NOT NULL AS ok`);
  return Boolean(result.rows[0]?.ok);
}
async function hasTicketWatchersTable() {
  const result = await pool.query(`SELECT to_regclass('public.v_b_ticket_watchers') IS NOT NULL AS ok`);
  return Boolean(result.rows[0]?.ok);
}
export async function applyFormTicketTargets(ticketId, targets = {}, context = {}) {
  const normalized = normalizeTicketTargets(targets);
  const assigneeUserIds = await resolveAssigneeUserIds(normalized, context);
  const watcherUserIds = await resolveWatcherUserIds(normalized, context);
  const hasAssignees = await hasTicketAssigneesTable();
  if (hasAssignees && assigneeUserIds.length > 0) {
    await pool.query("DELETE FROM v_b_ticket_assignees WHERE ticket_id = $1", [ticketId]);
    for (const userId of assigneeUserIds) {
      await pool.query(`INSERT INTO v_b_ticket_assignees (ticket_id, user_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (ticket_id, user_id) DO NOTHING`, [ticketId, userId]);
    }
    await pool.query(`UPDATE v_b_tickets SET assigned_user_id = $1, updated_at = NOW() WHERE id = $2`, [assigneeUserIds[0], ticketId]);
  }
  const hasWatchers = await hasTicketWatchersTable();
  if (hasWatchers && watcherUserIds.length > 0) {
    for (const userId of watcherUserIds) {
      await pool.query(`INSERT INTO v_b_ticket_watchers (ticket_id, user_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (ticket_id, user_id) DO NOTHING`, [ticketId, userId]);
    }
  }
  return {
    assigneeUserIds,
    watcherUserIds
  };
}
export function mergeCreateOptionsFromTargets(targets = {}, options = {}) {
  const normalized = normalizeTicketTargets(targets);
  return {
    priority: normalized.priority || options.priority || "normal",
    status: normalized.status || options.status || "new"
  };
}
function formatTemplateFieldValue(raw) {
  if (raw === true) return "Yes";
  if (raw === false) return "No";
  if (raw === undefined || raw === null) return "";
  return String(raw).trim();
}
export function resolveSalesFormTicketTemplate(template, context = {}) {
  const raw = String(template || "");
  if (!raw.trim()) return "";
  const values = context.values && typeof context.values === "object" ? context.values : {};
  const displayValues = context.displayValues && typeof context.displayValues === "object" ? context.displayValues : {};
  let out = raw.replace(/\{\{\s*field\.([^}]+?)\s*\}\}/gi, (_, key) => {
    const fieldKey = String(key || "").trim();
    if (!fieldKey) return "";
    if (Object.prototype.hasOwnProperty.call(displayValues, fieldKey)) {
      return formatTemplateFieldValue(displayValues[fieldKey]);
    }
    return formatTemplateFieldValue(values[fieldKey]);
  });
  const replacements = [["{{form.label}}", context.formLabel], ["{{form.kind}}", context.formKind], ["{{form.key}}", context.formKey], ["{{form.category}}", context.categorySlug], ["{{rule.label}}", context.ruleLabel], ["{{client.name}}", context.clientName], ["{{entreprise.nom}}", context.clientName], ["{{contact.name}}", context.contactName], ["{{contact.email}}", context.contactEmail], ["{{purchase_order}}", context.purchaseOrder], ["{{commercial}}", context.commercial], ["{{project_manager}}", context.projectManager]];
  for (const [token, value] of replacements) {
    out = out.split(token).join(value == null ? "" : String(value));
  }
  return out.trim();
}
export function buildTicketTitle(baseTitle, rule, context = {}) {
  const template = rule?.targets?.titleTemplate;
  if (template && String(template).trim()) {
    return resolveSalesFormTicketTemplate(template, context) || String(baseTitle || "").trim();
  }
  const suffix = rule?.targets?.titleSuffix || rule?.label;
  const title = String(baseTitle || "").trim();
  if (!suffix || suffix === "Primary ticket" || suffix === "Ticket principal") return title;
  if (title.includes(suffix)) return title;
  return `${title} — ${suffix}`;
}
export function buildTicketDescription(baseDescription, rule, context = {}) {
  const template = rule?.targets?.descriptionTemplate;
  if (template && String(template).trim()) {
    return resolveSalesFormTicketTemplate(template, context) || String(baseDescription || "");
  }
  return String(baseDescription || "");
}
