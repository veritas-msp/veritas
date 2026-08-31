import { getEquipmentDbId } from "../../../utils/equipmentIdentity";
import { getTicketDescriptionPreview } from "../../../utils/incomingEmailContent";
import { isDateWithinPeriod } from "./supervisionReportBuilder";
import { getCheckmkHostName, isEquipmentMappedForCheckMK } from "./checkmkReportCacheUtils";

export function normalizeInsightEquipmentId(raw) {
  if (raw == null || raw === "") return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (value.includes(":")) {
    const tail = value.slice(value.lastIndexOf(":") + 1).trim();
    return tail || value;
  }
  return value;
}

export function resolveReportEquipmentKey(item, moduleKey = "module") {
  if (!item) return null;
  if (item.commentKey != null) return String(item.commentKey);
  const dbId = getEquipmentDbId(item);
  if (dbId) return dbId;
  if (item.id != null) return String(item.id);
  if (item.uuid != null) return String(item.uuid);
  if (item.glpi_id != null) return String(item.glpi_id);
  const name = item.nom || item.name || item.logiciel || "unknown";
  return `${moduleKey}:${name}`;
}

export function listClientEquipmentsFlat(client) {
  const eq = client?.equipements || {};
  const out = [];
  const pushList = (moduleKey, list) => {
    if (!Array.isArray(list)) return;
    list.forEach(item => {
      const key = resolveReportEquipmentKey(item, moduleKey);
      const dbId = getEquipmentDbId(item) || (item?.id != null ? String(item.id) : null);
      out.push({
        item,
        moduleKey,
        equipmentKey: key,
        equipmentId: dbId
      });
    });
  };
  pushList("Internet", eq.Internet);
  pushList("Servers", eq.Serveurs || eq.Servers);
  pushList("Firewall", eq.Firewalls);
  pushList("Storage", [...(eq.NAS || []), ...(eq.SAN || [])]);
  pushList("Switch", eq.Switch);
  pushList("BorneWifi", eq.BorneWifi);
  const toip = Array.isArray(eq.TOIP) ? eq.TOIP : eq.TOIP?.solutions;
  pushList("TOIP", toip);
  return out;
}

function ticketEquipmentId(ticket) {
  const info = ticket?.equipment_info || ticket?.equipmentInfo || null;
  if (!info || typeof info !== "object") return null;
  if (info.concerned === false) return null;
  return normalizeInsightEquipmentId(info.equipmentId || info.equipment_id || null);
}

function ticketCreatedAt(ticket) {
  return ticket?.created_at || ticket?.createdAt || ticket?.updated_at || ticket?.updatedAt || null;
}

