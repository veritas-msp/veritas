import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import { resolveEquipmentFamilyKey } from "./supervisionAlertRulesConfig";

function joinMeta(parts, clientName = "") {
  const client = String(clientName || "").trim().toLowerCase();
  return (Array.isArray(parts) ? parts : [])
    .map(part => String(part || "").trim())
    .filter(Boolean)
    .filter(part => !client || part.toLowerCase() !== client)
    .join(" · ");
}

/** Resolve enterprise label from queue/alert/equipment payloads. */
export function resolveQueueClientName(...sources) {
  for (const source of sources) {
    if (source == null) continue;
    if (typeof source === "string" || typeof source === "number") {
      const text = String(source).trim();
      if (text) return text;
      continue;
    }
    const name = String(
      source.clientName ||
        source.client_name ||
        source.equipment?.clientName ||
        source.equipment?.client_name ||
        source.client?.name ||
        source.client?.nom ||
        source.meta?.clientName ||
        source.meta?.client_name ||
        ""
    ).trim();
    if (name) return name;
  }
  return "";
}

const SEVERITY_RANK = {
  critical: 0,
  warning: 1,
  info: 2
};

/**
 * File ops du centre = alertes persistées (réconciliées après sync CheckMK).
 */
export function buildQueueItemsFromSupervisionAlerts(alerts = [], labels = {}) {
  const fallbackName = labels.noName || "—";
  return (Array.isArray(alerts) ? alerts : [])
    .filter(alert => {
      const status = String(alert?.status || "open");
      return status === "open" || status === "acked" || status === "linked";
    })
    .map(alert => {
      const severity = String(alert.severity || "warning").toLowerCase();
      const tone = severity === "critical" ? "bad" : severity === "warning" ? "warn" : "info";
      const clientName = resolveQueueClientName(alert, alert?.meta);
      const equipmentName =
        alert?.meta?.equipmentName ||
        alert?.subtitle?.split(" · ")?.[0] ||
        alert?.meta?.hostName ||
        fallbackName;
      const hostName = alert?.meta?.hostName || null;
      const equipmentId = alert.equipmentId || null;
      const clientId = alert.clientId ?? null;
      const raisedAt =
        alert?.meta?.checkmkAlertAt ||
        alert?.createdAt ||
        alert?.lastSeenAt ||
        null;
      const raisedMs = raisedAt ? new Date(raisedAt).getTime() : NaN;
      const title = alert.title || alert.label || "Alerte";
      const equipment = equipmentId
        ? {
            id: equipmentId,
            dbId: equipmentId,
            clientId,
            clientName,
            name: equipmentName,
            checkmkMapping: hostName
              ? { checkmk_host_name: hostName, is_active: true }
              : null
          }
        : null;
      return {
        id: alert.queueItemId || alert.id,
        queueItemId: alert.queueItemId || alert.id,
        domain: alert.domain || "devices",
        severity: SEVERITY_RANK[severity] != null ? severity : "warning",
        tone,
        title,
        subtitle: alert.subtitle || joinMeta([equipmentName, hostName], clientName),
        label: alert.label || title,
        clientId,
        clientName,
        equipmentId,
        equipment,
        criterionKey: alert?.meta?.criterionKey || null,
        ticketSubject: [equipmentName, title].filter(Boolean).join(" — "),
        priority: SEVERITY_RANK[severity] ?? 9,
        alertAt: raisedAt,
        notifiedAt: raisedAt,
        sortTime: Number.isFinite(raisedMs) ? raisedMs : null,
        workflowStatus: alert.status || "open",
        alertState: alert,
        handledByName: alert.ackedByName || null,
        linkedTicketKind: alert.linkedTicketKind || null,
        linkedTicketId: alert.linkedTicketId || null,
        linkedEventId: alert.linkedEventId || null
      };
    })
    .sort((a, b) => {
      const sev = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
      if (sev !== 0) return sev;
      const ta = a.sortTime ?? Number.POSITIVE_INFINITY;
      const tb = b.sortTime ?? Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      return (a.priority ?? 9) - (b.priority ?? 9);
    });
}

