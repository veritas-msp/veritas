export function buildMicrosoftTenantFleetStats(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const clientIds = new Set();
  list.forEach(row => {
    if (row.clientId != null) clientIds.add(row.clientId);
  });
  const active = list.filter(row => row.status === "actif").length;
  const inactive = list.length - active;
  const issues = list.filter(row => {
    if (row.status === "inactif") return true;
    if (row.mfaAdminPct != null && row.mfaAdminPct < 80) return true;
    if (row.secureScoreCurrent != null && row.secureScoreMax > 0) {
      const pct = Math.round(row.secureScoreCurrent / row.secureScoreMax * 100);
      if (pct < 60) return true;
    }
    return false;
  }).length;
  const healthScore = list.length === 0 ? null : Math.max(0, Math.min(100, Math.round((list.length - issues) / list.length * 100)));
  return {
    total: list.length,
    clients: clientIds.size,
    active,
    inactive,
    issues,
    healthScore
  };
}
