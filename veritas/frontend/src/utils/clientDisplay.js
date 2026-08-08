export function extractClientNumberFromName(name) {
  const cleaned = (name || "").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/[\s-]+/).filter(Boolean);
  if (parts.length > 1 && /^\d+$/.test(parts[0])) {
    return parts[0];
  }
  return "";
}
export function getClientNumber(client) {
  if (!client) return "";
  const direct = client.client_number ?? client.clientNumber;
  if (direct != null && String(direct).trim()) {
    return String(direct).trim();
  }
  return extractClientNumberFromName(client.name);
}
export function getClientNameWithoutCode(nameOrClient) {
  if (nameOrClient && typeof nameOrClient === "object") {
    const name = nameOrClient.name || "";
    const number = getClientNumber(nameOrClient);
    const cleaned = String(name).trim();
    if (!cleaned) return "";
    if (number) {
      const withoutAssignedNumber = cleaned.replace(new RegExp(`^${number.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-–\u2014]?\\s*`, "i"), "").trim();
      if (withoutAssignedNumber) return withoutAssignedNumber;
    }
    const parts = cleaned.split(/[\s-]+/).filter(Boolean);
    if (parts.length > 1 && /^\d+$/.test(parts[0])) {
      return parts.slice(1).join(" ").trim();
    }
    return cleaned;
  }
  const cleaned = (nameOrClient || "").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/[\s-]+/).filter(Boolean);
  if (parts.length > 1 && /^\d+$/.test(parts[0])) {
    return parts.slice(1).join(" ").trim();
  }
  return cleaned;
}
export function getClientInitials(nameOrClient) {
  const displayName = getClientNameWithoutCode(nameOrClient);
  if (!displayName) return "-";
  const letters = displayName.replace(/[^a-zA-ZÀ-ÿ]/gi, "");
  if (letters.length >= 3) {
    return letters.slice(0, 3).toUpperCase();
  }
  const compact = displayName.replace(/[\s-]+/g, "");
  return compact.slice(0, 3).toUpperCase() || "-";
}
export function formatClientTabLabel(client) {
  const number = getClientNumber(client);
  const name = getClientNameWithoutCode(client);
  if (number && name) return `${number} · ${name}`;
  return name || client?.name || `Client #${client?.id || "?"}`;
}
