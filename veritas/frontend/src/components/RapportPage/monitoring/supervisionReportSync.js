import API_BASE_URL from "../../../config";
import { collectCheckMKMappedEquipment } from "./checkmkReportCacheUtils";
import { syncAndPersistAntivirusSolution, normalizeAntivirusItem, formatAntivirusSolutionLabel } from "../../EnterprisesPage/antivirusSolutionUtils";
import { syncAndPersistAntispamSolution, normalizeAntispamItem, formatAntispamSolutionLabel } from "../../EnterprisesPage/antispamSolutionUtils";

function fill(template, vars = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ""));
}

function listSolutions(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.solutions)) return raw.solutions;
  return [];
}

function listBackupInstances(raw) {
  if (!raw) return [];
  if (Array.isArray(raw.instances)) return raw.instances;
  return [];
}

function equipmentLabel(item, fallback = "") {
  const name = item?.nom || item?.name || item?.logiciel || item?.fqdn || item?.checkmk_host_name || fallback;
  return String(name || fallback).trim() || fallback;
}

function hasOffice365Tenant(client) {
  if (client?.has_azure_credentials || client?.hasAzureCredentials || client?.azureHasCredentials) return true;
  const raw = client?.equipements?.Office365;
  if (!raw || typeof raw !== "object") return false;
  if (Array.isArray(raw)) return raw.length > 0;
  const data = raw.data || raw;
  if (data && typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length > 0 && !(keys.length === 1 && data.enabled === true)) return true;
  }
  return false;
}

export function getOffice365SyncPeriod(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 10) return "D7";
  if (diffDays <= 45) return "D30";
  if (diffDays <= 120) return "D90";
  return "D90";
}

export async function syncOffice365ForClient(clientId, startDate, endDate, { signal } = {}) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid report period");
  }
  end.setHours(23, 59, 59, 999);
  const period = getOffice365SyncPeriod(start, end);
  const response = await fetch(
    `${API_BASE_URL}/office365/sync-all?clientId=${encodeURIComponent(clientId)}&period=${period}&startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal
    }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Office 365 sync failed");
  }
  return result;
}

export async function syncBackupJobsForClient(clientId, { signal } = {}) {
  const res = await fetch(`${API_BASE_URL}/checkmk/save-jobs/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    signal,
    body: JSON.stringify({ clientId: clientId ?? null })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Backup jobs sync failed");
  }
  return data;
}

async function persistNddDomain(clientId, domaine, ovhDomain, { signal } = {}) {
  if (!clientId) throw new Error("Client not found.");
  if (!domaine?.id) throw new Error("Domain ID missing.");
  const domainName = domaine?.nom || domaine?.name || domaine?.fqdn || "";
  const expiration = ovhDomain.expiration || ovhDomain.expirationDate || null;
  const nextData = {
    ...(domaine.data && typeof domaine.data === "object" ? domaine.data : domaine),
    nom: domainName,
    name: domainName,
    expiration,
    expirationDate: expiration,
    registrar: ovhDomain.registrar || domaine.registrar || "OVH",
    ovhSyncedAt: new Date().toISOString()
  };
  delete nextData.id;
  delete nextData.is_active;
  delete nextData.checkmk_host_name;
  delete nextData.checkmk_site;
  delete nextData.checkmk_service_name;
  const response = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/ndd/${domaine.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    signal,
    body: JSON.stringify({
      item_key: domaine.item_key || domainName,
      name: domaine.name || domainName,
      data: nextData,
      is_active: domaine.is_active !== false
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || "Error saving the domain.");
  }
  return expiration;
}

export async function syncNddDomainForClient(clientId, domaine, { signal } = {}) {
  const domainName = domaine?.nom || domaine?.name || domaine?.fqdn || "";
  if (!domainName) throw new Error("Domain name missing.");
  const response = await fetch(`${API_BASE_URL}/ovh/domain/${encodeURIComponent(domainName)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    signal
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Unable to fetch ${domainName} from OVH`);
  }
  const result = await response.json();
  if (!result.success || !result.domain) {
    throw new Error(`OVH data unavailable for ${domainName}`);
  }
  await persistNddDomain(clientId, domaine, result.domain, { signal });
  return result.domain;
}

/**
 * Build sequential sync jobs for every configured integration on the client.
 */
