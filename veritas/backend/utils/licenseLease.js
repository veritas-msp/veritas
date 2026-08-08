import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEASE_FILE_PATH = path.join(__dirname, "..", "uploads", ".license-lease");
const LEASE_VERSION = 1;
const LICENSE_KEY_RE = /^VRT-PRO-(?:[A-F0-9]{4}-){3}[A-F0-9]{4}$/;

function normalizeLicenseKey(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function isValidLicenseKeyFormat(key) {
  return LICENSE_KEY_RE.test(normalizeLicenseKey(key));
}

function getLeaseSecret() {
  const candidates = [
    process.env.VERITAS_LICENSE_LEASE_SECRET,
    process.env.BILLING_LICENSE_LEASE_SECRET,
    process.env.VERITAS_BILLING_LICENSE_SECRET,
  ];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim().replace(/^["']|["']$/g, "");
    if (trimmed) return trimmed;
  }
  return "";
}

export function getLeaseSecretDiagnostics() {
  const keys = [
    "VERITAS_LICENSE_LEASE_SECRET",
    "BILLING_LICENSE_LEASE_SECRET",
    "VERITAS_BILLING_LICENSE_SECRET",
  ];
  const present = {};
  const lengths = {};
  for (const key of keys) {
    const raw = process.env[key];
    const trimmed =
      typeof raw === "string" ? raw.trim().replace(/^["']|["']$/g, "") : "";
    present[key] = trimmed.length > 0;
    lengths[key] = trimmed.length;
  }
  return {
    configured: Boolean(getLeaseSecret()),
    present,
    lengths,
  };
}

function fromB64url(input) {
  const padded = String(input).replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64").toString("utf8");
}

function signPayload(payloadB64) {
  const secret = getLeaseSecret();
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function isLeaseVerifyConfigured() {
  return Boolean(getLeaseSecret());
}

/**
 * Verify a signed lease token. Returns payload or null.
 * @param {string} token
 * @param {{ expectedKey?: string }} [options]
 */
export function verifyLicenseLease(token, { expectedKey } = {}) {
  if (!token || typeof token !== "string") return null;
  const secretOk = getLeaseSecret();
  if (!secretOk) return null;

  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expectedSig = signPayload(payloadB64);
  if (!expectedSig || expectedSig !== sig) return null;

  let payload;
  try {
    payload = JSON.parse(fromB64url(payloadB64));
  } catch {
    return null;
  }

  if (!payload || payload.v !== LEASE_VERSION) return null;
  if (payload.iss !== "veritas-billing") return null;
  if (!isValidLicenseKeyFormat(payload.licenseKey)) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.exp) || payload.exp <= nowSec) return null;
  if (!Number.isFinite(payload.iat) || payload.iat > nowSec + 300) return null;

  const key = normalizeLicenseKey(payload.licenseKey);
  if (expectedKey) {
    const want = normalizeLicenseKey(expectedKey);
    if (want && want !== key) return null;
  }

  return {
    ...payload,
    licenseKey: key,
  };
}

export function extractLeaseTokenFromDocument(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (trimmed.includes(".") && !trimmed.startsWith("{")) return trimmed;
    try {
      return extractLeaseTokenFromDocument(JSON.parse(trimmed));
    } catch {
      return "";
    }
  }
  if (typeof raw === "object") {
    if (typeof raw.lease === "string") return raw.lease.trim();
    if (typeof raw.token === "string") return raw.token.trim();
    if (raw.document) return extractLeaseTokenFromDocument(raw.document);
  }
  return "";
}

export function readStoredLeaseToken() {
  try {
    if (!fs.existsSync(LEASE_FILE_PATH)) return null;
    const raw = JSON.parse(fs.readFileSync(LEASE_FILE_PATH, "utf8"));
    return typeof raw?.token === "string" ? raw.token : null;
  } catch {
    return null;
  }
}

export function storeLicenseLease(token) {
  if (!token || typeof token !== "string") return false;
  const payload = verifyLicenseLease(token);
  if (!payload) return false;
  fs.mkdirSync(path.dirname(LEASE_FILE_PATH), { recursive: true });
  fs.writeFileSync(
    LEASE_FILE_PATH,
    JSON.stringify(
      {
        token,
        licenseKey: payload.licenseKey,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        savedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );
  return true;
}

export function clearStoredLicenseLease() {
  try {
    if (fs.existsSync(LEASE_FILE_PATH)) fs.unlinkSync(LEASE_FILE_PATH);
  } catch {
    /* ignore */
  }
}

/**
 * Apply stored (or provided) lease for offline Pro access.
 * @returns {null | { payload, expiresAt }}
 */
export function resolveOfflineLease({ expectedKey, token } = {}) {
  const candidate = token || readStoredLeaseToken();
  if (!candidate) return null;
  const payload = verifyLicenseLease(candidate, { expectedKey });
  if (!payload) return null;
  return {
    payload,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}
