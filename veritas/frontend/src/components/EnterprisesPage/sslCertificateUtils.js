export const SSL_STATUS_ORDER = {
  error: 0,
  expired: 1,
  warning: 2,
  unknown: 3,
  active: 4
};
export function formatSslDate(value, locale = "en-GB") {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(locale);
  } catch {
    return "-";
  }
}
export function formatSslDateTime(value, locale = "en-GB") {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "-";
  }
}
const DEFAULT_SSL_STATUS_LABELS = {
  error: "Error",
  unknown: "Not checked",
  unknownInvalid: "Unknown",
  expired: "Expired",
  warning: "Expiring soon",
  active: "Valid"
};
export function getSslCertStatus(cert, statusLabels = DEFAULT_SSL_STATUS_LABELS) {
  if (cert?.error) {
    return {
      key: "error",
      text: statusLabels.error,
      icon: "mdi:alert-circle-outline"
    };
  }
  if (!cert?.expiration) {
    return {
      key: "unknown",
      text: statusLabels.unknown,
      icon: "mdi:help-circle-outline"
    };
  }
  const expiry = new Date(cert.expiration);
  if (Number.isNaN(expiry.getTime())) {
    return {
      key: "unknown",
      text: statusLabels.unknownInvalid,
      icon: "mdi:help-circle-outline"
    };
  }
  const now = new Date();
  if (expiry < now) {
    return {
      key: "expired",
      text: statusLabels.expired,
      icon: "mdi:close-circle-outline"
    };
  }
  const warnDate = new Date(now);
  warnDate.setDate(warnDate.getDate() + 30);
  if (expiry <= warnDate) {
    return {
      key: "warning",
      text: statusLabels.warning,
      icon: "mdi:clock-alert-outline"
    };
  }
  return {
    key: "active",
    text: statusLabels.active,
    icon: "mdi:check-circle-outline"
  };
}
export function computeSslStats(certificates) {
  const stats = {
    total: certificates.length,
    active: 0,
    warning: 0,
    problem: 0,
    unknown: 0
  };
  for (const cert of certificates) {
    const status = getSslCertStatus(cert);
    if (status.key === "active") stats.active += 1;else if (status.key === "warning") stats.warning += 1;else if (status.key === "error" || status.key === "expired") stats.problem += 1;else stats.unknown += 1;
  }
  return stats;
}
export function sortSslCertificates(certificates) {
  return [...certificates].sort((a, b) => {
    const sa = getSslCertStatus(a);
    const sb = getSslCertStatus(b);
    const orderDiff = (SSL_STATUS_ORDER[sa.key] ?? 9) - (SSL_STATUS_ORDER[sb.key] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    const daysA = a.daysRemaining ?? 9999;
    const daysB = b.daysRemaining ?? 9999;
    return daysA - daysB;
  });
}
export function filterSslCertificates(certificates, statusFilter) {
  if (!statusFilter || statusFilter === "all") return certificates;
  return certificates.filter(cert => getSslCertStatus(cert).key === statusFilter);
}
export function getSslHostLabel(cert) {
  const hostname = cert?.hostname || "-";
  const port = cert?.port;
  return `${hostname}${port && port !== 443 ? `:${port}` : ""}`;
}
export function getSslExpiryBarWidth(daysRemaining) {
  if (daysRemaining == null) return 0;
  if (daysRemaining < 0) return 100;
  return Math.min(100, Math.max(4, Math.round(daysRemaining / 365 * 100)));
}
export function formatSslIntervalHours(hours) {
  const value = Number(hours) || 24;
  if (value >= 24 && value % 24 === 0) {
    const days = value / 24;
    return `${days} day${days > 1 ? "s" : ""}`;
  }
  return `${value} h`;
}
export function formatSslSanList(value) {
  if (!value) return "-";
  const parts = String(value).split(/,\s*/).map(part => part.replace(/^DNS:/i, "").trim()).filter(Boolean);
  if (parts.length === 0) return "-";
  if (parts.length <= 3) return parts.join(", ");
  return `${parts.slice(0, 3).join(", ")} (+${parts.length - 3})`;
}