export function filterSupervisionQueue(items = [], {
  severity = "all",
  domain = "all",
  client = "",
  query = "",
  workflowStatus = "all"
} = {}) {
  const q = String(query || "").trim().toLowerCase();
  const clientFilter = String(client || "").trim().toLowerCase();
  return items.filter(item => {
    if (severity !== "all" && item.severity !== severity) return false;
    if (domain !== "all" && item.domain !== domain) return false;
    if (workflowStatus !== "all") {
      const status = item.workflowStatus || "open";
      if (workflowStatus === "active") {
        if (status === "closed") return false;
      } else if (status !== workflowStatus) {
        return false;
      }
    } else if ((item.workflowStatus || "open") === "closed") {
      return false;
    }
    if (clientFilter) {
      const name = String(item.clientName || "").toLowerCase();
      if (!name.includes(clientFilter) && String(item.clientId || "") !== clientFilter) return false;
    }
    if (!q) return true;
    const hay = [item.title, item.subtitle, item.label, item.clientName, item.domain].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function countQueueByWorkflow(items = []) {
  return items.reduce((acc, item) => {
    const status = item.workflowStatus || "open";
    acc[status] = (acc[status] || 0) + 1;
    acc.total += 1;
    return acc;
  }, {
    open: 0,
    acked: 0,
    linked: 0,
    closed: 0,
    total: 0
  });
}

export function countQueueBySeverity(items = []) {
  return items.reduce((acc, item) => {
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    acc.total += 1;
    return acc;
  }, {
    critical: 0,
    warning: 0,
    info: 0,
    total: 0
  });
}

/**
 * Prefill payload for TicketCreate when opening a Support ticket from the supervision queue.
 */
export function buildSupervisionSupportTicketPrefill(item, rules = null) {
  const equipment = item?.equipment || null;
  const clientId = item?.clientId || equipment?.clientId || null;
  const equipmentId = getEquipmentDbId(equipment) || equipment?.id || item?.equipmentId || null;
  const checkmkHost = equipment?.checkmkMapping?.checkmk_host_name
    || equipment?.checkmkMapping?.checkmkHostName
    || equipment?.checkmk_host_name
    || item?.meta?.hostName
    || null;

  const lines = [];
  if (item?.title) lines.push(`Alerte : ${item.title}`);
  if (item?.severity) lines.push(`Sévérité : ${String(item.severity)}`);
  if (item?.clientName) lines.push(`Entreprise : ${item.clientName}`);
  if (equipment?.name) lines.push(`Périphérique : ${equipment.name}`);
  if (equipment?.type) lines.push(`Type : ${equipment.type}`);
  if (equipment?.ip) lines.push(`IP : ${equipment.ip}`);
  if (checkmkHost) lines.push(`Hôte CheckMK : ${checkmkHost}`);
  if (item?.subtitle) lines.push(`Contexte : ${item.subtitle}`);
  if (item?.label && item.label !== item.title) lines.push(`Détail : ${item.label}`);
  lines.push("", "Ticket créé depuis le centre de supervision.");

  const title = item?.ticketSubject || [equipment?.name, item?.title].filter(Boolean).join(" — ") || "";
  const description = lines.filter((line, index, arr) => line !== "" || (index > 0 && arr[index - 1] !== "")).join("\n").slice(0, 5000);

  const familyKey = resolveEquipmentFamilyKey(equipment?.type === "NAS" ? "Storage" : equipment?.type);
  const criterionKey = String(item?.criterionKey || item?.meta?.criterionKey || "").trim();
  const rule = familyKey && criterionKey && rules ? rules?.[familyKey]?.[criterionKey] : null;
  const supportFormId = rule?.supportFormId ? String(rule.supportFormId) : null;
  const subjectFieldKey = rule?.subjectFieldKey ? String(rule.subjectFieldKey) : null;
  const descriptionFieldKey = rule?.descriptionFieldKey ? String(rule.descriptionFieldKey) : null;
  const supportFormValues = {};
  if (subjectFieldKey && title) supportFormValues[subjectFieldKey] = title;
  if (descriptionFieldKey && description) supportFormValues[descriptionFieldKey] = description;

  return {
    clientId,
    equipmentId,
    title,
    description,
    category: "monitoring",
    preferPrimaryContact: true,
    ...(supportFormId
      ? {
          supportFormId,
          lockSupportForm: true,
          subjectFieldKey,
          descriptionFieldKey,
          supportFormValues,
          prefillSource: "supervision"
        }
      : {})
  };
}
