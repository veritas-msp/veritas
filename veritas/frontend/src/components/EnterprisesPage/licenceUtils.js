export const LICENCE_STATUS_ORDER = {
  expired: 0,
  warning: 1,
  neutral: 2,
  active: 3
};
const DEFAULT_STATUS_LABELS = {
  neutral: "No date",
  invalidDate: "Invalid date",
  expired: "Expired",
  warning: "Expiring soon",
  active: "Valid"
};
export function formatLicenseDate(value, locale = "en-GB") {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(locale);
  } catch {
    return "-";
  }
}
export function getLicenseStatus(item, statusLabels = DEFAULT_STATUS_LABELS) {
  const labels = {
    ...DEFAULT_STATUS_LABELS,
    ...statusLabels
  };
  if (!item?.expiration) {
    return {
      key: "neutral",
      text: labels.neutral,
      icon: "mdi:calendar-blank-outline"
    };
  }
  const expiry = new Date(item.expiration);
  if (Number.isNaN(expiry.getTime())) {
    return {
      key: "neutral",
      text: labels.invalidDate,
      icon: "mdi:help-circle-outline"
    };
  }
  const now = new Date();
  if (expiry < now) {
    return {
      key: "expired",
      text: labels.expired,
      icon: "mdi:close-circle-outline"
    };
  }
  const warnDate = new Date(now);
  warnDate.setDate(warnDate.getDate() + 30);
  if (expiry <= warnDate) {
    return {
      key: "warning",
      text: labels.warning,
      icon: "mdi:clock-alert-outline"
    };
  }
  return {
    key: "active",
    text: labels.active,
    icon: "mdi:check-circle-outline"
  };
}
export function computeLicenseStats(licences) {
  const stats = {
    total: licences.length,
    active: 0,
    warning: 0,
    expired: 0,
    neutral: 0
  };
  for (const item of licences) {
    const status = getLicenseStatus(item);
    if (status.key === "active") stats.active += 1;else if (status.key === "warning") stats.warning += 1;else if (status.key === "expired") stats.expired += 1;else stats.neutral += 1;
  }
  return stats;
}
export function sortLicenses(items) {
  return [...items].sort((a, b) => {
    const sa = getLicenseStatus(a);
    const sb = getLicenseStatus(b);
    const orderDiff = (LICENCE_STATUS_ORDER[sa.key] ?? 9) - (LICENCE_STATUS_ORDER[sb.key] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    const daysA = a.daysRemaining ?? 9999;
    const daysB = b.daysRemaining ?? 9999;
    return daysA - daysB;
  });
}
export function filterLicenses(items, statusFilter) {
  if (!statusFilter || statusFilter === "all") return items;
  return items.filter(item => getLicenseStatus(item).key === statusFilter);
}
