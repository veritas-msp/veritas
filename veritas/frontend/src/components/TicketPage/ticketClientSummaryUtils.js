export function formatContractDate(dateString) {
  if (!dateString) return "-";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(dateString));
  } catch {
    return String(dateString);
  }
}
export function formatContractDateShort(dateString) {
  if (!dateString) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date(dateString));
  } catch {
    return null;
  }
}
export function capitalizeFirstChar(text) {
  if (!text) return text;
  const value = String(text);
  return value.charAt(0).toUpperCase() + value.slice(1);
}
export function getContractFactLabel(validity, {
  startDate,
  expirationDate
} = {}) {
  const expiration = formatContractDateShort(expirationDate);
  const start = formatContractDateShort(startDate);
  const status = validity?.status || "unknown";
  if (status === "expired") {
    return expiration ? capitalizeFirstChar(`expired on ${expiration}`) : capitalizeFirstChar("expired");
  }
  if (status === "pending") {
    return start ? capitalizeFirstChar(`starts on ${start}`) : capitalizeFirstChar("not started yet");
  }
  if (status === "expiring" || status === "active") {
    return expiration ? capitalizeFirstChar(`valid until ${expiration}`) : capitalizeFirstChar("active");
  }
  return capitalizeFirstChar("no contract");
}
export function getContractValidityAlert(validity, contractFactLabel = "") {
  const status = validity?.status;
  if (status !== "expired" && status !== "expiring") return null;
  const days = Number(validity?.daysUntilExpiration);
  if (status === "expired") {
    const daysAgo = Number.isFinite(days) ? Math.abs(days) : null;
    return {
      status: "expired",
      title: "Contract expired",
      detail: daysAgo != null && daysAgo > 0 ? `Expired ${daysAgo} day${daysAgo > 1 ? "s" : ""} ago` : contractFactLabel || "The client contract is no longer active",
      shortLabel: "Expired",
      icon: "mdi:alert-circle-outline"
    };
  }
  const daysLeft = Number.isFinite(days) ? days : null;
  return {
    status: "expiring",
    title: "Contract expiring soon",
    detail: daysLeft != null ? daysLeft <= 0 ? "Expires today" : `Expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}` : contractFactLabel || "Renewal required",
    shortLabel: "Expiring soon",
    icon: "mdi:clock-alert-outline"
  };
}
export function computeSupportCreditTotals(balance, packs = []) {
  const remaining = Number(balance ?? 0);
  const packList = Array.isArray(packs) ? packs : [];
  const totalFromPacks = packList.reduce((sum, pack) => sum + Number(pack?.initial_amount ?? 0), 0);
  const total = totalFromPacks > 0 ? totalFromPacks : remaining;
  return {
    remaining,
    total
  };
}
export function getUsableSupportCreditPacks(packs = []) {
  return (Array.isArray(packs) ? packs : []).filter(pack => String(pack?.status || "") === "active" && Number(pack?.remaining_amount ?? 0) > 0);
}
export function buildDefaultResolveCreditAmounts(packs = [], {
  defaultAmount = 1,
  legacyBalance = 0
} = {}) {
  const amounts = {};
  const usablePacks = getUsableSupportCreditPacks(packs);
  usablePacks.forEach(pack => {
    amounts[pack.id] = defaultAmount;
  });
  if (usablePacks.length === 0 && Number(legacyBalance || 0) > 0) {
    amounts.__legacy = defaultAmount;
  }
  return amounts;
}
export function buildSupportCreditDebitsPayload(creditAmountsByPackId = {}, packs = []) {
  const usablePacks = getUsableSupportCreditPacks(packs);
  if (usablePacks.length > 0) {
    return usablePacks.map(pack => ({
      packId: pack.id,
      amount: Math.max(0, Math.floor(Number(creditAmountsByPackId[pack.id]) || 0))
    })).filter(row => row.amount > 0);
  }
  const legacyAmount = Math.max(0, Math.floor(Number(creditAmountsByPackId.__legacy) || 0));
  return legacyAmount > 0 ? [{
    packId: null,
    amount: legacyAmount
  }] : [];
}
export function getTotalResolveCreditDebit(creditAmountsByPackId = {}, packs = []) {
  return buildSupportCreditDebitsPayload(creditAmountsByPackId, packs).reduce((sum, row) => sum + row.amount, 0);
}
function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}
export function getContractValidity(contrat = {}) {
  const start = parseDateOnly(contrat.debut);
  const end = parseDateOnly(contrat.expiration);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!start && !end) {
    return {
      status: "unknown",
      label: "Not specified",
      daysUntilExpiration: null
    };
  }
  if (end && today > end) {
    const days = Math.ceil((today - end) / (1000 * 60 * 60 * 24));
    return {
      status: "expired",
      label: "Expired",
      daysUntilExpiration: -days
    };
  }
  if (start && today < start) {
    const days = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    return {
      status: "pending",
      label: "Not started yet",
      daysUntilExpiration: null,
      daysUntilStart: days
    };
  }
  if (end) {
    const daysUntilExpiration = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiration <= 30) {
      return {
        status: "expiring",
        label: daysUntilExpiration <= 0 ? "Expires today" : `Expires in ${daysUntilExpiration} days`,
        daysUntilExpiration
      };
    }
    return {
      status: "active",
      label: "Active",
      daysUntilExpiration
    };
  }
  return {
    status: "active",
    label: "Active",
    daysUntilExpiration: null
  };
}
export function buildClientContractSummary(client) {
  if (!client) return null;
  let contrat = client.contrat || {};
  if (typeof contrat === "string") {
    try {
      contrat = JSON.parse(contrat);
    } catch {
      contrat = {};
    }
  }
  let options = client.options || {};
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      options = {};
    }
  }
  const validity = getContractValidity(contrat);
  const activeOptionKeys = Object.entries(options).filter(([, enabled]) => Boolean(enabled)).map(([key]) => key);
  return {
    contrat,
    validity,
    startDate: contrat.debut || "",
    expirationDate: contrat.expiration || "",
    activeOptionKeys,
    clientNumber: client.client_number || null
  };
}
