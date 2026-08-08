import { getRmmAgentOsDisplay } from "./rmmMonitoringUtils";
export function filterRmmFleetRows(agents = [], searchQuery = "") {
  const query = String(searchQuery || "").trim().toLowerCase();
  const rows = Array.isArray(agents) ? agents : [];
  if (!query) return rows;
  return rows.filter(agent => {
    const osDisplay = getRmmAgentOsDisplay(agent);
    const haystack = [agent.hostname, agent.machine_id, agent.client_name, agent.ip, agent.domain, agent.logged_user, agent.agent_version, osDisplay.label, osDisplay.build].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}
export function buildRmmFleetStats(agents = []) {
  const list = Array.isArray(agents) ? agents : [];
  const clientIds = new Set();
  let offline = 0;
  let pendingUpdates = 0;
  let diskAlerts = 0;
  list.forEach(agent => {
    if (agent.client_id != null) clientIds.add(agent.client_id);
    if (!agent.online) offline += 1;
    if ((agent.updates_pending ?? 0) > 0) pendingUpdates += 1;
    if ((agent.disk_pct ?? 0) >= 85) diskAlerts += 1;
  });
  const online = list.length - offline;
  const healthScore = list.length === 0 ? null : Math.max(0, Math.min(100, Math.round(online / list.length * 100)));
  return {
    total: list.length,
    clients: clientIds.size,
    online,
    offline,
    pendingUpdates,
    diskAlerts,
    issues: offline + pendingUpdates,
    healthScore
  };
}
export function filterRmmFleetByStatus(agents = [], statusFilter = "all") {
  const list = Array.isArray(agents) ? agents : [];
  switch (statusFilter) {
    case "online":
      return list.filter(a => a.online);
    case "offline":
      return list.filter(a => !a.online);
    case "updates":
      return list.filter(a => (a.updates_pending ?? 0) > 0);
    case "disk":
      return list.filter(a => (a.disk_pct ?? 0) >= 85);
    default:
      return list;
  }
}
export function getRmmFleetSortValue(agent, key) {
  switch (key) {
    case "hostname":
      return (agent.hostname || agent.machine_id || "").toLowerCase();
    case "client_name":
      return (agent.client_name || "").toLowerCase();
    case "os":
      return (getRmmAgentOsDisplay(agent).label || "").toLowerCase();
    case "ip":
      return (agent.ip || "").toLowerCase();
    case "last_seen_at":
      {
        if (!agent.last_seen_at) return 0;
        const time = new Date(agent.last_seen_at).getTime();
        return Number.isFinite(time) ? time : 0;
      }
    default:
      return "";
  }
}
export function sortRmmFleetRows(agents = [], sortBy = "last_seen_at", sortDirection = "desc") {
  const direction = sortDirection === "asc" ? 1 : -1;
  return [...(Array.isArray(agents) ? agents : [])].sort((a, b) => {
    const va = getRmmFleetSortValue(a, sortBy);
    const vb = getRmmFleetSortValue(b, sortBy);
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * direction;
    return String(va).localeCompare(String(vb), "fr", {
      numeric: true
    }) * direction;
  });
}
