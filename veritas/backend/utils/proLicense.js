import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";
import {
  getVeritasBillingApiUrl,
  getVeritasBillingLicenseSecret,
} from "../constants/billing.js";
import {
  clearStoredLicenseLease,
  extractLeaseTokenFromDocument,
  getLeaseSecretDiagnostics,
  getOrCreateInstanceId,
  hydrateLicenseKeyFromStoredLease,
  isLeaseVerifyConfigured,
  readLicenseSnapshot,
  resolveOfflineLease,
  storeLicenseLease,
  storeLicenseSnapshot,
  verifyLicenseLease,
} from "./licenseLease.js";
import { persistBootSecrets } from "./envFile.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Backend .env first, then the compose .env at the repo root (does not override).
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

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
  companyName: null,
  licenseRevision: null,
  leaseExpiresAt: null,
  subscriptionExpiresAt: null,
  offlineLease: false,
  billingUrl: null,
  billingErrorCode: null,
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
  const secret = getVeritasBillingLicenseSecret();
  return {
    billingUrl: getVeritasBillingApiUrl(),
    secret,
    configured: Boolean(secret),
  };
}

function getAppVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : null;
  } catch {
    return null;
  }
}

const ACTIVE_BILLING_STATUSES = new Set(["active", "trialing", "past_due"]);

function normalizeBillingPayload(data) {
  const body = data && typeof data === "object" ? data : {};
  const license = body.license && typeof body.license === "object" ? body.license : {};
  const status = body.status || license.status || null;
  const explicitValid = body.valid ?? body.ok ?? license.valid;
  const valid =
    explicitValid == null
      ? ACTIVE_BILLING_STATUSES.has(String(status || "").toLowerCase())
      : Boolean(explicitValid);
  return {
    valid,
    status,
    agentCount: body.agentCount ?? license.agentCount ?? null,
    billingInterval: body.billingInterval ?? license.billingInterval ?? null,
    customerEmail: body.customerEmail ?? license.customerEmail ?? null,
    companyName: body.companyName ?? license.companyName ?? null,
    expiresAt:
      body.subscriptionExpiresAt ||
      body.licenseExpiresAt ||
      license.expiresAt ||
      body.expiresAt ||
      null,
    lease: typeof body.lease === "string" ? body.lease : typeof license.lease === "string" ? license.lease : null,
    licenseRevision: body.licenseRevision || body.updatedAt || license.updatedAt || null,
    message: body.message || license.message || null,
    error: body.error || body.code || license.error || null,
  };
}

function billingFailureCode(res, data) {
  const code = String(data?.error || data?.code || "").toUpperCase();
  if (res?.status === 401 || code === "UNAUTHORIZED") return "UNAUTHORIZED";
  return code || (res?.status ? `HTTP_${res.status}` : "error");
}

function formatBillingFetchError(error, billingUrl) {
  const cause = error?.cause?.code || error?.code || "";
  const name = String(error?.name || "");
  if (name === "AbortError" || cause === "ABORT_ERR" || /aborted|timeout/i.test(String(error?.message || ""))) {
    return `License validation timed out (${billingUrl}). Using offline lease if available.`;
  }
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
    companyName: null,
    licenseRevision: null,
    leaseExpiresAt: null,
    subscriptionExpiresAt: null,
    offlineLease: false,
    billingErrorCode: null,
  };
}

function getBillingFetchTimeoutMs() {
  const raw = Number.parseInt(process.env.LICENSE_VALIDATE_TIMEOUT_MS || "", 10);
  if (Number.isFinite(raw) && raw >= 500) return Math.min(30000, raw);
  return 4000;
}

function isCommunityEdition() {
  return String(process.env.VERITAS_EDITION || "community").trim().toLowerCase() === "community";
}

