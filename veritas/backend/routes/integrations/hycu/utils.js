import https from "https";
import fetch from "node-fetch";
import { getSettingsMap } from "../../../utils/settingsHelper.js";

const HYCU_SETTING_KEYS = [
  "HYCU_API_URL",
  "HYCU_API_KEY",
  "HYCU_USERNAME",
  "HYCU_PASSWORD",
  "HYCU_VERIFY_TLS"
];

export function normalizeHycuApiUrl(apiUrl) {
  let url = String(apiUrl || "").trim();
  while (url.endsWith("/")) url = url.slice(0, -1);
  // Strip trailing /rest/v1.0 if the operator pasted the full API base.
  url = url.replace(/\/rest\/v1\.0$/i, "");
  return url;
}

export function parseVerifyTls(value, fallback = false) {
  const raw = `${value ?? ""}`.trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "oui", "on"].includes(raw)) return true;
  if (["0", "false", "no", "non", "off"].includes(raw)) return false;
  return fallback;
}

export async function getHycuSettingsFromStore() {
  const map = await getSettingsMap(HYCU_SETTING_KEYS);
  return {
    apiUrl: normalizeHycuApiUrl(map.HYCU_API_URL),
    apiKey: String(map.HYCU_API_KEY || "").trim(),
    username: String(map.HYCU_USERNAME || "").trim(),
    password: String(map.HYCU_PASSWORD || ""),
    verifyTls: parseVerifyTls(map.HYCU_VERIFY_TLS, false)
  };
}

export function getHycuCredentialsFromRequest(req) {
  const body = req?.body || {};
  return {
    apiUrl: normalizeHycuApiUrl(body.HYCU_API_URL || body.apiUrl),
    apiKey: String(body.HYCU_API_KEY || body.apiKey || "").trim(),
    username: String(body.HYCU_USERNAME || body.username || "").trim(),
    password: String(body.HYCU_PASSWORD || body.password || ""),
    verifyTls: parseVerifyTls(body.HYCU_VERIFY_TLS ?? body.verifyTls, false)
  };
}

function createAgent(verifyTls) {
  return new https.Agent({ rejectUnauthorized: Boolean(verifyTls) });
}

