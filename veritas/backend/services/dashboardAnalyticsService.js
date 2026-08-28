import { pool } from "../database/db.js";
import { fetchMonitorableEquipmentStats } from "../utils/monitorableEquipmentStats.js";
import { listContractModuleOptions } from "../utils/contractModuleOptions.js";
import { hasSatisfactionTable } from "./ticketSatisfactionService.js";
const CLOSED_STATUSES = "('resolved', 'closed')";
const FIRST_TAKEOVER_SUBQUERY = `(SELECT h.created_at
  FROM v_b_ticket_status_history h
  WHERE h.ticket_id = t.id
    AND LOWER(COALESCE(h.old_status, '')) IN ('new', 'open', '')
    AND LOWER(COALESCE(h.new_status, '')) NOT IN ('new', 'open', '')
  ORDER BY h.created_at ASC
  LIMIT 1)`;
const TICKET_TYPE_LABELS = {
  incident: "Incident",
  demande: "Request",
  probleme: "Problem",
  changement: "Change"
};
const TICKET_STATUS_LABELS = {
  new: "New",
  open: "Open",
  pending: "Pending",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed"
};
const TICKET_PRIORITY_LABELS = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
  critical: "Critical"
};
const EVENT_TYPE_LABELS = {
  intervention: "Intervention",
  presentation: "Presentation",
  maintenance_preventive: "Preventive maintenance",
  maintenance: "Maintenance",
  mise_a_jour: "Update",
  conge: "Leave",
  integration_monitoring: "Monitoring integration",
  campagne: "Campaign",
  other: "Other"
};
function parsePeriodStart(period) {
  const now = new Date();
  switch (String(period || "365d").toLowerCase()) {
    case "7d":
      return new Date(now.getTime() - 7 * 86400000);
    case "30d":
      return new Date(now.getTime() - 30 * 86400000);
    case "90d":
      return new Date(now.getTime() - 90 * 86400000);
    case "365d":
      return new Date(now.getTime() - 365 * 86400000);
    case "ytd":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
      return null;
    default:
      return new Date(now.getTime() - 365 * 86400000);
  }
}
function parseIsoDate(value, label) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const err = new Error(`Invalid date (${label})`);
    err.code = "INVALID_DATE_RANGE";
    throw err;
  }
  return date.toISOString();
}
export function resolveDashboardDateRange({
  period,
  startAt,
  endAt
} = {}) {
  const hasCustom = Boolean(startAt || endAt);
  if (hasCustom) {
    const sinceIso = parseIsoDate(startAt, "start");
    const untilIso = parseIsoDate(endAt, "end");
    if (sinceIso && untilIso && new Date(sinceIso) > new Date(untilIso)) {
      const err = new Error("The start date must be before the end date.");
      err.code = "INVALID_DATE_RANGE";
      throw err;
    }
    return {
      period: "custom",
      sinceIso,
      untilIso
    };
  }
  const normalizedPeriod = String(period || "365d").toLowerCase();
  const since = parsePeriodStart(normalizedPeriod);
  return {
    period: normalizedPeriod,
    sinceIso: since ? since.toISOString() : null,
    untilIso: normalizedPeriod === "all" ? null : new Date().toISOString()
  };
}
function buildRangeClause(params, column, sinceIso, untilIso) {
  let clause = "";
  if (sinceIso) {
    params.push(sinceIso);
    clause += ` AND ${column} >= $${params.length}`;
  }
  if (untilIso) {
    params.push(untilIso);
    clause += ` AND ${column} <= $${params.length}`;
  }
  return clause;
}
export function parseDashboardEntityFilters(input = {}) {
  const agentId = String(input.agentId || "").trim() || null;
  const clientRaw = input.clientId;
  const contactRaw = input.contactId;
  const clientId = clientRaw != null && clientRaw !== "" && Number.isFinite(Number(clientRaw)) ? Number(clientRaw) : null;
  const contactId = contactRaw != null && contactRaw !== "" && Number.isFinite(Number(contactRaw)) ? Number(contactRaw) : null;
  return {
    agentId,
    clientId,
    contactId
  };
}
function hasEntityFilters(filters = {}) {
  return Boolean(filters.agentId || filters.clientId || filters.contactId);
}
function buildTicketScopeClause(params, filters = {}, alias = "t") {
  let clause = "";
  if (filters.agentId) {
    params.push(filters.agentId);
    clause += ` AND ${alias}.assigned_user_id = $${params.length}::uuid`;
  }
  if (filters.clientId) {
    params.push(filters.clientId);
    clause += ` AND ${alias}.client_id = $${params.length}`;
  }
  if (filters.contactId) {
    params.push(filters.contactId);
    clause += ` AND ${alias}.requester_contact_id = $${params.length}`;
  }
  return clause;
}
function buildEventScopeClause(params, filters = {}, alias = "e") {
  let clause = "";
  if (filters.agentId) {
    params.push(filters.agentId);
    clause += ` AND COALESCE(${alias}.assigned_user_id, ${alias}.user_id) = $${params.length}::uuid`;
  }
  if (filters.clientId) {
    params.push(filters.clientId);
    clause += ` AND ${alias}.client_id = $${params.length}`;
  }
  if (filters.contactId) {
    params.push(filters.contactId);
    clause += ` AND (
      ${alias}.client_id IN (SELECT l.client_id FROM v_b_contact_client_links l WHERE l.contact_id = $${params.length})
      OR ${alias}.client_id = (SELECT c.client_id FROM v_b_contacts c WHERE c.id = $${params.length})
    )`;
  }
  return clause;
}
function round1(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Math.round(Number(value) * 10) / 10;
}
function roundPct(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Math.round(Number(value));
}
function formatUserLabel(email, username) {
  const name = String(username || "").trim();
  if (name) return name;
  const local = String(email || "").split("@")[0];
  return local || "Agent";
}
function formatContactLabel(row) {
  const fullName = [row.prenom, row.nom].filter(Boolean).join(" ").trim();
  const company = String(row.client_name || "").trim();
  if (fullName && company) return `${fullName} · ${company}`;
  return fullName || row.email || "Contact";
}
function mapCountRows(rows, labelMap = {}) {
  return (rows || []).map(row => {
    const key = String(row.key || row.status || row.priority || row.type || row.category || "").trim();
    const label = labelMap[key] || labelMap[key.toLowerCase()] || key || "Other";
    return {
      key: key || "other",
      label,
      count: Number(row.count) || 0
    };
  });
}
function buildTrend(rows) {
  return (rows || []).map(row => ({
    period: row.period,
    count: Number(row.count) || 0
  }));
}
function buildWeekdayTrend(rows) {
  const byDay = new Map((rows || []).map(row => [Number(row.period), Number(row.count) || 0]));
  return [1, 2, 3, 4, 5, 6, 7].map(day => ({
    period: day,
    count: byDay.get(day) || 0
  }));
}
function buildYearlyTrend(rows) {
  return (rows || []).map(row => ({
    period: Number(row.period),
    count: Number(row.count) || 0
  })).filter(row => Number.isFinite(row.period)).sort((a, b) => a.period - b.period);
}
async function tableExists(tableName) {
  const result = await pool.query(`SELECT to_regclass($1) IS NOT NULL AS ok`, [tableName]);
  return Boolean(result.rows[0]?.ok);
}
async function fetchSupportStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  const params = [];
  const periodClause = buildRangeClause(params, "t.created_at", sinceIso, untilIso);
  const scopeClause = buildTicketScopeClause(params, filters, "t");
  const ticketWhere = `WHERE 1=1${periodClause}${scopeClause}`;
  const openNowParams = [];
  const openNowScope = buildTicketScopeClause(openNowParams, filters, "t");
  const [overviewResult, statusResult, priorityResult, typeResult, categoryResult, responseResult, resolutionResult, agentsResult, clientsResult, contactsResult, weekdayResult, yearlyResult, monthlyResult, openNowResult, channelResult] = await Promise.all([pool.query(`SELECT
         COUNT(*)::int AS created,
         COUNT(*) FILTER (WHERE t.status IN ${CLOSED_STATUSES})::int AS closed,
         COUNT(*) FILTER (WHERE t.status NOT IN ${CLOSED_STATUSES})::int AS open_snapshot
       FROM v_b_tickets t
       ${ticketWhere}`, params), pool.query(`SELECT LOWER(COALESCE(t.status, 'open')) AS key, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY count DESC`, params), pool.query(`SELECT LOWER(COALESCE(t.priority, 'normal')) AS key, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY count DESC`, params), pool.query(`SELECT LOWER(COALESCE(t.type, 'incident')) AS key, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY count DESC`, params), pool.query(`SELECT COALESCE(NULLIF(TRIM(t.category), ''), 'Uncategorized') AS key, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY count DESC`, params), pool.query(`SELECT
         AVG(EXTRACT(EPOCH FROM (${FIRST_TAKEOVER_SUBQUERY} - t.created_at)) / 3600.0)
           FILTER (WHERE ${FIRST_TAKEOVER_SUBQUERY} IS NOT NULL) AS avg_first_response_hours,
         COUNT(*) FILTER (WHERE ${FIRST_TAKEOVER_SUBQUERY} IS NOT NULL)::int AS with_first_response
       FROM v_b_tickets t
       ${ticketWhere}`, params), pool.query(`SELECT
         AVG(EXTRACT(EPOCH FROM (COALESCE(t.closed_at, t.resolved_at) - t.created_at)) / 3600.0)
           FILTER (WHERE COALESCE(t.closed_at, t.resolved_at) IS NOT NULL) AS avg_resolution_hours,
         COUNT(*) FILTER (WHERE COALESCE(t.closed_at, t.resolved_at) IS NOT NULL)::int AS resolved_count
       FROM v_b_tickets t
       WHERE t.status IN ${CLOSED_STATUSES}${periodClause}${scopeClause}`, params), pool.query(`SELECT
         u.id AS user_id,
         COALESCE(NULLIF(TRIM(u.username), ''), u.email, 'Agent') AS label,
         u.email,
         COUNT(t.id)::int AS assigned_count,
         COUNT(t.id) FILTER (WHERE t.status IN ${CLOSED_STATUSES})::int AS closed_count,
         COUNT(t.id) FILTER (WHERE t.status NOT IN ${CLOSED_STATUSES})::int AS open_count,
         AVG(EXTRACT(EPOCH FROM (COALESCE(t.closed_at, t.resolved_at) - t.created_at)) / 3600.0)
           FILTER (WHERE COALESCE(t.closed_at, t.resolved_at) IS NOT NULL) AS avg_resolution_hours
       FROM v_b_users u
       LEFT JOIN v_b_tickets t ON t.assigned_user_id = u.id${periodClause}${scopeClause}
       WHERE COALESCE(u.role, '') <> 'client'
         AND u.is_active = true
       GROUP BY u.id, u.username, u.email
       HAVING COUNT(t.id) > 0
       ORDER BY closed_count DESC, assigned_count DESC
       LIMIT 15`, params), pool.query(`SELECT
         c.id AS client_id,
         COALESCE(c.name, c.contrat->>'nom', 'Client') AS label,
         COUNT(t.id)::int AS count
       FROM v_b_tickets t
       LEFT JOIN v_b_clients c ON c.id = t.client_id
       WHERE t.client_id IS NOT NULL${periodClause}${scopeClause}
       GROUP BY c.id, c.name, c.contrat
       ORDER BY count DESC`, params), pool.query(`SELECT
         ct.id AS contact_id,
         ct.prenom,
         ct.nom,
         ct.email,
         COALESCE(cl.name, cl.contrat->>'nom') AS client_name,
         COUNT(t.id)::int AS count
       FROM v_b_tickets t
       LEFT JOIN v_b_contacts ct ON ct.id = t.requester_contact_id
       LEFT JOIN v_b_clients cl ON cl.id = COALESCE(t.client_id, ct.client_id)
       WHERE t.requester_contact_id IS NOT NULL${periodClause}${scopeClause}
       GROUP BY ct.id, ct.prenom, ct.nom, ct.email, cl.name, cl.contrat
       ORDER BY count DESC`, params), pool.query(`SELECT EXTRACT(ISODOW FROM t.created_at)::int AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY 1 ASC`, params), pool.query(`SELECT EXTRACT(YEAR FROM t.created_at)::int AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY 1 ASC`, params), pool.query(`SELECT date_trunc('month', t.created_at)::date AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY 1 ASC`, params), pool.query(`SELECT COUNT(*)::int AS count
       FROM v_b_tickets t
       WHERE t.status NOT IN ${CLOSED_STATUSES}${openNowScope}`, openNowParams), pool.query(`SELECT LOWER(COALESCE(t.channel, 'web')) AS key, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY count DESC`, params)]);
  const overview = overviewResult.rows[0] || {};
  let satisfaction = null;
  if (await hasSatisfactionTable()) {
    const satParams = [...params];
    const satPeriod = periodClause.replace(/t\.created_at/g, "s.created_at");
    const [satOverview, satByAgent] = await Promise.all([pool.query(`SELECT
           COUNT(*)::int AS responses,
           AVG(COALESCE(s.rating, 0))::float AS avg_rating,
           COUNT(*) FILTER (WHERE COALESCE(s.rating, 0) >= 4)::int AS promoters,
           COUNT(*) FILTER (WHERE COALESCE(s.rating, 0) <= 2)::int AS detractors
         FROM v_b_ticket_satisfaction s
         JOIN v_b_tickets t ON t.id = s.ticket_id
         WHERE COALESCE(s.rating, 0) > 0${satPeriod}${scopeClause}`, satParams), pool.query(`SELECT
           u.id AS user_id,
           COALESCE(NULLIF(TRIM(u.username), ''), u.email, 'Agent') AS label,
           COUNT(s.id)::int AS responses,
           AVG(COALESCE(s.rating, 0))::float AS avg_rating
         FROM v_b_ticket_satisfaction s
         JOIN v_b_tickets t ON t.id = s.ticket_id
         LEFT JOIN v_b_users u ON u.id = t.assigned_user_id
         WHERE COALESCE(s.rating, 0) > 0${periodClause}${scopeClause}
         GROUP BY u.id, u.username, u.email
         HAVING COUNT(s.id) > 0
         ORDER BY responses DESC, avg_rating DESC
         LIMIT 10`, params)]);
    const satRow = satOverview.rows[0] || {};
    const responses = Number(satRow.responses) || 0;
    satisfaction = {
      responses,
      avgRating: round1(satRow.avg_rating),
      csatPercent: responses > 0 ? roundPct(Number(satRow.promoters) / responses * 100) : null,
      detractorPercent: responses > 0 ? roundPct(Number(satRow.detractors) / responses * 100) : null,
      byAgent: (satByAgent.rows || []).map(row => ({
        userId: row.user_id,
        label: formatUserLabel(row.email, row.label),
        responses: Number(row.responses) || 0,
        avgRating: round1(row.avg_rating)
      }))
    };
  }
  const responseRow = responseResult.rows[0] || {};
  const resolutionRow = resolutionResult.rows[0] || {};
  return {
    overview: {
      created: Number(overview.created) || 0,
      closed: Number(overview.closed) || 0,
      openNow: Number(openNowResult.rows[0]?.count) || 0,
      closureRate: Number(overview.created) > 0 ? roundPct(Number(overview.closed) / Number(overview.created) * 100) : null
    },
    timing: {
      avgFirstResponseHours: round1(responseRow.avg_first_response_hours),
      ticketsWithFirstResponse: Number(responseRow.with_first_response) || 0,
      avgResolutionHours: round1(resolutionRow.avg_resolution_hours),
      resolvedCount: Number(resolutionRow.resolved_count) || 0
    },
    byStatus: mapCountRows(statusResult.rows, TICKET_STATUS_LABELS),
    byPriority: mapCountRows(priorityResult.rows, TICKET_PRIORITY_LABELS),
    byType: mapCountRows(typeResult.rows, TICKET_TYPE_LABELS),
    byCategory: mapCountRows(categoryResult.rows),
    byChannel: mapCountRows(channelResult.rows, {
      web: "Web portal",
      email: "Email",
      phone: "Phone",
      api: "API"
    }),
    weekdayTrend: buildWeekdayTrend(weekdayResult.rows),
    yearlyTrend: buildYearlyTrend(yearlyResult.rows),
    monthlyTrend: buildTrend(monthlyResult.rows),
    topAgents: (agentsResult.rows || []).map(row => ({
      userId: row.user_id,
      label: formatUserLabel(row.email, row.label),
      assignedCount: Number(row.assigned_count) || 0,
      closedCount: Number(row.closed_count) || 0,
      openCount: Number(row.open_count) || 0,
      avgResolutionHours: round1(row.avg_resolution_hours)
    })),
    topClients: (clientsResult.rows || []).map(row => ({
      clientId: row.client_id,
      label: row.label,
      count: Number(row.count) || 0
    })),
    topContacts: (contactsResult.rows || []).map(row => ({
      contactId: row.contact_id,
      label: formatContactLabel(row),
      count: Number(row.count) || 0
    })),
    satisfaction
  };
}
async function fetchPlanningStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  if (!(await tableExists("public.v_b_events"))) {
    return {
      available: false,
      overview: {
        total: 0,
        maintenanceYtd: 0,
        upcoming: 0
      },
      byType: [],
      byAgent: [],
      monthlyTrend: []
    };
  }
  const params = [];
  const periodClause = buildRangeClause(params, "e.start", sinceIso, untilIso);
  const scopeClause = buildEventScopeClause(params, filters, "e");
  const eventWhere = `WHERE 1=1${periodClause}${scopeClause}`;
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const [overviewResult, typeResult, agentResult, trendResult, upcomingResult, maintenanceYtdResult] = await Promise.all([pool.query(`SELECT COUNT(*)::int AS total FROM v_b_events e ${eventWhere}`, params), pool.query(`SELECT LOWER(COALESCE(e.type, 'other')) AS key, COUNT(*)::int AS count
         FROM v_b_events e
         ${eventWhere}
         GROUP BY 1
         ORDER BY count DESC`, params), pool.query(`SELECT
           u.id AS user_id,
           COALESCE(NULLIF(TRIM(u.username), ''), u.email, 'Agent') AS label,
           u.email,
           COUNT(e.id)::int AS count
         FROM v_b_events e
         LEFT JOIN v_b_users u ON u.id = COALESCE(e.assigned_user_id, e.user_id)
         ${eventWhere}
         GROUP BY u.id, u.username, u.email
         ORDER BY count DESC
         LIMIT 12`, params), pool.query(`SELECT date_trunc('month', e.start)::date AS period, COUNT(*)::int AS count
         FROM v_b_events e
         ${eventWhere}
         GROUP BY 1
         ORDER BY 1 ASC`, params), (() => {
    const upcomingParams = [sinceIso, untilIso];
    const upcomingScopeParams = [];
    const upcomingScope = buildEventScopeClause(upcomingScopeParams, filters, "e").replace(/\$(\d+)/g, (_, index) => `$${Number(index) + 2}`);
    return pool.query(`SELECT COUNT(*)::int AS count
           FROM v_b_events e
           WHERE e.start >= GREATEST(NOW(), COALESCE($1::timestamptz, '-infinity'::timestamptz))
             AND ($2::timestamptz IS NULL OR e.start <= $2::timestamptz)${upcomingScope}`, [...upcomingParams, ...upcomingScopeParams]);
  })(), (() => {
    const maintenanceParams = [yearStart];
    const maintenanceScopeParams = [];
    const maintenanceScope = buildEventScopeClause(maintenanceScopeParams, filters, "e").replace(/\$(\d+)/g, (_, index) => `$${Number(index) + 1}`);
    return pool.query(`SELECT COUNT(*)::int AS count
           FROM v_b_events e
           WHERE e.type IN ('maintenance', 'maintenance_preventive')
             AND e.start >= $1${maintenanceScope}`, [...maintenanceParams, ...maintenanceScopeParams]);
  })()]);
  const maintenanceTypes = ["maintenance", "maintenance_preventive"];
  const byType = mapCountRows(typeResult.rows, EVENT_TYPE_LABELS);
  const maintenanceInPeriod = byType.filter(row => maintenanceTypes.includes(row.key)).reduce((sum, row) => sum + row.count, 0);
  return {
    available: true,
    overview: {
      total: Number(overviewResult.rows[0]?.total) || 0,
      maintenanceInPeriod,
      maintenanceYtd: Number(maintenanceYtdResult.rows[0]?.count) || 0,
      upcoming: Number(upcomingResult.rows[0]?.count) || 0
    },
    byType,
    byAgent: (agentResult.rows || []).map(row => ({
      userId: row.user_id,
      label: formatUserLabel(row.email, row.label),
      count: Number(row.count) || 0
    })),
    monthlyTrend: buildTrend(trendResult.rows)
  };
}
async function fetchCrmStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  const contactParams = [];
  const contactPeriod = buildRangeClause(contactParams, "c.created_at", sinceIso, untilIso);
  const ticketParams = [];
  const ticketPeriod = buildRangeClause(ticketParams, "t.created_at", sinceIso, untilIso);
  const ticketScope = buildTicketScopeClause(ticketParams, filters, "t");
  const hasPeriod = Boolean(sinceIso || untilIso);
  const contactScope = filters.clientId != null ? (() => {
    contactParams.push(filters.clientId);
    return ` AND (
      EXISTS (SELECT 1 FROM v_b_contact_client_links l WHERE l.contact_id = c.id AND l.client_id = $${contactParams.length})
      OR c.client_id = $${contactParams.length}
    )`;
  })() : filters.contactId != null ? (() => {
    contactParams.push(filters.contactId);
    return ` AND c.id = $${contactParams.length}`;
  })() : "";
  const [clientsResult, contactsResult, clientsInPeriodResult, contractsResult] = await Promise.all([filters.clientId != null ? pool.query(`SELECT COUNT(*)::int AS count FROM v_b_clients WHERE id = $1`, [filters.clientId]) : pool.query(`SELECT COUNT(*)::int AS count FROM v_b_clients`), tableExists("public.v_b_contacts").then(ok => ok ? pool.query(`SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE 1=1${contactPeriod})::int AS new_in_period
             FROM v_b_contacts c
             WHERE 1=1${contactScope}`, contactParams) : {
    rows: [{
      total: 0,
      new_in_period: 0
    }]
  }), hasPeriod ? pool.query(`SELECT COUNT(DISTINCT t.client_id)::int AS count
           FROM v_b_tickets t
           WHERE t.client_id IS NOT NULL${ticketPeriod}${ticketScope}`, ticketParams) : Promise.resolve({
    rows: [{
      count: filters.clientId != null ? 1 : null
    }]
  }), filters.clientId != null ? pool.query(`SELECT id, name, contrat FROM v_b_clients WHERE id = $1`, [filters.clientId]) : pool.query(`SELECT id, name, contrat FROM v_b_clients`)]);
  let contractsExpiring = 0;
  let contractsExpired = 0;
  let contractsSuspended = 0;
  let contractsActive = 0;
  const now = Date.now();
  const windowMs = 30 * 86400000;
  const sinceMs = sinceIso ? new Date(sinceIso).getTime() : null;
  const untilMs = untilIso ? new Date(untilIso).getTime() : now;
  for (const row of contractsResult.rows) {
    let contrat = row.contrat;
    if (typeof contrat === "string") {
      try {
        contrat = JSON.parse(contrat);
      } catch {
        contrat = {};
      }
    }
    if (!contrat) continue;
    if (contrat.suspendu) {
      contractsSuspended += 1;
      continue;
    }
    const exp = contrat.expiration ? new Date(contrat.expiration).getTime() : NaN;
    if (!Number.isFinite(exp)) {
      contractsActive += 1;
      continue;
    }
    if (hasPeriod) {
      if (exp >= sinceMs && exp <= untilMs) {
        if (exp < now) contractsExpired += 1;
        else contractsExpiring += 1;
      }
      if (exp >= now) contractsActive += 1;
      continue;
    }
    if (exp < now) contractsExpired += 1;
    else {
      contractsActive += 1;
      if (exp - now <= windowMs) contractsExpiring += 1;
    }
  }
  const contactRow = contactsResult.rows[0] || {};
  const clientsInPeriod = clientsInPeriodResult.rows[0]?.count;
  return {
    clientsTotal: hasPeriod ? Number(clientsInPeriod) || 0 : Number(clientsResult.rows[0]?.count) || 0,
    clientsPortfolio: Number(clientsResult.rows[0]?.count) || 0,
    contactsTotal: Number(contactRow.total) || 0,
    contactsNew: Number(contactRow.new_in_period) || 0,
    contractsExpiring,
    contractsExpired,
    contractsSuspended,
    contractsActive
  };
}
const SOLUTION_TABLES = [{
  key: "antivirus",
  table: "v_b_clients_m_antivirus"
}, {
  key: "antispam",
  table: "v_b_clients_m_antispam"
}, {
  key: "backup",
  table: "v_b_clients_m_save"
}, {
  key: "o365",
  table: "v_b_clients_m_o365"
}, {
  key: "domain",
  table: "v_b_clients_m_ndd"
}, {
  key: "ssl",
  table: "v_b_clients_m_ssl"
}, {
  key: "campaigns",
  table: "v_b_clients_c_campaign",
  anyRow: true
}];
async function countTableOrZero(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return Number(result.rows[0]?.count) || 0;
  } catch (err) {
    if (err.code === "42P01" || err.code === "42703") return 0;
    throw err;
  }
}
async function fetchSolutionCoverage(clientId = null) {
  const rows = [];
  for (const item of SOLUTION_TABLES) {
    const where = item.anyRow ? clientId != null ? "WHERE client_id = $1" : "" : clientId != null ? "WHERE data IS NOT NULL AND client_id = $1" : "WHERE data IS NOT NULL";
    const params = clientId != null ? [clientId] : [];
    const count = await countTableOrZero(`SELECT COUNT(*)::int AS count FROM ${item.table} ${where}`, params);
    rows.push({
      key: item.key,
      count
    });
  }
  return rows;
}
async function fetchEnterpriseStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  const crm = await fetchCrmStats({
    sinceIso,
    untilIso,
    filters
  });
  let modules = [];
  try {
    const options = await listContractModuleOptions({
      includeDisabled: false,
      includeUsage: filters.clientId == null
    });
    if (filters.clientId != null) {
      const clientRow = await pool.query(`SELECT options FROM v_b_clients WHERE id = $1`, [filters.clientId]);
      let clientOptions = clientRow.rows[0]?.options || {};
      if (typeof clientOptions === "string") {
        try {
          clientOptions = JSON.parse(clientOptions);
        } catch {
          clientOptions = {};
        }
      }
      modules = options.map(mod => ({
        key: mod.moduleKey,
        label: mod.label,
        icon: mod.icon,
        count: clientOptions?.[mod.moduleKey] ? 1 : 0
      }));
    } else {
      modules = options.map(mod => ({
        key: mod.moduleKey,
        label: mod.label,
        icon: mod.icon,
        count: Number(mod.clientUsageCount) || 0
      }));
    }
  } catch (err) {
    console.warn("[analytics] contract modules", err.message);
  }
  const solutions = await fetchSolutionCoverage(filters.clientId);
  return {
    ...crm,
    modules,
    solutions
  };
}
async function fetchReportsStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  if (!(await tableExists("public.document_history"))) {
    return {
      available: false,
      total: 0,
      inPeriod: 0,
      byType: [],
      monthlyTrend: []
    };
  }
  const params = [];
  const periodClause = buildRangeClause(params, "r.created_at", sinceIso, untilIso);
  let scopeClause = "";
  if (filters.agentId) {
    params.push(filters.agentId);
    scopeClause += ` AND r.user_id = $${params.length}::uuid`;
  }
  const reportWhere = `WHERE COALESCE(r.is_trashed, false) = false${periodClause}${scopeClause}`;
  const [overviewResult, typeResult, trendResult] = await Promise.all([pool.query(`SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE true${periodClause}${scopeClause})::int AS in_period
       FROM document_history r
       WHERE COALESCE(r.is_trashed, false) = false`, params), pool.query(`SELECT LOWER(COALESCE(r.type, 'monitoring')) AS key, COUNT(*)::int AS count
       FROM document_history r
       ${reportWhere}
       GROUP BY 1
       ORDER BY count DESC`, params), pool.query(`SELECT date_trunc('month', r.created_at)::date AS period, COUNT(*)::int AS count
       FROM document_history r
       ${reportWhere}
       GROUP BY 1
       ORDER BY 1 ASC`, params)]);
  const overview = overviewResult.rows[0] || {};
  return {
    available: true,
    total: Number(overview.total) || 0,
    inPeriod: Number(overview.in_period) || 0,
    byType: mapCountRows(typeResult.rows, {
      monitoring: "Monitoring",
      synthese: "Summary",
      intervention: "Intervention",
      crav: "CRAV"
    }),
    monthlyTrend: buildTrend(trendResult.rows)
  };
}
async function fetchDevicesStats(filters = {}) {
  const equipmentStats = await fetchMonitorableEquipmentStats();
  const clientParams = filters.clientId != null ? [filters.clientId] : [];
  const clientWhere = filters.clientId != null ? " AND client_id = $1" : "";
  const [agentsResult, rmmResult, computersResult] = await Promise.all([countTableOrZero(`SELECT COUNT(*)::int AS count FROM v_b_users WHERE is_active = true AND COALESCE(role, '') <> 'client'`), tableExists("public.v_b_rmm_agents").then(ok => ok ? pool.query(`SELECT
           COUNT(*) FILTER (WHERE COALESCE(status, 'active') = 'active')::int AS active,
           COUNT(*) FILTER (WHERE COALESCE(status, 'active') = 'active' AND last_seen_at >= NOW() - INTERVAL '15 minutes')::int AS online
         FROM v_b_rmm_agents
         WHERE 1=1${clientWhere}`, clientParams).catch(() => ({
    rows: [{
      active: 0,
      online: 0
    }]
  })) : {
    rows: [{
      active: 0,
      online: 0
    }]
  }), tableExists("public.v_b_clients_m_ordinateurs").then(ok => ok ? pool.query(`SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE COALESCE(is_active, TRUE) = TRUE)::int AS active
         FROM v_b_clients_m_ordinateurs
         WHERE client_id IS NOT NULL${clientWhere}`, clientParams).catch(() => ({
    rows: [{
      total: 0,
      active: 0
    }]
  })) : {
    rows: [{
      total: 0,
      active: 0
    }]
  })]);
  const rmmRow = rmmResult.rows?.[0] || {};
  const computersRow = computersResult.rows?.[0] || {};
  return {
    equipTotal: equipmentStats.equipMonitoredTotal || 0,
    equipMonitoredTotal: equipmentStats.equipMonitoredTotal || 0,
    equipUnderSurveillanceCount: equipmentStats.equipUnderSurveillanceCount || 0,
    equipSurveillancePercent: roundPct(equipmentStats.equipSurveillancePercent),
    families: (equipmentStats.families || []).map(row => ({
      key: row.key || row.family,
      label: row.label || row.key,
      icon: row.icon || null,
      count: Number(row.count) || 0,
      monitored: Number(row.monitoredCount || row.monitored) || 0
    })),
    activeAgents: Number(agentsResult) || 0,
    rmmAgents: Number(rmmRow.active) || 0,
    rmmOnline: Number(rmmRow.online) || 0,
    computersTotal: Number(computersRow.total) || 0,
    computersActive: Number(computersRow.active) || 0
  };
}
function emptyKnowledgeStats() {
  return {
    available: false,
    overview: {
      articlesTotal: 0,
      published: 0,
      drafts: 0,
      createdInPeriod: 0,
      publishedInPeriod: 0,
      publicEnabled: 0,
      viewsTotal: 0,
      commentsInPeriod: 0,
      ratingsInPeriod: 0,
      avgRating: null,
      helpfulYes: 0,
      helpfulNo: 0,
      helpfulRate: null,
      favoritesInPeriod: 0,
      searchMisses: 0
    },
    byStatus: [],
    byCategory: [],
    topArticles: [],
    topConsumers: [],
    searchMisses: [],
    monthlyTrend: []
  };
}
function buildKnowledgeArticleScopeClause(params, filters = {}, alias = "a") {
  let clause = "";
  if (filters.agentId) {
    params.push(filters.agentId);
    clause += ` AND ${alias}.author_user_id = $${params.length}::uuid`;
  }
  if (filters.clientId) {
    params.push(filters.clientId);
    clause += ` AND (
      COALESCE(${alias}.visible_to_all_clients, FALSE) = TRUE
      OR EXISTS (
        SELECT 1 FROM v_b_knowledge_article_clients ac
         WHERE ac.article_id = ${alias}.id AND ac.client_id = $${params.length}
      )
    )`;
  }
  if (filters.contactId) {
    params.push(filters.contactId);
    clause += ` AND (
      COALESCE(${alias}.visible_to_all_contacts, FALSE) = TRUE
      OR EXISTS (
        SELECT 1 FROM v_b_knowledge_article_contacts ct
         WHERE ct.article_id = ${alias}.id AND ct.contact_id = $${params.length}
      )
    )`;
  }
  return clause;
}
async function queryRowsOrEmpty(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows || [];
  } catch (err) {
    if (err.code === "42P01" || err.code === "42703") return [];
    throw err;
  }
}
async function fetchKnowledgeStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  if (!(await tableExists("public.v_b_knowledge_articles"))) {
    return emptyKnowledgeStats();
  }
  try {
    const articleParams = [];
    const articleScope = buildKnowledgeArticleScopeClause(articleParams, filters, "a");
    const createdClause = buildRangeClause(articleParams, "a.created_at", sinceIso, untilIso);
    const statusParams = [];
    const statusScope = buildKnowledgeArticleScopeClause(statusParams, filters, "a");
    const categoryParams = [];
    const categoryScope = buildKnowledgeArticleScopeClause(categoryParams, filters, "a");
    const topParams = [];
    const topScope = buildKnowledgeArticleScopeClause(topParams, filters, "a");
    const commentParams = [];
    const commentScope = buildKnowledgeArticleScopeClause(commentParams, filters, "a");
    const commentPeriod = buildRangeClause(commentParams, "cm.created_at", sinceIso, untilIso);
    const ratingParams = [];
    const ratingScope = buildKnowledgeArticleScopeClause(ratingParams, filters, "a");
    const ratingPeriod = buildRangeClause(ratingParams, "r.updated_at", sinceIso, untilIso);
    const helpfulParams = [];
    const helpfulScope = buildKnowledgeArticleScopeClause(helpfulParams, filters, "a");
    const helpfulPeriod = buildRangeClause(helpfulParams, "h.updated_at", sinceIso, untilIso);
    const favoriteParams = [];
    const favoriteScope = buildKnowledgeArticleScopeClause(favoriteParams, filters, "a");
    const favoritePeriod = buildRangeClause(favoriteParams, "f.created_at", sinceIso, untilIso);
    const consumerParams = [];
    const consumerScope = buildKnowledgeArticleScopeClause(consumerParams, filters, "a");
    const consumerPeriod = buildRangeClause(consumerParams, "x.created_at", sinceIso, untilIso);
    const missParams = [];
    const missPeriod = buildRangeClause(missParams, "m.last_at", sinceIso, untilIso);
    const trendParams = [];
    const trendScope = buildKnowledgeArticleScopeClause(trendParams, filters, "a");
    const trendPeriod = buildRangeClause(trendParams, "cm.created_at", sinceIso, untilIso);
    const [
      overviewRows,
      statusRows,
      categoryRows,
      topRows,
      commentRows,
      ratingRows,
      helpfulRows,
      favoriteRows,
      consumerRows,
      missRows,
      trendRows
    ] = await Promise.all([
      queryRowsOrEmpty(
        `SELECT
           COUNT(*)::int AS articles_total,
           COUNT(*) FILTER (WHERE a.status = 'published')::int AS published,
           COUNT(*) FILTER (WHERE a.status = 'draft')::int AS drafts,
           COUNT(*) FILTER (WHERE 1=1${createdClause})::int AS created_in_period,
           COALESCE(SUM(COALESCE(a.view_count, 0)), 0)::bigint AS views_total
         FROM v_b_knowledge_articles a
         WHERE 1=1${articleScope}`,
        articleParams
      ),
      queryRowsOrEmpty(
        `SELECT COALESCE(a.status, 'draft') AS key, COUNT(*)::int AS count
           FROM v_b_knowledge_articles a
          WHERE 1=1${statusScope}
          GROUP BY 1
          ORDER BY count DESC`,
        statusParams
      ),
      queryRowsOrEmpty(
        `SELECT COALESCE(NULLIF(TRIM(a.category), ''), 'Uncategorized') AS key, COUNT(*)::int AS count
           FROM v_b_knowledge_articles a
          WHERE 1=1${categoryScope}
          GROUP BY 1
          ORDER BY count DESC`,
        categoryParams
      ),
      queryRowsOrEmpty(
        `SELECT a.id,
                COALESCE(NULLIF(TRIM(a.title), ''), 'Untitled') AS title,
                COALESCE(a.category, '') AS category,
                COALESCE(a.status, 'draft') AS status,
                COALESCE(a.view_count, 0)::int AS views
           FROM v_b_knowledge_articles a
          WHERE 1=1${topScope}
          ORDER BY views DESC, a.updated_at DESC
          LIMIT 10`,
        topParams
      ),
      queryRowsOrEmpty(
        `SELECT COUNT(*)::int AS count
           FROM v_b_knowledge_article_comments cm
           JOIN v_b_knowledge_articles a ON a.id = cm.article_id
          WHERE 1=1${commentScope}${commentPeriod}`,
        commentParams
      ),
      queryRowsOrEmpty(
        `SELECT COUNT(*)::int AS count,
                AVG(r.rating)::float AS avg_rating
           FROM v_b_knowledge_article_ratings r
           JOIN v_b_knowledge_articles a ON a.id = r.article_id
          WHERE 1=1${ratingScope}${ratingPeriod}`,
        ratingParams
      ),
      queryRowsOrEmpty(
        `SELECT
           COUNT(*) FILTER (WHERE h.helpful = TRUE)::int AS yes_count,
           COUNT(*) FILTER (WHERE h.helpful = FALSE)::int AS no_count
           FROM v_b_knowledge_article_helpful h
           JOIN v_b_knowledge_articles a ON a.id = h.article_id
          WHERE 1=1${helpfulScope}${helpfulPeriod}`,
        helpfulParams
      ),
      queryRowsOrEmpty(
        `SELECT COUNT(*)::int AS count
           FROM v_b_knowledge_article_favorites f
           JOIN v_b_knowledge_articles a ON a.id = f.article_id
          WHERE 1=1${favoriteScope}${favoritePeriod}`,
        favoriteParams
      ),
      queryRowsOrEmpty(
        `SELECT c.id AS client_id,
                COALESCE(c.name, c.contrat->>'nom', 'Client') AS label,
                COUNT(*)::int AS count
           FROM (
             SELECT cm.article_id, cm.client_id, cm.created_at
               FROM v_b_knowledge_article_comments cm
             UNION ALL
             SELECT r.article_id, r.client_id, r.updated_at
               FROM v_b_knowledge_article_ratings r
           ) x
           JOIN v_b_knowledge_articles a ON a.id = x.article_id
           JOIN v_b_clients c ON c.id = x.client_id
          WHERE x.client_id IS NOT NULL${consumerScope}${consumerPeriod}
          GROUP BY c.id, c.name, c.contrat
          ORDER BY count DESC
          LIMIT 10`,
        consumerParams
      ),
      queryRowsOrEmpty(
        `SELECT m.query AS label, m.hit_count::int AS count, m.last_at
           FROM v_b_knowledge_search_misses m
          WHERE 1=1${missPeriod}
          ORDER BY m.hit_count DESC, m.last_at DESC
          LIMIT 12`,
        missParams
      ),
      queryRowsOrEmpty(
        `SELECT to_char(date_trunc('month', cm.created_at), 'YYYY-MM') AS period,
                COUNT(*)::int AS count
           FROM v_b_knowledge_article_comments cm
           JOIN v_b_knowledge_articles a ON a.id = cm.article_id
          WHERE 1=1${trendScope}${trendPeriod}
          GROUP BY 1
          ORDER BY 1`,
        trendParams
      )
    ]);
    const overviewRow = overviewRows[0] || {};
    const publishedParams = [];
    const publishedScope = buildKnowledgeArticleScopeClause(publishedParams, filters, "a");
    const publishedRange = buildRangeClause(publishedParams, "a.published_at", sinceIso, untilIso);
    const publicParams = [];
    const publicScope = buildKnowledgeArticleScopeClause(publicParams, filters, "a");
    const [publishedRows, publicRows] = await Promise.all([
      queryRowsOrEmpty(
        `SELECT COUNT(*)::int AS count
           FROM v_b_knowledge_articles a
          WHERE a.published_at IS NOT NULL${publishedScope}${publishedRange}`,
        publishedParams
      ),
      queryRowsOrEmpty(
        `SELECT COUNT(*)::int AS count
           FROM v_b_knowledge_articles a
          WHERE COALESCE(a.public_enabled, FALSE) = TRUE${publicScope}`,
        publicParams
      )
    ]);
    const helpfulYes = Number(helpfulRows[0]?.yes_count) || 0;
    const helpfulNo = Number(helpfulRows[0]?.no_count) || 0;
    const helpfulTotal = helpfulYes + helpfulNo;
    const topIds = topRows.map(row => row.id).filter(Boolean);
    let commentByArticle = new Map();
    let ratingByArticle = new Map();
    if (topIds.length) {
      const commentCountParams = [topIds];
      const commentCountPeriod = buildRangeClause(commentCountParams, "cm.created_at", sinceIso, untilIso);
      const [topComments, topRatings] = await Promise.all([
        queryRowsOrEmpty(
          `SELECT cm.article_id, COUNT(*)::int AS count
             FROM v_b_knowledge_article_comments cm
            WHERE cm.article_id = ANY($1::uuid[])${commentCountPeriod}
            GROUP BY 1`,
          commentCountParams
        ),
        queryRowsOrEmpty(
          `SELECT article_id, ROUND(AVG(rating)::numeric, 1)::float AS avg_rating, COUNT(*)::int AS count
             FROM v_b_knowledge_article_ratings
            WHERE article_id = ANY($1::uuid[])
            GROUP BY 1`,
          [topIds]
        )
      ]);
      commentByArticle = new Map(topComments.map(row => [String(row.article_id), Number(row.count) || 0]));
      ratingByArticle = new Map(topRatings.map(row => [String(row.article_id), {
        avgRating: round1(row.avg_rating),
        count: Number(row.count) || 0
      }]));
    }
    const missTotalRows = await queryRowsOrEmpty(
      `SELECT COALESCE(SUM(m.hit_count), 0)::int AS count
         FROM v_b_knowledge_search_misses m
        WHERE 1=1${missPeriod}`,
      missParams
    );
    return {
      available: true,
      overview: {
        articlesTotal: Number(overviewRow.articles_total) || 0,
        published: Number(overviewRow.published) || 0,
        drafts: Number(overviewRow.drafts) || 0,
        createdInPeriod: Number(overviewRow.created_in_period) || 0,
        publishedInPeriod: Number(publishedRows[0]?.count) || 0,
        publicEnabled: Number(publicRows[0]?.count) || 0,
        viewsTotal: Number(overviewRow.views_total) || 0,
        commentsInPeriod: Number(commentRows[0]?.count) || 0,
        ratingsInPeriod: Number(ratingRows[0]?.count) || 0,
        avgRating: round1(ratingRows[0]?.avg_rating),
        helpfulYes,
        helpfulNo,
        helpfulRate: helpfulTotal ? roundPct(helpfulYes / helpfulTotal * 100) : null,
        favoritesInPeriod: Number(favoriteRows[0]?.count) || 0,
        searchMisses: Number(missTotalRows[0]?.count) || 0
      },
      byStatus: mapCountRows(statusRows, {
        draft: "Draft",
        published: "Published"
      }),
      byCategory: mapCountRows(categoryRows),
      topArticles: topRows.map(row => {
        const rating = ratingByArticle.get(String(row.id)) || {};
        return {
          id: row.id,
          title: row.title,
          category: row.category || "",
          status: row.status,
          views: Number(row.views) || 0,
          comments: commentByArticle.get(String(row.id)) || 0,
          avgRating: rating.avgRating ?? null
        };
      }),
      topConsumers: (consumerRows || []).map(row => ({
        key: String(row.client_id),
        label: row.label,
        count: Number(row.count) || 0
      })),
      searchMisses: (missRows || []).map(row => ({
        label: row.label,
        count: Number(row.count) || 0
      })),
      monthlyTrend: buildTrend(trendRows)
    };
  } catch (err) {
    console.error("fetchKnowledgeStats:", err);
    return emptyKnowledgeStats();
  }
}
export async function fetchAnalyticsDashboard(options = "365d") {
  const input = typeof options === "string" ? {
    period: options
  } : options || {};
  const {
    period,
    startAt,
    endAt,
    agentId,
    clientId,
    contactId
  } = input;
  const range = resolveDashboardDateRange({
    period,
    startAt,
    endAt
  });
  const {
    sinceIso,
    untilIso
  } = range;
  const filters = parseDashboardEntityFilters({
    agentId,
    clientId,
    contactId
  });
  const [support, planning, enterprise, reports, devices, knowledge, satisfactionAvailable] = await Promise.all([fetchSupportStats({
    sinceIso,
    untilIso,
    filters
  }), fetchPlanningStats({
    sinceIso,
    untilIso,
    filters
  }), fetchEnterpriseStats({
    sinceIso,
    untilIso,
    filters
  }), fetchReportsStats({
    sinceIso,
    untilIso,
    filters
  }), fetchDevicesStats(filters), fetchKnowledgeStats({
    sinceIso,
    untilIso,
    filters
  }), hasSatisfactionTable()]);
  return {
    period: range.period,
    since: sinceIso,
    until: untilIso,
    generatedAt: new Date().toISOString(),
    filters: {
      agentId: filters.agentId,
      clientId: filters.clientId,
      contactId: filters.contactId,
      active: hasEntityFilters(filters)
    },
    modules: {
      satisfaction: satisfactionAvailable,
      planning: planning.available,
      reports: reports.available,
      knowledge: knowledge.available
    },
    summary: {
      ticketsCreated: support.overview.created,
      ticketsOpen: support.overview.openNow,
      avgFirstResponseHours: support.timing.avgFirstResponseHours,
      avgResolutionHours: support.timing.avgResolutionHours,
      eventsTotal: planning.overview.total,
      maintenanceInPeriod: planning.overview.maintenanceInPeriod,
      maintenanceYtd: planning.overview.maintenanceYtd,
      clientsTotal: enterprise.clientsPortfolio || enterprise.clientsTotal,
      reportsInPeriod: reports.inPeriod,
      equipMonitoredTotal: devices.equipMonitoredTotal,
      knowledgeArticles: knowledge.overview.published,
      knowledgeViews: knowledge.overview.viewsTotal,
      satisfactionAvg: support.satisfaction?.avgRating ?? null
    },
    support,
    planning,
    enterprise,
    crm: enterprise,
    reports,
    devices,
    infrastructure: devices,
    knowledge
  };
}
