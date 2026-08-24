import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaPlus, FaTrash, FaSearch, FaTimes, FaSync } from "react-icons/fa";
import { toast } from "react-toastify";
import { fetchCyberPageData, fetchClientModules, saveClientModules } from "../../api/clients";
import API_BASE_URL from "../../config";
import styles from "../CybersecuritePage/CybersecuritePage.module.css";
import InstanceBackupModal from "../CybersecuritePage/InstanceSauvegardeModal";
import AddJobModal from "../CybersecuritePage/AddJobModal";
import EquipmentMappingModal from "./EquipmentMappingModal";
import SmartTooltip from "../SmartTooltip";
import { getBackupJobStatus, getBackupJobStatusLabel, getBackupJobStatusTitle, getBackupJobRowStyle, compareBackupJobsByStatus, computeBackupJobStats } from "../CybersecuritePage/backupJobStatusUtils";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCyberModalsCopy } from "../CybersecuritePage/cyberModalsI18n";
import BackupMspDashboard from "./BackupMspDashboard";
import { getBackupMspDashboardCopy } from "./backupMspDashboardI18n";
import { getBackupMspPanelCopy } from "./backupMspPanelI18n";
import { interpolate } from "../../i18n/translate";
import { getLocaleTag } from "../../i18n/locales";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import { formatServeurLieLabel, isBackupJobActive, normalizeServeurLieList } from "../EnterprisesPage/backupJobUtils";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
const BACKUPS_CACHE_KEY = "cyber_backups_cache_v1";
const BACKUPS_CACHE_TTL_MS = 3 * 60 * 1000;
const CYBER_PAGE_DATA_CACHE_KEY = "cyber_page_data_cache_v1";
const CYBER_PAGE_DATA_CACHE_TTL_MS = 5 * 60 * 1000;
function readCache(key, ttlMs) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const isFresh = parsed?.savedAt && Date.now() - parsed.savedAt < ttlMs;
    return isFresh ? parsed.data : null;
  } catch {
    return null;
  }
}
function writeCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({
      savedAt: Date.now(),
      data
    }));
  } catch {}
}
export default function BackupMspPanel({
  onNavigate,
  onStatsChange,
  onIssueJobsChange,
  visible = true,
  embedded = false,
  copy: copyProp = null,
  localeTag: localeTagProp = null,
  initialJobStatusFilter = null
}) {
  const locale = useAppLocale();
  const localeTag = localeTagProp || getLocaleTag(locale);
  const internalCopy = useMemo(() => getBackupMspPanelCopy(locale), [locale]);
  const copy = copyProp || internalCopy;
  const dashboardCopy = useMemo(() => getBackupMspDashboardCopy(locale), [locale]);
  const cyberCopy = useMemo(() => getCyberModalsCopy(locale), [locale]);
  const backupsControllerRef = useRef(null);
  const clientsControllerRef = useRef(null);
  const clientsLoadPromiseRef = useRef(null);
  const clientsWithModulesLoadedRef = useRef(false);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [backupData, setBackupData] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [mappingModalEquipment, setMappingModalEquipment] = useState(null);
  const [instanceBackupModal, setInstanceBackupModal] = useState({
    open: false,
    mode: "add",
    instanceType: null,
    clientId: null,
    clientName: null,
    instance: null
  });
  const [addJobModalOpen, setAddJobModalOpen] = useState(false);
  const [searchQuery] = useState("");
  const [selectedClients] = useState(() => new Set());
  const [selectedBackupTables] = useState(new Set());
  const [backupJobStatusFilter, setBackupJobStatusFilter] = useState(initialJobStatusFilter);
  const [showBackupInstances, setShowBackupInstances] = useState(false);
  const [jobsSearchQuery, setJobsSearchQuery] = useState("");
  const [jobsSyncLoading, setJobsSyncLoading] = useState(false);
  const [jobsLastSyncDate, setJobsLastSyncDate] = useState(null);
  const [jobsSortBy, setJobsSortBy] = useState("last_backup_start");
  const [jobsSortOrder, setJobsSortOrder] = useState("asc");
  const [hycuSortBy, setHycuSortBy] = useState("clientName");
  const [hycuSortOrder, setHycuSortOrder] = useState("asc");
  const [veeamSortBy, setVeeamSortBy] = useState("clientName");
  const [veeamSortOrder, setVeeamSortOrder] = useState("asc");
  const [activeBackupSortBy, setActiveBackupSortBy] = useState("clientName");
  const [activeBackupSortOrder, setActiveBackupSortOrder] = useState("asc");
  const [hyperBackupSortBy, setHyperBackupSortBy] = useState("clientName");
  const [hyperBackupSortOrder, setHyperBackupSortOrder] = useState("asc");
  const invalidateBackupsCache = useCallback(() => {
    try {
      sessionStorage.removeItem(BACKUPS_CACHE_KEY);
    } catch {}
  }, []);
  const loadClients = useCallback(async ({
    force = false,
    skipCache = false
  } = {}) => {
    if (clientsLoadPromiseRef.current) {
      return await clientsLoadPromiseRef.current;
    }
    if (clientsWithModulesLoadedRef.current && !force) return clients;
    const request = (async () => {
      try {
        setLoadingClients(true);
        clientsControllerRef.current?.abort();
        const controller = createTrackedAbortController();
        clientsControllerRef.current = controller;
        if (!skipCache) {
          try {
            const raw = sessionStorage.getItem(CYBER_PAGE_DATA_CACHE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw);
              const isFresh = parsed?.savedAt && parsed?.data && Array.isArray(parsed.data.clients) && Date.now() - parsed.savedAt < CYBER_PAGE_DATA_CACHE_TTL_MS;
              if (isFresh) {
                setClients(parsed.data.clients);
                clientsWithModulesLoadedRef.current = true;
                return parsed.data.clients;
              }
            }
          } catch {}
        }
        const payload = await fetchCyberPageData({
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        const clientsData = Array.isArray(payload?.clients) ? payload.clients : [];
        setClients(clientsData);
        clientsWithModulesLoadedRef.current = true;
        try {
          sessionStorage.setItem(CYBER_PAGE_DATA_CACHE_KEY, JSON.stringify({
            savedAt: Date.now(),
            data: {
              clients: clientsData,
              campaigns: payload?.campaigns || []
            }
          }));
        } catch {}
        return clientsData;
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error("Error while loading des clients:", error);
        return null;
      } finally {
        setLoadingClients(false);
      }
    })();
    clientsLoadPromiseRef.current = request;
    const data = await request;
    clientsLoadPromiseRef.current = null;
    return data;
  }, [clients]);
  const loadAllBackups = useCallback(async (clientsList = null, options = {}) => {
    const skipCache = options?.skipCache === true;
    const fromRetry = options?.fromRetry === true;
    const list = clientsList != null ? clientsList : clients;
    const hasModulesData = Array.isArray(list) && list.some(client => client?.equipements && typeof client.equipements === "object");
    try {
      if (!hasModulesData && !fromRetry) {
        const enrichedClients = await loadClients({
          force: true,
          skipCache: true
        });
        if (Array.isArray(enrichedClients)) {
          return await loadAllBackups(enrichedClients, {
            skipCache: true,
            fromRetry: true
          });
        }
      }
      if (!skipCache) {
        const cached = readCache(BACKUPS_CACHE_KEY, BACKUPS_CACHE_TTL_MS);
        if (cached?.backupData) {
          setBackupData(Array.isArray(cached.backupData) ? cached.backupData : []);
          if (cached.jobsLastSyncDate) setJobsLastSyncDate(cached.jobsLastSyncDate);
          return;
        }
      }
      setLoadingBackups(true);
      backupsControllerRef.current?.abort();
      const backupsController = createTrackedAbortController();
      backupsControllerRef.current = backupsController;
      const allBackups = [];
      let resolvedLastSyncDate = jobsLastSyncDate || null;
      (list || []).forEach(client => {
        if (!client.equipements?.Sauvegarde) return;
        const sauvegarde = client.equipements.Sauvegarde;
        const instances = sauvegarde.instances || [];
        instances.forEach(instance => {
          allBackups.push({
            id: instance.id || `instance-${client.id}-${instance.logiciel}`,
            clientId: client.id,
            clientName: client.name || client.nom || copy.unknownClient,
            type: "instance",
            logiciel: instance.logiciel || "",
            server: instance.server || "",
            version: instance.version || "",
            expiration: instance.expiration || "",
            instanceId: instance.id,
            rawData: instance
          });
          const jobs = instance.jobs || [];
          jobs.forEach(job => {
            const jobId = job.id || `job-${client.id}-${instance.id}-${job.nom}`;
            const checkmkMapping = job.checkmk_host_name || job.checkmk_service_name ? {
              checkmk_host_name: job.checkmk_host_name || null,
              checkmk_site: job.checkmk_site || null,
              checkmk_service_name: job.checkmk_service_name || null,
              is_active: true
            } : null;
            allBackups.push({
              id: jobId,
              clientId: client.id,
              clientName: client.name || client.nom || copy.unknownClient,
              type: "job",
              instanceId: instance.id,
              instanceLogiciel: instance.logiciel || "",
              nom: job.nom || "",
              typeBackup: job.type || "",
              regularite: job.regularite || "",
              horaire: job.horaire || "",
              retention: job.retention || "",
              destination: job.destination || "",
              serveurLie: normalizeServeurLieList(job.serveurLie),
              stockageLie: job.stockageLie || "",
              replicationVers: job.replicationVers || "",
              isDefault: job.isDefault || false,
              actif: isBackupJobActive(job),
              isMapped: !!checkmkMapping,
              checkmkMapping,
              last_backup_date: job.last_backup_date ?? null,
              last_backup_start: job.last_backup_start ?? null,
              last_backup_duration: job.last_backup_duration ?? null,
              rawData: job
            });
          });
        });
      });
      setBackupData(allBackups);
      try {
        const syncRes = await fetch(`${API_BASE_URL}/checkmk/save-jobs/last-sync`, {
          credentials: "include",
          signal: backupsController.signal
        });
        if (syncRes.ok) {
          const syncData = await syncRes.json().catch(() => ({}));
          if (syncData.lastSync) {
            resolvedLastSyncDate = syncData.lastSync;
            setJobsLastSyncDate(syncData.lastSync);
          }
        }
      } catch {}
      writeCache(BACKUPS_CACHE_KEY, {
        backupData: allBackups,
        jobsLastSyncDate: resolvedLastSyncDate
      });
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error while loading des sauvegardes:", error);
      setBackupData([]);
    } finally {
      setLoadingBackups(false);
    }
  }, [clients, jobsLastSyncDate, loadClients]);
  const syncJobsFromCheckMK = useCallback(async () => {
    try {
      setJobsSyncLoading(true);
      const res = await fetch(`${API_BASE_URL}/checkmk/save-jobs/sync`, {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || copy.toasts.syncError);
        return;
      }
      toast.success(data.message && data.updated != null ? `${data.message} (${data.updated} updated)` : copy.toasts.syncDone);
      if (data.lastSync) setJobsLastSyncDate(data.lastSync);
      await loadClients({
        force: true,
        skipCache: true
      });
      invalidateBackupsCache();
      await loadAllBackups(null, {
        skipCache: true
      });
    } catch (err) {
      console.error("Sync jobs CheckMK:", err);
      toast.error(copy.toasts.syncError);
    } finally {
      setJobsSyncLoading(false);
    }
  }, [invalidateBackupsCache, loadAllBackups, loadClients, copy]);
  const handleDeleteJob = useCallback(async item => {
    if (!item?.clientId || !item?.id || !item?.instanceId) return;
    if (!window.confirm(interpolate(cyberCopy.deleteBackupJob, {
      name: item.nom || item.id
    }))) return;
    try {
      const data = await fetchClientModules(item.clientId);
      const equipements = data.equipements || {};
      const instances = (equipements.Sauvegarde?.instances || []).map(inst => {
        if ((inst.id || inst.instanceId) !== item.instanceId) return inst;
        const jobs = (inst.jobs || []).filter(j => j.id !== item.id);
        return {
          ...inst,
          jobs
        };
      });
      await saveClientModules(item.clientId, {
        equipements: {
          ...equipements,
          Backup: {
            instances
          }
        }
      });
      toast.success(copy.toasts.jobDeleted);
      const clientsData = await loadClients({
        force: true,
        skipCache: true
      });
      if (Array.isArray(clientsData)) {
        invalidateBackupsCache();
        loadAllBackups(clientsData, {
          skipCache: true
        });
      }
    } catch (err) {
      toast.error(err?.message || copy.toasts.deleteError);
    }
  }, [cyberCopy, copy, invalidateBackupsCache, loadAllBackups, loadClients]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const modulesClients = await loadClients({
        force: false
      });
      if (cancelled) return;
      if (Array.isArray(modulesClients) && modulesClients.length > 0) {
        await loadAllBackups(modulesClients);
      }
    })();
    return () => {
      cancelled = true;
      backupsControllerRef.current?.abort();
      clientsControllerRef.current?.abort();
    };
  }, [loadAllBackups, loadClients]);
  useEffect(() => {
    const handler = () => {
      invalidateBackupsCache();
      loadClients({
        force: true,
        skipCache: true
      }).then(data => {
        if (Array.isArray(data)) loadAllBackups(data, {
          skipCache: true
        });
      });
    };
    window.addEventListener("veritas:backups-changed", handler);
    return () => window.removeEventListener("veritas:backups-changed", handler);
  }, [invalidateBackupsCache, loadAllBackups, loadClients]);
  useEffect(() => {
    if (initialJobStatusFilter) {
      setBackupJobStatusFilter(initialJobStatusFilter);
    }
  }, [initialJobStatusFilter]);
  const filteredHYCU = useMemo(() => {
    if (selectedBackupTables.size > 0 && !selectedBackupTables.has("HYCU")) return [];
    let filtered = backupData.filter(item => item.type === "instance" && item.logiciel === "HYCU Backup");
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => item.clientName.toLowerCase().includes(query) || item.logiciel && item.logiciel.toLowerCase().includes(query) || item.version && item.version.toLowerCase().includes(query) || item.server && item.server.toLowerCase().includes(query));
    }
    if (selectedClients.size > 0) {
      filtered = filtered.filter(item => selectedClients.has(item.clientName));
    }
    return filtered;
  }, [backupData, searchQuery, selectedClients, selectedBackupTables]);
  const filteredVeeam = useMemo(() => {
    if (selectedBackupTables.size > 0 && !selectedBackupTables.has("Veeam")) return [];
    let filtered = backupData.filter(item => item.type === "instance" && item.logiciel === "Veeam");
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => item.clientName.toLowerCase().includes(query) || item.logiciel && item.logiciel.toLowerCase().includes(query) || item.version && item.version.toLowerCase().includes(query) || item.server && item.server.toLowerCase().includes(query));
    }
    if (selectedClients.size > 0) {
      filtered = filtered.filter(item => selectedClients.has(item.clientName));
    }
    return filtered;
  }, [backupData, searchQuery, selectedClients, selectedBackupTables]);
  const filteredActiveBackup = useMemo(() => {
    if (selectedBackupTables.size > 0 && !selectedBackupTables.has("Active Backup")) return [];
    let filtered = backupData.filter(item => item.type === "instance" && item.logiciel === "Active Backup for Microsoft 365");
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => item.clientName.toLowerCase().includes(query) || item.logiciel && item.logiciel.toLowerCase().includes(query) || item.version && item.version.toLowerCase().includes(query) || item.server && item.server.toLowerCase().includes(query));
    }
    if (selectedClients.size > 0) {
      filtered = filtered.filter(item => selectedClients.has(item.clientName));
    }
    return filtered;
  }, [backupData, searchQuery, selectedClients, selectedBackupTables]);
  const filteredHyperBackup = useMemo(() => {
    if (selectedBackupTables.size > 0 && !selectedBackupTables.has("HyperBackup")) return [];
    let filtered = backupData.filter(item => item.type === "instance" && item.logiciel === "HyperBackup");
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => item.clientName.toLowerCase().includes(query) || item.logiciel && item.logiciel.toLowerCase().includes(query) || item.version && item.version.toLowerCase().includes(query) || item.server && item.server.toLowerCase().includes(query));
    }
    if (selectedClients.size > 0) {
      filtered = filtered.filter(item => selectedClients.has(item.clientName));
    }
    return filtered;
  }, [backupData, searchQuery, selectedClients, selectedBackupTables]);
  const sortByKey = (list, key, order) => {
    const sorted = [...list];
    const mult = order === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      let va = a[key] ?? (a.rawData && a.rawData[key]) ?? "";
      let vb = b[key] ?? (b.rawData && b.rawData[key]) ?? "";
      if (key === "expiration" || key === "clientName" || typeof va === "string") {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
        return mult * (va < vb ? -1 : va > vb ? 1 : 0);
      }
      if (typeof va === "number" && typeof vb === "number") return mult * (va - vb);
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
      return mult * (va < vb ? -1 : va > vb ? 1 : 0);
    });
    return sorted;
  };
  const sortedHYCU = useMemo(() => sortByKey(filteredHYCU, hycuSortBy, hycuSortOrder), [filteredHYCU, hycuSortBy, hycuSortOrder]);
  const sortedVeeam = useMemo(() => sortByKey(filteredVeeam, veeamSortBy, veeamSortOrder), [filteredVeeam, veeamSortBy, veeamSortOrder]);
  const sortedActiveBackup = useMemo(() => {
    const sorted = [...filteredActiveBackup];
    const mult = activeBackupSortOrder === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      let va;
      let vb;
      if (activeBackupSortBy === "clientName") {
        va = (a.clientName || "").toLowerCase();
        vb = (b.clientName || "").toLowerCase();
      } else if (activeBackupSortBy === "activeBackupStorage") {
        va = (a.rawData && a.rawData.activeBackupStorage || "").toLowerCase();
        vb = (b.rawData && b.rawData.activeBackupStorage || "").toLowerCase();
      } else {
        const modsA = a.rawData?.activeBackupModules || {};
        const modsB = b.rawData?.activeBackupModules || {};
        va = Object.values(modsA).filter(Boolean).length;
        vb = Object.values(modsB).filter(Boolean).length;
        return mult * (va - vb);
      }
      return mult * (va < vb ? -1 : va > vb ? 1 : 0);
    });
    return sorted;
  }, [filteredActiveBackup, activeBackupSortBy, activeBackupSortOrder]);
  const sortedHyperBackup = useMemo(() => sortByKey(filteredHyperBackup, hyperBackupSortBy, hyperBackupSortOrder), [filteredHyperBackup, hyperBackupSortBy, hyperBackupSortOrder]);
  const filteredJobs = useMemo(() => {
    let filtered = backupData.filter(item => item.type === "job");
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => item.clientName.toLowerCase().includes(query) || item.nom && item.nom.toLowerCase().includes(query) || item.typeBackup && item.typeBackup.toLowerCase().includes(query) || item.instanceLogiciel && item.instanceLogiciel.toLowerCase().includes(query) || formatServeurLieLabel(item.serveurLie, "").toLowerCase().includes(query) || item.destination && item.destination.toLowerCase().includes(query));
    }
    if (selectedClients.size > 0) {
      filtered = filtered.filter(item => selectedClients.has(item.clientName));
    }
    return filtered;
  }, [backupData, searchQuery, selectedClients]);
  const backupJobStats = useMemo(() => computeBackupJobStats(filteredJobs), [filteredJobs]);
  useEffect(() => {
    onStatsChange?.(backupJobStats);
  }, [backupJobStats, onStatsChange]);
  const issueJobs = useMemo(() => filteredJobs.filter(job => {
    const status = getBackupJobStatus(job);
    return status === "critical" || status === "warning";
  }), [filteredJobs]);
  useEffect(() => {
    onIssueJobsChange?.(issueJobs);
  }, [issueJobs, onIssueJobsChange]);
  const jobsAfterStatusFilter = useMemo(() => {
    if (!backupJobStatusFilter) return filteredJobs;
    return filteredJobs.filter(job => {
      const status = getBackupJobStatus(job);
      if (backupJobStatusFilter === "issues") return status === "critical" || status === "warning";
      if (backupJobStatusFilter === "critical") return status === "critical";
      if (backupJobStatusFilter === "warning") return status === "warning";
      if (backupJobStatusFilter === "ok") return status === "ok";
      if (backupJobStatusFilter === "inactive") return status === "inactive";
      return true;
    });
  }, [filteredJobs, backupJobStatusFilter]);
  const displayedJobs = useMemo(() => {
    if (!jobsSearchQuery.trim()) return jobsAfterStatusFilter;
    const query = jobsSearchQuery.toLowerCase();
    return jobsAfterStatusFilter.filter(item => item.clientName.toLowerCase().includes(query) || item.nom && item.nom.toLowerCase().includes(query) || item.typeBackup && item.typeBackup.toLowerCase().includes(query) || item.instanceLogiciel && item.instanceLogiciel.toLowerCase().includes(query) || formatServeurLieLabel(item.serveurLie, "").toLowerCase().includes(query) || item.destination && item.destination.toLowerCase().includes(query) || item.regularite && item.regularite.toLowerCase().includes(query) || item.horaire && String(item.horaire).toLowerCase().includes(query) || item.retention && item.retention.toLowerCase().includes(query));
  }, [jobsAfterStatusFilter, jobsSearchQuery]);
  const sortedDisplayedJobs = useMemo(() => {
    const sorted = [...displayedJobs];
    const key = jobsSortBy;
    const order = jobsSortOrder === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      const statusCmp = compareBackupJobsByStatus(a, b);
      if (statusCmp !== 0) return statusCmp;
      let va = a[key];
      let vb = b[key];
      if (key === "last_backup_date") {
        va = va ?? a.rawData?.last_backup_date;
        vb = vb ?? b.rawData?.last_backup_date;
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
        return order * (va - vb);
      }
      if (key === "last_backup_start") {
        va = va ?? a.rawData?.last_backup_start;
        vb = vb ?? b.rawData?.last_backup_start;
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
        return order * (va - vb);
      }
      if (va == null || va === "") va = "";
      if (vb == null || vb === "") vb = "";
      return order * String(va).toLowerCase().localeCompare(String(vb).toLowerCase(), localeTag);
    });
    return sorted;
  }, [displayedJobs, jobsSortBy, jobsSortOrder]);
  const backupTableCounts = useMemo(() => ({
    hycu: backupData.filter(item => item.type === "instance" && item.logiciel === "HYCU Backup").length,
    veeam: backupData.filter(item => item.type === "instance" && item.logiciel === "Veeam").length,
    activeBackup: backupData.filter(item => item.type === "instance" && item.logiciel === "Active Backup for Microsoft 365").length,
    hyperBackup: backupData.filter(item => item.type === "instance" && item.logiciel === "HyperBackup").length,
    jobs: backupData.filter(item => item.type === "job").length
  }), [backupData]);
  const toggleBackupJobStatusFilter = filterKey => {
    setBackupJobStatusFilter(prev => prev === filterKey ? null : filterKey);
  };
  const handleJobsSort = column => {
    if (jobsSortBy === column) {
      setJobsSortOrder(jobsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setJobsSortBy(column);
      setJobsSortOrder("asc");
    }
  };
  const JobsSortIcon = ({
    column
  }) => jobsSortBy !== column ? null : <span>{jobsSortOrder === "asc" ? " ↑" : " ↓"}</span>;
  const handleHycuSort = column => {
    if (hycuSortBy === column) setHycuSortOrder(hycuSortOrder === "asc" ? "desc" : "asc");else {
      setHycuSortBy(column);
      setHycuSortOrder("asc");
    }
  };
  const HycuSortIcon = ({
    column
  }) => hycuSortBy !== column ? null : <span>{hycuSortOrder === "asc" ? " ↑" : " ↓"}</span>;
  const handleVeeamSort = column => {
    if (veeamSortBy === column) setVeeamSortOrder(veeamSortOrder === "asc" ? "desc" : "asc");else {
      setVeeamSortBy(column);
      setVeeamSortOrder("asc");
    }
  };
  const VeeamSortIcon = ({
    column
  }) => veeamSortBy !== column ? null : <span>{veeamSortOrder === "asc" ? " ↑" : " ↓"}</span>;
  const handleActiveBackupSort = column => {
    if (activeBackupSortBy === column) setActiveBackupSortOrder(activeBackupSortOrder === "asc" ? "desc" : "asc");else {
      setActiveBackupSortBy(column);
      setActiveBackupSortOrder("asc");
    }
  };
  const ActiveBackupSortIcon = ({
    column
  }) => activeBackupSortBy !== column ? null : <span>{activeBackupSortOrder === "asc" ? " ↑" : " ↓"}</span>;
  const handleHyperBackupSort = column => {
    if (hyperBackupSortBy === column) setHyperBackupSortOrder(hyperBackupSortOrder === "asc" ? "desc" : "asc");else {
      setHyperBackupSortBy(column);
      setHyperBackupSortOrder("asc");
    }
  };
  const HyperBackupSortIcon = ({
    column
  }) => hyperBackupSortBy !== column ? null : <span>{hyperBackupSortOrder === "asc" ? " ↑" : " ↓"}</span>;
  const openMappingModal = item => {
    setMappingModalEquipment({
      id: item.id,
      name: item.nom,
      nom: item.nom,
      type: "Backup",
      clientId: item.clientId,
      clientName: item.clientName,
      checkmkMapping: item.checkmkMapping || null
    });
  };
  const handleRefreshAfterSave = async () => {
    const data = await loadClients({
      force: true,
      skipCache: true
    });
    if (Array.isArray(data)) {
      invalidateBackupsCache();
      loadAllBackups(data, {
        skipCache: true
      });
    }
  };
  if (!visible) return null;
  if (embedded) {
    return <>
        <BackupMspDashboard jobs={filteredJobs} loading={loadingBackups || loadingClients} syncing={jobsSyncLoading} onSync={syncJobsFromCheckMK} copy={dashboardCopy} bcp47={localeTag} onOpenJob={job => {
        if (!onNavigate || !job) return;
        onNavigate("JobDetail", job);
      }} onOpenClient={row => {
        if (!onNavigate || !row?.clientId) return;
        onNavigate("ContratDetail", {
          clientId: row.clientId,
          name: row.clientName
        });
      }} />

        {addJobModalOpen ? <AddJobModal open={addJobModalOpen} onClose={() => setAddJobModalOpen(false)} clients={clients} onSaved={handleRefreshAfterSave} /> : null}

        {instanceBackupModal.open ? <InstanceBackupModal open={instanceBackupModal.open} onClose={() => setInstanceBackupModal(prev => ({
        ...prev,
        open: false
      }))} mode={instanceBackupModal.mode} instanceType={instanceBackupModal.instanceType} clientId={instanceBackupModal.clientId} clientName={instanceBackupModal.clientName} instance={instanceBackupModal.instance} clients={clients} onSaved={handleRefreshAfterSave} /> : null}
      </>;
  }
  const panelContent = <div className={styles.tablesContainer}>
          {backupJobStats.total > 0 && <div className={`${styles.backupAlertBar} ${backupJobStats.issues > 0 ? styles.backupAlertBarHasIssues : ""}`}>
              <div className={styles.backupAlertBarLabel}>
                <Icon icon="mdi:backup-restore" className={styles.backupAlertBarIcon} />
                <span>{copy.alertBar.label}</span>
              </div>
              <div className={styles.backupAlertPills}>
                <button type="button" className={`${styles.backupAlertPill} ${styles.backupAlertPillIssues} ${backupJobStatusFilter === "issues" ? styles.backupAlertPillActive : ""}`} onClick={() => toggleBackupJobStatusFilter("issues")} disabled={backupJobStats.issues === 0} title={copy.alertBar.alertsTitle}>
                  <Icon icon="mdi:bell-alert" />
                  {copy.formatAlertCount(backupJobStats.issues)}
                </button>
                <button type="button" className={`${styles.backupAlertPill} ${styles.backupAlertPillCritical} ${backupJobStatusFilter === "critical" ? styles.backupAlertPillActive : ""}`} onClick={() => toggleBackupJobStatusFilter("critical")} disabled={backupJobStats.critical === 0} title={copy.alertBar.criticalTitle}>
                  <Icon icon="mdi:alert-circle" />
                  {copy.formatCriticalCount(backupJobStats.critical)}
                </button>
                <button type="button" className={`${styles.backupAlertPill} ${styles.backupAlertPillWarning} ${backupJobStatusFilter === "warning" ? styles.backupAlertPillActive : ""}`} onClick={() => toggleBackupJobStatusFilter("warning")} disabled={backupJobStats.warning === 0} title={copy.alertBar.warningTitle}>
                  <Icon icon="mdi:alert" />
                  {copy.formatWarningCount(backupJobStats.warning)}
                </button>
                <button type="button" className={`${styles.backupAlertPill} ${styles.backupAlertPillOk} ${backupJobStatusFilter === "ok" ? styles.backupAlertPillActive : ""}`} onClick={() => toggleBackupJobStatusFilter("ok")} disabled={backupJobStats.ok === 0} title={copy.alertBar.okTitle}>
                  <Icon icon="mdi:check-circle" />
                  {copy.formatOkCount(backupJobStats.ok)}
                </button>
                <button type="button" className={`${styles.backupAlertPill} ${styles.backupAlertPillInactive} ${backupJobStatusFilter === "inactive" ? styles.backupAlertPillActive : ""}`} onClick={() => toggleBackupJobStatusFilter("inactive")} disabled={backupJobStats.inactive === 0} title={copy.alertBar.inactiveTitle}>
                  <Icon icon="mdi:pause-circle-outline" />
                  {copy.formatInactiveCount(backupJobStats.inactive)}
                </button>
                {backupJobStatusFilter && <button type="button" className={styles.backupAlertPillClear} onClick={() => setBackupJobStatusFilter(null)}>
                    <FaTimes /> {copy.alertBar.showAll}
                  </button>}
              </div>
              <div className={styles.backupAlertActions}>
                <SmartTooltip as="span" content={copy.alertBar.syncTooltip}>
                  <button type="button" className={styles.backupAlertSyncBtn} onClick={syncJobsFromCheckMK} disabled={jobsSyncLoading}>
                    <FaSync className={jobsSyncLoading ? styles.spinIcon : undefined} />
                    {jobsSyncLoading ? copy.alertBar.syncLoading : copy.alertBar.sync}
                  </button>
                </SmartTooltip>
                {jobsLastSyncDate && <span className={styles.backupAlertMeta}>
                    {copy.alertBar.syncPrefix}{" "}
                    {(() => {
            try {
              return new Date(jobsLastSyncDate).toLocaleString(localeTag, {
                dateStyle: "short",
                timeStyle: "short"
              });
            } catch {
              return jobsLastSyncDate;
            }
          })()}
                  </span>}
                {backupJobStats.issues > 0 && !backupJobStatusFilter && <span className={styles.backupAlertHint}>
                    {copy.formatJobsToTreat(backupJobStats.issues)}
                  </span>}
              </div>
            </div>}

          <div className={styles.backupJobsSection}>
            <div className={styles.tableSectionHeaderJobs}>
              <div className={styles.tableSectionTitle}>
                <Icon icon="mdi:backup-restore" className={styles.tableSectionIcon} />
                <h2>{copy.jobsTitle}</h2>
                <span className={styles.tableSectionCount}>
                  ({displayedJobs.length}
                  {jobsSearchQuery.trim() || backupJobStatusFilter ? ` / ${filteredJobs.length}` : ""})
                </span>
              </div>
              <div className={styles.jobsHeaderActionsCenter}>
                <div className={styles.jobsSearchBox}>
                  <FaSearch className={styles.searchIcon} />
                  <input type="text" placeholder={copy.jobsSearchPlaceholder} value={jobsSearchQuery} onChange={e => setJobsSearchQuery(e.target.value)} className={styles.searchInput} aria-label={copy.jobsSearchAria} />
                  {jobsSearchQuery && <button type="button" onClick={() => setJobsSearchQuery("")} className={styles.clearButton} aria-label={copy.clearSearchAria}>
                      <FaTimes />
                    </button>}
                </div>
                <button type="button" className={styles.addInstanceButton} onClick={() => setAddJobModalOpen(true)} title={copy.addJobTitle} aria-label={copy.addJobAria}>
                  <FaPlus />
                </button>
              </div>
              <div className={styles.jobsHeaderSpacer} aria-hidden="true" />
            </div>
            {loadingBackups || loadingClients ? <div className={styles.loadingState}>
                <Icon icon="mdi:loading" className={styles.loadingIcon} />
                <p>{copy.loading.jobs}</p>
              </div> : filteredJobs.length === 0 ? <MspEmptyState icon="mdi:backup-restore" title={copy.empty.noJobsTitle} text={copy.empty.noJobsText} /> : displayedJobs.length === 0 ? <MspEmptyState icon="mdi:magnify" title={copy.empty.noResultsTitle} text={copy.empty.noResultsText} /> : <div className={styles.tableWrapper}>
                <table className={styles.equipmentTable}>
                  <thead>
                    <tr>
                      <th>{copy.table.status}</th>
                      <th onClick={() => handleJobsSort("clientName")} style={{
                cursor: "pointer"
              }}>
                        {copy.table.client} <JobsSortIcon column="clientName" />
                      </th>
                      <th onClick={() => handleJobsSort("nom")} style={{
                cursor: "pointer"
              }}>
                        {copy.table.name} <JobsSortIcon column="nom" />
                      </th>
                      <th onClick={() => handleJobsSort("typeBackup")} style={{
                cursor: "pointer"
              }}>
                        {copy.table.type} <JobsSortIcon column="typeBackup" />
                      </th>
                      <th onClick={() => handleJobsSort("serveurLie")} style={{
                cursor: "pointer"
              }}>
                        {copy.table.server} <JobsSortIcon column="serveurLie" />
                      </th>
                      <th onClick={() => handleJobsSort("destination")} style={{
                cursor: "pointer"
              }}>
                        {copy.table.destination} <JobsSortIcon column="destination" />
                      </th>
                      <th onClick={() => handleJobsSort("last_backup_start")} style={{
                cursor: "pointer"
              }}>
                        {copy.table.lastBackup} <JobsSortIcon column="last_backup_start" />
                      </th>
                      <th onClick={() => handleJobsSort("last_backup_duration")} style={{
                cursor: "pointer"
              }}>
                        {copy.table.duration} <JobsSortIcon column="last_backup_duration" />
                      </th>
                      <th>{copy.table.mapping}</th>
                      <th>{copy.table.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDisplayedJobs.map((item, index) => {
              const jobStatus = getBackupJobStatus(item);
              const statusLabel = getBackupJobStatusLabel(jobStatus);
              const statusTitle = getBackupJobStatusTitle(jobStatus);
              const badgeClass = jobStatus === "critical" ? styles.jobStatusBadgeCritical : jobStatus === "warning" ? styles.jobStatusBadgeWarning : jobStatus === "ok" ? styles.jobStatusBadgeOk : jobStatus === "inactive" ? styles.jobStatusBadgeInactive : jobStatus === "unmapped" ? styles.jobStatusBadgeUnmapped : styles.jobStatusBadgeHycu;
              return <tr key={`${item.id}-${index}`} className={styles.equipmentRow} style={{
                cursor: "default",
                ...getBackupJobRowStyle(jobStatus)
              }} title={statusTitle}>
                          <td>
                            <span className={`${styles.jobStatusBadge} ${badgeClass}`}>{statusLabel}</span>
                          </td>
                          <td className={item.clientId ? styles.clickableClientCell : ""}>
                            <div className={styles.nameCell} onClick={e => {
                    e.stopPropagation();
                    if (onNavigate && item.clientId) {
                      onNavigate("ContratDetail", {
                        clientId: item.clientId,
                        name: item.clientName
                      });
                    }
                  }} style={item.clientId ? {
                    cursor: "pointer"
                  } : {}} title={item.clientId ? copy.table.viewClient : ""}>
                              <span>{item.clientName}</span>
                            </div>
                          </td>
                          <td>{item.nom || "-"}</td>
                          <td>
                            {item.typeBackup ? item.typeBackup.charAt(0).toUpperCase() + item.typeBackup.slice(1) : "-"}
                          </td>
                          <td>{formatServeurLieLabel(item.serveurLie, "-")}</td>
                          <td className={styles.boldCell}>
                            {item.instanceLogiciel === "HYCU Backup" ? "DataCenter PSI" : item.destination || "-"}
                          </td>
                          <td className={`${styles.dateCell} ${styles.boldCell}`}>
                            {item.last_backup_start ?? item.rawData?.last_backup_start ? (() => {
                    try {
                      return new Date(item.last_backup_start ?? item.rawData?.last_backup_start).toLocaleString(localeTag, {
                        dateStyle: "short",
                        timeStyle: "short"
                      });
                    } catch {
                      return String(item.last_backup_start ?? item.rawData?.last_backup_start ?? "-");
                    }
                  })() : "-"}
                          </td>
                          <td className={styles.boldCell}>{item.last_backup_duration || "-"}</td>
                          <td>
                            {jobStatus === "hycu" ? <span className={styles.unmappedBadge} style={{
                    opacity: 0.6
                  }} title={copy.table.hycuNoSync}>
                                -
                              </span> : <div className={styles.mappingCell} role="button" tabIndex={0} onClick={() => openMappingModal(item)} onKeyDown={e => {
                    if (e.key === "Enter") openMappingModal(item);
                  }} style={{
                    cursor: "pointer"
                  }}>
                                {item.isMapped ? <span className={styles.mappedBadge} title={`Mapped: ${item.checkmkMapping?.checkmk_host_name || "CheckMK"}`}>
                                    <Icon icon="simple-icons:checkmk" style={{
                        width: "18px",
                        height: "18px"
                      }} />
                                  </span> : <span className={styles.unmappedBadge} title={copy.table.mapCheckmk}>
                                    <Icon icon="simple-icons:checkmk" style={{
                        width: "18px",
                        height: "18px",
                        opacity: 0.5
                      }} />
                                  </span>}
                              </div>}
                          </td>
                          <td>
                            <button type="button" className={styles.deleteJobButton} onClick={e => {
                    e.stopPropagation();
                    handleDeleteJob(item);
                  }} title={copy.table.deleteJob} aria-label={copy.table.deleteJob}>
                              <FaTrash />
                            </button>
                          </td>
                        </tr>;
            })}
                  </tbody>
                </table>
              </div>}
          </div>

          <div className={styles.backupInstancesCollapsible}>
            <button type="button" className={styles.backupInstancesToggle} onClick={() => setShowBackupInstances(open => !open)}>
              <Icon icon={showBackupInstances ? "mdi:chevron-up" : "mdi:chevron-down"} />
              {copy.formatInstancesToggle(backupTableCounts.hycu + backupTableCounts.veeam + backupTableCounts.activeBackup + backupTableCounts.hyperBackup)}
            </button>
            {showBackupInstances && <div className={styles.backupInstancesGrid}>
                {(selectedBackupTables.size === 0 || selectedBackupTables.has("HYCU")) && <div className={styles.equipmentTableSection}>
                    <div className={styles.tableSectionHeader}>
                      <div className={styles.tableSectionTitle}>
                        <img src="/assets/icons/hycu.png" alt="HYCU Backup" style={{
                width: "24px",
                height: "24px",
                display: "inline-block",
                verticalAlign: "middle",
                marginRight: "0.75rem",
                borderRadius: "4px"
              }} />
                        <h2>HYCU Backup</h2>
                        <span className={styles.tableSectionCount}>({filteredHYCU.length})</span>
                      </div>
                      <button type="button" className={styles.addInstanceButton} onClick={() => setInstanceBackupModal({
              open: true,
              mode: "add",
              instanceType: "HYCU Backup",
              clientId: null,
              clientName: null,
              instance: null
            })} title="Add a HYCU instance" aria-label="Add a HYCU instance">
                        <FaPlus />
                      </button>
                    </div>
                    {loadingBackups ? <div className={styles.loadingState}>
                        <Icon icon="mdi:loading" className={styles.loadingIcon} />
                        <p>{copy.loading.hycu}</p>
                      </div> : filteredHYCU.length === 0 ? <MspEmptyState icon="mdi:server" title={copy.instances.noHycuTitle} text={copy.instances.noHycuText} /> : <div className={styles.tableWrapper}>
                        <table className={styles.equipmentTable}>
                          <thead>
                            <tr>
                              <th onClick={() => handleHycuSort("clientName")} style={{
                    cursor: "pointer"
                  }}>
                                Client <HycuSortIcon column="clientName" />
                              </th>
                              <th onClick={() => handleHycuSort("server")} style={{
                    cursor: "pointer"
                  }}>
                                Nom <HycuSortIcon column="server" />
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedHYCU.map((item, index) => <tr key={`${item.id}-${index}`} className={styles.equipmentRow} style={{
                  cursor: "pointer",
                  backgroundColor: "#f9fafb"
                }} onClick={() => setInstanceBackupModal({
                  open: true,
                  mode: "edit",
                  instanceType: null,
                  clientId: item.clientId,
                  clientName: item.clientName,
                  instance: item.rawData
                })}>
                                <td className={item.clientId ? styles.clickableClientCell : ""}>
                                  <div className={styles.nameCell} onClick={e => {
                      e.stopPropagation();
                      if (onNavigate && item.clientId) {
                        onNavigate("ContratDetail", {
                          clientId: item.clientId,
                          name: item.clientName
                        });
                      }
                    }} style={item.clientId ? {
                      cursor: "pointer"
                    } : {}} title={item.clientId ? copy.table.viewClient : ""}>
                                    <span>{item.clientName}</span>
                                  </div>
                                </td>
                                <td>{item.server || item.logiciel || "-"}</td>
                              </tr>)}
                          </tbody>
                        </table>
                      </div>}
                  </div>}

                {(selectedBackupTables.size === 0 || selectedBackupTables.has("Veeam")) && <div className={styles.equipmentTableSection}>
                    <div className={styles.tableSectionHeader}>
                      <div className={styles.tableSectionTitle}>
                        <img src="/assets/icons/veeam.png" alt="Veeam" style={{
                width: "24px",
                height: "24px",
                display: "inline-block",
                verticalAlign: "middle",
                marginRight: "0.75rem",
                borderRadius: "4px"
              }} />
                        <h2>Veeam</h2>
                        <span className={styles.tableSectionCount}>({filteredVeeam.length})</span>
                      </div>
                      <button type="button" className={styles.addInstanceButton} onClick={() => setInstanceBackupModal({
              open: true,
              mode: "add",
              instanceType: "Veeam",
              clientId: null,
              clientName: null,
              instance: null
            })} title="Add a Veeam instance" aria-label="Add a Veeam instance">
                        <FaPlus />
                      </button>
                    </div>
                    {loadingBackups ? <div className={styles.loadingState}>
                        <Icon icon="mdi:loading" className={styles.loadingIcon} />
                        <p>{copy.loading.veeam}</p>
                      </div> : filteredVeeam.length === 0 ? <MspEmptyState icon="mdi:server" title={copy.instances.noVeeamTitle} text={copy.instances.noVeeamText} /> : <div className={styles.tableWrapper}>
                        <table className={styles.equipmentTable}>
                          <thead>
                            <tr>
                              <th onClick={() => handleVeeamSort("clientName")} style={{
                    cursor: "pointer"
                  }}>
                                Client <VeeamSortIcon column="clientName" />
                              </th>
                              <th onClick={() => handleVeeamSort("server")} style={{
                    cursor: "pointer"
                  }}>
                                Nom <VeeamSortIcon column="server" />
                              </th>
                              <th onClick={() => handleVeeamSort("expiration")} style={{
                    cursor: "pointer"
                  }}>
                                Expiration <VeeamSortIcon column="expiration" />
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedVeeam.map((item, index) => {
                  const expirationStr = item.expiration || item.rawData?.expiration;
                  let expirationMs = null;
                  try {
                    if (expirationStr) expirationMs = new Date(expirationStr).getTime();
                  } catch {}
                  const now = Date.now();
                  const J30 = 30 * 24 * 60 * 60 * 1000;
                  const isExpired = expirationMs != null && expirationMs < now;
                  const isExpiringSoon = expirationMs != null && expirationMs >= now && expirationMs - now <= J30;
                  const rowStyle = {
                    cursor: "pointer",
                    backgroundColor: isExpired ? "#fee2e2" : isExpiringSoon ? "#ffedd5" : "#f9fafb"
                  };
                  return <tr key={`${item.id}-${index}`} className={styles.equipmentRow} style={rowStyle} title={isExpired ? "License expired" : isExpiringSoon ? "License expires within 30 days" : ""} onClick={() => setInstanceBackupModal({
                    open: true,
                    mode: "edit",
                    instanceType: null,
                    clientId: item.clientId,
                    clientName: item.clientName,
                    instance: item.rawData
                  })}>
                                  <td className={item.clientId ? styles.clickableClientCell : ""}>
                                    <div className={styles.nameCell} onClick={e => {
                        e.stopPropagation();
                        if (onNavigate && item.clientId) {
                          onNavigate("ContratDetail", {
                            clientId: item.clientId,
                            name: item.clientName
                          });
                        }
                      }} style={item.clientId ? {
                        cursor: "pointer"
                      } : {}} title={item.clientId ? copy.table.viewClient : ""}>
                                      <span>{item.clientName}</span>
                                    </div>
                                  </td>
                                  <td>{item.server || item.logiciel || "-"}</td>
                                  <td className={styles.dateCell}>
                                    {item.expiration ? new Date(item.expiration).toLocaleDateString("en-US") : "-"}
                                  </td>
                                </tr>;
                })}
                          </tbody>
                        </table>
                      </div>}
                  </div>}

                {(selectedBackupTables.size === 0 || selectedBackupTables.has("Active Backup")) && <div className={styles.equipmentTableSection}>
                    <div className={styles.tableSectionHeader}>
                      <div className={styles.tableSectionTitle}>
                        <img src="/assets/icons/active-backup.png" alt="Active Backup for Microsoft 365" style={{
                width: "24px",
                height: "24px",
                display: "inline-block",
                verticalAlign: "middle",
                marginRight: "0.75rem",
                borderRadius: "4px"
              }} />
                        <h2>Active Backup for Microsoft 365</h2>
                        <span className={styles.tableSectionCount}>({filteredActiveBackup.length})</span>
                      </div>
                      <button type="button" className={styles.addInstanceButton} onClick={() => setInstanceBackupModal({
              open: true,
              mode: "add",
              instanceType: "Active Backup for Microsoft 365",
              clientId: null,
              clientName: null,
              instance: null
            })} title="Add an Active Backup instance" aria-label="Add an Active Backup instance">
                        <FaPlus />
                      </button>
                    </div>
                    {loadingBackups ? <div className={styles.loadingState}>
                        <Icon icon="mdi:loading" className={styles.loadingIcon} />
                        <p>{copy.loading.activeBackup}</p>
                      </div> : filteredActiveBackup.length === 0 ? <MspEmptyState icon="mdi:sync" title={copy.instances.noActiveBackupTitle} text={copy.instances.noActiveBackupText} /> : <div className={styles.tableWrapper}>
                        <table className={styles.equipmentTable}>
                          <thead>
                            <tr>
                              <th onClick={() => handleActiveBackupSort("clientName")} style={{
                    cursor: "pointer"
                  }}>
                                Client <ActiveBackupSortIcon column="clientName" />
                              </th>
                              <th onClick={() => handleActiveBackupSort("activeBackupModules")} style={{
                    cursor: "pointer"
                  }}>
                                Enabled modules <ActiveBackupSortIcon column="activeBackupModules" />
                              </th>
                              <th onClick={() => handleActiveBackupSort("activeBackupStorage")} style={{
                    cursor: "pointer"
                  }}>
                                Storage de destination <ActiveBackupSortIcon column="activeBackupStorage" />
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedActiveBackup.map((item, index) => {
                  const rawData = item.rawData || {};
                  const activeBackupModules = rawData.activeBackupModules || {};
                  const allModules = [{
                    key: "oneDrive",
                    label: "OneDrive",
                    icon: "entypo-social:onedrive"
                  }, {
                    key: "sharePoint",
                    label: "SharePoint",
                    icon: "mdi:microsoft-sharepoint"
                  }, {
                    key: "exchange",
                    label: "Exchange",
                    icon: "simple-icons:microsoftexchange"
                  }, {
                    key: "teams",
                    label: "Teams",
                    icon: "simple-icons:microsoftteams"
                  }, {
                    key: "calendar",
                    label: "Calendar",
                    icon: "mdi:calendar"
                  }, {
                    key: "contacts",
                    label: "Contacts",
                    icon: "mdi:contacts"
                  }];
                  const nasDestination = rawData.activeBackupStorage || "-";
                  return <tr key={`${item.id}-${index}`} className={styles.equipmentRow} style={{
                    cursor: "pointer",
                    backgroundColor: "#f9fafb"
                  }} onClick={() => setInstanceBackupModal({
                    open: true,
                    mode: "edit",
                    instanceType: null,
                    clientId: item.clientId,
                    clientName: item.clientName,
                    instance: item.rawData
                  })}>
                                  <td className={item.clientId ? styles.clickableClientCell : ""}>
                                    <div className={styles.nameCell} onClick={e => {
                        e.stopPropagation();
                        if (onNavigate && item.clientId) {
                          onNavigate("ContratDetail", {
                            clientId: item.clientId,
                            name: item.clientName
                          });
                        }
                      }} style={item.clientId ? {
                        cursor: "pointer"
                      } : {}} title={item.clientId ? copy.table.viewClient : ""}>
                                      <span>{item.clientName}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className={styles.activeBackupModulesCell}>
                                      {allModules.map(module => {
                          const isActive = !!activeBackupModules[module.key];
                          return <span key={module.key} className={isActive ? styles.activeBackupModuleOn : styles.activeBackupModuleOff} title={`${module.label}: ${isActive ? "enabled" : "inactive"}`}>
                                            <Icon icon={module.icon} style={{
                              width: "18px",
                              height: "18px"
                            }} />
                                          </span>;
                        })}
                                    </div>
                                  </td>
                                  <td>{nasDestination}</td>
                                </tr>;
                })}
                          </tbody>
                        </table>
                      </div>}
                  </div>}

                {(selectedBackupTables.size === 0 || selectedBackupTables.has("HyperBackup")) && <div className={styles.equipmentTableSection}>
                    <div className={styles.tableSectionHeader}>
                      <div className={styles.tableSectionTitle}>
                        <img src="/assets/icons/hyperbackup.png" alt="HyperBackup" style={{
                width: "24px",
                height: "24px",
                display: "inline-block",
                verticalAlign: "middle",
                marginRight: "0.75rem",
                borderRadius: "4px"
              }} />
                        <h2>HyperBackup</h2>
                        <span className={styles.tableSectionCount}>({filteredHyperBackup.length})</span>
                      </div>
                      <button type="button" className={styles.addInstanceButton} onClick={() => setInstanceBackupModal({
              open: true,
              mode: "add",
              instanceType: "HyperBackup",
              clientId: null,
              clientName: null,
              instance: null
            })} title="Add a HyperBackup instance" aria-label="Add a HyperBackup instance">
                        <FaPlus />
                      </button>
                    </div>
                    {loadingBackups ? <div className={styles.loadingState}>
                        <Icon icon="mdi:loading" className={styles.loadingIcon} />
                        <p>{copy.loading.hyperBackup}</p>
                      </div> : filteredHyperBackup.length === 0 ? <MspEmptyState icon="mdi:sync" title={copy.instances.noHyperBackupTitle} text={copy.instances.noHyperBackupText} /> : <div className={styles.tableWrapper}>
                        <table className={styles.equipmentTable}>
                          <thead>
                            <tr>
                              <th onClick={() => handleHyperBackupSort("clientName")} style={{
                    cursor: "pointer"
                  }}>
                                Client <HyperBackupSortIcon column="clientName" />
                              </th>
                              <th onClick={() => handleHyperBackupSort("hyperbackupSource")} style={{
                    cursor: "pointer"
                  }}>
                                Nas d&apos;origine <HyperBackupSortIcon column="hyperbackupSource" />
                              </th>
                              <th onClick={() => handleHyperBackupSort("hyperbackupDestination")} style={{
                    cursor: "pointer"
                  }}>
                                Nas de destination <HyperBackupSortIcon column="hyperbackupDestination" />
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedHyperBackup.map((item, index) => {
                  const rawData = item.rawData || {};
                  const nasSource = rawData.hyperbackupSource ? rawData.hyperbackupSource.replace(/^(NAS|SAN)-/, "") : "-";
                  const nasDestination = rawData.hyperbackupDestination ? rawData.hyperbackupDestination.replace(/^(NAS|SAN|DISQUE)-/, "").replace(/-\d+$/, "") : "-";
                  return <tr key={`${item.id}-${index}`} className={styles.equipmentRow} style={{
                    cursor: "pointer",
                    backgroundColor: "#f9fafb"
                  }} onClick={() => setInstanceBackupModal({
                    open: true,
                    mode: "edit",
                    instanceType: null,
                    clientId: item.clientId,
                    clientName: item.clientName,
                    instance: item.rawData
                  })}>
                                  <td className={item.clientId ? styles.clickableClientCell : ""}>
                                    <div className={styles.nameCell} onClick={e => {
                        e.stopPropagation();
                        if (onNavigate && item.clientId) {
                          onNavigate("ContratDetail", {
                            clientId: item.clientId,
                            name: item.clientName
                          });
                        }
                      }} style={item.clientId ? {
                        cursor: "pointer"
                      } : {}} title={item.clientId ? copy.table.viewClient : ""}>
                                      <span>{item.clientName}</span>
                                    </div>
                                  </td>
                                  <td>{nasSource}</td>
                                  <td>{nasDestination}</td>
                                </tr>;
                })}
                          </tbody>
                        </table>
                      </div>}
                  </div>}
              </div>}
          </div>
    </div>;
  return <>
      {embedded ? panelContent : <div className={styles.tabPanel}>{panelContent}</div>}

      {mappingModalEquipment && <EquipmentMappingModal isOpen={!!mappingModalEquipment} onClose={() => setMappingModalEquipment(null)} equipment={mappingModalEquipment} requireService={true} onMappingSaved={mapping => {
      if (mappingModalEquipment) {
        setBackupData(prev => prev.map(item => item.id === mappingModalEquipment.id && item.clientId === mappingModalEquipment.clientId ? {
          ...item,
          checkmkMapping: mapping || null,
          isMapped: !!(mapping && mapping.checkmk_host_name && mapping.is_active !== false)
        } : item));
      }
      setMappingModalEquipment(null);
    }} />}

      {addJobModalOpen && <AddJobModal open={addJobModalOpen} onClose={() => setAddJobModalOpen(false)} clients={clients} onSaved={handleRefreshAfterSave} />}

      {instanceBackupModal.open && <InstanceBackupModal open={instanceBackupModal.open} onClose={() => setInstanceBackupModal(prev => ({
      ...prev,
      open: false
    }))} mode={instanceBackupModal.mode} instanceType={instanceBackupModal.instanceType} clientId={instanceBackupModal.clientId} clientName={instanceBackupModal.clientName} instance={instanceBackupModal.instance} clients={clients} onSaved={handleRefreshAfterSave} />}
    </>;
}
