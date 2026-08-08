import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchClientsList, fetchClientModules, fetchClientGeneral } from "../../api/clients";
import { getCheckMKReportPeriodData } from "../../api/checkmkReportPeriod";
import { fetchMonitoringDocuments, saveMonitoringDocument } from "../../api/monitoringDocuments";
import API_BASE_URL from "../../config";
import styles from "./RapportPage.module.css";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import ReportCreateWizard from "./RapportCreateWizard";
import ReportBuilderPlaceholder from "./RapportBuilderPlaceholder";
import ReportInterventionBuilder from "./intervention/RapportInterventionBuilder";
import { REPORT_TYPE_IDS } from "./reportTypeConstants";
import MonitoringSteps, { getEnabledMonitoringSteps } from "./monitoring/MonitoringSteps";
import { applyEquipmentPatchToEquipements } from "./monitoring/equipmentPatchUtils";
import { buildCheckMKCacheEntry, buildCheckMKReportSnapshot, computeCheckMKEquipmentStatus, deriveServicesFromPeriodEvents, filterCheckMKEventsForReportPeriod, resolveCheckMKEquipmentKey } from "./monitoring/checkmkReportCacheUtils";
import enterpriseStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import builderStyles from "./monitoring/RapportMonitoringBuilder.module.css";
import { confirmLeaveMonitoringReport, isMonitoringReportBuilderActive } from "../../utils/monitoringReportGuard";
import saveModalStyles from "../Monitoring/MonitoringSummary/MonitoringSummary.module.css";
import { exportReportAsZIP, buildReportZipBlob } from "./exportRapportZip";
import { uploadReportArchiveToClientVault } from "../../utils/uploadReportToClientVault";
import ReportSaveVisibilitySwitch from "../shared/ReportSaveVisibilitySwitch";
import { safeJsonClone } from "../../utils/safeJson";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getRapportPageCopy, getReportTypes } from "./rapportPageI18n";
const RAPPORT_CLIENTS_CACHE_KEY = "rapport_clients_list_cache_v1";
const RAPPORT_CLIENTS_CACHE_TTL_MS = 5 * 60 * 1000;
function normalizeClientListRow(client) {
  let modulesSnapshot = client.modules;
  if (typeof modulesSnapshot === "string") {
    try {
      modulesSnapshot = JSON.parse(modulesSnapshot);
    } catch {
      modulesSnapshot = {};
    }
  }
  if (!modulesSnapshot || typeof modulesSnapshot !== "object") {
    modulesSnapshot = {};
  }
  return {
    ...client,
    modules_monitoring: modulesSnapshot
  };
}
async function loadReportClientsListCached({
  force = false,
  signal
} = {}) {
  if (!force) {
    try {
      const raw = sessionStorage.getItem(RAPPORT_CLIENTS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const isFresh = parsed?.savedAt && Array.isArray(parsed?.data) && Date.now() - parsed.savedAt < RAPPORT_CLIENTS_CACHE_TTL_MS;
        if (isFresh) {
          return parsed.data.map(normalizeClientListRow);
        }
      }
    } catch {}
  }
  const clientsData = await fetchClientsList({
    signal
  });
  if (signal?.aborted) return [];
  const normalized = (Array.isArray(clientsData) ? clientsData : []).map(normalizeClientListRow);
  try {
    sessionStorage.setItem(RAPPORT_CLIENTS_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      data: normalized
    }));
  } catch {}
  return normalized;
}
export default function ReportPage({
  onNavigate,
  hasTabsBar = false,
  onMonitoringReportGuardChange
}) {
  const locale = useAppLocale();
  const pageCopy = useMemo(() => getRapportPageCopy(locale), [locale]);
  const reportTypes = useMemo(() => getReportTypes(pageCopy, pageCopy.localeCode || locale), [pageCopy, locale]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [builderType, setBuilderType] = useState(null);
  const [builderClient, setBuilderClient] = useState(null);
  const [builderStepIndex, setBuilderStepIndex] = useState(0);
  const [createWizardStep, setCreateWizardStep] = useState("client");
  const [selectedReportTypeId, setSelectedReportTypeId] = useState(null);
  const [draftReport, setDraftReport] = useState(null);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const builderSectionRef = useRef(null);
  const summaryContentRef = useRef(null);
  const [equipmentComments, setEquipmentComments] = useState({});
  const [activeCommentsTarget, setActiveCommentsTarget] = useState(null);
  const [generalComments, setGeneralComments] = useState([]);
  const [pendingEquipmentComment, setPendingEquipmentComment] = useState("");
  const [pendingGeneralComment, setPendingGeneralComment] = useState("");
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [highlightedEquipmentKey, setHighlightedEquipmentKey] = useState(null);
  const [isSyncingMonitoring, setIsSyncingMonitoring] = useState(false);
  const [syncingEquipmentKey, setSyncingEquipmentKey] = useState(null);
  const [equipmentMonitoringStatus, setEquipmentMonitoringStatus] = useState({});
  const [equipmentCheckMKData, setEquipmentCheckMKData] = useState({});
  const [isSyncingOffice365Report, setIsSyncingOffice365Report] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [saveErrorVisible, setSaveErrorVisible] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const [saveVisibleToClient, setSaveVisibleToClient] = useState(false);
  const [recentDocs, setRecentDocs] = useState([]);
  const [stepStorageState, setStepStorageState] = useState(null);
  const userInitial = useMemo(() => {
    if (typeof window === "undefined") return "L";
    try {
      const name = window.localStorage && window.localStorage.getItem("user_name") || "";
      const email = window.localStorage && window.localStorage.getItem("user_email") || "";
      const source = (name || email).trim();
      return source ? source[0].toUpperCase() : "L";
    } catch (e) {
      return "L";
    }
  }, []);
  useEffect(() => {
    const ac = new AbortController();
    const loadClients = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadReportClientsListCached({
          signal: ac.signal
        });
        if (ac.signal.aborted) return;
        setClients(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("Error loading monitoring clients for ReportPage:", err);
        setError("Unable to load the client list.");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };
    loadClients();
    return () => ac.abort();
  }, []);
  useEffect(() => {
    if (builderType !== "monitoring" || !builderClient?.equipements) return;
    const eq = builderClient.equipements;
    const collect = arr => (Array.isArray(arr) ? arr : []).filter(i => i?.checkmk_host_name && i?.is_active !== false).map(i => ({
      equipment_id: i.id
    }));
    const items = [...collect(eq.Servers), ...collect(eq.Firewalls), ...collect(eq.NAS), ...collect(eq.SAN ?? []), ...collect(eq.Switch), ...collect(eq.BorneWifi)];
    const initialStatuses = {};
    items.forEach(m => {
      if (m.equipment_id) initialStatuses[String(m.equipment_id)] = "unsynced";
    });
    setEquipmentMonitoringStatus(prev => {
      const next = {
        ...prev
      };
      Object.entries(initialStatuses).forEach(([key, status]) => {
        if (next[key] == null) next[key] = status;
      });
      return next;
    });
  }, [builderClient, builderType]);
  const isBuilderActive = isMonitoringReportBuilderActive(builderType, builderClient);
  const isOnSummaryStep = useMemo(() => {
    if (!builderClient || builderType !== "monitoring") return false;
    const steps = getEnabledMonitoringSteps(builderClient);
    return steps[builderStepIndex] === "summary";
  }, [builderClient, builderType, builderStepIndex]);
  useEffect(() => {
    onMonitoringReportGuardChange?.(isBuilderActive);
    return () => onMonitoringReportGuardChange?.(false);
  }, [isBuilderActive, onMonitoringReportGuardChange]);
  const confirmLeaveBuilder = () => {
    if (!isBuilderActive) return true;
    return confirmLeaveMonitoringReport();
  };
  const selectedClient = useMemo(() => clients.find(c => String(c.id) === selectedClientId) || null, [clients, selectedClientId]);
  const handleWizardSelectClient = clientId => {
    setSelectedClientId(clientId);
    setSelectedReportTypeId(null);
    setDraftReport(null);
  };
  const handleStartDraftReport = async reportTypeId => {
    const resolvedTypeId = reportTypeId ?? selectedReportTypeId;
    if (!selectedClient || !resolvedTypeId) return;
    const type = reportTypes.find(entry => entry.id === resolvedTypeId);
    if (!type) return;
    setSelectedReportTypeId(resolvedTypeId);
    const clientForDraft = type.id === REPORT_TYPE_IDS.INTERVENTION ? await enrichBuilderClientWithSites(selectedClient) : selectedClient;
    setDraftReport({
      type,
      client: clientForDraft,
      documentId: null,
      initialData: null,
      documentName: ""
    });
  };
  const handleBackFromDraftReport = () => {
    setDraftReport(null);
    setCreateWizardStep("type");
  };
  const handleBackToSelection = () => {
    if (!confirmLeaveBuilder()) return;
    setBuilderType(null);
    setBuilderClient(null);
    setBuilderStepIndex(0);
    setEquipmentComments({});
    setActiveCommentsTarget(null);
    setIsCommentsDrawerOpen(false);
    setEquipmentMonitoringStatus({});
    setEquipmentCheckMKData({});
    setStepStorageState(null);
  };
  const enrichBuilderClientWithSites = async client => {
    const clientId = client?.id ?? client?.uuid;
    if (!clientId) return client;
    if (Array.isArray(client.sites) && client.sites.length > 0) return client;
    try {
      const generalData = await fetchClientGeneral(clientId);
      if (Array.isArray(generalData?.sites) && generalData.sites.length > 0) {
        return {
          ...client,
          sites: generalData.sites
        };
      }
    } catch (err) {
      console.warn("Unable to load client sites for the report:", err);
    }
    return client;
  };
  const equipmentCommentCounts = useMemo(() => {
    const result = {};
    Object.entries(equipmentComments).forEach(([key, list]) => {
      result[key] = Array.isArray(list) ? list.length : 0;
    });
    return result;
  }, [equipmentComments]);
  const equipmentTicketCounts = useMemo(() => {
    const result = {};
    Object.entries(equipmentComments).forEach(([key, list]) => {
      const count = (list || []).filter(c => c.isTicketComment === true).length;
      if (count > 0) result[key] = count;
    });
    return result;
  }, [equipmentComments]);
  const allCommentsChronological = useMemo(() => {
    const equipment = Object.entries(equipmentComments).flatMap(([equipmentKey, list]) => (list || []).map(c => ({
      ...c,
      equipmentKey,
      scope: "equipment"
    })));
    const general = (generalComments || []).map(c => ({
      ...c,
      scope: "general"
    }));
    const all = [...equipment, ...general];
    const getTime = c => {
      if (!c.createdAt) return 0;
      const t = new Date(c.createdAt).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    all.sort((a, b) => getTime(a) - getTime(b));
    return all;
  }, [equipmentComments, generalComments]);
  const handleOpenEquipmentComments = (item, {
    moduleKey,
    equipmentKey
  }) => {
    if (!item || !moduleKey) return;
    const key = equipmentKey || item.commentKey || item.id || item.uuid || `${moduleKey}:${item.nom || item.name || "unknown"}`;
    setActiveCommentsTarget({
      moduleKey,
      equipmentKey: key,
      equipment: item
    });
    setIsCommentsDrawerOpen(true);
  };
  const handleFocusEquipmentFromComment = (moduleKey, equipmentKey) => {
    if (!builderClient || builderType !== "monitoring") return;
    const stepsArray = getEnabledMonitoringSteps(builderClient);
    const targetIndex = stepsArray.findIndex(k => k === moduleKey);
    if (targetIndex >= 0) {
      setBuilderStepIndex(targetIndex);
    }
    setHighlightedEquipmentKey(equipmentKey);
    setIsCommentsDrawerOpen(true);
    window.clearTimeout(handleFocusEquipmentFromComment._timeoutId);
    handleFocusEquipmentFromComment._timeoutId = window.setTimeout(() => {
      setHighlightedEquipmentKey(null);
    }, 1500);
  };
  const handleCloseEquipmentComments = () => {
    setIsCommentsDrawerOpen(false);
  };
  const handleRefreshBuilderClient = async () => {
    if (!builderClient?.id && !builderClient?.uuid) return;
    const clientId = builderClient.id ?? builderClient.uuid;
    try {
      const modulesData = await fetchClientModules(clientId);
      if (modulesData?.equipements && typeof modulesData.equipements === "object") {
        setBuilderClient(prev => prev ? {
          ...prev,
          equipements: modulesData.equipements
        } : prev);
      }
    } catch (err) {
      console.error("Error reloading report modules:", err);
      toast.error("Unable to reload client data.");
    }
  };
  const handleReportEquipmentSaved = async (formData, createdRow, sourceEquipment, moduleKey, equipmentIndex = -1, equipmentListKey = null) => {
    if (!formData) return;
    if (createdRow) {
      void handleRefreshBuilderClient();
      return;
    }
    setBuilderClient(prev => {
      if (!prev?.equipements) return prev;
      return {
        ...prev,
        equipements: applyEquipmentPatchToEquipements(prev.equipements, moduleKey, formData, sourceEquipment, equipmentListKey, equipmentIndex)
      };
    });
  };
  const fetchCheckMKDataForHost = async (hostName, site, startIso, endIso) => {
    const reportPeriod = {
      start: startIso,
      end: endIso
    };
    const reportPeriodResp = await getCheckMKReportPeriodData(hostName, startIso, endIso, site).catch(() => null);
    const rawEvents = reportPeriodResp?.events?.events ?? [];
    const periodEvents = filterCheckMKEventsForReportPeriod(rawEvents, reportPeriod);
    const criticalEvents = periodEvents.filter(event => Number(event?.state) === 2);
    const availability = reportPeriodResp?.availability?.availability ?? reportPeriodResp?.availability ?? null;
    const periodServices = deriveServicesFromPeriodEvents(periodEvents);
    const parsed = {
      services: periodServices,
      events: criticalEvents,
      availability,
      eventsCount: criticalEvents.length
    };
    return {
      cacheEntry: buildCheckMKCacheEntry(parsed.services, parsed.events, parsed.availability, reportPeriod),
      status: computeCheckMKEquipmentStatus(parsed)
    };
  };
  const handleSyncAllMonitoring = async () => {
    if (!builderClient || builderType !== "monitoring") return;
    if (!builderClient.reportStartDate || !builderClient.reportEndDate) {
      toast.error("The report period is not defined.");
      return;
    }
    const clientId = builderClient.id || builderClient.uuid;
    if (!clientId) {
      toast.error("Unable to identify the client for CheckMK synchronization.");
      return;
    }
    const steps = getEnabledMonitoringSteps(builderClient);
    const currentStepKey = steps[builderStepIndex] || null;
    if (currentStepKey === "Office365") {
      try {
        setIsSyncingOffice365Report(true);
        if (typeof window !== "undefined" && typeof window.__office365SyncTrigger === "function") {
          try {
            window.__office365SyncTrigger();
          } catch (e) {
            console.error("Error synchronizing via the O365 module:", e);
          }
        }
        const headers = {
          "Content-Type": "application/json"
        };
        const startDate = new Date(builderClient.reportStartDate);
        const endDate = new Date(builderClient.reportEndDate);
        endDate.setHours(23, 59, 59, 999);
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        let period = "D30";
        if (diffDays <= 10) {
          period = "D7";
        } else if (diffDays <= 45) {
          period = "D30";
        } else if (diffDays <= 120) {
          period = "D90";
        }
        const response = await fetch(`${API_BASE_URL}/office365/sync-all?clientId=${clientId}&period=${period}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
          method: "GET",
          headers,
          credentials: "include"
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          console.error("Error synchronizing Office 365 for the report:", result);
          toast.error(result.error || "Error during Office 365 synchronization");
        } else {
          toast.success("Microsoft 365 data synchronized successfully");
        }
      } catch (error) {
        console.error("Error synchronizing Office 365 (monitoring report):", error);
        toast.error(error.message || "Error during Office 365 synchronization");
      } finally {
        setIsSyncingOffice365Report(false);
      }
      return;
    }
    setIsSyncingMonitoring(true);
    try {
      const eq = builderClient.equipements || {};
      const collect = arr => (Array.isArray(arr) ? arr : []).filter(i => i?.checkmk_host_name && i?.is_active !== false).map(i => ({
        equipment_id: i.id,
        checkmk_host_name: i.checkmk_host_name,
        checkmk_site: i.checkmk_site ?? null
      }));
      const mappings = [...collect(eq.Servers), ...collect(eq.Firewalls), ...collect(eq.NAS), ...collect(eq.SAN ?? []), ...collect(eq.Switch), ...collect(eq.BorneWifi)];
      if (mappings.length === 0) {
        setEquipmentMonitoringStatus({});
        toast.info("No equipment mapped to CheckMK for this client.");
        return;
      }
      const startDate = new Date(builderClient.reportStartDate);
      const endDate = new Date(builderClient.reportEndDate);
      endDate.setHours(23, 59, 59, 999);
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();
      const results = {};
      const checkMKDataByEquipment = {};
      const concurrency = 3;
      let index = 0;
      const worker = async () => {
        while (index < mappings.length) {
          const currentIndex = index;
          index += 1;
          const mapping = mappings[currentIndex];
          const hostName = mapping.checkmk_host_name;
          if (!hostName) continue;
          const site = mapping.checkmk_site || null;
          try {
            const {
              cacheEntry,
              status
            } = await fetchCheckMKDataForHost(hostName, site, startIso, endIso);
            const equipmentId = mapping.equipment_id;
            if (equipmentId) {
              const key = String(equipmentId);
              results[key] = status;
              checkMKDataByEquipment[key] = cacheEntry;
            }
          } catch (err) {
            console.error("Error synchronizing CheckMK for an equipment item:", err);
          }
        }
      };
      const workers = [];
      for (let i = 0; i < concurrency && i < mappings.length; i += 1) {
        workers.push(worker());
      }
      await Promise.all(workers);
      setEquipmentMonitoringStatus(results);
      setEquipmentCheckMKData(checkMKDataByEquipment);
      toast.success("CheckMK data synchronization complete.");
    } catch (err) {
      console.error("Error during CheckMK synchronization:", err);
      toast.error("Error synchronizing CheckMK data.");
    } finally {
      setIsSyncingMonitoring(false);
    }
  };
  const handleSyncSingleEquipment = async (item, {
    moduleKey,
    equipmentKey
  }) => {
    if (!builderClient || builderType !== "monitoring") return;
    const hostName = item?.checkmk_host_name ?? item?.data?.checkmk_host_name;
    if (!hostName || typeof hostName !== "string" || !hostName.trim()) {
      toast.warn("This equipment has no CheckMK mapping configured.");
      return;
    }
    if (!builderClient.reportStartDate || !builderClient.reportEndDate) {
      toast.error("The report period is not defined.");
      return;
    }
    setSyncingEquipmentKey(equipmentKey);
    setIsSyncingMonitoring(true);
    try {
      const startDate = new Date(builderClient.reportStartDate);
      const endDate = new Date(builderClient.reportEndDate);
      endDate.setHours(23, 59, 59, 999);
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();
      const site = item?.checkmk_site ?? item?.data?.checkmk_site ?? null;
      const {
        cacheEntry,
        status
      } = await fetchCheckMKDataForHost(hostName, site, startIso, endIso);
      const key = resolveCheckMKEquipmentKey(item, equipmentKey);
      if (key) {
        setEquipmentMonitoringStatus(prev => ({
          ...prev,
          [key]: status
        }));
        setEquipmentCheckMKData(prev => ({
          ...prev,
          [key]: cacheEntry
        }));
      }
      toast.success("CheckMK data updated for this equipment.");
    } catch (err) {
      console.error("CheckMK equipment sync error:", err);
      toast.error("Error retrieving CheckMK data.");
    } finally {
      setSyncingEquipmentKey(null);
      setIsSyncingMonitoring(false);
    }
  };
  const handlePublishEquipmentComment = () => {
    const trimmed = String(pendingEquipmentComment || "").trim();
    if (!trimmed || !activeCommentsTarget) return;
    const {
      equipmentKey,
      moduleKey,
      equipment
    } = activeCommentsTarget;
    const equipmentName = equipment?.nom || equipment?.name || equipment?.logiciel || "Equipment";
    const referenceLabel = `${moduleKey || "Equipment"} · ${equipmentName}`;
    const infraModules = ["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "TOIP"];
    const cyberModules = ["Backup", "Antivirus", "Antispam"];
    const servicesModules = ["Office365", "NDD"];
    let category = null;
    if (infraModules.includes(moduleKey)) {
      category = "infra";
    } else if (cyberModules.includes(moduleKey)) {
      category = "cyber";
    } else if (servicesModules.includes(moduleKey)) {
      category = "services";
    }
    setEquipmentComments(prev => {
      const existing = prev[equipmentKey] || [];
      const nextComment = {
        id: Date.now(),
        author: "Vous",
        createdAt: new Date().toISOString(),
        text: trimmed,
        referenceLabel,
        category,
        moduleKey
      };
      return {
        ...prev,
        [equipmentKey]: [...existing, nextComment]
      };
    });
    setPendingEquipmentComment("");
    setActiveCommentsTarget(null);
    setEditingComment(null);
  };
  const handleCancelEquipmentComment = () => {
    setPendingEquipmentComment("");
    setActiveCommentsTarget(null);
    setEditingComment(null);
  };
  useEffect(() => {
    if (showSaveModal) {
      fetchMonitoringDocuments().then(docs => {
        const activeDocs = (docs || []).filter(d => !d.is_trashed && !d.isTrashed && !d.trashed && !d.deleted);
        setRecentDocs(activeDocs);
      }).catch(() => setRecentDocs([]));
    }
  }, [showSaveModal]);
  const refreshRecentDocs = () => {
    fetchMonitoringDocuments().then(docs => {
      const activeDocs = (docs || []).filter(d => !d.is_trashed && !d.isTrashed && !d.trashed && !d.deleted);
      setRecentDocs(activeDocs);
    }).catch(() => setRecentDocs([]));
  };
  const archiveReportToClientVault = async ({
    visibleToClient,
    documentName,
    reportPeriod
  }) => {
    if (!builderClient?.id || !summaryContentRef?.current) return {
      skipped: true
    };
    try {
      const {
        blob,
        fileName
      } = await buildReportZipBlob(summaryContentRef, {
        client: builderClient
      });
      await uploadReportArchiveToClientVault({
        blob,
        fileName: documentName ? `${documentName}.zip` : fileName,
        clientId: builderClient.id,
        clientName: builderClient.name || builderClient.nom || "",
        description: reportPeriod || "",
        visibleToClient
      });
      return {
        success: true
      };
    } catch (err) {
      console.error("Archivage vault:", err);
      return {
        success: false,
        error: err.message
      };
    }
  };
  const handleSaveReport = async (forceOverwrite = false) => {
    if (!saveName.trim() || !builderClient) return null;
    setSaving(true);
    try {
      const configCopy = safeJsonClone({
        client: builderClient
      });
      const dataCopy = safeJsonClone({
        reportComments: {
          equipment: equipmentComments,
          general: generalComments
        },
        stepStates: {
          Storage: stepStorageState
        },
        checkMK: buildCheckMKReportSnapshot(equipmentCheckMKData, equipmentMonitoringStatus, builderClient?.reportStartDate, builderClient?.reportEndDate)
      });
      const clientName = builderClient?.name || builderClient?.nom || "CLIENT";
      const reportPeriod = builderClient?.reportStartDate && builderClient?.reportEndDate ? `From ${formatReportDate(builderClient.reportStartDate)} to ${formatReportDate(builderClient.reportEndDate)}` : builderClient?.reportPeriod || null;
      const result = await saveMonitoringDocument({
        name: saveName.trim(),
        client_name: clientName,
        report_period: reportPeriod,
        config: configCopy,
        data: dataCopy,
        overwrite: forceOverwrite
      });
      if (result && result.success) {
        const vaultResult = await archiveReportToClientVault({
          visibleToClient: saveVisibleToClient,
          documentName: saveName.trim(),
          reportPeriod
        });
        setSaveSuccessVisible(true);
        setSaveName("");
        setShowSaveModal(false);
        refreshRecentDocs();
        setTimeout(() => setSaveSuccessVisible(false), 3000);
        if (vaultResult.success) {
          toast.success(saveVisibleToClient ? "Report saved and shared with the company." : "Report saved (internal agents).");
        } else if (!vaultResult.skipped) {
          toast.warn("Report saved, but document archiving failed.");
        } else {
          toast.success("Report saved.");
        }
        return result;
      }
      if (result && result.message && String(result.message).includes("déjà enregistré")) {
        setPendingSave({
          name: saveName.trim(),
          client_name: clientName,
          report_period: reportPeriod,
          config: configCopy,
          data: dataCopy,
          visibleToClient: saveVisibleToClient
        });
        setShowOverwriteConfirm(true);
        return null;
      }
      setSaveErrorVisible(true);
      setTimeout(() => setSaveErrorVisible(false), 3000);
      toast.error(result?.error || result?.message || "Error while saving.");
      return result;
    } catch (err) {
      setSaveErrorVisible(true);
      setTimeout(() => setSaveErrorVisible(false), 3000);
      toast.error(err?.message || "Error while saving.");
      return {
        success: false,
        error: err?.message
      };
    } finally {
      setSaving(false);
    }
  };
  const handleLoadSavedDocument = doc => {
    if (!doc || !doc.name) return;
    setSaveName(doc.name);
  };
  const handleDownloadZip = async () => {
    if (!builderClient) {
      toast.error("No client selected.");
      return;
    }
    try {
      await exportReportAsZIP(summaryContentRef, {
        client: builderClient
      });
      toast.success("ZIP download started.");
    } catch (err) {
      toast.error(err?.message || "Error during export.");
    }
  };
  const handleOverwriteConfirm = async () => {
    if (!pendingSave) return;
    setSaving(true);
    try {
      const dataWithComments = {
        ...(typeof pendingSave.data === "object" && pendingSave.data !== null ? pendingSave.data : {}),
        reportComments: {
          equipment: equipmentComments,
          general: generalComments
        },
        stepStates: {
          Storage: stepStorageState
        },
        checkMK: buildCheckMKReportSnapshot(equipmentCheckMKData, equipmentMonitoringStatus, builderClient?.reportStartDate, builderClient?.reportEndDate)
      };
      const result = await saveMonitoringDocument({
        name: pendingSave.name,
        client_name: pendingSave.client_name,
        report_period: pendingSave.report_period,
        config: pendingSave.config,
        data: dataWithComments,
        overwrite: true
      });
      if (result && result.success) {
        const vaultResult = await archiveReportToClientVault({
          visibleToClient: pendingSave.visibleToClient ?? saveVisibleToClient,
          documentName: pendingSave.name,
          reportPeriod: pendingSave.report_period
        });
        setSaveSuccessVisible(true);
        setSaveName("");
        setPendingSave(null);
        setShowOverwriteConfirm(false);
        setShowSaveModal(false);
        refreshRecentDocs();
        setTimeout(() => setSaveSuccessVisible(false), 3000);
        if (vaultResult.success) {
          toast.success(pendingSave.visibleToClient ?? saveVisibleToClient ? "Report saved and shared with the company." : "Report saved (internal agents).");
        } else if (!vaultResult.skipped) {
          toast.warn("Report saved, but document archiving failed.");
        } else {
          toast.success("Report updated.");
        }
      } else {
        setSaveErrorVisible(true);
        setTimeout(() => setSaveErrorVisible(false), 3000);
        toast.error(result?.error || "Error while overwriting.");
      }
    } catch (err) {
      setSaveErrorVisible(true);
      setTimeout(() => setSaveErrorVisible(false), 3000);
      toast.error(err?.message || "Error while overwriting.");
    } finally {
      setSaving(false);
    }
  };
  const handlePublishGeneralComment = () => {
    const trimmed = String(pendingGeneralComment || "").trim();
    if (!trimmed) return;
    const nextComment = {
      id: Date.now(),
      author: "Vous",
      createdAt: new Date().toISOString(),
      text: trimmed
    };
    setGeneralComments(prev => [...prev, nextComment]);
    setPendingGeneralComment("");
  };
  const handleCancelGeneralComment = () => {
    setPendingGeneralComment("");
  };
  const handleStartEditEquipmentComment = (equipmentKey, comment) => {
    setEditingComment({
      scope: "equipment",
      equipmentKey,
      id: comment.id,
      text: comment.text || ""
    });
  };
  const handleStartEditGeneralComment = comment => {
    setEditingComment({
      scope: "general",
      id: comment.id,
      text: comment.text || ""
    });
  };
  const handleChangeEditingText = text => {
    setEditingComment(prev => prev ? {
      ...prev,
      text: text != null ? text : ""
    } : prev);
  };
  const handleSaveEditingComment = () => {
    if (!editingComment) return;
    const trimmed = String(editingComment.text || "").trim();
    if (!trimmed) {
      setEditingComment(null);
      return;
    }
    if (editingComment.scope === "equipment" && editingComment.equipmentKey) {
      const {
        equipmentKey,
        id
      } = editingComment;
      setEquipmentComments(prev => {
        const list = prev[equipmentKey] || [];
        return {
          ...prev,
          [equipmentKey]: list.map(c => c.id === id ? {
            ...c,
            text: trimmed
          } : c)
        };
      });
    } else if (editingComment.scope === "general") {
      const {
        id
      } = editingComment;
      setGeneralComments(prev => prev.map(c => c.id === id ? {
        ...c,
        text: trimmed
      } : c));
    }
    setEditingComment(null);
  };
  const handleDeleteEquipmentComment = (equipmentKey, id) => {
    setEquipmentComments(prev => {
      const list = prev[equipmentKey] || [];
      const nextList = list.filter(c => c.id !== id);
      const next = {
        ...prev
      };
      if (nextList.length === 0) {
        delete next[equipmentKey];
      } else {
        next[equipmentKey] = nextList;
      }
      return next;
    });
    if (editingComment && editingComment.scope === "equipment" && editingComment.equipmentKey === equipmentKey && editingComment.id === id) {
      setEditingComment(null);
    }
  };
  const handleDeleteGeneralComment = id => {
    setGeneralComments(prev => prev.filter(c => c.id !== id));
    if (editingComment && editingComment.scope === "general" && editingComment.id === id) {
      setEditingComment(null);
    }
  };
  const formatReportDate = isoDate => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString(pageCopy.bcp47);
  };
  const isLegacyMonitoringBuilder = builderType === "monitoring" && builderClient;
  const isDraftWizard = Boolean(draftReport);
  const isInterventionDraft = isDraftWizard && draftReport?.type?.id === REPORT_TYPE_IDS.INTERVENTION;
  return <>
      <div className={`${cyberStyles.mspPage} msp-page-insight`}>
        {isLegacyMonitoringBuilder ? <div className={styles.builderShell}>
              <section ref={builderSectionRef} className={`${builderStyles.builderSection} ${isCommentsDrawerOpen ? builderStyles.builderSectionWithComments : ""}`}>
                {}
                <div className={builderStyles.builderHeaderWrapper}>
                  <div className={`${enterpriseStyles.header} ${enterpriseStyles.headerInColumn}`}>
                    <div className={enterpriseStyles.headerTitle}>
                      <h1>
                        <button type="button" className={enterpriseStyles.backButton} onClick={handleBackToSelection} title="Back">
                          <Icon icon="mdi:arrow-left" />
                        </button>
                        <Icon icon="mdi:file-chart" className={enterpriseStyles.headerIcon} />
                        <span>
                          {builderClient ? builderClient.name || builderClient.nom || `Client #${builderClient.id}` : "Monitoring report"}
                        </span>
                      </h1>
                      {builderClient && <div className={builderStyles.builderSubtitle}>
                          {(builderClient.reportStartDate || builderClient.reportEndDate) && <span style={{
                    opacity: 0.85
                  }}>
                              {builderClient.reportStartDate && builderClient.reportEndDate ? `From ${formatReportDate(builderClient.reportStartDate)} to ${formatReportDate(builderClient.reportEndDate)}` : builderClient.reportStartDate ? `From ${formatReportDate(builderClient.reportStartDate)}` : `Until ${formatReportDate(builderClient.reportEndDate)}`}
                            </span>}
                        </div>}
                    </div>
                    <div className={enterpriseStyles.headerActions}>
                      <button type="button" className={`${enterpriseStyles.headerActionButton} ${isCommentsDrawerOpen ? enterpriseStyles.headerActionButtonActive : enterpriseStyles.headerActionButtonInactive}`} title="Show / hide comments" onClick={() => {
                  setIsCommentsDrawerOpen(prev => !prev);
                }}>
                        <Icon icon="mdi:comment-text-outline" className={enterpriseStyles.headerActionIcon} />
                      </button>

                      <button type="button" className={`${enterpriseStyles.headerActionButton} ${enterpriseStyles.headerActionButtonInactive}`} title={builderType === "monitoring" && builderClient && isSyncingOffice365Report ? "Office 365 synchronization in progress..." : "Synchronize monitoring data"} onClick={handleSyncAllMonitoring} disabled={isSyncingMonitoring || isSyncingOffice365Report}>
                        <Icon icon="mdi:refresh" className={enterpriseStyles.headerActionIcon} style={{
                    animation: isSyncingMonitoring || isSyncingOffice365Report ? "spin 1s linear infinite" : "none"
                  }} />
                      </button>

                      {isOnSummaryStep && <>
                          <button type="button" className={`${enterpriseStyles.headerActionButton} ${enterpriseStyles.headerActionButtonInactive}`} title="Download the 3 reports as a ZIP (HTML)" onClick={handleDownloadZip} disabled={!builderClient}>
                            <Icon icon="mdi:download" className={enterpriseStyles.headerActionIcon} />
                          </button>
                          <button type="button" className={`${enterpriseStyles.headerActionButton} ${enterpriseStyles.headerActionButtonInactive}`} title="Save the report" onClick={() => builderClient && setShowSaveModal(true)} disabled={!builderClient}>
                            <Icon icon="mdi:content-save-outline" className={enterpriseStyles.headerActionIcon} />
                          </button>
                        </>}
                    </div>
                  </div>
                </div>

                {}
                {showSaveModal && <div className={saveModalStyles.modalOverlay} onClick={e => {
            if (e.target === e.currentTarget) setShowSaveModal(false);
          }}>
                    <div className={saveModalStyles.modalContent} onClick={e => e.stopPropagation()}>
                      <div className={saveModalStyles.modalHeader}>
                        <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem"
                }}>
                          <Icon icon="mdi:content-save" className={saveModalStyles.modalIcon} />
                          <h3>Save monitoring report</h3>
                        </div>
                        <button type="button" className={saveModalStyles.closeButton} onClick={() => setShowSaveModal(false)} title="Close">
                          <Icon icon="mdi:close" />
                        </button>
                      </div>
                      <div className={saveModalStyles.modalBody}>
                        <div className={saveModalStyles.saveInputSection}>
                          <label className={saveModalStyles.saveInputLabel}>Document name</label>
                          <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="E.g. Monitoring Report - Client Alpha" className={saveModalStyles.saveInput} />
                        </div>
                        <ReportSaveVisibilitySwitch visibleToClient={saveVisibleToClient} onChange={setSaveVisibleToClient} disabled={saving} />
                        {recentDocs.length > 0 && <div className={saveModalStyles.recentDocs}>
                            <h4 className={saveModalStyles.recentDocsTitle}>
                              <Icon icon="mdi:file-document-multiple" style={{
                      fontSize: "1.1rem",
                      marginRight: "0.5rem"
                    }} />
                              My documents ({recentDocs.length})
                            </h4>
                            <div className={saveModalStyles.docsTableContainer}>
                              <table className={saveModalStyles.docsTable}>
                                <thead>
                                  <tr>
                                    <th>Name</th>
                                    <th>Client</th>
                                    <th>Period</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {recentDocs.slice(0, 10).map(doc => <tr key={doc.id} className={saveModalStyles.docTableRow} onClick={() => handleLoadSavedDocument(doc)} title="Click to reuse this name">
                                      <td className={saveModalStyles.docNameCell}>
                                        <span className={saveModalStyles.docName}>{doc.name}</span>
                                      </td>
                                      <td className={saveModalStyles.docCell}>{doc.client_name || "-"}</td>
                                      <td className={saveModalStyles.docCell}>{doc.report_period || "-"}</td>
                                    </tr>)}
                                </tbody>
                              </table>
                            </div>
                          </div>}
                      </div>
                      <div className={saveModalStyles.modalActions} style={{
                justifyContent: "flex-end"
              }}>
                        <button type="button" onClick={() => handleSaveReport()} className={saveModalStyles.primaryButton} disabled={saving || !saveName.trim()} title="Save">
                          {saving ? <Icon icon="mdi:loading" style={{
                    fontSize: "1.1rem",
                    animation: "spin 1s linear infinite"
                  }} /> : <Icon icon="mdi:content-save" style={{
                    fontSize: "1.1rem"
                  }} />}
                        </button>
                      </div>
                    </div>
                  </div>}

                {}
                {showOverwriteConfirm && pendingSave && <div className={saveModalStyles.modalOverlay} onClick={e => {
            if (e.target === e.currentTarget) {
              setShowOverwriteConfirm(false);
              setPendingSave(null);
            }
          }}>
                    <div className={`${saveModalStyles.modalContent} ${saveModalStyles.overwriteModalContent}`} onClick={e => e.stopPropagation()}>
                      <div className={saveModalStyles.modalHeader}>
                        <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem"
                }}>
                          <Icon icon="mdi:alert" className={saveModalStyles.modalIcon} />
                          <h3>Existing document</h3>
                        </div>
                        <button type="button" className={saveModalStyles.closeButton} onClick={() => {
                  setShowOverwriteConfirm(false);
                  setPendingSave(null);
                }} title="Close">
                          <Icon icon="mdi:close" />
                        </button>
                      </div>
                      <div className={saveModalStyles.modalBody}>
                        <p style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  color: "#1a1a1a"
                }}>
                          A document named &quot;{saveName}&quot; already exists. Do you want to overwrite it?
                        </p>
                      </div>
                      <div className={saveModalStyles.modalActions} style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem"
              }}>
                        <button type="button" className={saveModalStyles.secondaryButton} onClick={() => {
                  setShowOverwriteConfirm(false);
                  setPendingSave(null);
                }}>
                          Cancel
                        </button>
                        <button type="button" onClick={handleOverwriteConfirm} disabled={saving} className={saveModalStyles.primaryButton} style={{
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem"
                }}>
                          <Icon icon={saving ? "mdi:loading" : "mdi:check"} style={saving ? {
                    animation: "spin 1s linear infinite"
                  } : undefined} />
                          {saving ? "Saving..." : "Yes, overwrite"}
                        </button>
                      </div>
                    </div>
                  </div>}

                {builderType === "monitoring" && builderClient && <MonitoringSteps client={builderClient} activeStepIndex={builderStepIndex} onStepChange={setBuilderStepIndex} onOpenComments={handleOpenEquipmentComments} onRefreshClient={handleRefreshBuilderClient} onEquipmentSaved={handleReportEquipmentSaved} equipmentCommentCounts={equipmentCommentCounts} equipmentTicketCounts={equipmentTicketCounts} equipmentComments={equipmentComments} highlightedEquipmentKey={highlightedEquipmentKey} monitoringSyncStatus={equipmentMonitoringStatus} equipmentCheckMKData={equipmentCheckMKData} isSyncingMonitoring={isSyncingMonitoring} onSyncCheckMK={handleSyncSingleEquipment} syncingEquipmentKey={syncingEquipmentKey} isSyncingOffice365Report={isSyncingOffice365Report} allCommentsChronological={allCommentsChronological} summaryContentRef={summaryContentRef} stockageReportState={stepStorageState} onSetStorageReportState={setStepStorageState} />}

                {isCommentsDrawerOpen && <div className={`${builderStyles.commentsDrawerOverlay} ${hasTabsBar ? builderStyles.commentsDrawerOverlayWithTabs : ""}`}>
                    <div className={builderStyles.commentsDrawer}>
                      <div className={builderStyles.commentsDrawerHeader}>
                        <div className={builderStyles.commentsDrawerTitleBlock}>
                          <h3 className={builderStyles.commentsDrawerTitle}>
                            Report comment
                          </h3>
                        </div>
                      </div>

                      <div className={builderStyles.commentsDrawerBody}>
                        <div className={builderStyles.commentsScrollArea}>
                          <div className={builderStyles.commentsList}>
                              {allCommentsChronological.length === 0 ? <div className={builderStyles.commentsEmpty}>
                                No comments for this report.
                              </div> : allCommentsChronological.map(comment => {
                      const isEquipment = comment.scope === "equipment";
                      const isEditing = editingComment && editingComment.scope === comment.scope && (isEquipment ? editingComment.equipmentKey === comment.equipmentKey && editingComment.id === comment.id : editingComment.id === comment.id);
                      const categoryClass = isEquipment ? comment.category === "infra" ? builderStyles.commentItemInfra : comment.category === "cyber" ? builderStyles.commentItemCyber : comment.category === "services" ? builderStyles.commentItemServices : "" : "";
                      return <div key={isEquipment ? `eq-${comment.equipmentKey}-${comment.id}` : `gen-${comment.id}`} className={`${builderStyles.commentItem} ${categoryClass} ${isEquipment ? builderStyles.commentItemClickable : ""}`} onClick={isEquipment ? () => handleFocusEquipmentFromComment(comment.moduleKey, comment.equipmentKey) : undefined} role={isEquipment ? "button" : undefined} tabIndex={isEquipment ? 0 : undefined} onKeyDown={isEquipment ? e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleFocusEquipmentFromComment(comment.moduleKey, comment.equipmentKey);
                        }
                      } : undefined}>
                                  <div className={builderStyles.commentMeta}>
                                          <span className={builderStyles.commentAuthor}>
                                            {comment.author || "Unknown author"}
                                          </span>
                                          <span className={builderStyles.commentDate}>
                                            {comment.createdAt ? new Date(comment.createdAt).toLocaleString("en-US") : ""}
                                          </span>
                                        </div>
                                        {isEquipment && comment.referenceLabel && <div className={builderStyles.commentReference}>
                                      {comment.referenceLabel}
                                    </div>}
                                        {isEditing ? <>
                                            <textarea rows={2} className={builderStyles.commentTextarea} value={editingComment.text ?? ""} onChange={e => handleChangeEditingText(e.target.value)} />
                                            <div className={builderStyles.commentComposerActions}>
                                              <button type="button" className={builderStyles.commentPublishButton} onClick={handleSaveEditingComment} disabled={!(editingComment.text || "").trim()}>
                                                Save
                                              </button>
                                              <button type="button" className={builderStyles.commentCancelButton} onClick={() => setEditingComment(null)}>
                                                Cancel
                                              </button>
                                            </div>
                                          </> : <>
                                            <div className={builderStyles.commentText}>
                                              {comment.text}
                                            </div>
                                            <div className={builderStyles.commentActions}>
                                              <button type="button" onClick={e => {
                              e.stopPropagation();
                              isEquipment ? handleStartEditEquipmentComment(comment.equipmentKey, comment) : handleStartEditGeneralComment(comment);
                            }} onMouseDown={e => e.stopPropagation()}>
                                          Edit
                                        </button>
                                        <button type="button" onClick={e => {
                              e.stopPropagation();
                              isEquipment ? handleDeleteEquipmentComment(comment.equipmentKey, comment.id) : handleDeleteGeneralComment(comment.id);
                            }} onMouseDown={e => e.stopPropagation()}>
                                          Delete
                                        </button>
                                      </div>
                                    </>}
                                </div>;
                    })}
                          </div>
                        </div>

                        {}
                        <div className={builderStyles.commentsFooter}>
                          {activeCommentsTarget ? <div className={builderStyles.commentComposerCard}>
                              <div className={builderStyles.commentHint}>
                                {activeCommentsTarget.equipment?.nom || activeCommentsTarget.equipment?.name || "Equipment"}
                              </div>
                              <textarea rows={2} className={builderStyles.commentTextarea} placeholder="Add a comment..." value={pendingEquipmentComment} onChange={e => setPendingEquipmentComment(e.target.value)} />
                              <div className={builderStyles.commentComposerActions}>
                                <button type="button" className={builderStyles.commentPublishButton} onClick={handlePublishEquipmentComment} disabled={!pendingEquipmentComment.trim()}>
                                  Publish
                                </button>
                                <button type="button" className={builderStyles.commentCancelButton} onClick={handleCancelEquipmentComment}>
                                  Cancel
                                </button>
                              </div>
                            </div> : <div className={builderStyles.commentComposerCard}>
                              <div className={builderStyles.commentHint}>
                                General comment
                              </div>
                              <textarea rows={2} className={builderStyles.commentTextarea} placeholder="Add a comment..." value={pendingGeneralComment} onChange={e => setPendingGeneralComment(e.target.value)} />
                              <div className={builderStyles.commentComposerActions}>
                                <button type="button" className={builderStyles.commentPublishButton} onClick={handlePublishGeneralComment} disabled={!pendingGeneralComment.trim()}>
                                  Publish
                                </button>
                                <button type="button" className={builderStyles.commentCancelButton} onClick={handleCancelGeneralComment}>
                                  Cancel
                                </button>
                              </div>
                            </div>}
                        </div>
                      </div>
                    </div>
                  </div>}
              </section>
          </div> : isInterventionDraft ? <ReportInterventionBuilder copy={pageCopy} reportType={draftReport.type} client={draftReport.client} initialData={draftReport.initialData} documentId={draftReport.documentId} documentName={draftReport.documentName} onBack={handleBackFromDraftReport} /> : isDraftWizard ? <ReportBuilderPlaceholder copy={pageCopy} reportType={draftReport.type} client={draftReport.client} onBack={handleBackFromDraftReport} /> : <div className={cyberStyles.mspLayout}>
            <div className={cyberStyles.mspMain}>
              <header className={cyberStyles.mspHero}>
                <div className={cyberStyles.mspHeroMain}>
                  <div className={cyberStyles.mspBrandMark}>
                    <Icon icon="mingcute:report-forms-fill" className={cyberStyles.mspBrandMarkIcon} />
                  </div>
                  <div className={cyberStyles.mspHeroCopy}>
                    <span className={cyberStyles.mspEyebrow}>{pageCopy.eyebrow}</span>
                    <h1 className={cyberStyles.mspTitle}>{pageCopy.pageTitle}</h1>
                    <p className={cyberStyles.mspSubtitle}>{pageCopy.subtitle}</p>
                  </div>
                </div>
              </header>

              <main className={cyberStyles.mspContent}>
                <div className={`${cyberStyles.tabContent} ${styles.wizardTabContent}`}>
                  {error ? <div className={styles.alertError}>{error}</div> : null}

                  <ReportCreateWizard copy={pageCopy} reportTypes={reportTypes} clients={clients} loading={loading} step={createWizardStep} onStepChange={setCreateWizardStep} selectedClientId={selectedClientId} onSelectClient={handleWizardSelectClient} selectedReportTypeId={selectedReportTypeId} onSelectReportType={setSelectedReportTypeId} onStartReport={handleStartDraftReport} />
                </div>
              </main>
            </div>
          </div>}
      </div>
    </>;
}
