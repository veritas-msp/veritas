import { pool } from "../database/db.js";

function asList(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

export function normalizeBriefingPayload(payload = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  return {
    summary: String(source.summary || "").trim(),
    insights: asList(source.insights),
    priorities: asList(source.priorities),
    watchpoints: asList(source.watchpoints),
    critical: asList(source.critical),
    strengths: asList(source.strengths),
    risks: asList(source.risks),
    nextActions: asList(source.nextActions)
  };
}

function mapBriefingRow(row) {
  const payload = normalizeBriefingPayload(row.payload);
  return {
    id: row.id,
    featureKey: row.feature_key,
    scopeKey: row.scope_key || "",
    generatedAt: row.generated_at,
    generatedBy: row.generated_by,
    requesterName: row.requester_name || "",
    locale: row.locale || null,
    ...payload
  };
}

const SELECT_SQL = `SELECT b.id, b.feature_key, b.scope_key, b.generated_at, b.generated_by, b.locale, b.payload,
            COALESCE(NULLIF(TRIM(u.username), ''), u.email, '') AS requester_name
     FROM v_b_ai_briefings b
     LEFT JOIN v_b_users u ON u.id = b.generated_by`;

export async function insertAiBriefing({
  featureKey,
  scopeKey = "",
  userId = null,
  locale = null,
  payload = {}
}) {
  const normalized = normalizeBriefingPayload(payload);
  const inserted = await pool.query(
    `INSERT INTO v_b_ai_briefings (feature_key, scope_key, generated_by, locale, payload)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id`,
    [
      String(featureKey || "").trim(),
      String(scopeKey || "").trim(),
      userId || null,
      locale ? String(locale).slice(0, 8) : null,
      JSON.stringify(normalized)
    ]
  );
  const id = inserted.rows[0]?.id;
  if (!id) return { ...normalized, id: null, generatedAt: new Date().toISOString(), generatedBy: userId, requesterName: "" };
  const { rows } = await pool.query(`${SELECT_SQL} WHERE b.id = $1`, [id]);
  return mapBriefingRow(rows[0]);
}

export async function listAiBriefings({
  featureKey,
  scopeKey = "",
  limit = 50
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const { rows } = await pool.query(
    `${SELECT_SQL}
     WHERE b.feature_key = $1 AND b.scope_key = $2
     ORDER BY b.generated_at DESC
     LIMIT $3`,
    [String(featureKey || "").trim(), String(scopeKey || "").trim(), safeLimit]
  );
  return rows.map(mapBriefingRow);
}

export function briefingPersistErrorIgnored(err) {
  return err?.code === "42P01" || err?.code === "42703";
}
