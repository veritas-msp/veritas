const MAX_EVENT_LOG = 500;

function endpointKey(ep) {
  if (ep?.id != null && String(ep.id).trim()) return String(ep.id);
  const fallback = `${ep?.name ?? ""}|${ep?.ip ?? ""}|${ep?.fqdn ?? ""}`.trim();
  return fallback && fallback !== "||" ? fallback : "";
}

function isInfected(ep) {
  return ep?.isInfected === true || ep?.malwareDetected === true;
}

function indexEndpoints(list) {
  const map = new Map();
  for (const ep of Array.isArray(list) ? list : []) {
    const key = endpointKey(ep);
    if (key) map.set(key, ep);
  }
  return map;
}

function makeEvent({ type, severity, endpointId, endpointName, message, at }) {
  const stamp = at || new Date().toISOString();
  const id = `${type}:${endpointId || "unknown"}:${stamp}`;
  return {
    id,
    at: stamp,
    type,
    severity: severity || "info",
    endpointId: endpointId || null,
    endpointName: endpointName || "Poste",
    message: message || ""
  };
}

export function normalizeAntivirusEventLog(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(item => item && item.id && item.at)
    .map(item => ({
      id: String(item.id),
      at: String(item.at),
      type: String(item.type || "info"),
      severity: String(item.severity || "info"),
      endpointId: item.endpointId != null ? String(item.endpointId) : null,
      endpointName: String(item.endpointName || "Poste"),
      message: String(item.message || "")
    }))
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

export function mergeAntivirusEventLog(existing, incoming, { max = MAX_EVENT_LOG } = {}) {
  const byId = new Map();
  for (const event of [...normalizeAntivirusEventLog(incoming), ...normalizeAntivirusEventLog(existing)]) {
    if (!byId.has(event.id)) byId.set(event.id, event);
  }
  return Array.from(byId.values())
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, max);
}

function detectTransitions(prevList, nextList, now) {
  const prevMap = indexEndpoints(prevList);
  const nextMap = indexEndpoints(nextList);
  const events = [];

  for (const [key, next] of nextMap.entries()) {
    const prev = prevMap.get(key);
    if (!prev) continue;
    const name = next.name || prev.name || "Poste";
    const nextInfected = isInfected(next);
    const prevInfected = isInfected(prev);
    if (nextInfected && !prevInfected) {
      events.push(
        makeEvent({
          type: "infected",
          severity: "danger",
          endpointId: key,
          endpointName: name,
          message: `Poste infecté : ${name}`,
          at: now
        })
      );
    } else if (!nextInfected && prevInfected) {
      events.push(
        makeEvent({
          type: "cleaned",
          severity: "success",
          endpointId: key,
          endpointName: name,
          message: `Infection résolue : ${name}`,
          at: now
        })
      );
    }

    const nextManaged = Boolean(next.isManaged);
    const prevManaged = Boolean(prev.isManaged);
    if (nextManaged && !prevManaged) {
      events.push(
        makeEvent({
          type: "managed",
          severity: "info",
          endpointId: key,
          endpointName: name,
          message: `Poste passé en géré : ${name}`,
          at: now
        })
      );
    } else if (!nextManaged && prevManaged) {
      events.push(
        makeEvent({
          type: "unmanaged",
          severity: "warn",
          endpointId: key,
          endpointName: name,
          message: `Poste passé en non géré : ${name}`,
          at: now
        })
      );
    }
  }

  return events;
}

function seedCurrentInfections(nextList, now) {
  const events = [];
  for (const ep of Array.isArray(nextList) ? nextList : []) {
    if (!isInfected(ep)) continue;
    const key = endpointKey(ep);
    const name = ep.name || "Poste";
    events.push(
      makeEvent({
        type: "infected",
        severity: "danger",
        endpointId: key || name,
        endpointName: name,
        message: `Poste infecté détecté : ${name}`,
        at: now
      })
    );
  }
  return events;
}

/** Calcule le journal mis à jour à partir de l’état précédent et du nouvel inventaire enrichi. */
export function buildAntivirusEventLogUpdate(prevLog, prevEndpoints, nextEndpoints, { now = new Date().toISOString() } = {}) {
  const existing = normalizeAntivirusEventLog(prevLog);
  const prev = Array.isArray(prevEndpoints) ? prevEndpoints : [];
  const next = Array.isArray(nextEndpoints) ? nextEndpoints : [];
  const incoming =
    prev.length > 0 ? detectTransitions(prev, next, now) : existing.length === 0 ? seedCurrentInfections(next, now) : [];
  return {
    eventLog: mergeAntivirusEventLog(existing, incoming),
    addedCount: incoming.length
  };
}

export function getAntivirusEventTypeMeta(type) {
  switch (String(type || "")) {
    case "infected":
      return { label: "Infection", icon: "mdi:virus-outline", tone: "danger" };
    case "cleaned":
      return { label: "Résolu", icon: "mdi:shield-check-outline", tone: "success" };
    case "managed":
      return { label: "Géré", icon: "mdi:monitor-check", tone: "info" };
    case "unmanaged":
      return { label: "Non géré", icon: "mdi:monitor-off", tone: "warn" };
    default:
      return { label: "Événement", icon: "mdi:history", tone: "info" };
  }
}