export function buildSupervisionSyncJobs(client, {
  copy = {},
  fetchCheckMKHost,
  onCheckMKHostDone,
  signal
} = {}) {
  const jobs = [];
  const clientId = client?.id ?? client?.uuid;
  const eq = client?.equipements || {};

  const mappings = collectCheckMKMappedEquipment(eq);
  mappings.forEach((mapping, index) => {
    const hostName = mapping.checkmk_host_name;
    if (!hostName) return;
    const name = equipmentLabel(mapping.item, hostName);
    jobs.push({
      id: `checkmk-${mapping.equipment_id ?? hostName}-${index}`,
      group: "supervision",
      label: fill(copy.hostLabel, { name }),
      estimatedMs: 4000,
      run: async () => {
        if (typeof fetchCheckMKHost !== "function") {
          throw new Error("CheckMK fetch is unavailable.");
        }
        if (!client?.reportStartDate || !client?.reportEndDate) {
          throw new Error("Report period is not defined.");
        }
        const startDate = new Date(client.reportStartDate);
        const endDate = new Date(client.reportEndDate);
        endDate.setHours(23, 59, 59, 999);
        const { cacheEntry, status } = await fetchCheckMKHost(hostName, mapping.checkmk_site || null, startDate.toISOString(), endDate.toISOString());
        const key = mapping.equipment_id != null ? String(mapping.equipment_id) : null;
        if (key && typeof onCheckMKHostDone === "function") {
          onCheckMKHostDone(key, cacheEntry, status);
        }
      }
    });
  });

  const backupInstances = listBackupInstances(eq.Sauvegarde || eq.Backup);
  if (backupInstances.length > 0 && clientId) {
    jobs.push({
      id: "backup-jobs",
      group: "backup",
      label: copy.backupJobs || "Backup jobs",
      estimatedMs: 8000,
      run: () => syncBackupJobsForClient(clientId, { signal })
    });
  }

  listSolutions(eq.Antivirus).forEach((solution, index) => {
    const normalized = normalizeAntivirusItem(solution);
    if (!normalized?.companyId) return;
    const name = normalized.companyName || formatAntivirusSolutionLabel(normalized) || normalized.nom || "Bitdefender";
    jobs.push({
      id: `antivirus-${normalized.companyId}-${index}`,
      group: "antivirus",
      label: fill(copy.antivirusLabel, { name }),
      estimatedMs: 18000,
      run: () => syncAndPersistAntivirusSolution(clientId, solution, { signal })
    });
  });

  listSolutions(eq.Antispam).forEach((solution, index) => {
    const normalized = normalizeAntispamItem(solution);
    if (!normalized?.customerId) return;
    const name = normalized.customerName || formatAntispamSolutionLabel(normalized) || normalized.nom || "Mailinblack";
    jobs.push({
      id: `antispam-${normalized.customerId}-${index}`,
      group: "antispam",
      label: fill(copy.antispamLabel, { name }),
      estimatedMs: 12000,
      run: () => syncAndPersistAntispamSolution(clientId, solution, { signal })
    });
  });

  if (hasOffice365Tenant(client) && clientId && client?.reportStartDate && client?.reportEndDate) {
    jobs.push({
      id: "office365",
      group: "office365",
      label: copy.office365 || "Microsoft 365",
      estimatedMs: 20000,
      run: async () => {
        if (typeof window !== "undefined" && typeof window.__office365SyncTrigger === "function") {
          try {
            window.__office365SyncTrigger();
          } catch (err) {
            console.error("Office365 sync trigger error:", err);
          }
        }
        await syncOffice365ForClient(clientId, client.reportStartDate, client.reportEndDate, { signal });
      }
    });
  }

  const domaines = Array.isArray(eq.NDD) ? eq.NDD : [];
  domaines.forEach((domaine, index) => {
    const name = equipmentLabel(domaine, domaine?.fqdn || "");
    if (!name) return;
    jobs.push({
      id: `ndd-${domaine.id ?? name}-${index}`,
      group: "ndd",
      label: fill(copy.nddLabel, { name }),
      estimatedMs: 2500,
      run: () => syncNddDomainForClient(clientId, domaine, { signal })
    });
  });

  return jobs;
}

export async function runSupervisionSyncJobs(jobs, { onProgress, isCancelled } = {}) {
  const durations = [];
  let ok = 0;
  let fail = 0;
  const initialEta = jobs.reduce((sum, job) => sum + (job.estimatedMs || 5000), 0);
  onProgress?.({ type: "start", total: jobs.length, etaMs: initialEta, ok: 0, fail: 0 });

  for (let i = 0; i < jobs.length; i += 1) {
    if (isCancelled?.()) {
      return { ok, fail, cancelled: true, completed: i };
    }
    onProgress?.({ type: "item", index: i, state: "running" });
    const started = Date.now();
    try {
      await jobs[i].run();
      ok += 1;
      durations.push(Date.now() - started);
      onProgress?.({ type: "item", index: i, state: "ok" });
    } catch (err) {
      if (err?.name === "AbortError") {
        return { ok, fail, cancelled: true, completed: i };
      }
      fail += 1;
      onProgress?.({
        type: "item",
        index: i,
        state: "error",
        error: err?.message || String(err)
      });
    }
    const remainingJobs = jobs.slice(i + 1);
    const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const etaFromAvg = remainingJobs.length * avg;
    const etaFromEstimates = remainingJobs.reduce((sum, job) => sum + (job.estimatedMs || 5000), 0);
    const etaMs = durations.length >= 2
      ? Math.round(etaFromAvg)
      : Math.round(0.45 * etaFromAvg + 0.55 * etaFromEstimates);
    onProgress?.({
      type: "tick",
      completed: i + 1,
      total: jobs.length,
      etaMs,
      ok,
      fail
    });
  }

  return { ok, fail, cancelled: false, completed: jobs.length };
}

export { fill as fillSyncCopy };
