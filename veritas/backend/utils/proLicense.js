import fetch from "node-fetch";
import { VERITAS_BILLING_API_URL, VERITAS_BILLING_LICENSE_SECRET } from "../constants/billing.js";
import {
  clearStoredLicenseLease,
  extractLeaseTokenFromDocument,
  isLeaseVerifyConfigured,
  resolveOfflineLease,
  storeLicenseLease,
} from "./licenseLease.js";

const LICENSE_KEY_RE = /^VRT-PRO-(?:[A-F0-9]{4}-){3}[A-F0-9]{4}$/;
const DEFAULT_CACHE_MS = 5000;
let cache = {
  valid: false,
  status: null,
  agentCount: null,
  billingInterval: null,
  checkedAt: null,
  checkedAtMs: 0,
  lastError: null,
  billingConfigured: false,
  customerEmail: null,
  licenseRevision: null,
  leaseExpiresAt: null,
  offlineLease: false,
};
let refreshInFlight = null;

export function normalizeLicenseKey(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidLicenseKeyFormat(key) {
  return LICENSE_KEY_RE.test(normalizeLicenseKey(key));
}

export function getLicenseCacheMaxAgeMs() {
  const raw = Number.parseInt(process.env.LICENSE_CACHE_MS || "", 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_CACHE_MS;
}

export function isDevProBypass() {
  return (
    process.env.NODE_ENV !== "production" &&
    String(process.env.VERITAS_EDITION || "").trim().toLowerCase() === "pro" &&
    !normalizeLicenseKey(process.env.VERITAS_LICENSE_KEY || "")
  );
}

export function isLicenseCacheValid() {
  if (isDevProBypass()) return true;
  return cache.valid === true;
}

export function getLicensedMspAgentLimit() {
  if (isDevProBypass()) return null;
  if (!isLicenseCacheValid()) return null;
  if (cache.agentCount == null) return null;
  return cache.agentCount;
}

function getBillingConfig() {
  return {
    billingUrl: VERITAS_BILLING_API_URL,
    secret: VERITAS_BILLING_LICENSE_SECRET,
    configured: true,
  };
}

function formatBillingFetchError(error, billingUrl) {
  const cause = error?.cause?.code || error?.code || "";
  if (cause === "ECONNREFUSED" || cause === "ENOTFOUND") {
    return `License validation service unreachable (${billingUrl}). Check network connectivity.`;
  }
  if (String(error?.message || "").includes("fetch failed")) {
    return `Unable to reach the license validation service (${billingUrl}).`;
  }
  return error?.message || "Network error while contacting the license validation service.";
}

function emptyCacheFields() {
  return {
    agentCount: null,
    billingInterval: null,
    customerEmail: null,
    licenseRevision: null,
    leaseExpiresAt: null,
    offlineLease: false,
  };
}

function applyOfflineLeaseToCache(networkErrorMessage) {
  const key = normalizeLicenseKey(process.env.VERITAS_LICENSE_KEY || "");
  if (!key || !isLeaseVerifyConfigured()) {
    return null;
  }
  const offline = resolveOfflineLease({ expectedKey: key });
  if (!offline) return null;
  cache = {
    ...cache,
    valid: true,
    status: "offline_lease",
    agentCount: offline.payload.agentCount ?? null,
    billingInterval: offline.payload.billingInterval ?? null,
    checkedAt: new Date().toISOString(),
    checkedAtMs: Date.now(),
    lastError: networkErrorMessage || null,
    customerEmail: offline.payload.customerEmail ?? null,
    licenseRevision: null,
    leaseExpiresAt: offline.expiresAt,
    offlineLease: true,
  };
  return cache;
}

export async function refreshProLicenseState() {
  cache.billingConfigured = getBillingConfig().configured;
  if (isDevProBypass()) {
    cache = {
      ...cache,
      valid: true,
      status: "dev_bypass",
      ...emptyCacheFields(),
      checkedAt: new Date().toISOString(),
      checkedAtMs: Date.now(),
      lastError: null,
    };
    return cache;
  }
  const key = normalizeLicenseKey(process.env.VERITAS_LICENSE_KEY || "");
  if (!key) {
    cache = {
      ...cache,
      valid: false,
      status: "missing",
      ...emptyCacheFields(),
      checkedAt: new Date().toISOString(),
      checkedAtMs: Date.now(),
      lastError: null,
    };
    return cache;
  }
  const { billingUrl, secret } = getBillingConfig();
  try {
    const res = await fetch(`${billingUrl}/api/license/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Veritas-License-Secret": secret,
      },
      body: JSON.stringify({
        licenseKey: key,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const offline = applyOfflineLeaseToCache(
        data.message || `Billing HTTP error ${res.status}`
      );
      if (offline) return offline;
      cache = {
        ...cache,
        valid: false,
        status: data.error || data.code || "error",
        ...emptyCacheFields(),
        checkedAt: new Date().toISOString(),
        checkedAtMs: Date.now(),
        lastError: data.message || `Billing HTTP error ${res.status}`,
      };
      return cache;
    }

    const valid = Boolean(data.valid);
    if (valid && data.lease) {
      storeLicenseLease(data.lease);
    } else if (!valid) {
      // Online authority: revoke/suspend clears offline grace
      clearStoredLicenseLease();
    }

    const stored = valid ? resolveOfflineLease({ expectedKey: key }) : null;

    cache = {
      ...cache,
      valid,
      status: data.status || (valid ? "active" : "invalid"),
      agentCount: data.agentCount ?? null,
      billingInterval: data.billingInterval ?? null,
      checkedAt: new Date().toISOString(),
      checkedAtMs: Date.now(),
      lastError: valid ? null : data.message || "Invalid license or inactive subscription.",
      customerEmail: data.customerEmail ?? null,
      licenseRevision: data.licenseRevision || data.updatedAt || null,
      leaseExpiresAt: stored?.expiresAt || data.expiresAt || null,
      offlineLease: false,
    };
    return cache;
  } catch (error) {
    const message = formatBillingFetchError(error, billingUrl);
    const offline = applyOfflineLeaseToCache(message);
    if (offline) return offline;
    cache = {
      ...cache,
      valid: false,
      status: "network_error",
      ...emptyCacheFields(),
      checkedAt: new Date().toISOString(),
      checkedAtMs: Date.now(),
      lastError: message,
    };
    return cache;
  }
}

export async function ensureFreshLicense() {
  if (isDevProBypass()) return cache;
  const maxAge = getLicenseCacheMaxAgeMs();
  if (maxAge === 0 || Date.now() - (cache.checkedAtMs || 0) >= maxAge) {
    if (!refreshInFlight) {
      refreshInFlight = refreshProLicenseState().finally(() => {
        refreshInFlight = null;
      });
    }
    await refreshInFlight;
  }
  return cache;
}

export function invalidateLicenseCache() {
  cache.checkedAtMs = 0;
}

export function getLicenseKeyHint() {
  const key = normalizeLicenseKey(process.env.VERITAS_LICENSE_KEY || "");
  if (!key) return null;
  const parts = key.split("-");
  const tail = parts.slice(-2).join("-");
  return `••••-${tail}`;
}

function buildLicenseDetail({ includePrivate = false } = {}) {
  const detail = {
    valid: cache.valid || isDevProBypass(),
    status: isDevProBypass() ? "dev_bypass" : cache.status,
    agentCount: cache.agentCount,
    billingInterval: cache.billingInterval,
    checkedAt: cache.checkedAt,
    lastError: cache.lastError,
    billingConfigured: cache.billingConfigured,
    leaseExpiresAt: cache.leaseExpiresAt,
    offlineLease: Boolean(cache.offlineLease),
    devBypass: isDevProBypass(),
  };
  if (includePrivate) {
    detail.customerEmail = cache.customerEmail;
  }
  return detail;
}

export function getLicensePublicSummary() {
  return {
    edition: isLicenseCacheValid() ? "pro" : "community",
    hasLicenseKey: Boolean(normalizeLicenseKey(process.env.VERITAS_LICENSE_KEY || "")),
    keyHint: getLicenseKeyHint(),
    license: buildLicenseDetail({
      includePrivate: false,
    }),
  };
}

export function getLicenseAdminSummary() {
  return {
    edition: isLicenseCacheValid() ? "pro" : "community",
    hasLicenseKey: Boolean(normalizeLicenseKey(process.env.VERITAS_LICENSE_KEY || "")),
    keyHint: getLicenseKeyHint(),
    license: buildLicenseDetail({
      includePrivate: true,
    }),
  };
}

/**
 * Apply an offline activation file/token (air-gapped first install).
 * @param {string|object} tokenOrDocument
 */
export function applyOfflineActivation(tokenOrDocument) {
  const token = extractLeaseTokenFromDocument(tokenOrDocument);
  if (!token) {
    const err = new Error("INVALID_ACTIVATION_FILE");
    err.code = "INVALID_ACTIVATION_FILE";
    throw err;
  }
  if (!isLeaseVerifyConfigured()) {
    const err = new Error("LEASE_SECRET_MISSING");
    err.code = "LEASE_SECRET_MISSING";
    throw err;
  }
  const offline = resolveOfflineLease({ token });
  if (!offline) {
    const err = new Error("LEASE_INVALID");
    err.code = "LEASE_INVALID";
    throw err;
  }
  if (!storeLicenseLease(token)) {
    const err = new Error("LEASE_STORE_FAILED");
    err.code = "LEASE_STORE_FAILED";
    throw err;
  }
  return offline;
}
