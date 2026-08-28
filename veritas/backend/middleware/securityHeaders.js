function isLocalHost(req) {
  const host = String(req.hostname || req.headers?.host || "")
    .split(":")[0]
    .toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function isHttpsRequest(req) {
  if (req.secure) return true;
  const proto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return proto === "https";
}

function isApiLikePath(path) {
  return (
    path.startsWith("/api") ||
    path.startsWith("/uploads") ||
    path.startsWith("/rmm") ||
    path === "/health" ||
    path.startsWith("/health/") ||
    path === "/status" ||
    path === "/db-status"
  );
}

const API_CSP =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

/** Same-origin SPA: allow app assets + Iconify CDN fetches used by @iconify/react. */
const SPA_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join("; ");

export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  const path = String(req.path || "");
  res.setHeader("Content-Security-Policy", isApiLikePath(path) ? API_CSP : SPA_CSP);

  // Never advertise HSTS on plain HTTP / localhost — browsers would force HTTPS and break local prod.
  if (process.env.NODE_ENV === "production" && isHttpsRequest(req) && !isLocalHost(req)) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}

function embedAncestorOrigins() {
  const fromEnv = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  const frontendBase = String(process.env.FRONTEND_BASE_URL || "").trim().replace(/\/+$/, "");
  const list = ["'self'", "http://localhost:3000", "http://127.0.0.1:3000", ...fromEnv];
  if (frontendBase) list.push(frontendBase);
  return [...new Set(list)].join(" ");
}

/** Allow the SPA to embed authenticated files (PDF) in an iframe. */
export function allowAssetEmbedding(res) {
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", `frame-ancestors ${embedAncestorOrigins()}`);
}
