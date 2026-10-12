import { fetchClientModules, saveClientModules } from "../../api/clients";
import API_BASE_URL from "../../config";
import { isBackupJobMapped } from "./backupJobStatusUtils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function groupFleetItemsByClient(items = []) {
  const groups = new Map();
  for (const item of items) {
    if (item?.clientId == null) continue;
    const key = String(item.clientId);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function listBackupInstances(equipements = {}) {
  const raw = equipements.Sauvegarde || equipements.Backup;
  return Array.isArray(raw?.instances) ? raw.instances : [];
}

function resolveInstanceId(instance, fallbackIndex = 0, clientId = null) {
  return instance?.id ?? instance?.instanceId ?? `instance-${clientId}-${instance?.logiciel || fallbackIndex}`;
}

function jobMatches(entry, item) {
  if (!entry || !item) return false;
  if (entry.id != null && item.id != null && String(entry.id) === String(item.id)) return true;
  const entryName = String(entry.nom || entry.name || "").trim().toLowerCase();
  const itemName = String(item.jobName || item.nom || item.raw?.nom || "").trim().toLowerCase();
  return Boolean(entryName && itemName && entryName === itemName);
}

function instanceMatches(instance, item, clientId, index) {
  const resolvedId = resolveInstanceId(instance, index, clientId);
  return item?.id != null && String(resolvedId) === String(item.id);
}

async function persistBackupInstances(clientId, modulesData, nextInstances) {
  const existingEquipements = modulesData?.equipements || {};
  const hadBackupKey = Boolean(existingEquipements.Backup);
  const payload = {
    instances: nextInstances
  };
  const nextEquipements = {
    ...existingEquipements,
    Sauvegarde: payload
  };
  if (hadBackupKey) nextEquipements.Backup = payload;
  await saveClientModules(clientId, {
    modules: modulesData?.modules || {
      Monitoring: true
    },
    modules_monitoring: {
      ...(modulesData?.modules_monitoring || {}),
      Sauvegarde: nextInstances.length > 0
    },
    equipements: nextEquipements
  });
}

export function isBackupJobSyncable(row) {
  if (!row) return false;
  const mapped = row.isMapped || isBackupJobMapped(row.raw || row);
  if (!mapped) return false;
  return UUID_RE.test(String(row.id || ""));
}

export function collectSyncableBackupJobIds(items = []) {
  const ids = [];
  const seen = new Set();
  for (const item of items) {
    if (!isBackupJobSyncable(item)) continue;
    const id = String(item.id);
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export async function bulkRemoveBackupJobs(items = []) {
  const groups = groupFleetItemsByClient(items);
  let deleted = 0;
  const failed = [];
  for (const [clientId, group] of groups) {
    try {
      const modulesData = await fetchClientModules(clientId);
      const instances = listBackupInstances(modulesData?.equipements);
      let removed = 0;
      const nextInstances = instances.map(inst => {
        const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
        const remaining = jobs.filter(job => !group.some(item => {
          if (item.instanceId != null) {
            const instId = inst.id ?? inst.instanceId;
            if (instId != null && String(instId) !== String(item.instanceId)) return false;
          }
          return jobMatches(job, item);
        }));
        removed += jobs.length - remaining.length;
        return {
          ...inst,
          jobs: remaining
        };
      });
      const unmatched = group.filter(item => {
        return !instances.some(inst => {
          const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
          return jobs.some(job => {
            if (item.instanceId != null) {
              const instId = inst.id ?? inst.instanceId;
              if (instId != null && String(instId) !== String(item.instanceId)) return false;
            }
            return jobMatches(job, item);
          });
        });
      });
      failed.push(...unmatched);
      if (removed === 0) continue;
      await persistBackupInstances(clientId, modulesData, nextInstances);
      deleted += removed;
    } catch {
      failed.push(...group);
    }
  }
  return {
    deleted,
    failed
  };
}

export async function bulkRemoveBackupInstances(items = []) {
  const groups = groupFleetItemsByClient(items);
  let deleted = 0;
  const failed = [];
  for (const [clientId, group] of groups) {
    try {
      const modulesData = await fetchClientModules(clientId);
      const instances = listBackupInstances(modulesData?.equipements);
      const nextInstances = instances.filter((inst, index) => !group.some(item => instanceMatches(inst, item, clientId, index)));
      const removed = instances.length - nextInstances.length;
      const unmatched = group.filter(item => !instances.some((inst, index) => instanceMatches(inst, item, clientId, index)));
      failed.push(...unmatched);
      if (removed === 0) continue;
      await persistBackupInstances(clientId, modulesData, nextInstances);
      deleted += removed;
    } catch {
      failed.push(...group);
    }
  }
  return {
    deleted,
    failed
  };
}

async function postSaveJobsSync(path, jobIds) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jobIds
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Sync failed");
  return data;
}

/** Synchronise les jobs mappés sélectionnés (CheckMK + HYCU si applicable). */
export async function bulkSyncBackupJobs(items = []) {
  const jobIds = collectSyncableBackupJobIds(items);
  if (!jobIds.length) {
    return {
      updated: 0,
      skipped: items.length,
      lastSync: null
    };
  }
  let updated = 0;
  let lastSync = null;
  const errors = [];
  try {
    const checkmk = await postSaveJobsSync("/checkmk/save-jobs/sync", jobIds);
    updated += Number(checkmk.updated) || 0;
    if (checkmk.lastSync) lastSync = checkmk.lastSync;
  } catch (err) {
    errors.push(err);
  }
  try {
    const hycu = await postSaveJobsSync("/hycu/save-jobs/sync", jobIds);
    updated += Number(hycu.updated) || 0;
  } catch {
    // HYCU optionnel : ne bloque pas si l’intégration est absente
  }
  if (errors.length && updated === 0) throw errors[0];
  return {
    updated: updated || jobIds.length,
    skipped: Math.max(0, items.length - jobIds.length),
    lastSync
  };
}
