import express from 'express';
import { pool } from '../../../database/db.js';
import verifyJWT from '../../../middleware/auth.js';
import { getCheckMKSettings, authenticateCheckMK, getHostServices, getServicePluginOutputViaViewPy, fetchShowServiceDetails, serviceNameMatches, stripHostPrefixFromService } from './utils.js';
const router = express.Router();
const SAVE_TABLE = 'v_b_clients_m_save';
const SETTINGS_TABLE = 'v_b_settings';
const LAST_SYNC_SECTION = 'checkmk';
const LAST_SYNC_KEY = 'checkmk_save_jobs_last_sync';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let lastSaveJobsSyncAt = null;
function isUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}
function normalizeJobIdsFilter(jobIds) {
  if (!Array.isArray(jobIds) || jobIds.length === 0) return null;
  const normalized = jobIds.map(id => String(id).trim()).filter(Boolean);
  if (normalized.length === 0) return null;
  if (!normalized.every(isUuid)) {
    return null;
  }
  return normalized;
}
async function loadLastSyncFromDb() {
  try {
    const r = await pool.query(`SELECT value FROM ${SETTINGS_TABLE} WHERE section = $1 AND key = $2`, [LAST_SYNC_SECTION, LAST_SYNC_KEY]);
    if (r.rows[0]?.value) lastSaveJobsSyncAt = r.rows[0].value;
  } catch (_) {}
}
async function saveLastSyncToDb(isoDate) {
  try {
    const r = await pool.query(`UPDATE ${SETTINGS_TABLE} SET value = $1 WHERE section = $2 AND key = $3`, [isoDate, LAST_SYNC_SECTION, LAST_SYNC_KEY]);
    if (r.rowCount === 0) {
      await pool.query(`INSERT INTO ${SETTINGS_TABLE} (section, key, value) VALUES ($1, $2, $3)`, [LAST_SYNC_SECTION, LAST_SYNC_KEY, isoDate]);
    }
  } catch (err) {
    console.warn('[checkmk save-jobs] Unable to save lastSync to database:', err.message);
  }
}
function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null || value === false) continue;
    const text = String(value).trim();
    if (text && text !== 'null' && text !== 'undefined') return text;
  }
  return '';
}
function resolveJobCheckmkMapping(job) {
  const data = job?.data && typeof job.data === 'object' ? job.data : {};
  const mapping = data.checkmkMapping && typeof data.checkmkMapping === 'object' ? data.checkmkMapping : {};
  return {
    host: firstNonEmpty(job?.checkmk_host_name, data.checkmk_host_name, mapping.checkmk_host_name),
    site: firstNonEmpty(job?.checkmk_site, data.checkmk_site, mapping.checkmk_site),
    service: firstNonEmpty(job?.checkmk_service_name, data.checkmk_service_name, mapping.checkmk_service_name, data.nom)
  };
}
function formatDurationSeconds(seconds) {
  const s = Math.floor(Number(seconds));
  if (Number.isNaN(s) || s < 0) return null;
  const minutes = Math.floor(s / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) return `${hours}h ${remainingMinutes}min`;
  return `${minutes}min`;
}
function parseDurationFromPerfData(perfData) {
  if (!perfData || typeof perfData !== 'string') return null;
  const str = String(perfData);
  const keys = ['duration', 'backup_duration', 'last_duration', 'duration_sec', 'backup_time', 'time'];
  for (const key of keys) {
    const re = new RegExp(`\\b${key}=([\\d.]+)`, 'i');
    const m = str.match(re);
    if (m) {
      const formatted = formatDurationSeconds(parseFloat(m[1]));
      if (formatted) return formatted;
    }
  }
  return null;
}
function parseDurationFromPluginOutput(pluginOutput) {
  if (!pluginOutput || typeof pluginOutput !== 'string') return null;
  const out = pluginOutput;
  const creationMatch = out.match(/Creation time:\s*([^,\n]+)/i);
  const endMatch = out.match(/End time:\s*([^,\n]+)/i);
  if (creationMatch && endMatch) {
    try {
      const parseDate = dateStr => {
        const str = dateStr.trim();
        const parts = str.split(' ');
        const datePart = parts[0] || '';
        const timePart = parts[1] || '00:00:00';
        const segs = datePart.split('.').map(x => parseInt(x, 10));
        const t = timePart.split(':').map(x => parseInt(x, 10) || 0);
        const hour = t[0] || 0,
          minute = t[1] || 0,
          second = t[2] || 0;
        if (segs.length === 3 && segs[2] >= 2000 && segs[2] <= 2100) {
          const day = segs[0],
            month = segs[1],
            year = segs[2];
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const d = new Date(year, month - 1, day, hour, minute, second);
            if (!isNaN(d.getTime())) return d;
          }
        }
        return new Date(NaN);
      };
      const start = parseDate(creationMatch[1].trim());
      const end = parseDate(endMatch[1].trim());
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        if (diffMinutes < 0 || diffMinutes > 10080) return null;
        const diffHours = Math.floor(diffMinutes / 60);
        const remainingMinutes = diffMinutes % 60;
        if (diffHours > 0) return `${diffHours}h ${remainingMinutes}min`;
        return `${diffMinutes}min`;
      }
    } catch (e) {}
  }
  const durationLabels = [/Duration:\s*([^\n,]+)/i, /Backup duration:\s*([^\n,]+)/i, /Dauer:\s*([^\n,]+)/i, /Last backup duration:\s*([^\n,]+)/i];
  for (const re of durationLabels) {
    const m = out.match(re);
    if (m) {
      const raw = m[1].trim();
      if (/^\d+\s*h(?:ours?)?\s*\d+\s*min/i.test(raw) || /^\d+\s*min/i.test(raw) || /^\d+\s*s/i.test(raw)) return raw;
      const secMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|secondes?)/i);
      if (secMatch) {
        const formatted = formatDurationSeconds(parseFloat(secMatch[1]));
        if (formatted) return formatted;
      }
      const minMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:m|min|minutes?)/i);
      if (minMatch) return `${Math.floor(parseFloat(minMatch[1]))}min`;
    }
  }
  const preFormatted = out.match(/(\d+)\s*h(?:ours?)?\s*(\d+)\s*min/i) || out.match(/(\d+)\s*min(?:utes?)?/i);
  if (preFormatted) {
    if (preFormatted[2] !== undefined) return `${preFormatted[1]}h ${preFormatted[2]}min`;
    return `${preFormatted[1]}min`;
  }
  return null;
}
function parseEuropeanOrIsoDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  const euro = str.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (euro) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = euro;
    const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    const parsed = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
