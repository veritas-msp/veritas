export function isMicrosoftTenantIssue(row) {
  if (!row) return false;
  if (row.status === "inactif") return true;
  if (row.mfaAdminPct != null && row.mfaAdminPct < 80) return true;
  if (row.secureScoreCurrent != null && row.secureScoreMax > 0) {
    const pct = Math.round(row.secureScoreCurrent / row.secureScoreMax * 100);
    if (pct < 60) return true;
  }
  return false;
}

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function buildMicrosoftTenantFleetStats(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const clientIds = new Set();
  let licenseTotal = 0;
  let userTotal = 0;
  let scoreCurrent = 0;
  let scoreMax = 0;
  list.forEach(row => {
    if (row.clientId != null) clientIds.add(row.clientId);
    licenseTotal += toCount(row.totalLicenses);
    userTotal += toCount(row.userCount);
    const current = Number(row.secureScoreCurrent);
    const max = Number(row.secureScoreMax);
    if (Number.isFinite(current) && Number.isFinite(max) && max > 0) {
      scoreCurrent += current;
      scoreMax += max;
    }
  });
  const active = list.filter(row => row.status === "actif").length;
  const inactive = list.length - active;
  const issues = list.filter(isMicrosoftTenantIssue).length;
  const healthScore = list.length === 0 ? null : Math.max(0, Math.min(100, Math.round((list.length - issues) / list.length * 100)));
  const globalScore = scoreMax > 0 ? Math.max(0, Math.min(100, Math.round(scoreCurrent / scoreMax * 100))) : null;
  return {
    total: list.length,
    clients: clientIds.size,
    active,
    inactive,
    issues,
    healthScore,
    licenseTotal,
    userTotal,
    globalScore
  };
}

export function formatMicrosoftGlobalScore(score) {
  if (score == null || Number.isNaN(Number(score))) return "—";
  return `${Math.round(Number(score))} %`;
}

export function microsoftScoreTone(score) {
  if (score == null) return "neutral";
  if (score >= 80) return "good";
  if (score >= 50) return "warn";
  return "bad";
}
