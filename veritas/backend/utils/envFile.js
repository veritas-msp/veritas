import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ENV_PATH = path.join(__dirname, "..", ".env");
const FRONTEND_ENV_PATH = path.join(__dirname, "..", "..", "frontend", ".env");
const BOOT_SECRETS_PATH = path.join(__dirname, "..", "uploads", ".boot-secrets");
const FILE_HEADERS = {
  backend: "# Veritas Backend — configuration generated / updated by the setup wizard",
  frontend: "# Veritas Frontend — configuration generated / updated by the setup wizard"
};
function readEnvFileAt(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}
function writeEnvFileAt(filePath, updates, headerKey = "backend") {
  const current = readEnvFileAt(filePath);
  const merged = {
    ...current,
    ...updates
  };
  const lines = [FILE_HEADERS[headerKey] || FILE_HEADERS.backend];
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null) continue;
    const safe = String(value).includes(" ") ? `"${String(value)}"` : String(value);
    lines.push(`${key}=${safe}`);
  }
  fs.mkdirSync(path.dirname(filePath), {
    recursive: true
  });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  return merged;
}
function applyProcessEnv(updates) {
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== null) {
      process.env[key] = String(value);
    }
  }
}
function canWriteEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      return false;
    }
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      return false;
    }
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
/** Persist JWT/ENCRYPTION/license key for Docker restarts (uploads volume). */
export function persistBootSecrets(overrides = {}) {
  const jwtSecret = overrides.JWT_SECRET || process.env.JWT_SECRET;
  const encryptionKey = overrides.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!jwtSecret || !encryptionKey) return false;

  let previousLicense = "";
  let previousEdition = "";
  try {
    if (fs.existsSync(BOOT_SECRETS_PATH) && fs.statSync(BOOT_SECRETS_PATH).isFile()) {
      const prev = fs.readFileSync(BOOT_SECRETS_PATH, "utf8");
      const lic = prev.match(/export VERITAS_LICENSE_KEY='((?:\\'|[^'])*)'/);
      const edi = prev.match(/export VERITAS_EDITION='((?:\\'|[^'])*)'/);
      if (lic) previousLicense = lic[1].replace(/\\'/g, "'");
      if (edi) previousEdition = edi[1].replace(/\\'/g, "'");
    }
  } catch {
    /* ignore */
  }

  const licenseKey = String(
    overrides.VERITAS_LICENSE_KEY !== undefined
      ? overrides.VERITAS_LICENSE_KEY
      : process.env.VERITAS_LICENSE_KEY || previousLicense || ""
  ).trim();
  const edition = String(
    overrides.VERITAS_EDITION !== undefined
      ? overrides.VERITAS_EDITION
      : process.env.VERITAS_EDITION || previousEdition || ""
  ).trim();
  try {
    fs.mkdirSync(path.dirname(BOOT_SECRETS_PATH), {
      recursive: true
    });
    const escape = value => String(value).replace(/'/g, `'\"'\"'`);
    const lines = [
      `export JWT_SECRET='${escape(jwtSecret)}'`,
      `export ENCRYPTION_KEY='${escape(encryptionKey)}'`
    ];
    if (licenseKey) {
      lines.push(`export VERITAS_LICENSE_KEY='${escape(licenseKey)}'`);
    }
    if (edition) {
      lines.push(`export VERITAS_EDITION='${escape(edition)}'`);
    }
    fs.writeFileSync(BOOT_SECRETS_PATH, `${lines.join("\n")}\n`, {
      encoding: "utf8",
      mode: 0o600
    });
    return true;
  } catch (err) {
    console.warn("[env] Could not persist boot secrets:", err.message);
    return false;
  }
}
export function writeEnvFile(updates) {
  applyProcessEnv(updates);
  if (updates.JWT_SECRET || updates.ENCRYPTION_KEY || updates.VERITAS_LICENSE_KEY || updates.VERITAS_EDITION) {
    persistBootSecrets(updates);
  }
  if (!canWriteEnvFile(BACKEND_ENV_PATH)) {
    console.warn("[env] Backend .env is not writable (Docker mount or missing). Using process.env only.");
    return {
      ...updates,
      written: false
    };
  }
  try {
    const merged = writeEnvFileAt(BACKEND_ENV_PATH, updates, "backend");
    return {
      ...merged,
      written: true
    };
  } catch (err) {
    console.warn("[env] Could not write backend .env:", err.message);
    return {
      ...updates,
      written: false
    };
  }
}
export function writeFrontendEnvFile(updates) {
  if (!canWriteEnvFile(FRONTEND_ENV_PATH)) {
    console.warn("[env] Frontend .env not available in this runtime (expected in Docker). Skipping.");
    return {
      written: false
    };
  }
  try {
    const merged = writeEnvFileAt(FRONTEND_ENV_PATH, updates, "frontend");
    return {
      ...merged,
      written: true
    };
  } catch (err) {
    console.warn("[env] Could not write frontend .env:", err.message);
    return {
      written: false
    };
  }
}
export function getPrimaryFrontendBaseUrl(req = null) {
  const configured = getConfiguredFrontendBaseUrls();
  const allowed = getAllowedFrontendOrigins();

  const configuredPublic = configured.find(url => !isLocalDevFrontendOrigin(url));
  if (configuredPublic) return configuredPublic;

  const allowedPublic = allowed.find(url => !isLocalDevFrontendOrigin(url));
  if (allowedPublic) return allowedPublic;

  const fromRequest = resolveFrontendBaseFromRequest(req);
  if (fromRequest && isAllowedFrontendOrigin(fromRequest, allowed)) {
    return fromRequest;
  }

  return configured[0] || allowed[0] || "http://localhost:3000";
}

function normalizeFrontendOrigin(url) {
  if (!url) return "";
  return String(url).trim().replace(/\/+$/, "");
}

function isLocalDevFrontendOrigin(origin) {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function getConfiguredFrontendBaseUrls() {
  const raw = process.env.FRONTEND_BASE_URL || "";
  return raw.split(",").map(part => normalizeFrontendOrigin(part)).filter(Boolean);
}

function getAllowedFrontendOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(part => normalizeFrontendOrigin(part))
    .filter(Boolean);
  return [...new Set([...getConfiguredFrontendBaseUrls(), ...fromEnv])];
}

function isAllowedFrontendOrigin(origin, allowedOrigins) {
  const normalized = normalizeFrontendOrigin(origin);
  if (!normalized) return false;
  if (allowedOrigins.includes(normalized)) return true;
  if (process.env.NODE_ENV !== "production" && isLocalDevFrontendOrigin(normalized)) {
    return true;
  }
  const allowedIsLocalOnly =
    allowedOrigins.length === 0 || allowedOrigins.every(isLocalDevFrontendOrigin);
  if (
    process.env.NODE_ENV === "production" &&
    allowedIsLocalOnly &&
    !isLocalDevFrontendOrigin(normalized)
  ) {
    return true;
  }
  return false;
}

function resolveFrontendBaseFromRequest(req) {
  if (!req) return "";

  const explicit = normalizeFrontendOrigin(req.body?.appOrigin);
  if (explicit) return explicit;

  const origin = normalizeFrontendOrigin(req.headers?.origin);
  if (origin) return origin;

  const referer = String(req.headers?.referer || req.headers?.referrer || "").trim();
  if (referer) {
    try {
      return normalizeFrontendOrigin(new URL(referer).origin);
    } catch {
      /* ignore */
    }
  }

  const forwardedHost = String(req.headers?.["x-forwarded-host"] || "").split(",")[0].trim();
  const host = forwardedHost || String(req.headers?.host || "").split(",")[0].trim();
  if (!host || host.startsWith("localhost:") || host.startsWith("127.0.0.1:")) {
    return "";
  }

  const forwardedProto = String(req.headers?.["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol || "https";
  try {
    return normalizeFrontendOrigin(`${protocol}://${host}`);
  } catch {
    return "";
  }
}
