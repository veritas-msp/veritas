export const DASHBOARD_SCOPE_TYPES = ["all", "agent", "client", "contact"];
export const DEFAULT_SCOPE_FILTER = {
  type: "all",
  agentId: null,
  clientId: null,
  contactId: null
};
export function parseScopeFilter(value) {
  const type = DASHBOARD_SCOPE_TYPES.includes(value?.type) ? value.type : "all";
  if (type === "all") return {
    ...DEFAULT_SCOPE_FILTER
  };
  return {
    type,
    agentId: type === "agent" ? String(value?.agentId || "").trim() || null : null,
    clientId: type === "client" ? String(value?.clientId || "").trim() || null : null,
    contactId: type === "contact" ? String(value?.contactId || "").trim() || null : null
  };
}
export function isScopeFilterReady(value) {
  const parsed = parseScopeFilter(value);
  if (parsed.type === "all") return true;
  if (parsed.type === "agent") return Boolean(parsed.agentId);
  if (parsed.type === "client") return Boolean(parsed.clientId);
  if (parsed.type === "contact") return Boolean(parsed.contactId);
  return false;
}
export function normalizeScopeFilter(value) {
  const parsed = parseScopeFilter(value);
  if (parsed.type === "all") return {
    ...DEFAULT_SCOPE_FILTER
  };
  if (parsed.type === "agent" && parsed.agentId) {
    return {
      type: "agent",
      agentId: parsed.agentId,
      clientId: null,
      contactId: null
    };
  }
  if (parsed.type === "client" && parsed.clientId) {
    return {
      type: "client",
      agentId: null,
      clientId: parsed.clientId,
      contactId: null
    };
  }
  if (parsed.type === "contact" && parsed.contactId) {
    return {
      type: "contact",
      agentId: null,
      clientId: null,
      contactId: parsed.contactId
    };
  }
  return {
    ...DEFAULT_SCOPE_FILTER
  };
}
export function buildScopeQueryParams(scopeFilter) {
  const params = new URLSearchParams();
  const normalized = normalizeScopeFilter(scopeFilter);
  if (normalized.type === "agent" && normalized.agentId) {
    params.set("agentId", normalized.agentId);
  }
  if (normalized.type === "client" && normalized.clientId) {
    params.set("clientId", normalized.clientId);
  }
  if (normalized.type === "contact" && normalized.contactId) {
    params.set("contactId", normalized.contactId);
  }
  return params;
}
export function getScopeFilterKey(scopeFilter) {
  return JSON.stringify(normalizeScopeFilter(scopeFilter));
}
export function isScopeFilterActive(scopeFilter) {
  return normalizeScopeFilter(scopeFilter).type !== "all";
}
