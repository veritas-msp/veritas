const MAX_EVENT_LOG = 500;

function entityKey(kind, item) {
  if (!item) return "";
  if (kind === "user") {
    const key = item.id ?? item.email ?? item.mail ?? item.login ?? item.name ?? "";
    return key != null && String(key).trim() ? String(key).trim().toLowerCase() : "";
  }
  const key = item.id ?? item.name ?? item.domain ?? "";
  return key != null && String(key).trim() ? String(key).trim().toLowerCase() : "";
}

function entityLabel(kind, item) {
  if (kind === "user") {
    return String(item?.email || item?.mail || item?.login || item?.name || "Utilisateur").trim() || "Utilisateur";
  }
  return String(item?.name || item?.domain || "Domaine").trim() || "Domaine";
}

function indexEntities(kind, list) {
  const map = new Map();
  for (const item of Array.isArray(list) ? list : []) {
    const key = entityKey(kind, item);
    if (key) map.set(key, item);
  }
  return map;
}

function makeEvent({ type, severity, subjectId, subjectName, message, at }) {
  const stamp = at || new Date().toISOString();
  const id = `${type}:${subjectId || "unknown"}:${stamp}`;
  return {
    id,
    at: stamp,
    type,
    severity: severity || "info",
    subjectId: subjectId || null,
    subjectName: subjectName || "Élément",
    message: message || ""
  };
}

export function normalizeAntispamEventLog(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(item => item && item.id && item.at)
    .map(item => ({
      id: String(item.id),
      at: String(item.at),
      type: String(item.type || "info"),
      severity: String(item.severity || "info"),
      subjectId: item.subjectId != null ? String(item.subjectId) : item.endpointId != null ? String(item.endpointId) : null,
      subjectName: String(item.subjectName || item.endpointName || "Élément"),
      message: String(item.message || "")
    }))
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

export function mergeAntispamEventLog(existing, incoming, { max = MAX_EVENT_LOG } = {}) {
  const byId = new Map();
  for (const event of [...normalizeAntispamEventLog(incoming), ...normalizeAntispamEventLog(existing)]) {
    if (!byId.has(event.id)) byId.set(event.id, event);
  }
  return Array.from(byId.values())
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, max);
}

function detectListTransitions(kind, prevList, nextList, now) {
  const prevMap = indexEntities(kind, prevList);
  const nextMap = indexEntities(kind, nextList);
  const events = [];
  const addedType = kind === "user" ? "user_added" : "domain_added";
  const removedType = kind === "user" ? "user_removed" : "domain_removed";
  const addedSeverity = "info";
  const removedSeverity = "warn";

  for (const [key, next] of nextMap.entries()) {
    if (prevMap.has(key)) continue;
    const name = entityLabel(kind, next);
    events.push(
      makeEvent({
        type: addedType,
        severity: addedSeverity,
        subjectId: key,
        subjectName: name,
        message: kind === "user" ? `Utilisateur ajouté : ${name}` : `Domaine ajouté : ${name}`,
        at: now
      })
    );
  }

  for (const [key, prev] of prevMap.entries()) {
    if (nextMap.has(key)) continue;
    const name = entityLabel(kind, prev);
    events.push(
      makeEvent({
        type: removedType,
        severity: removedSeverity,
        subjectId: key,
        subjectName: name,
        message: kind === "user" ? `Utilisateur retiré : ${name}` : `Domaine retiré : ${name}`,
        at: now
      })
    );
  }

  return events;
}

function detectLicenseChange(prevDashboard, nextDashboard, now) {
  const prevSummary = prevDashboard?.sections?.licenses?.summary || {};
  const nextSummary = nextDashboard?.sections?.licenses?.summary || {};
  const prevUsed = prevSummary.used != null ? Number(prevSummary.used) : null;
  const nextUsed = nextSummary.used != null ? Number(nextSummary.used) : null;
  const prevTotal = prevSummary.total != null ? Number(prevSummary.total) : null;
  const nextTotal = nextSummary.total != null ? Number(nextSummary.total) : null;
  if (prevUsed == null && prevTotal == null) return [];
  if (prevUsed === nextUsed && prevTotal === nextTotal) return [];
  const label = `${nextUsed ?? "-"} / ${nextTotal ?? "-"}`;
  return [
    makeEvent({
      type: "license_changed",
      severity: "info",
      subjectId: "licenses",
      subjectName: "Licences",
      message: `Licences mises à jour : ${label}`,
      at: now
    })
  ];
}

function sectionItems(dashboard, key) {
  const section = dashboard?.sections?.[key];
  return Array.isArray(section?.items) ? section.items : [];
}

/** Calcule le journal mis à jour à partir de l’état précédent et du nouveau dashboard. */
export function buildAntispamEventLogUpdate(prevLog, prevDashboard, nextDashboard, { now = new Date().toISOString() } = {}) {
  const existing = normalizeAntispamEventLog(prevLog);
  const hasPrev =
    prevDashboard &&
    (sectionItems(prevDashboard, "users").length > 0 ||
      sectionItems(prevDashboard, "domains").length > 0 ||
      prevDashboard?.sections?.licenses?.summary);
  const incoming = hasPrev
    ? [
        ...detectListTransitions("user", sectionItems(prevDashboard, "users"), sectionItems(nextDashboard, "users"), now),
        ...detectListTransitions("domain", sectionItems(prevDashboard, "domains"), sectionItems(nextDashboard, "domains"), now),
        ...detectLicenseChange(prevDashboard, nextDashboard, now)
      ]
    : [];
  return {
    eventLog: mergeAntispamEventLog(existing, incoming),
    addedCount: incoming.length
  };
}

export function getAntispamEventTypeMeta(type) {
  switch (String(type || "")) {
    case "user_added":
      return { label: "Utilisateur +", icon: "mdi:account-plus-outline", tone: "info" };
    case "user_removed":
      return { label: "Utilisateur −", icon: "mdi:account-minus-outline", tone: "warn" };
    case "domain_added":
      return { label: "Domaine +", icon: "mdi:earth-plus", tone: "info" };
    case "domain_removed":
      return { label: "Domaine −", icon: "mdi:earth-minus", tone: "warn" };
    case "license_changed":
      return { label: "Licences", icon: "mdi:license", tone: "success" };
    default:
      return { label: "Événement", icon: "mdi:history", tone: "info" };
  }
}
