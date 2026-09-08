import express from "express";
import pool from "../../../database/db.js";
import verifyJWT from "../../../middleware/auth.js";
import {
  authenticateHycu,
  fetchHycuJobDetail,
  getHycuSettingsFromStore
} from "./utils.js";
import { isHycuIntegrationEnabled } from "../../../utils/hycuIntegrationStatus.js";

const router = express.Router();
const SAVE_TABLE = "v_b_clients_m_save";

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null || value === false) continue;
    const text = String(value).trim();
    if (text && text !== "null" && text !== "undefined") return text;
  }
  return null;
}

function resolveJobHycuMapping(job) {
  let data = job?.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  data = data && typeof data === "object" ? data : {};
  const mapping = data.hycuMapping && typeof data.hycuMapping === "object" ? data.hycuMapping : {};
  return {
    uuid: firstNonEmpty(job?.hycu_job_uuid, data.hycu_job_uuid, mapping.hycu_job_uuid, mapping.uuid),
    name: firstNonEmpty(job?.hycu_job_name, data.hycu_job_name, mapping.hycu_job_name, mapping.name)
  };
}

function normalizeJobIdsFilter(jobIds) {
  if (!Array.isArray(jobIds) || !jobIds.length) return null;
  return jobIds.map(id => String(id).trim()).filter(Boolean);
}

export async function runHycuSaveJobsSync({ clientId = null, jobIds = null } = {}) {
  const columnsResult = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [SAVE_TABLE]
  );
  const columns = new Set(columnsResult.rows.map(r => r.column_name));
  if (!columns.has("hycu_job_uuid")) {
    throw new Error("Column hycu_job_uuid missing. Run migration 20260908_hycu_save_job_mapping.sql.");
  }
  if (!columns.has("last_backup_date") || !columns.has("last_backup_duration")) {
    throw new Error("Columns last_backup_date / last_backup_duration missing.");
  }
  const hasLastBackupStart = columns.has("last_backup_start");

  const queryParams = [];
  let clientFilter = "";
  if (clientId != null) {
    queryParams.push(clientId);
    clientFilter = ` AND client_id = $${queryParams.length}`;
  }
  const mappedUuidExpr = `NULLIF(TRIM(COALESCE(hycu_job_uuid, data::jsonb->>'hycu_job_uuid', data::jsonb->'hycuMapping'->>'hycu_job_uuid', data::jsonb->'hycuMapping'->>'uuid', '')), '')`;
  const jobIdsFilter = normalizeJobIdsFilter(jobIds);
  if (jobIdsFilter?.length) {
    queryParams.push(jobIdsFilter);
    clientFilter += ` AND id = ANY($${queryParams.length}::uuid[])`;
  }

  const jobsResult = await pool.query(
    `SELECT id, client_id, item_key, data, hycu_job_uuid, hycu_job_name
     FROM ${SAVE_TABLE}
     WHERE ${mappedUuidExpr} IS NOT NULL
       AND (
         (item_key IS NOT NULL AND item_key LIKE 'job-%')
         OR (data IS NOT NULL AND (data::jsonb->>'type') = 'job')
       )${clientFilter}`,
    queryParams
  );
  const jobs = jobsResult.rows;
  if (!jobs.length) {
    return {
      message: "No HYCU-mapped job to synchronize",
      updated: 0,
      total: 0,
      lastSync: new Date().toISOString()
    };
  }

  const credentials = await getHycuSettingsFromStore();
  const auth = await authenticateHycu(credentials);
  let updated = 0;

  for (const job of jobs) {
    const mapping = resolveJobHycuMapping(job);
    if (!mapping.uuid) continue;
    try {
      const detail = await fetchHycuJobDetail(auth, mapping.uuid);
      if (!detail) continue;
      const lastBackupDate = detail.lastBackupAt || null;
      const lastBackupDuration = detail.duration || null;
      const lastBackupStart = detail.lastBackupAt || null;
      const jobName = detail.name || mapping.name || null;

      if (hasLastBackupStart) {
        await pool.query(
          `UPDATE ${SAVE_TABLE}
           SET last_backup_date = COALESCE($1::timestamptz, last_backup_date),
               last_backup_duration = COALESCE($2::varchar, last_backup_duration),
               last_backup_start = COALESCE($4::timestamptz, last_backup_start),
               hycu_job_name = COALESCE($5::text, hycu_job_name),
               data = COALESCE(data::jsonb, '{}'::jsonb) || jsonb_build_object(
                 'hycu_job_uuid', to_jsonb($3::text),
                 'hycu_job_name', to_jsonb(COALESCE($5::text, hycu_job_name))
               ),
               updated_at = NOW()
           WHERE id = $6`,
          [lastBackupDate, lastBackupDuration, mapping.uuid, lastBackupStart, jobName, job.id]
        );
      } else {
        await pool.query(
          `UPDATE ${SAVE_TABLE}
           SET last_backup_date = COALESCE($1::timestamptz, last_backup_date),
               last_backup_duration = COALESCE($2::varchar, last_backup_duration),
               hycu_job_name = COALESCE($4::text, hycu_job_name),
               data = COALESCE(data::jsonb, '{}'::jsonb) || jsonb_build_object(
                 'hycu_job_uuid', to_jsonb($3::text),
                 'hycu_job_name', to_jsonb(COALESCE($4::text, hycu_job_name))
               ),
               updated_at = NOW()
           WHERE id = $5`,
          [lastBackupDate, lastBackupDuration, mapping.uuid, jobName, job.id]
        );
      }
      updated += 1;
    } catch (err) {
      console.warn(`[hycu save-jobs sync] job id=${job.id} uuid=${mapping.uuid}:`, err.message || err);
    }
  }

  return {
    message: "HYCU save jobs synchronized",
    updated,
    total: jobs.length,
    lastSync: new Date().toISOString()
  };
}

router.post("/save-jobs/sync", verifyJWT, async (req, res) => {
  try {
    const enabled = await isHycuIntegrationEnabled();
    if (!enabled) {
      return res.status(503).json({ error: "HYCU integration is disabled" });
    }
    const clientId = req.body?.clientId ?? null;
    const jobIds = Array.isArray(req.body?.jobIds) ? req.body.jobIds.filter(Boolean) : null;
    const result = await runHycuSaveJobsSync({
      clientId,
      jobIds: jobIds?.length ? jobIds : null
    });
    res.json(result);
  } catch (err) {
    console.error("POST /hycu/save-jobs/sync:", err);
    const msg = err.message || "Error synchronizing HYCU jobs";
    if (/column/i.test(msg)) return res.status(501).json({ error: msg });
    if (/required|incomplete/i.test(msg)) return res.status(400).json({ error: msg });
    if (/authentif|authenticate|credentials|token|401|403/i.test(msg)) {
      return res.status(502).json({ error: msg });
    }
    res.status(500).json({ error: msg });
  }
});

export default router;