async function hycuFetch(url, { method = "GET", headers = {}, body, verifyTls = false } = {}) {
  const options = {
    method,
    headers: {
      Accept: "application/json",
      ...headers
    },
    agent: url.startsWith("https:") ? createAgent(verifyTls) : undefined
  };
  if (body != null) {
    options.headers["Content-Type"] = "application/json";
    options.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return fetch(url, options);
}

/**
 * Resolve a Bearer token: prefer API key, else requestToken with Basic auth.
 * Returns { authHeader, apiUrl, verifyTls }.
 */
export async function authenticateHycu(credentials) {
  const apiUrl = normalizeHycuApiUrl(credentials?.apiUrl);
  const apiKey = String(credentials?.apiKey || "").trim();
  const username = String(credentials?.username || "").trim();
  const password = String(credentials?.password || "");
  const verifyTls = Boolean(credentials?.verifyTls);
  if (!apiUrl) {
    throw new Error("HYCU API URL is required");
  }
  if (apiKey) {
    return {
      authHeader: `Bearer ${apiKey}`,
      apiUrl,
      verifyTls,
      mode: "api_key"
    };
  }
  if (!username || !password) {
    throw new Error("HYCU API key or username/password required");
  }
  const basic = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
  const tokenUrl = `${apiUrl}/rest/v1.0/requestToken`;
  const response = await hycuFetch(tokenUrl, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
    verifyTls
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || payload?.error || `HYCU auth failed (${response.status})`;
    throw new Error(message);
  }
  const token = payload?.token || payload?.accessToken || payload?.access_token;
  if (!token) {
    throw new Error("HYCU requestToken returned no token");
  }
  // Some HYCU builds expect the token base64-encoded in Bearer.
  const bearer = String(token).includes(".") ? String(token) : Buffer.from(String(token), "utf8").toString("base64");
  return {
    authHeader: `Bearer ${bearer}`,
    apiUrl,
    verifyTls,
    mode: "request_token",
    rawToken: String(token)
  };
}

export async function hycuApiGet(auth, path) {
  const url = `${auth.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await hycuFetch(url, {
    method: "GET",
    headers: { Authorization: auth.authHeader },
    verifyTls: auth.verifyTls
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.message?.titleDescriptionEn ||
      payload?.message ||
      payload?.error ||
      `HYCU GET ${path} failed (${response.status})`;
    const err = new Error(typeof message === "string" ? message : JSON.stringify(message));
    err.status = response.status;
    throw err;
  }
  return payload;
}

function firstString(...values) {
  for (const value of values) {
    if (value == null || value === false) continue;
    const text = String(value).trim();
    if (text && text !== "null" && text !== "undefined") return text;
  }
  return null;
}

function toIsoDate(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    // HYCU often returns epoch ms; treat small numbers as seconds.
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function durationToString(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    // Prefer seconds → compact "Xm Ys" / "Xh"
    const totalSec = value > 100000 ? Math.round(value / 1000) : Math.round(value);
    if (totalSec < 60) return `${totalSec}s`;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor(totalSec % 3600 / 60);
    const s = totalSec % 60;
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return String(value);
}

export function normalizeHycuJobEntity(entity = {}) {
  const uuid = firstString(
    entity.uuid,
    entity.id,
    entity.jobUuid,
    entity.jobId,
    entity.backupSetUuid,
    entity.backupUuid
  );
  if (!uuid) return null;
  const name = firstString(
    entity.name,
    entity.jobName,
    entity.displayName,
    entity.title,
    entity.backupSetName,
    uuid
  );
  const status = firstString(
    entity.status,
    entity.state,
    entity.jobStatus,
    entity.lastStatus,
    entity.result
  );
  const lastBackupAt = toIsoDate(
    firstString(
      entity.lastBackupAt,
      entity.lastBackupTime,
      entity.lastSuccessfulBackup,
      entity.lastSuccess,
      entity.endTime,
      entity.finishedAt,
      entity.completionTime,
      entity.updatedAt
    ) || entity.endTimeMs || entity.finishedAtMs || entity.lastBackup
  );
  const duration = durationToString(
    entity.duration ?? entity.durationMs ?? entity.elapsedTime ?? entity.runTime ?? null
  );
  return {
    uuid,
    name: name || uuid,
    status: status || null,
    lastBackupAt,
    duration,
    rawType: firstString(entity.type, entity.jobType, entity.backupType) || "job"
  };
}

function extractEntities(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.entities)) return payload.entities;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.jobs)) return payload.jobs;
  if (Array.isArray(payload.backups)) return payload.backups;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

/**
 * List HYCU jobs / backup sets. Tries several REST paths used across Hybrid builds.
 */
export async function listHycuJobs(auth, { search = "", limit = 200 } = {}) {
  const paths = [
    "/rest/v1.0/jobs?pageSize=200",
    "/rest/v1.0/jobs",
    "/rest/v1.0/backups?pageSize=200",
    "/rest/v1.0/backups",
    "/rest/v1.0/backupSets?pageSize=200",
    "/rest/v1.0/backupSets"
  ];
  let lastError = null;
  const byUuid = new Map();
  for (const path of paths) {
    try {
      const payload = await hycuApiGet(auth, path);
      const entities = extractEntities(payload);
      for (const entity of entities) {
        const normalized = normalizeHycuJobEntity(entity);
        if (normalized?.uuid && !byUuid.has(normalized.uuid)) {
          byUuid.set(normalized.uuid, normalized);
        }
      }
      if (byUuid.size > 0) break;
    } catch (err) {
      lastError = err;
      if (err?.status && err.status !== 404) {
        // Auth / server errors: stop early.
        if (err.status === 401 || err.status === 403) throw err;
      }
    }
  }
  let jobs = [...byUuid.values()];
  const q = String(search || "").trim().toLowerCase();
  if (q) {
    jobs = jobs.filter(
      job =>
        String(job.name || "").toLowerCase().includes(q) ||
        String(job.uuid || "").toLowerCase().includes(q) ||
        String(job.status || "").toLowerCase().includes(q)
    );
  }
  jobs.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }));
  const capped = Math.min(Math.max(Number(limit) || 200, 1), 500);
  jobs = jobs.slice(0, capped);
  if (!jobs.length && lastError && lastError.status !== 404) {
    throw lastError;
  }
  return jobs;
}

export async function fetchHycuJobDetail(auth, jobUuid) {
  const uuid = String(jobUuid || "").trim();
  if (!uuid) return null;
  const paths = [
    `/rest/v1.0/jobs/${encodeURIComponent(uuid)}`,
    `/rest/v1.0/backups/${encodeURIComponent(uuid)}`,
    `/rest/v1.0/backupSets/${encodeURIComponent(uuid)}`
  ];
  for (const path of paths) {
    try {
      const payload = await hycuApiGet(auth, path);
      const entity = payload?.entity || payload?.entities?.[0] || payload;
      const normalized = normalizeHycuJobEntity(entity);
      if (normalized) return normalized;
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) throw err;
    }
  }
  // Fallback: scan list
  const all = await listHycuJobs(auth, { limit: 500 });
  return all.find(job => job.uuid === uuid) || null;
}
