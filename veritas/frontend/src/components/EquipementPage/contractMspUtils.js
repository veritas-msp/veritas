const STATUS_RANK = {
  expired: 0,
  suspended: 1,
  expiring: 2
};
export function buildContractFleetRows(alerts = [], licenseAlerts = [], options = {}) {
  const {
    licenseModuleSections = [],
    contractType = {}
  } = options;
  const rows = [];
  for (const alert of Array.isArray(alerts) ? alerts : []) {
    rows.push({
      id: `contract-${alert.id}`,
      clientId: alert.id,
      clientName: alert.name,
      name: alert.name,
      subtitle: contractType.msp || "Contrat MSP",
      type: contractType.enterprise || "Company contract",
      typeKey: "contract",
      categoryId: "contract",
      categoryLabel: contractType.enterprise || "Company contract",
      status: alert.status,
      expiration: alert.expiration,
      module: null
    });
  }
  for (const alert of Array.isArray(licenseAlerts) ? licenseAlerts : []) {
    const typeLabel = alert.moduleLabel || licenseModuleSections.find(section => section.module === alert.module)?.label || alert.module || contractType.license || "License";
    const detail = alert.label || typeLabel;
    rows.push({
      id: alert.id,
      clientId: alert.clientId,
      clientName: alert.clientName,
      name: alert.clientName || alert.label || typeLabel,
      subtitle: detail,
      type: typeLabel,
      typeKey: alert.module || "license",
      categoryId: alert.module || "license",
      categoryLabel: typeLabel,
      status: alert.status,
      expiration: alert.expiration,
      module: alert.module
    });
  }
  return rows;
}
export function buildContractFleetStats(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const clientIds = new Set();
  const categories = new Set();
  const statusCounts = {
    expired: 0,
    expiring: 0,
    suspended: 0
  };
  list.forEach(row => {
    if (row.clientId != null) clientIds.add(row.clientId);
    if (row.categoryId) categories.add(row.categoryId);
    if (statusCounts[row.status] != null) statusCounts[row.status] += 1;
  });
  const issues = list.length;
  const healthScore = list.length === 0 ? 100 : Math.max(0, Math.round(100 - (statusCounts.expired * 3 + statusCounts.suspended * 2 + statusCounts.expiring) / Math.max(list.length * 3, 1) * 100));
  return {
    total: list.length,
    clients: clientIds.size,
    categories: categories.size,
    issues,
    healthScore,
    statusCounts
  };
}
export function filterContractFleetRows(rows = [], {
  search = "",
  statusFilter = "all",
  categoryFilter = "all"
} = {}) {
  const query = String(search || "").trim().toLowerCase();
  return (Array.isArray(rows) ? rows : []).filter(row => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (categoryFilter !== "all" && row.categoryId !== categoryFilter) return false;
    if (!query) return true;
    const haystack = [row.name, row.clientName, row.subtitle, row.type, row.categoryLabel].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}
export function sortContractFleetRows(rows = [], sortBy = "expiration", sortDirection = "asc") {
  const direction = sortDirection === "asc" ? 1 : -1;
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    let va;
    let vb;
    switch (sortBy) {
      case "name":
        va = (a.name || "").toLowerCase();
        vb = (b.name || "").toLowerCase();
        break;
      case "type":
        va = (a.type || "").toLowerCase();
        vb = (b.type || "").toLowerCase();
        break;
      case "status":
        va = STATUS_RANK[a.status] ?? 3;
        vb = STATUS_RANK[b.status] ?? 3;
        break;
      case "expiration":
      default:
        {
          const ta = a.expiration ? new Date(a.expiration).getTime() : Number.POSITIVE_INFINITY;
          const tb = b.expiration ? new Date(b.expiration).getTime() : Number.POSITIVE_INFINITY;
          va = Number.isFinite(ta) ? ta : Number.POSITIVE_INFINITY;
          vb = Number.isFinite(tb) ? tb : Number.POSITIVE_INFINITY;
          break;
        }
    }
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * direction;
    return String(va).localeCompare(String(vb), "fr", {
      numeric: true
    }) * direction;
  });
}
export function groupContractFleetByCategory(rows = []) {
  const groups = new Map();
  (Array.isArray(rows) ? rows : []).forEach(row => {
    const key = row.categoryId || "other";
    if (!groups.has(key)) {
      groups.set(key, {
        categoryId: key,
        categoryLabel: row.categoryLabel || row.type || key,
        list: []
      });
    }
    groups.get(key).list.push(row);
  });
  return Array.from(groups.values()).sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel, "fr"));
}