function applyOfflineLeaseToCache(networkErrorMessage, billingErrorCode = null) {
  hydrateLicenseKeyFromStoredLease();
  let key = normalizeLicenseKey(process.env.VERITAS_LICENSE_KEY || "");
  if (!isLeaseVerifyConfigured()) {
    return null;
  }
  let offline = key ? resolveOfflineLease({ expectedKey: key }) : null;
  if (!offline) {
    offline = resolveOfflineLease();
    if (offline?.payload?.licenseKey) {
      key = normalizeLicenseKey(offline.payload.licenseKey);
      process.env.VERITAS_LICENSE_KEY = key;
      persistBootSecrets({
        VERITAS_LICENSE_KEY: key,
        VERITAS_EDITION: "pro"
      });
    }
  }
  if (!offline) return null;
  const snap = readLicenseSnapshot() || {};
  const payload = offline.payload || {};
  cache = {
    ...cache,
    valid: true,
    status: "offline_lease",
    agentCount: payload.agentCount ?? snap.agentCount ?? null,
    billingInterval: payload.billingInterval ?? snap.billingInterval ?? null,
    checkedAt: new Date().toISOString(),
    checkedAtMs: Date.now(),
    lastError: networkErrorMessage || null,
    billingErrorCode: billingErrorCode || null,
    customerEmail: payload.customerEmail ?? snap.customerEmail ?? null,
    companyName: payload.companyName ?? snap.companyName ?? null,
    licenseRevision: null,
    leaseExpiresAt: offline.expiresAt,
    subscriptionExpiresAt:
      payload.subscriptionExpiresAt ?? payload.licenseExpiresAt ?? snap.subscriptionExpiresAt ?? null,
    offlineLease: true,
    billingUrl: getBillingConfig().billingUrl,
  };
  return cache;
}