function ticketSubjectPreview(ticket, title) {
  const preview = getTicketDescriptionPreview(ticket?.description, {
    maxChars: 140,
    maxLines: 2
  });
  const raw = String(preview.subject || preview.body || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const normalizedTitle = String(title || "").trim().toLowerCase();
  if (normalizedTitle && raw.toLowerCase() === normalizedTitle) return "";
  return raw;
}

function ticketCategoryLabel(ticket) {
  const raw = ticket?.category || ticket?.type || ticket?.prestation || "";
  const text = String(raw).replace(/^prestation-/, "").replace(/-/g, " ").trim();
  return text || "Support";
}

function alertEquipmentId(alert) {
  return normalizeInsightEquipmentId(alert?.equipmentId || alert?.equipment_id || null);
}

function alertAt(alert) {
  return alert?.createdAt || alert?.created_at || alert?.lastSeenAt || alert?.updatedAt || null;
}

/** Native Veritas alerts only (exclude CheckMK-sourced domains if present). */
function isNativeVeritasAlert(alert) {
  const domain = String(alert?.domain || "").toLowerCase();
  if (!domain) return true;
  if (domain.includes("checkmk") || domain.includes("check_mk")) return false;
  return true;
}

export function buildPeriodInsights({
  client,
  tickets = [],
  alerts = [],
  startDate,
  endDate
}) {
  const flat = listClientEquipmentsFlat(client);
  const idToKeys = new Map();
  flat.forEach(entry => {
    if (!entry.equipmentId) return;
    const list = idToKeys.get(entry.equipmentId) || [];
    list.push(entry.equipmentKey);
    idToKeys.set(entry.equipmentId, list);
  });

  const ticketsByEquipmentKey = {};
  const alertsByEquipmentKey = {};
  const seededCommentsByEquipmentKey = {};

  const periodTickets = (Array.isArray(tickets) ? tickets : []).filter(t =>
    isDateWithinPeriod(ticketCreatedAt(t), startDate, endDate)
  );
  const periodAlerts = (Array.isArray(alerts) ? alerts : [])
    .filter(isNativeVeritasAlert)
    .filter(a => isDateWithinPeriod(alertAt(a), startDate, endDate));

  const bump = (map, key, payload) => {
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(payload);
  };

  periodTickets.forEach(ticket => {
    const eqId = ticketEquipmentId(ticket);
    if (!eqId) return;
    const keys = idToKeys.get(eqId) || [eqId];
    keys.forEach(equipmentKey => {
      bump(ticketsByEquipmentKey, equipmentKey, ticket);
      const number = ticket.ticket_number || ticket.ticketNumber || "";
      const title = ticket.title || ticket.subject || "Ticket";
      const createdAt = ticketCreatedAt(ticket);
      const subjectPreview = ticketSubjectPreview(ticket, title);
      const categoryLabel = ticketCategoryLabel(ticket);
      const moduleKey = flat.find(f => f.equipmentKey === equipmentKey)?.moduleKey || null;
      const infraModules = ["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "TOIP"];
      const cyberModules = ["Backup", "Antivirus", "Antispam"];
      const servicesModules = ["Office365", "NDD"];
      let category = null;
      if (infraModules.includes(moduleKey)) category = "infra";
      else if (cyberModules.includes(moduleKey)) category = "cyber";
      else if (servicesModules.includes(moduleKey)) category = "services";
      const comment = {
        id: `auto-ticket-${ticket.id}`,
        isTicketComment: true,
        source: "ticket",
        ticketId: ticket.id,
        ticketNumber: number,
        ticketTitle: title,
        ticketSubject: subjectPreview,
        ticketCategory: categoryLabel,
        text: title,
        createdAt: createdAt || new Date().toISOString(),
        author: categoryLabel,
        moduleKey,
        category,
        referenceLabel: title
      };
      if (!seededCommentsByEquipmentKey[equipmentKey]) seededCommentsByEquipmentKey[equipmentKey] = [];
      seededCommentsByEquipmentKey[equipmentKey].push(comment);
    });
  });

  periodAlerts.forEach(alert => {
    const eqId = alertEquipmentId(alert);
    if (!eqId) return;
    const keys = idToKeys.get(eqId) || [eqId];
    keys.forEach(equipmentKey => bump(alertsByEquipmentKey, equipmentKey, alert));
  });

  const ticketCounts = {};
  const alertCounts = {};
  Object.entries(ticketsByEquipmentKey).forEach(([key, list]) => {
    ticketCounts[key] = list.length;
  });
  Object.entries(alertsByEquipmentKey).forEach(([key, list]) => {
    alertCounts[key] = list.length;
  });

  return {
    ticketCounts,
    alertCounts,
    ticketsByEquipmentKey,
    alertsByEquipmentKey,
    seededCommentsByEquipmentKey
  };
}

export function stripAutoTicketComments(existingComments) {
  const next = {};
  Object.entries(existingComments && typeof existingComments === "object" ? existingComments : {}).forEach(
    ([equipmentKey, list]) => {
      const kept = (Array.isArray(list) ? list : []).filter(
        c => !(c?.isTicketComment === true || String(c?.id || "").startsWith("auto-ticket-"))
      );
      if (kept.length > 0) next[equipmentKey] = kept;
    }
  );
  return next;
}

export function mergeSeededTicketComments(existingComments, seededByKey) {
  const next = stripAutoTicketComments(existingComments);
  Object.entries(seededByKey || {}).forEach(([equipmentKey, seededList]) => {
    const current = Array.isArray(next[equipmentKey]) ? [...next[equipmentKey]] : [];
    (seededList || []).forEach(comment => {
      const already = current.some(
        c =>
          (comment.ticketId && c.ticketId === comment.ticketId) ||
          (comment.id && c.id === comment.id)
      );
      if (!already) current.push(comment);
    });
    next[equipmentKey] = current;
  });
  return next;
}

export function getSupervisionColumnMeta(item, monitoringSyncStatus = {}, equipmentCheckMKData = {}) {
  const mapped = isEquipmentMappedForCheckMK(item);
  if (!mapped) {
    return {
      mapped: false,
      status: "unmapped",
      label: "—",
      tone: "muted",
      events: 0
    };
  }
  const key = item?.id != null ? String(item.id) : null;
  const status = (key && monitoringSyncStatus[key]) || "unsynced";
  const cached = key && equipmentCheckMKData[key] ? equipmentCheckMKData[key] : null;
  const events = Array.isArray(cached?.events)
    ? cached.events.filter(e => Number(e?.state) === 2).length
    : 0;
  const labels = {
    ok: "OK",
    warn: "Attention",
    critical: "Critique",
    unsynced: "À sync."
  };
  const tones = {
    ok: "ok",
    warn: "warn",
    critical: "critical",
    unsynced: "muted"
  };
  return {
    mapped: true,
    status,
    label: labels[status] || status,
    tone: tones[status] || "muted",
    events,
    hostName: getCheckmkHostName(item)
  };
}
