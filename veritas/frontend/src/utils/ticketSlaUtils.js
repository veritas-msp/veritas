export const DEFAULT_SLA_BY_PRIORITY = {
  urgent: {
    firstResponseHours: 1,
    resolutionHours: 4
  },
  high: {
    firstResponseHours: 2,
    resolutionHours: 8
  },
  normal: {
    firstResponseHours: 4,
    resolutionHours: 24
  },
  low: {
    firstResponseHours: 8,
    resolutionHours: 48
  }
};
export const SLA_PRIORITY_LABELS = {
  urgent: "Urgente",
  high: "Haute",
  normal: "Normale",
  low: "Basse"
};
function parseJsonObject(value, fallback = {}) {
  if (!value) return {
    ...fallback
  };
  if (typeof value === "object") return {
    ...fallback,
    ...value
  };
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? {
      ...fallback,
      ...parsed
    } : {
      ...fallback
    };
  } catch {
    return {
      ...fallback
    };
  }
}
export function parseClientSla(contrat) {
  const contratObj = parseJsonObject(contrat, {});
  const sla = parseJsonObject(contratObj.sla, {});
  const byPriority = {
    ...DEFAULT_SLA_BY_PRIORITY
  };
  const sourceByPriority = parseJsonObject(sla.byPriority, {});
  for (const key of Object.keys(DEFAULT_SLA_BY_PRIORITY)) {
    const row = parseJsonObject(sourceByPriority[key], {});
    byPriority[key] = {
      firstResponseHours: Number(row.firstResponseHours ?? byPriority[key].firstResponseHours),
      resolutionHours: Number(row.resolutionHours ?? byPriority[key].resolutionHours)
    };
  }
  return {
    enabled: Boolean(sla.enabled),
    byPriority
  };
}
export function createDefaultClientSla() {
  return {
    enabled: false,
    byPriority: {
      ...DEFAULT_SLA_BY_PRIORITY
    }
  };
}
export function normalizeClientSlaInContrat(contrat) {
  const contratObj = parseJsonObject(contrat, {});
  return {
    ...contratObj,
    sla: {
      ...createDefaultClientSla(),
      ...parseJsonObject(contratObj.sla, {}),
      byPriority: {
        ...DEFAULT_SLA_BY_PRIORITY,
        ...parseJsonObject(parseJsonObject(contratObj.sla, {}).byPriority, {})
      }
    }
  };
}
function parseSlaInfo(raw) {
  return parseJsonObject(raw, {
    enabled: false
  });
}
function formatSlaRemainingLabel(remainingMs) {
  if (remainingMs == null || Number.isNaN(remainingMs)) return "-";
  const overdue = remainingMs <= 0;
  const absMs = Math.abs(remainingMs);
  if (!overdue && absMs < 60000) {
    return "<1m";
  }
  const totalMinutes = overdue ? Math.max(1, Math.ceil(absMs / 60000)) : Math.max(0, Math.floor(absMs / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor(totalMinutes % (60 * 24) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return hours > 0 ? `${days}j${hours}h` : `${days}j`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${hours}h`;
  }
  return `${totalMinutes}m`;
}
function normalizeTicketStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "open") return "new";
  return value;
}
function isTicketClosed(status) {
  const normalized = normalizeTicketStatus(status);
  return normalized === "resolved" || normalized === "closed";
}
function isSlaInfoComplete(sla) {
  return Boolean(sla?.enabled && sla.firstResponseDueAt);
}
function getSlaHoursForPriorityFromContrat(clientContrat, priority) {
  const clientSla = parseClientSla(clientContrat);
  const key = String(priority || "normal").toLowerCase();
  const normalizedKey = Object.prototype.hasOwnProperty.call(DEFAULT_SLA_BY_PRIORITY, key) ? key : "normal";
  if (clientSla.enabled) {
    return clientSla.byPriority[normalizedKey] || clientSla.byPriority.normal;
  }
  return DEFAULT_SLA_BY_PRIORITY[normalizedKey];
}
function needsFirstResponseRefresh(ticket, existing, takeoverAt) {
  if (!isNewTicketStatusForSla(ticket?.status)) return false;
  if (takeoverAt || existing.firstResponseAt) return false;
  return true;
}
function isNewTicketStatusForSla(status) {
  const key = normalizeTicketStatus(status);
  return key === "new" || key === "";
}
export function findFirstTakeoverAtFromHistory(statusHistory = []) {
  const rows = Array.isArray(statusHistory) ? statusHistory : [];
  const match = rows.map(row => ({
    at: row?.created_at,
    atMs: new Date(row?.created_at).getTime(),
    oldStatus: row?.old_status,
    newStatus: row?.new_status
  })).filter(row => !Number.isNaN(row.atMs) && isNewTicketStatusForSla(row.oldStatus) && row.newStatus && !isNewTicketStatusForSla(row.newStatus)).sort((a, b) => a.atMs - b.atMs)[0];
  return match?.at || null;
}
function applyTakeoverToSlaInfo(sla, takeoverAt) {
  if (!sla?.enabled || !takeoverAt) return sla;
  const at = new Date(takeoverAt);
  if (Number.isNaN(at.getTime())) return sla;
  const resolutionHours = Number(sla.policy?.resolutionHours || 0);
  const resolutionDueAt = resolutionHours > 0 ? new Date(at.getTime() + resolutionHours * 60 * 60 * 1000) : null;
  const firstResponseBreached = sla.firstResponseDueAt ? at.getTime() > new Date(sla.firstResponseDueAt).getTime() : false;
  return {
    ...sla,
    firstResponseAt: at.toISOString(),
    firstResponseBreached,
    resolutionDueAt: resolutionDueAt ? resolutionDueAt.toISOString() : null
  };
}
function slaLabelFallback(ticket) {
  if (!ticket?.sla_label || ticket.sla_label === "-") return null;
  const status = normalizeTicketStatus(ticket?.status);
  const isNew = isNewTicketStatusForSla(status);
  const phase = ticket.sla_phase || null;
  if (!isNew && phase === "first_response") return null;
  if (isNew && phase === "resolution") return null;
  return {
    label: ticket.sla_label,
    tone: ticket.sla_tone || "neutral",
    status: ticket.sla_status || "none",
    phase
  };
}
export function buildSlaInfoForTicketFromContrat({
  clientContrat,
  priority,
  createdAt = new Date()
}) {
  const hours = getSlaHoursForPriorityFromContrat(clientContrat, priority);
  if (!hours) return {
    enabled: false
  };
  const key = String(priority || "normal").toLowerCase();
  const normalizedKey = Object.prototype.hasOwnProperty.call(DEFAULT_SLA_BY_PRIORITY, key) ? key : "normal";
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return {
    enabled: false
  };
  const firstResponseDueAt = new Date(created.getTime() + hours.firstResponseHours * 60 * 60 * 1000);
  return {
    enabled: true,
    priority: normalizedKey,
    firstResponseDueAt: firstResponseDueAt.toISOString(),
    resolutionDueAt: null,
    firstResponseAt: null,
    firstResponseBreached: false,
    resolutionBreached: false,
    policy: hours,
    timeMode: "calendar"
  };
}
function resolveTakeoverAt(ticket, statusHistory) {
  if (ticket?.first_takeover_at) return ticket.first_takeover_at;
  const history = statusHistory ?? ticket?.statusHistory;
  const fromHistory = findFirstTakeoverAtFromHistory(history);
  if (fromHistory) return fromHistory;
  const firstResponseAt = parseSlaInfo(ticket?.sla_info).firstResponseAt;
  return firstResponseAt || null;
}
export function buildTicketSlaDisplayInput(ticket, {
  clients,
  clientContrat,
  statusHistory
} = {}) {
  let resolvedContrat = clientContrat ?? ticket?.client_contrat ?? null;
  if (!resolvedContrat && ticket?.client_id && Array.isArray(clients)) {
    const client = clients.find(c => String(c.id) === String(ticket.client_id));
    resolvedContrat = client?.contrat ?? null;
  }
  return {
    clientContrat: resolvedContrat,
    statusHistory: statusHistory ?? ticket?.statusHistory
  };
}
function isSlaInfoReadyForDisplay(sla, ticket) {
  if (!sla?.enabled || !sla.firstResponseDueAt) return false;
  const status = normalizeTicketStatus(ticket?.status);
  if (isTicketClosed(status) || isNewTicketStatusForSla(status)) {
    return true;
  }
  return Boolean(sla.firstResponseAt && sla.resolutionDueAt);
}
export function resolveTicketSlaInfoForDisplay(ticket, {
  clientContrat,
  statusHistory,
  clients
} = {}) {
  const slaContext = buildTicketSlaDisplayInput(ticket, {
    clients,
    clientContrat,
    statusHistory
  });
  const existing = parseSlaInfo(ticket?.sla_info);
  const takeoverAt = resolveTakeoverAt(ticket, slaContext.statusHistory);
  const refreshFirstResponse = needsFirstResponseRefresh(ticket, existing, takeoverAt);
  if (isSlaInfoReadyForDisplay(existing, ticket) && !refreshFirstResponse) {
    return existing;
  }
  let sla = existing;
  if ((!isSlaInfoComplete(existing) || refreshFirstResponse) && slaContext.clientContrat) {
    const built = buildSlaInfoForTicketFromContrat({
      clientContrat: slaContext.clientContrat,
      priority: ticket?.priority,
      createdAt: ticket?.created_at || new Date()
    });
    if (built.enabled) {
      sla = refreshFirstResponse ? {
        ...existing,
        ...built,
        resolutionDueAt: null,
        firstResponseAt: null,
        firstResponseBreached: false
      } : built;
    }
  }
  if (!sla.enabled) return sla;
  if (takeoverAt && !isNewTicketStatusForSla(ticket?.status)) {
    if (sla.firstResponseAt && sla.resolutionDueAt) return sla;
    return applyTakeoverToSlaInfo(sla, takeoverAt);
  }
  if (isNewTicketStatusForSla(ticket?.status)) {
    return {
      ...sla,
      firstResponseAt: null,
      resolutionDueAt: null,
      firstResponseBreached: false
    };
  }
  return sla;
}
export function normalizeSlaTone(tone, {
  label
} = {}) {
  if (!label || label === "-") return "neutral";
  const value = String(tone || "").toLowerCase();
  if (value === "breach" || value === "breached") return "breach";
  if (value === "warning") return "warning";
  if (value === "ok" || value === "active" || value === "met") return "ok";
  return "ok";
}
export function getTicketSlaDisplay(ticket, options = {}) {
  if (!ticket) return {
    label: "-",
    tone: "neutral",
    status: "none",
    phase: null
  };
  const {
    now = Date.now(),
    ...context
  } = options;
  const enrichedView = computeSlaDisplay(ticket, now);
  if (enrichedView.label && enrichedView.label !== "-") {
    return {
      ...enrichedView,
      tone: normalizeSlaTone(enrichedView.tone, {
        label: enrichedView.label
      })
    };
  }
  const slaContext = buildTicketSlaDisplayInput(ticket, context);
  const resolvedInfo = resolveTicketSlaInfoForDisplay(ticket, {
    ...context,
    ...slaContext
  });
  const view = computeSlaDisplay({
    ...ticket,
    sla_info: resolvedInfo
  }, now);
  if (view.label && view.label !== "-") {
    return {
      ...view,
      tone: normalizeSlaTone(view.tone, {
        label: view.label
      })
    };
  }
  const fallback = slaLabelFallback(ticket) || view;
  return {
    ...fallback,
    tone: normalizeSlaTone(fallback.tone, {
      label: fallback.label
    })
  };
}
export function getTicketSlaSortValue(ticket, options = {}) {
  const {
    now = Date.now(),
    ...context
  } = options;
  const view = getTicketSlaDisplay(ticket, {
    ...context,
    now
  });
  if (view.remainingMs != null) return view.remainingMs;
  if (view.phase === "closed") {
    return Number.MAX_SAFE_INTEGER - (view.status === "breached" ? 1 : 0);
  }
  return Number.POSITIVE_INFINITY;
}
export function computeSlaDisplay(ticket, now = Date.now()) {
  const sla = parseSlaInfo(ticket?.sla_info);
  if (!sla.enabled) {
    return slaLabelFallback(ticket) || {
      label: "-",
      tone: "neutral",
      status: "none",
      phase: null
    };
  }
  const status = normalizeTicketStatus(ticket?.status);
  const closed = isTicketClosed(status);
  const isNew = isNewTicketStatusForSla(status);
  const firstResponseDue = sla.firstResponseDueAt ? new Date(sla.firstResponseDueAt).getTime() : null;
  const resolutionDue = sla.resolutionDueAt ? new Date(sla.resolutionDueAt).getTime() : null;
  const firstResponseAt = sla.firstResponseAt ? new Date(sla.firstResponseAt).getTime() : null;
  const resolvedAt = ticket?.resolved_at ? new Date(ticket.resolved_at).getTime() : null;
  if (closed) {
    const firstOk = !firstResponseDue || (firstResponseAt ? firstResponseAt <= firstResponseDue : true);
    const resolutionOk = !resolutionDue || (resolvedAt ? resolvedAt <= resolutionDue : true);
    const ok = firstOk && resolutionOk;
    return {
      label: ok ? "OK" : "Exp.",
      tone: ok ? "ok" : "breach",
      status: ok ? "met" : "breached",
      phase: "closed",
      remainingMs: null
    };
  }
  if (isNew && firstResponseDue) {
    const remaining = firstResponseDue - now;
    const warningMs = Math.max(15 * 60 * 1000, (sla.policy?.firstResponseHours || 4) * 60 * 60 * 1000 * 0.2);
    return {
      label: formatSlaRemainingLabel(remaining),
      tone: remaining <= 0 ? "breach" : remaining <= warningMs ? "warning" : "ok",
      status: remaining <= 0 ? "breached" : remaining <= warningMs ? "warning" : "active",
      phase: "first_response",
      remainingMs: remaining
    };
  }
  if (!isNew && resolutionDue) {
    const remaining = resolutionDue - now;
    const warningMs = Math.max(30 * 60 * 1000, (sla.policy?.resolutionHours || 24) * 60 * 60 * 1000 * 0.2);
    return {
      label: formatSlaRemainingLabel(remaining),
      tone: remaining <= 0 ? "breach" : remaining <= warningMs ? "warning" : "ok",
      status: remaining <= 0 ? "breached" : remaining <= warningMs ? "warning" : "active",
      phase: "resolution",
      remainingMs: remaining
    };
  }
  return slaLabelFallback(ticket) || {
    label: "-",
    tone: "neutral",
    status: "none",
    phase: null,
    remainingMs: null
  };
}
export function getSlaMeta(ticket, now = Date.now()) {
  const view = computeSlaDisplay(ticket, now);
  return {
    label: view.label,
    tone: view.tone,
    status: view.status,
    phase: view.phase
  };
}
export function formatClientSlaSummary(contrat) {
  const sla = parseClientSla(contrat);
  if (!sla.enabled) return "SLA not configured";
  const normal = sla.byPriority.normal;
  return `1st response ${normal.firstResponseHours}h · resolution ${normal.resolutionHours}h`;
}
export function formatClientSlaRows(contrat) {
  const sla = parseClientSla(contrat);
  if (!sla.enabled) return [];
  return Object.entries(SLA_PRIORITY_LABELS).map(([key, label]) => ({
    key,
    label,
    firstResponseHours: sla.byPriority[key]?.firstResponseHours ?? DEFAULT_SLA_BY_PRIORITY[key].firstResponseHours,
    resolutionHours: sla.byPriority[key]?.resolutionHours ?? DEFAULT_SLA_BY_PRIORITY[key].resolutionHours
  }));
}