export async function refreshProLicenseState() {
  const billing = getBillingConfig();
  cache.billingConfigured = billing.configured;
  cache.billingUrl = billing.billingUrl;
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

  const hydrated = hydrateLicenseKeyFromStoredLease();
  if (hydrated?.hydrated && hydrated.key) {
    persistBootSecrets({
      VERITAS_LICENSE_KEY: hydrated.key,
      VERITAS_EDITION: process.env.VERITAS_EDITION || "pro"
    });
  }
  // Community without an explicit key must never wait on billing (would block every /api call).
  const key = normalizeLicenseKey(process.env.VERITAS_LICENSE_KEY || "");
  if (isCommunityEdition() && !key) {
    cache = {
      ...cache,
      valid: false,
      status: "community",
      ...emptyCacheFields(),
      checkedAt: new Date().toISOString(),
      checkedAtMs: Date.now(),
      lastError: null,
    };
    return cache;
  }

  if (!key) {
    // Lease file may still unlock Pro when the key only lived in ephemeral container .env
    const offlineOnly = applyOfflineLeaseToCache(null);
    if (offlineOnly) return offlineOnly;
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
  const { billingUrl, secret, configured } = billing;
  if (!configured) {
    const offline = applyOfflineLeaseToCache(
      "Billing API secret is not configured (VERITAS_BILLING_LICENSE_SECRET).",
      "BILLING_UNCONFIGURED"
    );
    if (offline) {
      cache.billingErrorCode = "BILLING_UNCONFIGURED";
      return cache;
    }
    cache = {
      ...cache,
      valid: false,
      status: "billing_unconfigured",
      ...emptyCacheFields(),
      billingErrorCode: "BILLING_UNCONFIGURED",
      billingUrl,
      checkedAt: new Date().toISOString(),
      checkedAtMs: Date.now(),
      lastError: "Billing API secret is not configured (VERITAS_BILLING_LICENSE_SECRET).",
    };
    return cache;
  }
  const timeoutMs = getBillingFetchTimeoutMs();
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(`${billingUrl}/api/license/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Veritas-License-Secret": secret,
      },
      body: JSON.stringify({
        licenseKey: key,
        instanceId: getOrCreateInstanceId(),
        hostname: os.hostname(),
        version: getAppVersion(),
      }),
      signal: controller?.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = billingFailureCode(res, data);
      const offline = applyOfflineLeaseToCache(
        data.message || `Billing HTTP error ${res.status}`,
        code
      );
      if (offline) {
        cache.billingErrorCode = code;
        return cache;
      }
      cache = {
        ...cache,
        valid: false,
        status: code === "UNAUTHORIZED" ? "billing_unauthorized" : data.error || data.code || "error",
        ...emptyCacheFields(),
        billingErrorCode: code,
        billingUrl,
        checkedAt: new Date().toISOString(),
        checkedAtMs: Date.now(),
        lastError: data.message || `Billing HTTP error ${res.status}`,
      };
      return cache;
    }

    const normalized = normalizeBillingPayload(data);
    const valid = normalized.valid;
    const presented = valid && normalized.lease
      ? verifyLicenseLease(normalized.lease, { expectedKey: key })
      : null;
    if (valid) {
      if (presented) storeLicenseLease(normalized.lease);
      storeLicenseSnapshot({
        companyName: presented?.companyName ?? normalized.companyName,
        customerEmail: presented?.customerEmail ?? normalized.customerEmail,
        agentCount: presented?.agentCount ?? normalized.agentCount,
        billingInterval: presented?.billingInterval ?? normalized.billingInterval,
        status: presented?.status || normalized.status || "active",
        subscriptionExpiresAt:
          presented?.subscriptionExpiresAt || presented?.licenseExpiresAt || normalized.expiresAt,
      });
      persistBootSecrets({
        VERITAS_LICENSE_KEY: key,
        VERITAS_EDITION: "pro"
      });
    } else {
      const code = String(normalized.error || normalized.status || "").toLowerCase();
      if (/\b(revok|suspend|cancel|expired)\b/.test(code)) {
        clearStoredLicenseLease();
      } else {
        const offline = applyOfflineLeaseToCache(
          normalized.message || "Online validation rejected the key; using stored offline lease if available.",
          String(normalized.error || normalized.status || "invalid").toUpperCase()
        );
        if (offline) return offline;
      }
    }

    const stored = valid ? resolveOfflineLease({ expectedKey: key }) : null;
    cache = {
      ...cache,
      valid,
      status: normalized.status || (valid ? "active" : "invalid"),
      agentCount: presented?.agentCount ?? normalized.agentCount ?? null,
      billingInterval: presented?.billingInterval ?? normalized.billingInterval ?? null,
      checkedAt: new Date().toISOString(),
      checkedAtMs: Date.now(),
      lastError: valid ? null : normalized.message || "Invalid license or inactive subscription.",
      billingErrorCode: valid ? null : String(normalized.error || normalized.status || "invalid").toUpperCase(),
      customerEmail: presented?.customerEmail ?? normalized.customerEmail ?? null,
      companyName: presented?.companyName ?? normalized.companyName ?? null,
      licenseRevision: normalized.licenseRevision,
      leaseExpiresAt: stored?.expiresAt || null,
      subscriptionExpiresAt: presented?.subscriptionExpiresAt || presented?.licenseExpiresAt || normalized.expiresAt,
      offlineLease: false,
      billingUrl,
    };
    return cache;
  } catch (error) {
    const message = formatBillingFetchError(error, billingUrl);
    const offline = applyOfflineLeaseToCache(message, "NETWORK");
    if (offline) {
      cache.billingErrorCode = "NETWORK";
      return cache;
    }
    cache = {
      ...cache,
      valid: false,
      status: "network_error",
      ...emptyCacheFields(),
      billingErrorCode: "NETWORK",
      billingUrl,
      checkedAt: new Date().toISOString(),
      checkedAtMs: Date.now(),
      lastError: message,
    };
    return cache;
  } finally {
    if (timer) clearTimeout(timer);
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
    subscriptionExpiresAt: cache.subscriptionExpiresAt,
    offlineLease: Boolean(cache.offlineLease),
    billingUrl: cache.billingUrl || getVeritasBillingApiUrl(),
    billingErrorCode: cache.billingErrorCode,
    devBypass: isDevProBypass(),
  };
  if (includePrivate) {
    detail.customerEmail = cache.customerEmail;
    detail.companyName = cache.companyName;
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
  const lease = getLeaseSecretDiagnostics();
  return {
    edition: isLicenseCacheValid() ? "pro" : "community",
    hasLicenseKey: Boolean(normalizeLicenseKey(process.env.VERITAS_LICENSE_KEY || "")),
    keyHint: getLicenseKeyHint(),
    leaseSecretConfigured: lease.configured,
    leaseSecretDiagnostics: lease,
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
    err.diagnostics = getLeaseSecretDiagnostics();
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
  process.env.VERITAS_LICENSE_KEY = offline.payload.licenseKey;
  process.env.VERITAS_EDITION = "pro";
  persistBootSecrets({
    VERITAS_LICENSE_KEY: offline.payload.licenseKey,
    VERITAS_EDITION: "pro"
  });
  return offline;
}