function parseCreationTimeFromPluginOutput(pluginOutput) {
  if (!pluginOutput || typeof pluginOutput !== 'string') return null;
  const patterns = [
    /(?:creation|created|start|started)[\s_]*time[\s:]+([^\n,;]+)/i,
    /erstellungszeit[\s:]+([^\n,;]+)/i,
    /startzeit[\s:]+([^\n,;]+)/i,
    /début[\s:]+([^\n,;]+)/i,
    /start[\s:]+(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/i,
    /start[\s:]+(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})/i
  ];
  for (const pattern of patterns) {
    const match = pluginOutput.match(pattern);
    if (!match) continue;
    const parsed = parseEuropeanOrIsoDate(match[1]);
    if (parsed) return parsed;
  }
  return null;
}
function toLastBackupDate(lastCheck) {
  if (lastCheck == null) return null;
  if (typeof lastCheck === 'number') {
    const d = new Date(lastCheck * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof lastCheck === 'string') {
    const d = new Date(lastCheck);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}
export async function runSaveJobsSync({
  clientId,
  hostName = null,
  site = null,
  jobIds = null
} = {}) {
  const columnsResult = await pool.query(`SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`, [SAVE_TABLE]);
  const columns = new Set(columnsResult.rows.map(r => r.column_name));
  const hasLastBackupDate = columns.has('last_backup_date');
  const hasLastBackupDuration = columns.has('last_backup_duration');
  const hasLastBackupStart = columns.has('last_backup_start');
  if (!hasLastBackupDate || !hasLastBackupDuration) {
    throw new Error('Columns last_backup_date / last_backup_duration missing. Run migration add_last_backup_to_save.sql.');
  }
  const queryParams = [];
  let clientFilter = '';
  if (clientId != null) {
    queryParams.push(clientId);
    clientFilter = ` AND client_id = $${queryParams.length}`;
  }
  const mappedHostExpr = `NULLIF(TRIM(COALESCE(checkmk_host_name, data::jsonb->>'checkmk_host_name', data::jsonb->'checkmkMapping'->>'checkmk_host_name', '')), '')`;
  const mappedSiteExpr = `COALESCE(NULLIF(TRIM(COALESCE(checkmk_site, data::jsonb->>'checkmk_site', data::jsonb->'checkmkMapping'->>'checkmk_site', '')), ''), '')`;
  const mappedServiceExpr = `NULLIF(TRIM(COALESCE(checkmk_service_name, data::jsonb->>'checkmk_service_name', data::jsonb->'checkmkMapping'->>'checkmk_service_name', '')), '')`;
  const normalizedHost = hostName != null ? String(hostName).trim() : '';
  if (normalizedHost) {
    queryParams.push(normalizedHost);
    clientFilter += ` AND ${mappedHostExpr} = $${queryParams.length}`;
  }
  const normalizedSite = site != null ? String(site).trim() : '';
  if (normalizedSite) {
    queryParams.push(normalizedSite);
    clientFilter += ` AND ${mappedSiteExpr} = $${queryParams.length}`;
  }
  const jobIdsFilter = normalizeJobIdsFilter(jobIds);
  if (jobIdsFilter?.length) {
    queryParams.push(jobIdsFilter);
    clientFilter += ` AND id = ANY($${queryParams.length}::uuid[])`;
  }
  const jobsResult = await pool.query(`SELECT id, client_id, item_key, data, checkmk_host_name, checkmk_site, checkmk_service_name
     FROM ${SAVE_TABLE}
     WHERE ${mappedHostExpr} IS NOT NULL
       AND ${mappedServiceExpr} IS NOT NULL
       AND (
         (item_key IS NOT NULL AND item_key LIKE 'job-%')
         OR (data IS NOT NULL AND (data::jsonb->>'type') = 'job')
       )${clientFilter}`, queryParams);
  const jobs = jobsResult.rows;
  if (jobs.length === 0) {
    lastSaveJobsSyncAt = new Date().toISOString();
    await saveLastSyncToDb(lastSaveJobsSyncAt);
    return {
      message: 'No mapped job to synchronize',
      updated: 0,
      total: 0,
      lastSync: lastSaveJobsSyncAt
    };
  }
  const settings = await getCheckMKSettings();
  if (!settings?.apiUrl || !settings.username || !settings.password) {
    throw new Error('Check MK configuration incomplete.');
  }
  const authData = await authenticateCheckMK(settings.apiUrl, settings.username, settings.password);
  if (!authData?.auth_header) {
    throw new Error('Unable to authenticate to Check MK.');
  }
  const hostServicesCache = new Map();
  async function getCachedHostServices(host, hostSite) {
    const cacheKey = `${host}\0${hostSite || ''}`;
    if (!hostServicesCache.has(cacheKey)) {
      hostServicesCache.set(cacheKey, await getHostServices(settings.apiUrl, authData.auth_header, host, hostSite));
    }
    return hostServicesCache.get(cacheKey);
  }
  let updated = 0;
  for (const job of jobs) {
    const mapping = resolveJobCheckmkMapping(job);
    const host = mapping.host;
    const hostSite = mapping.site || settings.site || '';
    const serviceName = mapping.service;
    if (!host || !serviceName) continue;
    try {
      const services = await getCachedHostServices(host, hostSite);
      let svc = (services || []).find(s => serviceNameMatches(s, serviceName, host)) || null;
      if (!svc) {
        svc = await fetchShowServiceDetails(settings.apiUrl, authData.auth_header, host, serviceName, hostSite);
      }
      const serviceDescription = stripHostPrefixFromService(host, serviceName);
      let lastBackupDate = toLastBackupDate(svc?.lastCheck);
      let pluginOutputForCreation = svc?.longPluginOutput || svc?.pluginOutput || null;
      let lastBackupDuration = parseDurationFromPerfData(svc?.performanceData) || parseDurationFromPerfData(svc?.pluginOutput) || parseDurationFromPluginOutput(svc?.pluginOutput) || parseDurationFromPluginOutput(svc?.longPluginOutput);
      let viewPyData = null;
      const needsViewPy = !lastBackupDuration || hasLastBackupStart && !pluginOutputForCreation;
      if (needsViewPy) {
        viewPyData = await getServicePluginOutputViaViewPy(settings.apiUrl, authData.auth_header, host, serviceDescription || serviceName, hostSite);
        if (viewPyData) {
          const out = viewPyData.longPluginOutput || viewPyData.pluginOutput;
          if (!pluginOutputForCreation) pluginOutputForCreation = out;
          if (!lastBackupDuration) {
            lastBackupDuration = parseDurationFromPerfData(viewPyData.performanceData) || parseDurationFromPerfData(out) || parseDurationFromPluginOutput(viewPyData.longPluginOutput) || parseDurationFromPluginOutput(viewPyData.pluginOutput);
          }
        }
      }
      if (!pluginOutputForCreation) {
        const showDetails = svc?.pluginOutput || svc?.longPluginOutput
          ? null
          : await fetchShowServiceDetails(settings.apiUrl, authData.auth_header, host, serviceDescription, hostSite);
        if (showDetails) {
          if (!svc) svc = showDetails;
          pluginOutputForCreation = showDetails.longPluginOutput || showDetails.pluginOutput || pluginOutputForCreation;
          if (!lastBackupDate) lastBackupDate = toLastBackupDate(showDetails.lastCheck);
          if (!lastBackupDuration) {
            lastBackupDuration = parseDurationFromPluginOutput(pluginOutputForCreation) || parseDurationFromPerfData(showDetails.performanceData);
          }
        }
      }
      if (!lastBackupDuration) {
        const snippet = (pluginOutputForCreation || viewPyData?.performanceData || '(no plugin output)').toString().slice(0, 200);
        console.warn(`[checkmk save-jobs sync] Duration not found for job id=${job.id} (${serviceName}), host=${host}. Preview: ${snippet}`);
      }
      const lastBackupStart = pluginOutputForCreation ? parseCreationTimeFromPluginOutput(pluginOutputForCreation) : null;
      const startToStore = lastBackupStart || lastBackupDate || null;
      if (!svc && !pluginOutputForCreation && !lastBackupDate) continue;
      if (hasLastBackupStart) {
        await pool.query(`UPDATE ${SAVE_TABLE}
           SET last_backup_date = COALESCE($1::timestamptz, last_backup_date),
               last_backup_duration = COALESCE($2::varchar, last_backup_duration),
               last_backup_start = COALESCE($4::timestamptz, last_backup_start),
               updated_at = NOW()
           WHERE id = $3`, [lastBackupDate, lastBackupDuration || null, job.id, startToStore]);
      } else {
        await pool.query(`UPDATE ${SAVE_TABLE}
           SET last_backup_date = COALESCE($1::timestamptz, last_backup_date),
               last_backup_duration = COALESCE($2::varchar, last_backup_duration),
               updated_at = NOW()
           WHERE id = $3`, [lastBackupDate, lastBackupDuration || null, job.id]);
      }
      updated += 1;
    } catch (err) {
      console.error(`[checkmk save-jobs sync] Job id=${job.id} (${serviceName}):`, err.message);
    }
  }
  lastSaveJobsSyncAt = new Date().toISOString();
  await saveLastSyncToDb(lastSaveJobsSyncAt);
  return {
    message: 'Synchronization completed',
    updated,
    total: jobs.length,
    lastSync: lastSaveJobsSyncAt
  };
}
router.get('/save-jobs/last-sync', verifyJWT, async (req, res) => {
  if (lastSaveJobsSyncAt == null) await loadLastSyncFromDb();
  res.json({
    lastSync: lastSaveJobsSyncAt
  });
});
router.post('/save-jobs/sync', verifyJWT, async (req, res) => {
  try {
    const clientId = req.body?.clientId ?? null;
    const hostName = req.body?.hostName ?? null;
    const site = req.body?.site ?? null;
    const jobIds = Array.isArray(req.body?.jobIds) ? req.body.jobIds.filter(Boolean) : null;
    const result = await runSaveJobsSync({
      clientId,
      hostName,
      site,
      jobIds: jobIds?.length ? jobIds : null
    });
    res.json(result);
  } catch (err) {
    console.error('POST /checkmk/save-jobs/sync:', err);
    const msg = err.message || 'Error synchronizing jobs';
    if (/column/i.test(msg)) return res.status(501).json({
      error: msg
    });
    if (/configuration incomplete/i.test(msg)) return res.status(500).json({
      error: msg
    });
    if (/authentif|authenticate|credentials/i.test(msg)) return res.status(502).json({
      error: msg
    });
    res.status(500).json({
      error: msg
    });
  }
});
export default router;
