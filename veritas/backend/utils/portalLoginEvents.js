import { pool } from "../database/db.js";
import { ensurePortalLoginEventsSchema } from "../services/ensurePortalLoginEventsSchema.js";

const STATUS = {
  SUCCESS: "success",
  FAILURE: "failure",
  BLOCKED: "blocked",
  PENDING: "pending_activation",
  MFA_FAILURE: "mfa_failure"
};

function firstHeader(req, names) {
  for (const name of names) {
    const raw = req?.headers?.[name];
    if (raw == null || raw === "") continue;
    const value = Array.isArray(raw) ? raw[0] : String(raw).split(",")[0].trim();
    if (value && value.toUpperCase() !== "XX" && value.toUpperCase() !== "T1") return value;
  }
  return null;
}

export function getRequestClientIp(req) {
  const forwarded = firstHeader(req, ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"]);
  if (forwarded) return forwarded.replace(/^::ffff:/, "");
  const ip = req?.ip || req?.socket?.remoteAddress || null;
  return ip ? String(ip).replace(/^::ffff:/, "") : null;
}

export function summarizeUserAgent(userAgent) {
  const ua = String(userAgent || "").trim();
  if (!ua) return null;
  let browser = "Navigateur";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = "Safari";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "Opera";

  let os = null;
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/mac os x|macintosh/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  return os ? `${browser} · ${os}` : browser;
}

export function resolveRequestLocality(req) {
  const country = firstHeader(req, [
    "cf-ipcountry",
    "x-vercel-ip-country",
    "cloudfront-viewer-country",
    "x-country-code"
  ]);
  const city = firstHeader(req, [
    "cf-ipcity",
    "x-vercel-ip-city",
    "x-city"
  ]);
  const locality = [city, country].filter(Boolean).join(", ") || null;
  return { country_code: country, city, locality };
}

export function buildPortalLoginRequestMeta(req) {
  const userAgent = req?.headers?.["user-agent"] || null;
  const locality = resolveRequestLocality(req);
  return {
    ip: getRequestClientIp(req),
    user_agent: userAgent ? String(userAgent).slice(0, 512) : null,
    device_label: summarizeUserAgent(userAgent),
    ...locality
  };
}

export async function recordPortalLoginEvent({
  userId = null,
  contactId = null,
  clientId = null,
  email = null,
  status,
  failureReason = null,
  req = null,
  meta = null
}) {
  if (!status) return null;
  try {
    await ensurePortalLoginEventsSchema();
    const requestMeta = meta || (req ? buildPortalLoginRequestMeta(req) : {});
    const { rows } = await pool.query(
      `INSERT INTO v_b_portal_login_events
        (user_id, contact_id, client_id, email, status, failure_reason, ip, user_agent, device_label, country_code, city, locality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, created_at, status`,
      [
        userId || null,
        contactId || null,
        clientId || null,
        email ? String(email).trim().toLowerCase() : null,
        status,
        failureReason || null,
        requestMeta.ip || null,
        requestMeta.user_agent || null,
        requestMeta.device_label || null,
        requestMeta.country_code || null,
        requestMeta.city || null,
        requestMeta.locality || null
      ]
    );
    return rows[0] || null;
  } catch (err) {
    console.warn("[portal-login-events] record failed:", err?.message || err);
    return null;
  }
}

export async function touchPortalLastLogin(userId) {
  if (!userId) return;
  try {
    await pool.query(`UPDATE v_b_users SET last_login_at = NOW() WHERE id = $1 AND role = 'client'`, [userId]);
  } catch (err) {
    console.warn("[portal-login-events] last_login_at update failed:", err?.message || err);
  }
}

export async function listPortalLoginEventsForContact(contactId, { limit = 50 } = {}) {
  await ensurePortalLoginEventsSchema();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const { rows } = await pool.query(
    `SELECT id, user_id, contact_id, client_id, email, status, failure_reason,
            ip, user_agent, device_label, country_code, city, locality, created_at
     FROM v_b_portal_login_events
     WHERE contact_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [contactId, safeLimit]
  );
  return rows;
}

export { STATUS as PORTAL_LOGIN_STATUS };
