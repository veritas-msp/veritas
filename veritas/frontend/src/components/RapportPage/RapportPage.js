import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchClientsList, fetchClientModules, fetchClientGeneral } from "../../api/clients";
import { getCheckMKReportPeriodData } from "../../api/checkmkReportPeriod";
import { saveMonitoringDocument, updateMonitoringDocument, fetchMonitoringDocument } from "../../api/monitoringDocuments";
import styles from "./RapportPage.module.css";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import ReportCreateWizard from "./RapportCreateWizard";
import ReportBuilderPlaceholder from "./RapportBuilderPlaceholder";
import SupervisionPeriodGate from "./SupervisionPeriodGate";
import ReportInterventionBuilder from "./intervention/RapportInterventionBuilder";
import AuditSubtypeGate from "./audit/AuditSubtypeGate";
import RapportAuditBuilder from "./audit/RapportAuditBuilder";
import RapportSavedDocuments from "./RapportSavedDocuments";
import { REPORT_TYPE_IDS } from "./reportTypeConstants";
import MonitoringSteps, { getEnabledMonitoringSteps, MODULE_LABELS } from "./monitoring/MonitoringSteps";
import BuilderCommentsPane from "./monitoring/BuilderCommentsPane";
import ReportSyncProgressModal from "./monitoring/ReportSyncProgressModal";
import { buildSupervisionSyncJobs, runSupervisionSyncJobs, fillSyncCopy } from "./monitoring/supervisionReportSync";
import { applyEquipmentPatchToEquipements } from "./monitoring/equipmentPatchUtils";
import { buildCheckMKCacheEntry, buildCheckMKReportSnapshot, collectCheckMKMappedEquipment, computeCheckMKEquipmentStatus, deriveServicesFromPeriodEvents, filterCheckMKEventsForReportPeriod, getCheckmkHostName, getCheckmkSite, preserveCheckmkMappingsOnEquipements, resolveCheckMKEquipmentKey } from "./monitoring/checkmkReportCacheUtils";
import { getCheckMKServices } from "../../api/equipment";
import { fetchTickets } from "../../api/tickets";
import { fetchSupervisionAlertsHistory } from "../../api/supervisionAlerts";
import { isSupervisionReportBuilderType } from "./monitoring/supervisionReportBuilder";
import { buildPeriodInsights, mergeSeededTicketComments } from "./monitoring/supervisionReportInsights";
import {
  buildSupervisionBuilderStatePayload,
  emptyCustomSynthesis,
  getDocumentClientId,
  normalizeCustomSynthesis,
  resolveReportTypeIdFromDocument
} from "./reportDocumentUtils";
import shellStyles from "./RapportBuilderPlaceholder.module.css";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { isReportBuilderSessionActive } from "../../utils/monitoringReportGuard";
import { exportReportAsZIP, buildReportHtmlParts } from "./exportRapportZip";
import {
  fetchVaultBuilderState,
  replaceReportHtmlFolderInClientVault,
  uploadReportHtmlFolderToClientVault
} from "../../utils/uploadReportToClientVault";
import SaveSupervisionReportModal from "./SaveSupervisionReportModal";
import { safeJsonClone } from "../../utils/safeJson";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getRapportGuide } from "../PageGuide/rapportGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { getRapportPageCopy, getReportTypes } from "./rapportPageI18n";
import { interpolate } from "../../i18n/translate";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
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
  onMonitoringReportGuardChange,
  pageParams = null,
  onPageParamsConsumed
}) {
  const locale = useAppLocale();
  const pageCopy = useMemo(() => getRapportPageCopy(locale), [locale]);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const reportTypes = useMemo(() => getReportTypes(pageCopy, pageCopy.localeCode || locale), [pageCopy, locale]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [builderType, setBuilderType] = useState(null);
  const [builderClient, setBuilderClient] = useState(null);
  const [builderStepIndex, setBuilderStepIndex] = useState(0);
  const [createWizardStep, setCreateWizardStep] = useState("type");
  const [selectedReportTypeId, setSelectedReportTypeId] = useState(null);
  const rapportGuide = useMemo(() => getRapportGuide(locale, {
    showTypes: () => setCreateWizardStep("type"),
    showClient: () => {
      if (selectedReportTypeId) setCreateWizardStep("client");
    }
  }), [locale, selectedReportTypeId]);
  const [draftReport, setDraftReport] = useState(null);
  const [launchDisclaimerOpen, setLaunchDisclaimerOpen] = useState(false);
  const [pendingLaunchAction, setPendingLaunchAction] = useState(null);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const builderSectionRef = useRef(null);
  const summaryContentRef = useRef(null);
  const startingReportRef = useRef(false);
  const [equipmentComments, setEquipmentComments] = useState({});
  const [activeCommentsTarget, setActiveCommentsTarget] = useState(null);
  const [generalComments, setGeneralComments] = useState([]);
  const [pendingEquipmentComment, setPendingEquipmentComment] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [highlightedEquipmentKey, setHighlightedEquipmentKey] = useState(null);
  const [isSyncingMonitoring, setIsSyncingMonitoring] = useState(false);
  const [syncingEquipmentKey, setSyncingEquipmentKey] = useState(null);
  const [equipmentMonitoringStatus, setEquipmentMonitoringStatus] = useState({});
  const [equipmentCheckMKData, setEquipmentCheckMKData] = useState({});
  const [isSyncingOffice365Report, setIsSyncingOffice365Report] = useState(false);
  const [syncProgress, setSyncProgress] = useState({
    open: false,
    phase: "running",
    items: [],
    currentIndex: 0,
    etaMs: null
  });
  const syncProgressCancelRef = useRef(false);
  const syncProgressAbortRef = useRef(null);
  const syncInFlightRef = useRef(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNameError, setSaveNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [saveErrorVisible, setSaveErrorVisible] = useState(false);
  const [saveVisibleToClient, setSaveVisibleToClient] = useState(false);
  const [stepStorageState, setStepStorageState] = useState(null);
  const [startingSupervisionBuilder, setStartingSupervisionBuilder] = useState(false);
  const [equipmentAlertCounts, setEquipmentAlertCounts] = useState({});
  const [equipmentTicketInsightCounts, setEquipmentTicketInsightCounts] = useState({});
  const [equipmentTicketsByKey, setEquipmentTicketsByKey] = useState({});
  const [customSynthesis, setCustomSynthesis] = useState(() => emptyCustomSynthesis());
  const [editingDocumentId, setEditingDocumentId] = useState(null);
  const [editingVaultFolderId, setEditingVaultFolderId] = useState(null);
  const [editingVaultFileIds, setEditingVaultFileIds] = useState(null);
  const [editFrozenAt, setEditFrozenAt] = useState(null);
  const [savedDocsRefreshKey, setSavedDocsRefreshKey] = useState(0);
  const [openingSavedReport, setOpeningSavedReport] = useState(false);
  const periodInsightsAbortRef = useRef(null);
  const pageParamsHandledRef = useRef(null);
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
    const ac = createTrackedAbortController();
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
    if (!isSupervisionReportBuilderType(builderType) || !builderClient?.equipements) return;
    const mappings = collectCheckMKMappedEquipment(builderClient.equipements);
    const initialStatuses = {};
    mappings.forEach(m => {
      if (m.equipment_id != null) initialStatuses[String(m.equipment_id)] = "unsynced";
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
  const isBuilderActive = isReportBuilderSessionActive({
    builderType,
    builderClient,
    draftReport
  });
  const isOnSummaryStep = useMemo(() => {
    if (!builderClient || !isSupervisionReportBuilderType(builderType)) return false;
    const steps = getEnabledMonitoringSteps(builderClient);
    return steps[builderStepIndex] === "summary";
  }, [builderClient, builderType, builderStepIndex]);
  const onMonitoringReportGuardChangeRef = useRef(onMonitoringReportGuardChange);
  onMonitoringReportGuardChangeRef.current = onMonitoringReportGuardChange;
  onMonitoringReportGuardChangeRef.current?.(isBuilderActive);
  useLayoutEffect(() => {
    onMonitoringReportGuardChangeRef.current?.(isBuilderActive);
    return () => onMonitoringReportGuardChangeRef.current?.(false);
  }, [isBuilderActive]);
  const [builderLeaveModalOpen, setBuilderLeaveModalOpen] = useState(false);
  const pendingBuilderLeaveRef = useRef(null);
  const requestLeaveBuilder = action => {
    if (typeof action !== "function") return;
    if (!isBuilderActive) {
      action();
      return;
    }
    pendingBuilderLeaveRef.current = action;
    setBuilderLeaveModalOpen(true);
  };
  const handleBuilderLeaveCancel = () => {
    pendingBuilderLeaveRef.current = null;
    setBuilderLeaveModalOpen(false);
  };
  const handleBuilderLeaveConfirm = () => {
    const action = pendingBuilderLeaveRef.current;
    pendingBuilderLeaveRef.current = null;
    setBuilderLeaveModalOpen(false);
    action?.();
  };
  const handleWizardSelectType = typeId => {
    setSelectedReportTypeId(typeId);
    setSelectedClientId("");
    setDraftReport(null);
  };
  const handleWizardSelectClient = clientId => {
    setSelectedClientId(clientId);
    setDraftReport(null);
  };
  const handleStartDraftReport = async (reportTypeId, clientId) => {
    const resolvedTypeId = reportTypeId ?? selectedReportTypeId;
    const resolvedClientId = clientId != null ? String(clientId) : selectedClientId;
    const client = clients.find(entry => String(entry.id) === resolvedClientId) || null;
    if (!client || !resolvedTypeId || startingReportRef.current) return;
    const type = reportTypes.find(entry => entry.id === resolvedTypeId);
    if (!type || type.comingSoon) return;
    startingReportRef.current = true;
    setSelectedClientId(resolvedClientId);
    setSelectedReportTypeId(resolvedTypeId);
    try {
      const needsSites = type.id === REPORT_TYPE_IDS.INTERVENTION || type.id === REPORT_TYPE_IDS.AUDIT;
      const clientForDraft = needsSites ? await enrichBuilderClientWithSites(client) : client;
      const nextDraft = {
        type,
        client: clientForDraft,
        documentId: null,
        initialData: null,
        documentName: "",
        auditSubtypeId: type.id === REPORT_TYPE_IDS.AUDIT ? null : undefined
      };
      if (type.id === REPORT_TYPE_IDS.INTERVENTION) {
        setPendingLaunchAction({ kind: "draft", draft: nextDraft });
        setLaunchDisclaimerOpen(true);
        return;
      }
      setDraftReport(nextDraft);
    } finally {
      startingReportRef.current = false;
    }
  };
  const handleLaunchDisclaimerClose = () => {
    setLaunchDisclaimerOpen(false);
    setPendingLaunchAction(null);
  };
  const handleLaunchDisclaimerConfirm = () => {
    const action = pendingLaunchAction;
    setLaunchDisclaimerOpen(false);
    setPendingLaunchAction(null);
    if (!action) return;
    if (action.kind === "draft" && action.draft) {
      setDraftReport(action.draft);
      return;
    }
    if (action.kind === "auditSubtype" && action.subtypeId) {
      setDraftReport(prev => (prev ? { ...prev, auditSubtypeId: action.subtypeId } : prev));
    }
  };
  const loadPeriodInsights = async (client, startDate, endDate) => {
    const clientId = client?.id ?? client?.uuid;
    if (!clientId || !startDate || !endDate) {
      setEquipmentAlertCounts({});
      setEquipmentTicketInsightCounts({});
      setEquipmentTicketsByKey({});
      return;
    }
    if (periodInsightsAbortRef.current) {
      periodInsightsAbortRef.current.abort();
    }
    const controller = new AbortController();
    periodInsightsAbortRef.current = controller;
    try {
      const [ticketRows, alertRows] = await Promise.all([
        fetchTickets({ clientId, limit: 200 }, { signal: controller.signal }).catch(() => []),
        fetchSupervisionAlertsHistory({
          clientId,
          limit: 200,
          status: "all",
          signal: controller.signal
        }).catch(() => [])
      ]);
      if (controller.signal.aborted) return;
      const ticketList = Array.isArray(ticketRows) ? ticketRows : ticketRows?.tickets || [];
      const alertList = Array.isArray(alertRows) ? alertRows : [];
      const insights = buildPeriodInsights({
        client,
        tickets: ticketList,
        alerts: alertList,
        startDate,
        endDate
      });
      setEquipmentTicketInsightCounts(insights.ticketCounts || {});
      setEquipmentTicketsByKey(insights.ticketsByEquipmentKey || {});
      setEquipmentAlertCounts(insights.alertCounts || {});
      setEquipmentComments(prev => mergeSeededTicketComments(prev, insights.seededCommentsByEquipmentKey));
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.warn("Unable to load period insights for supervision report:", err);
    }
  };
  const handleConfirmSupervisionPeriod = async ({ startDate, endDate, selectedModules }) => {
    if (!draftReport?.client || startingSupervisionBuilder) return;
    const client = draftReport.client;
    const clientId = client.id ?? client.uuid;
    if (!clientId || !startDate || !endDate) {
      toast.error("Période ou client invalide.");
      return;
    }
    setStartingSupervisionBuilder(true);
    try {
      const [modulesData, enrichedClient] = await Promise.all([
        fetchClientModules(clientId),
        enrichBuilderClientWithSites(client)
      ]);
      const nextClient = {
        ...enrichedClient,
        equipements: modulesData?.equipements || enrichedClient.equipements || {},
        modules_monitoring: modulesData?.modules_monitoring || enrichedClient.modules_monitoring || {},
        reportStartDate: startDate,
        reportEndDate: endDate,
        reportSelectedModules: Array.isArray(selectedModules) ? selectedModules : undefined
      };
      setBuilderClient(nextClient);
      setBuilderType(REPORT_TYPE_IDS.SUPERVISION_ETAT);
      setBuilderStepIndex(0);
      setEquipmentComments({});
      setGeneralComments([]);
      setEquipmentMonitoringStatus({});
      setEquipmentCheckMKData({});
      setEquipmentAlertCounts({});
      setEquipmentTicketInsightCounts({});
      setEquipmentTicketsByKey({});
      setStepStorageState(null);
      setCustomSynthesis(emptyCustomSynthesis());
      setEditingDocumentId(null);
      setEditingVaultFolderId(null);
      setEditingVaultFileIds(null);
      setEditFrozenAt(null);
      setSaveName("");
      setSaveVisibleToClient(false);
      setDraftReport(null);
      setCreateWizardStep("type");
      void handleSyncAllMonitoring(nextClient);
      void loadPeriodInsights(nextClient, startDate, endDate);
    } catch (err) {
      console.error("Error starting supervision report builder:", err);
      toast.error(err?.message || "Impossible de démarrer le rapport de supervision.");
    } finally {
      setStartingSupervisionBuilder(false);
    }
  };
  const handleBackFromDraftReport = () => {
    const leavingStartedBuilder = draftReport?.type?.id && draftReport.type.id !== REPORT_TYPE_IDS.SUPERVISION_ETAT;
    const leaveDraft = () => {
      setDraftReport(null);
      setCreateWizardStep(selectedReportTypeId ? "client" : "type");
    };
    if (leavingStartedBuilder) {
      requestLeaveBuilder(leaveDraft);
      return;
    }
    leaveDraft();
  };
  const resetSupervisionBuilderState = () => {
    setBuilderType(null);
    setBuilderClient(null);
    setBuilderStepIndex(0);
    setEquipmentComments({});
    setGeneralComments([]);
    setActiveCommentsTarget(null);
    setEquipmentMonitoringStatus({});
    setEquipmentCheckMKData({});
    setEquipmentAlertCounts({});
    setEquipmentTicketInsightCounts({});
    setEquipmentTicketsByKey({});
    setStepStorageState(null);
    setCustomSynthesis(emptyCustomSynthesis());
    setEditingDocumentId(null);
    setEditingVaultFolderId(null);
    setEditingVaultFileIds(null);
    setEditFrozenAt(null);
    setSaveName("");
    setSaveVisibleToClient(false);
  };
  const handleBackToSelection = () => {
    requestLeaveBuilder(() => {
      resetSupervisionBuilderState();
      setSavedDocsRefreshKey(k => k + 1);
    });
  };
  const openSavedReport = useCallback(async (rawDoc) => {
    if (!rawDoc || openingSavedReport) return;
    setOpeningSavedReport(true);
    try {
      let doc = rawDoc;
      if (!doc?.config || !doc?.data) {
        doc = await fetchMonitoringDocument(rawDoc.id);
      }
      if (!doc?.config || !doc?.data) {
        toast.error("Document de rapport introuvable ou incomplet.");
        return;
      }
      const typeId = resolveReportTypeIdFromDocument(doc);
      const type = reportTypes.find(entry => entry.id === typeId);
      if (!type || type.comingSoon) {
        toast.error("Ce type de rapport n’est pas éditable.");
        return;
      }

      const clientId = getDocumentClientId(doc);
      let client =
        clients.find(entry => String(entry.id) === String(clientId) || String(entry.uuid) === String(clientId))
        || null;
      if (!client && clientId) {
        client = {
          id: clientId,
          name: doc.client_name || doc.config?.client?.name || doc.config?.client?.nom || "",
          nom: doc.client_name || doc.config?.client?.nom || doc.config?.client?.name || ""
        };
      }
      if (!client) {
        toast.error("Client du rapport introuvable.");
        return;
      }

      if (typeId === REPORT_TYPE_IDS.INTERVENTION) {
        const clientForDraft = await enrichBuilderClientWithSites(client);
        setDraftReport({
          type,
          client: clientForDraft,
          documentId: doc.id,
          initialData: doc.data?.intervention || doc.data || null,
          documentName: doc.name || "",
          vaultFileId: doc.config?.vaultFileId || null,
          visibleToClient: Boolean(doc.config?.visibleToClient),
          auditSubtypeId: undefined
        });
        setCreateWizardStep("type");
        return;
      }

      if (typeId === REPORT_TYPE_IDS.AUDIT) {
        const clientForDraft = await enrichBuilderClientWithSites(client);
        const auditPayload = doc.data?.audit || doc.data || null;
        const subtypeId = auditPayload?.subtypeId || doc.config?.auditSubtype || null;
        setDraftReport({
          type,
          client: clientForDraft,
          documentId: doc.id,
          initialData: auditPayload,
          documentName: doc.name || "",
          vaultFileId: doc.config?.vaultFileId || null,
          visibleToClient: Boolean(doc.config?.visibleToClient),
          auditSubtypeId: subtypeId
        });
        setCreateWizardStep("type");
        return;
      }

      // Supervision: hydrate builder, skip PeriodGate + auto sync
      const clientIdResolved = client.id ?? client.uuid;
      const [modulesData, enrichedClient] = await Promise.all([
        fetchClientModules(clientIdResolved),
        enrichBuilderClientWithSites(client)
      ]);
      const periodStart = doc.data?.period?.start || doc.config?.client?.reportStartDate || null;
      const periodEnd = doc.data?.period?.end || doc.config?.client?.reportEndDate || null;
      const selectedModules = doc.data?.reportSelectedModules
        || doc.config?.client?.reportSelectedModules
        || undefined;
      const nextClient = {
        ...enrichedClient,
        equipements: modulesData?.equipements || enrichedClient.equipements || {},
        modules_monitoring: modulesData?.modules_monitoring || enrichedClient.modules_monitoring || {},
        reportStartDate: periodStart,
        reportEndDate: periodEnd,
        reportPeriod: doc.report_period || doc.config?.client?.reportPeriod || null,
        reportSelectedModules: Array.isArray(selectedModules) ? selectedModules : undefined
      };

      const comments = doc.data?.reportComments || {};
      setEquipmentComments(comments.equipment && typeof comments.equipment === "object" ? comments.equipment : {});
      setGeneralComments(Array.isArray(comments.general) ? comments.general : []);
      setStepStorageState(doc.data?.stepStates?.Storage ?? null);
      setCustomSynthesis(normalizeCustomSynthesis(doc.data?.customSynthesis));
      setEquipmentMonitoringStatus(doc.data?.checkMK?.equipmentStatus || {});
      setEquipmentCheckMKData({});
      setEquipmentAlertCounts({});
      setEquipmentTicketInsightCounts({});
      setEquipmentTicketsByKey({});

      const vaultFolderId = doc.config?.vaultFolderId || null;
      setEditingDocumentId(doc.id);
      setEditingVaultFolderId(vaultFolderId);
      setEditingVaultFileIds(doc.config?.vaultFileIds || null);
      setSaveName(doc.name || "");
      setSaveVisibleToClient(Boolean(doc.config?.visibleToClient));
      setEditFrozenAt(doc.updated_at || doc.created_at || null);

      let sidecarLoaded = false;
      if (vaultFolderId && clientIdResolved) {
        try {
          const sidecar = await fetchVaultBuilderState({
            clientId: clientIdResolved,
            folderId: vaultFolderId
          });
          if (sidecar) {
            sidecarLoaded = true;
            if (sidecar.equipmentCheckMKData) setEquipmentCheckMKData(sidecar.equipmentCheckMKData);
            if (sidecar.equipmentMonitoringStatus) setEquipmentMonitoringStatus(sidecar.equipmentMonitoringStatus);
            if (sidecar.equipmentAlertCounts) setEquipmentAlertCounts(sidecar.equipmentAlertCounts);
            if (sidecar.equipmentTicketInsightCounts) setEquipmentTicketInsightCounts(sidecar.equipmentTicketInsightCounts);
            if (sidecar.equipmentTicketsByKey) setEquipmentTicketsByKey(sidecar.equipmentTicketsByKey);
            if (sidecar.customSynthesis) setCustomSynthesis(normalizeCustomSynthesis(sidecar.customSynthesis));
            if (sidecar.savedAt) setEditFrozenAt(sidecar.savedAt);
          }
        } catch (err) {
          console.warn("Unable to load vault builder sidecar:", err);
        }
      }
      if (!sidecarLoaded) {
        toast.warn(pageCopy.supervisionBuilder.editLegacyNoCache || "État Checkmk non retrouvé : mode dégradé.");
      }

      setBuilderClient(nextClient);
      setBuilderType(REPORT_TYPE_IDS.SUPERVISION_ETAT);
      setBuilderStepIndex(0);
      setDraftReport(null);
      setCreateWizardStep("type");
      // Explicitly do NOT call handleSyncAllMonitoring / loadPeriodInsights
    } catch (err) {
      console.error("Unable to open saved report:", err);
      toast.error(err?.message || "Impossible d’ouvrir le rapport.");
    } finally {
      setOpeningSavedReport(false);
    }
  }, [openingSavedReport, reportTypes, clients, pageCopy.supervisionBuilder.editLegacyNoCache]);

  useEffect(() => {
    if (pageParams?.goHome) {
      const homeKey = `goHome:${pageParams._nonce ?? "1"}`;
      if (pageParamsHandledRef.current === homeKey) return;
      pageParamsHandledRef.current = homeKey;
      onPageParamsConsumed?.();
      resetSupervisionBuilderState();
      setDraftReport(null);
      setSelectedReportTypeId(null);
      setSelectedClientId("");
      setCreateWizardStep("type");
      setReportStartDate("");
      setReportEndDate("");
      setShowSaveModal(false);
      setLaunchDisclaimerOpen(false);
      setPendingLaunchAction(null);
      setSavedDocsRefreshKey(k => k + 1);
      return;
    }
    const editId = pageParams?.editDocumentId ?? pageParams?.documentId ?? null;
    const editDoc = pageParams?.document || null;
    if (!editId && !editDoc) {
      pageParamsHandledRef.current = null;
      return;
    }
    const handleKey = String(editId || editDoc?.id || "");
    if (!handleKey || pageParamsHandledRef.current === handleKey) return;
    if (loading) return;
    pageParamsHandledRef.current = handleKey;
    onPageParamsConsumed?.();
    void openSavedReport(editDoc || { id: editId });
  }, [pageParams, loading, openSavedReport, onPageParamsConsumed]);
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
    const result = {
      ...equipmentTicketInsightCounts
    };
    Object.entries(equipmentComments).forEach(([key, list]) => {
      const count = (list || []).filter(c => c.isTicketComment === true).length;
      if (count > 0) {
        result[key] = Math.max(result[key] || 0, count);
      }
    });
    return result;
  }, [equipmentComments, equipmentTicketInsightCounts]);
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
  const builderSteps = useMemo(() => builderClient ? getEnabledMonitoringSteps(builderClient) : [], [builderClient]);
  const currentBuilderStepKey = builderSteps[builderStepIndex] || null;
  const currentBuilderStepLabel = MODULE_LABELS[currentBuilderStepKey] || currentBuilderStepKey || "Étape";
  const showBuilderCommentsPane = Boolean(currentBuilderStepKey && currentBuilderStepKey !== "support" && currentBuilderStepKey !== "summary");
  useEffect(() => {
    setActiveCommentsTarget(prev => {
      if (!prev) return prev;
      if (!showBuilderCommentsPane) return null;
      if (prev.moduleKey && prev.moduleKey !== currentBuilderStepKey) return null;
      return prev;
    });
  }, [currentBuilderStepKey, showBuilderCommentsPane]);
  const handleOpenEquipmentComments = (item, {
    moduleKey,
    equipmentKey
  } = {}) => {
    if (!item || !moduleKey) return;
    const key = equipmentKey || item.commentKey || item.id || item.uuid || `${moduleKey}:${item.nom || item.name || "unknown"}`;
    setActiveCommentsTarget({
      moduleKey,
      equipmentKey: key,
      equipment: item
    });
    setHighlightedEquipmentKey(key);
    setPendingEquipmentComment("");
    setEditingComment(null);
  };
  const handleClearCommentsTarget = () => {
    setActiveCommentsTarget(null);
    setHighlightedEquipmentKey(null);
    setPendingEquipmentComment("");
    setEditingComment(null);
  };
  const handleRefreshBuilderClient = async (fromClient = null) => {
    const source = fromClient && (fromClient.id || fromClient.uuid) ? fromClient : builderClient;
    if (!source?.id && !source?.uuid) return;
    const clientId = source.id ?? source.uuid;
    try {
      const modulesData = await fetchClientModules(clientId);
      if (modulesData?.equipements && typeof modulesData.equipements === "object") {
        setBuilderClient(prev => prev ? {
          ...prev,
          equipements: preserveCheckmkMappingsOnEquipements(prev.equipements, modulesData.equipements)
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
  const fetchCheckMKDataForHost = async (hostName, site, startIso, endIso, { signal } = {}) => {
    const reportPeriod = {
      start: startIso,
      end: endIso
    };
    const ignoreUnlessAborted = promise => promise.catch(err => {
      if (err?.name === "AbortError") throw err;
      return null;
    });
    const [reportPeriodResp, servicesResp] = await Promise.all([
      ignoreUnlessAborted(getCheckMKReportPeriodData(hostName, startIso, endIso, site, { signal })),
      ignoreUnlessAborted(getCheckMKServices(hostName, startIso, endIso, site, { signal }))
    ]);
    const rawEvents = reportPeriodResp?.events?.events ?? reportPeriodResp?.events ?? [];
    const eventsList = Array.isArray(rawEvents) ? rawEvents : [];
    const periodEvents = filterCheckMKEventsForReportPeriod(eventsList, reportPeriod);
    const criticalEvents = periodEvents.filter(event => Number(event?.state) === 2);
    const availability = reportPeriodResp?.availability?.availability ?? reportPeriodResp?.availability ?? null;
    const liveServices = Array.isArray(servicesResp?.services) ? servicesResp.services : null;
    const periodServices = liveServices != null ? liveServices : deriveServicesFromPeriodEvents(periodEvents);
    const parsed = {
      services: periodServices,
      events: periodEvents,
      availability,
      eventsCount: criticalEvents.length
    };
    return {
      cacheEntry: buildCheckMKCacheEntry(parsed.services, parsed.events, parsed.availability, reportPeriod),
      status: computeCheckMKEquipmentStatus({
        services: periodServices,
        events: criticalEvents,
        availability,
        eventsCount: criticalEvents.length
      })
    };
  };

  const syncCheckMKForClient = async (client, {
    silent = false
  } = {}) => {
    if (!client?.reportStartDate || !client?.reportEndDate) {
      if (!silent) toast.error("La période du rapport n’est pas définie.");
      return {
        synced: 0,
        total: 0
      };
    }
    const mappings = collectCheckMKMappedEquipment(client.equipements);
    if (mappings.length === 0) {
      if (!silent) toast.info("Aucun équipement mappé à une supervision pour ce client.");
      setEquipmentMonitoringStatus({});
      setEquipmentCheckMKData({});
      return {
        synced: 0,
        total: 0
      };
    }
    setIsSyncingMonitoring(true);
    try {
      const startDate = new Date(client.reportStartDate);
      const endDate = new Date(client.reportEndDate);
      endDate.setHours(23, 59, 59, 999);
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();
      const results = {};
      const checkMKDataByEquipment = {};
      const concurrency = 3;
      let index = 0;
      let synced = 0;
      const worker = async () => {
        while (index < mappings.length) {
          const currentIndex = index;
          index += 1;
          const mapping = mappings[currentIndex];
          const hostName = mapping.checkmk_host_name;
          if (!hostName) continue;
          try {
            const {
              cacheEntry,
              status
            } = await fetchCheckMKDataForHost(hostName, mapping.checkmk_site || null, startIso, endIso);
            const equipmentId = mapping.equipment_id;
            if (equipmentId != null) {
              const key = String(equipmentId);
              results[key] = status;
              checkMKDataByEquipment[key] = cacheEntry;
              synced += 1;
            }
          } catch (err) {
            console.error("Error synchronizing CheckMK for an equipment item:", err);
            if (mapping.equipment_id != null) {
              results[String(mapping.equipment_id)] = "unsynced";
            }
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
      if (!silent) {
        toast.success(`Supervision synchronisée (${synced}/${mappings.length}).`);
      }
      return {
        synced,
        total: mappings.length
      };
    } catch (err) {
      console.error("Error during CheckMK synchronization:", err);
      if (!silent) toast.error("Erreur lors de la synchronisation supervision.");
      return {
        synced: 0,
        total: mappings.length
      };
    } finally {
      setIsSyncingMonitoring(false);
    }
  };

  const closeSyncProgressModal = () => {
    setSyncProgress(prev => {
      if (prev.phase === "running") return prev;
      return { ...prev, open: false };
    });
  };
  const cancelSyncProgress = () => {
    if (syncProgressCancelRef.current) return;
    syncProgressCancelRef.current = true;
    try {
      syncProgressAbortRef.current?.abort();
    } catch {
      // ignore
    }
    setSyncProgress(prev => {
      if (!prev.open || prev.phase !== "running") return prev;
      return {
        ...prev,
        phase: "cancelled",
        etaMs: 0,
        items: prev.items.map(item => item.state === "running" ? { ...item, state: "pending" } : item)
      };
    });
    const syncCopy = pageCopy.supervisionBuilder.syncProgress || {};
    toast.info(syncCopy.cancelledToast || syncCopy.cancelled);
  };
  const handleSyncAllMonitoring = async (clientOverride = null) => {
    const client = clientOverride && typeof clientOverride === "object" && !clientOverride.nativeEvent
      ? clientOverride
      : builderClient;
    const autoStarted = Boolean(clientOverride && !clientOverride.nativeEvent);
    if (!client || !(autoStarted || isSupervisionReportBuilderType(builderType))) return;
    if (syncInFlightRef.current || isSyncingMonitoring || isSyncingOffice365Report) return;
    const clientId = client.id || client.uuid;
    const syncCopy = pageCopy.supervisionBuilder.syncProgress || {};
    if (!clientId) {
      toast.error(syncCopy.noClient || "Impossible d’identifier le client pour la synchronisation.");
      return;
    }
    const controller = createTrackedAbortController();
    const jobs = buildSupervisionSyncJobs(client, {
      copy: syncCopy,
      fetchCheckMKHost: fetchCheckMKDataForHost,
      onCheckMKHostDone: (key, cacheEntry, status) => {
        setEquipmentMonitoringStatus(prev => ({ ...prev, [key]: status }));
        setEquipmentCheckMKData(prev => ({ ...prev, [key]: cacheEntry }));
      },
      signal: controller.signal
    });
    if (jobs.length === 0) {
      try {
        controller.abort();
      } catch {
        // ignore
      }
      if (!autoStarted) toast.info(syncCopy.empty);
      return;
    }
    syncInFlightRef.current = true;
    syncProgressAbortRef.current = controller;
    syncProgressCancelRef.current = false;
    const hasOffice365Job = jobs.some(job => job.group === "office365");
    const initialEta = jobs.reduce((sum, job) => sum + (job.estimatedMs || 5000), 0);
    setIsSyncingMonitoring(true);
    if (hasOffice365Job) setIsSyncingOffice365Report(true);
    setSyncProgress({
      open: true,
      phase: "running",
      items: jobs.map(job => ({ id: job.id, label: job.label, state: "pending", error: null })),
      currentIndex: 0,
      etaMs: initialEta
    });
    const patchItem = (index, patch) => {
      setSyncProgress(prev => {
        const items = prev.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
        return { ...prev, items, currentIndex: index };
      });
    };
    try {
      const result = await runSupervisionSyncJobs(jobs, {
        isCancelled: () => syncProgressCancelRef.current || controller.signal.aborted,
        signal: controller.signal,
        onProgress: event => {
          if (syncProgressCancelRef.current || controller.signal.aborted) return;
          if (event.type === "item") {
            patchItem(event.index, { state: event.state, error: event.error || null });
            return;
          }
          if (event.type === "tick" || event.type === "start") {
            setSyncProgress(prev => ({
              ...prev,
              etaMs: event.etaMs,
              currentIndex: event.completed != null ? Math.min(event.completed, jobs.length - 1) : prev.currentIndex
            }));
          }
        }
      });
      const cancelled = result.cancelled || syncProgressCancelRef.current;
      if (!cancelled) {
        await handleRefreshBuilderClient(client);
      }
      setSyncProgress(prev => ({
        ...prev,
        phase: cancelled || prev.phase === "cancelled" ? "cancelled" : "done",
        etaMs: 0,
        items: prev.items.map(item => item.state === "running" ? { ...item, state: "pending" } : item)
      }));
      if (cancelled) {
        // toast already shown by cancelSyncProgress
      } else if (result.fail === 0) {
        toast.success(fillSyncCopy(syncCopy.successToast, { ok: result.ok, total: jobs.length }));
      } else if (result.ok > 0) {
        toast.warning(fillSyncCopy(syncCopy.partialToast, { ok: result.ok, fail: result.fail }));
      } else {
        toast.error(syncCopy.failToast);
      }
    } catch (err) {
      if (err?.name === "AbortError" || syncProgressCancelRef.current) {
        setSyncProgress(prev => ({
          ...prev,
          phase: "cancelled",
          etaMs: 0,
          items: prev.items.map(item => item.state === "running" ? { ...item, state: "pending" } : item)
        }));
        return;
      }
      console.error("Error during full integration sync:", err);
      setSyncProgress(prev => ({
        ...prev,
        phase: "done",
        etaMs: 0,
        items: prev.items.map(item => item.state === "running" ? { ...item, state: "error", error: err?.message || null } : item)
      }));
      toast.error(err?.message || syncCopy.failToast);
    } finally {
      if (syncProgressAbortRef.current === controller) {
        syncProgressAbortRef.current = null;
      }
      syncInFlightRef.current = false;
      setIsSyncingMonitoring(false);
      setIsSyncingOffice365Report(false);
    }
  };
  const handleSyncSingleEquipment = async (item, {
    moduleKey,
    equipmentKey
  }) => {
    if (!builderClient || !isSupervisionReportBuilderType(builderType)) return;
    const hostName = getCheckmkHostName(item);
    if (!hostName) {
      toast.warn("Cet équipement n’a pas de mapping supervision.");
      return;
    }
    if (!builderClient.reportStartDate || !builderClient.reportEndDate) {
      toast.error("La période du rapport n’est pas définie.");
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
      const site = getCheckmkSite(item);
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
      return cacheEntry;
    } catch (err) {
      console.error("CheckMK equipment sync error:", err);
      toast.error("Erreur lors de la récupération des données supervision.");
      return null;
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
    const familyLabel = MODULE_LABELS[moduleKey] || moduleKey || "Équipement";
    const referenceLabel = `${familyLabel} · ${equipmentName}`;
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
    setEditingComment(null);
  };
  const handlePublishFromCommentsPane = () => {
    if (activeCommentsTarget) {
      handlePublishEquipmentComment();
      return;
    }
    const trimmed = String(pendingEquipmentComment || "").trim();
    if (!trimmed) return;
    if (!showBuilderCommentsPane || !currentBuilderStepKey) {
      setGeneralComments(prev => [...prev, {
        id: Date.now(),
        author: "Vous",
        createdAt: new Date().toISOString(),
        text: trimmed
      }]);
      setPendingEquipmentComment("");
      return;
    }
    const infraModules = ["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "TOIP"];
    const cyberModules = ["Backup", "Antivirus", "Antispam"];
    const servicesModules = ["Office365", "NDD"];
    let category = null;
    if (infraModules.includes(currentBuilderStepKey)) category = "infra";
    else if (cyberModules.includes(currentBuilderStepKey)) category = "cyber";
    else if (servicesModules.includes(currentBuilderStepKey)) category = "services";
    setEquipmentComments(prev => {
      const existing = prev[currentBuilderStepKey] || [];
      return {
        ...prev,
        [currentBuilderStepKey]: [...existing, {
          id: Date.now(),
          author: "Vous",
          createdAt: new Date().toISOString(),
          text: trimmed,
          referenceLabel: currentBuilderStepLabel,
          category,
          moduleKey: currentBuilderStepKey
        }]
      };
    });
    setPendingEquipmentComment("");
  };
  const ensureSummaryContentReady = async () => {
    if (summaryContentRef?.current) return true;
    if (!builderClient) return false;
    const steps = getEnabledMonitoringSteps(builderClient);
    const summaryIndex = steps.indexOf("summary");
    if (summaryIndex < 0) return false;
    if (builderStepIndex !== summaryIndex) {
      setBuilderStepIndex(summaryIndex);
    }
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (summaryContentRef?.current) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return Boolean(summaryContentRef?.current);
  };
  const archiveReportToClientVault = async ({
    visibleToClient,
    documentName,
    reportPeriod,
    folderId = null,
    builderState = null
  }) => {
    const clientId = builderClient?.id ?? builderClient?.uuid;
    if (!clientId) {
      return {
        success: false,
        error: "Client introuvable pour l’archivage documentaire."
      };
    }
    const summaryReady = await ensureSummaryContentReady();
    if (!summaryReady) {
      return {
        success: false,
        error: "Ouvrez l’étape Synthèse puis réenregistrez pour archiver le rapport."
      };
    }
    try {
      const { files, folderLabel } = await buildReportHtmlParts(summaryContentRef, {
        client: builderClient
      });
      if (!files?.length) {
        throw new Error("Aucun fichier HTML à archiver.");
      }
      const payload = {
        files,
        clientId,
        clientName: builderClient.name || builderClient.nom || "",
        description: reportPeriod || "",
        visibleToClient,
        builderState
      };
      const vaultResult = folderId
        ? await replaceReportHtmlFolderInClientVault({
            ...payload,
            folderId
          })
        : await uploadReportHtmlFolderToClientVault({
            ...payload,
            folderName: documentName || folderLabel
          });
      return {
        success: true,
        fileCount: files.length,
        vaultFolderId: vaultResult.vaultFolderId || vaultResult.folder?.id || folderId || null,
        vaultFileIds: vaultResult.vaultFileIds || null
      };
    } catch (err) {
      console.error("Archivage vault:", err);
      return {
        success: false,
        error: err?.message || "Archivage documentaire impossible."
      };
    }
  };
  const handleSaveReport = async () => {
    if (!saveName.trim() || !builderClient) return null;
    setSaveNameError("");
    setSaving(true);
    try {
      const clientName = builderClient?.name || builderClient?.nom || "CLIENT";
      const reportPeriod = builderClient?.reportStartDate && builderClient?.reportEndDate ? `Du ${formatReportDate(builderClient.reportStartDate)} au ${formatReportDate(builderClient.reportEndDate)}` : builderClient?.reportPeriod || null;
      const dataCopy = safeJsonClone({
        reportComments: {
          equipment: equipmentComments,
          general: generalComments
        },
        period: {
          start: builderClient?.reportStartDate || null,
          end: builderClient?.reportEndDate || null
        },
        reportSelectedModules: builderClient.reportSelectedModules || null,
        stepStates: {
          Storage: stepStorageState
        },
        customSynthesis,
        checkMK: buildCheckMKReportSnapshot(equipmentCheckMKData, equipmentMonitoringStatus, builderClient?.reportStartDate, builderClient?.reportEndDate),
        reportType: REPORT_TYPE_IDS.SUPERVISION_ETAT,
        builderVersion: 1
      });
      const buildConfig = (vaultFolderId, vaultFileIds) => safeJsonClone({
        client: {
          id: builderClient.id ?? builderClient.uuid ?? null,
          name: builderClient.name || builderClient.nom || "",
          nom: builderClient.nom || builderClient.name || "",
          reportStartDate: builderClient.reportStartDate || null,
          reportEndDate: builderClient.reportEndDate || null,
          reportPeriod: builderClient.reportPeriod || null,
          reportSelectedModules: builderClient.reportSelectedModules || null
        },
        reportType: REPORT_TYPE_IDS.SUPERVISION_ETAT,
        vaultFolderId: vaultFolderId || null,
        vaultFileIds: vaultFileIds || null,
        visibleToClient: Boolean(saveVisibleToClient)
      });

      const result = editingDocumentId
        ? await updateMonitoringDocument(editingDocumentId, {
            name: saveName.trim(),
            client_name: clientName,
            report_period: reportPeriod,
            config: buildConfig(editingVaultFolderId, editingVaultFileIds),
            data: dataCopy
          })
        : await saveMonitoringDocument({
            name: saveName.trim(),
            client_name: clientName,
            report_period: reportPeriod,
            config: buildConfig(editingVaultFolderId, editingVaultFileIds),
            data: dataCopy,
            overwrite: false
          });
      if (result && result.success) {
        const nextDocId = result.id || editingDocumentId;
        if (nextDocId) setEditingDocumentId(nextDocId);

        const builderState = buildSupervisionBuilderStatePayload({
          equipmentCheckMKData,
          equipmentMonitoringStatus,
          equipmentAlertCounts,
          equipmentTicketInsightCounts,
          equipmentTicketsByKey,
          customSynthesis
        });
        const vaultResult = await archiveReportToClientVault({
          visibleToClient: saveVisibleToClient,
          documentName: saveName.trim(),
          reportPeriod,
          folderId: editingVaultFolderId,
          builderState
        });

        if (vaultResult.success) {
          const nextFolderId = vaultResult.vaultFolderId || editingVaultFolderId || null;
          const nextFileIds = vaultResult.vaultFileIds || editingVaultFileIds || null;
          if (nextFolderId) setEditingVaultFolderId(nextFolderId);
          if (nextFileIds) setEditingVaultFileIds(nextFileIds);
          if (nextDocId && (nextFolderId || nextFileIds)) {
            await updateMonitoringDocument(nextDocId, {
              name: saveName.trim(),
              client_name: clientName,
              report_period: reportPeriod,
              config: buildConfig(nextFolderId, nextFileIds),
              data: dataCopy
            });
          }
        }

        setEditFrozenAt(new Date().toISOString());
        setSaveSuccessVisible(true);
        setSaveNameError("");
        setShowSaveModal(false);
        setSavedDocsRefreshKey(k => k + 1);
        setTimeout(() => setSaveSuccessVisible(false), 3000);
        if (vaultResult.success) {
          toast.success(saveVisibleToClient
            ? `Rapport enregistré : dossier + ${vaultResult.fileCount || 3} HTML partagés avec l’entreprise.`
            : `Rapport enregistré : dossier + ${vaultResult.fileCount || 3} HTML (interne agents).`);
        } else if (!vaultResult.skipped) {
          toast.warn(vaultResult.error ? `Rapport enregistré, mais archivage échoué : ${vaultResult.error}` : "Rapport enregistré, mais l’archivage documentaire a échoué.");
        } else {
          toast.success("Rapport enregistré.");
        }
        return result;
      }
      if (!editingDocumentId && result && result.message && /déjà enregistré|already saved|already exists|existe déjà/i.test(String(result.message))) {
        setSaveNameError(
          `Un document nommé « ${saveName.trim()} » existe déjà. Choisissez un autre nom.`
        );
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
  const handleDownloadZip = async () => {
    if (!builderClient) {
      toast.error("Aucun client sélectionné.");
      return;
    }
    try {
      await exportReportAsZIP(summaryContentRef, {
        client: builderClient
      });
      toast.success("Téléchargement du rapport lancé.");
    } catch (err) {
      toast.error(err?.message || "Erreur pendant l’export.");
    }
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
  const handleStartEditFromPane = comment => {
    if (comment.scope === "general") {
      handleStartEditGeneralComment(comment);
    } else {
      handleStartEditEquipmentComment(comment.equipmentKey, comment);
    }
  };
  const handleDeleteFromPane = comment => {
    if (comment.scope === "general") {
      handleDeleteGeneralComment(comment.id);
    } else {
      handleDeleteEquipmentComment(comment.equipmentKey, comment.id);
    }
  };
  const formatReportDate = isoDate => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString(pageCopy.bcp47);
  };
  const formatDocDateTime = isoDate => {
    if (!isoDate) return "";
    try {
      return new Date(isoDate).toLocaleString(pageCopy.bcp47, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return String(isoDate);
    }
  };
  const isSupervisionBuilder = isSupervisionReportBuilderType(builderType) && builderClient;
  const isDraftWizard = Boolean(draftReport);
  const isInterventionDraft = isDraftWizard && draftReport?.type?.id === REPORT_TYPE_IDS.INTERVENTION;
  const isAuditDraft = isDraftWizard && draftReport?.type?.id === REPORT_TYPE_IDS.AUDIT;
  const isAuditGate = isAuditDraft && !draftReport?.auditSubtypeId;
  const isAuditBuilder = isAuditDraft && Boolean(draftReport?.auditSubtypeId);
  const isSupervisionDraft = isDraftWizard && draftReport?.type?.id === REPORT_TYPE_IDS.SUPERVISION_ETAT;
  const builderCommentsPane = showBuilderCommentsPane ? (
    <BuilderCommentsPane
      stepKey={currentBuilderStepKey}
      stepLabel={currentBuilderStepLabel}
      target={activeCommentsTarget}
      comments={allCommentsChronological.filter(comment =>
        !comment.moduleKey
        || comment.moduleKey === currentBuilderStepKey
        || comment.equipmentKey === currentBuilderStepKey
      )}
      pendingText={pendingEquipmentComment}
      onPendingChange={setPendingEquipmentComment}
      onPublish={handlePublishFromCommentsPane}
      onClearTarget={handleClearCommentsTarget}
      editingComment={editingComment}
      onStartEdit={handleStartEditFromPane}
      onChangeEditingText={handleChangeEditingText}
      onSaveEdit={handleSaveEditingComment}
      onCancelEdit={() => setEditingComment(null)}
      onDelete={handleDeleteFromPane}
    />
  ) : null;
  return <>
      <div className={`${cyberStyles.mspPage} ${layout.page} msp-page-insight`}>
        {isSupervisionBuilder ? <div className={cyberStyles.mspLayout}>
            <div className={cyberStyles.mspMain}>
            <div className={shellStyles.shell}>
              <div className={shellStyles.builderToolbar} data-guide="report-hero">
                <div className={shellStyles.builderToolbarMeta}>
                  <h1 className={shellStyles.builderToolbarTitle}>{pageCopy.reportTypes.supervisionEtat.title}</h1>
                  <p className={shellStyles.builderToolbarSubtitle}>
                    {builderClient?.reportStartDate && builderClient?.reportEndDate
                      ? `${builderClient?.name || builderClient?.nom || pageCopy.create.getClientLabel(builderClient?.id)} · Du ${formatReportDate(builderClient.reportStartDate)} au ${formatReportDate(builderClient.reportEndDate)}`
                      : `${builderClient?.name || builderClient?.nom || ""} — ${pageCopy.supervisionBuilder.builderHint || ""}`}
                  </p>
                  {editingDocumentId && editFrozenAt ? (
                    <p className={shellStyles.builderToolbarSubtitle}>
                      {interpolate(pageCopy.supervisionBuilder.editFrozenHint || "Données figées au {date} — synchroniser pour actualiser.", {
                        date: formatDocDateTime(editFrozenAt)
                      })}
                    </p>
                  ) : null}
                </div>
                <div className={shellStyles.heroActions}>
                  <button
                    type="button"
                    className={shellStyles.heroIconBtn}
                    onClick={() => { void handleSyncAllMonitoring(); }}
                    disabled={isSyncingMonitoring || isSyncingOffice365Report || syncProgress.open}
                    title={pageCopy.supervisionBuilder.builderSync}
                    aria-label={pageCopy.supervisionBuilder.builderSync}
                  >
                    <Icon
                      icon={
                        isSyncingMonitoring || isSyncingOffice365Report || syncProgress.open
                          ? "line-md:loading-loop"
                          : "line-md:backup-restore"
                      }
                      width={20}
                      height={20}
                      aria-hidden
                    />
                  </button>
                  {isOnSummaryStep ? (
                    <button
                      type="button"
                      className={shellStyles.heroIconBtn}
                      onClick={handleDownloadZip}
                      disabled={!builderClient}
                      title={pageCopy.supervisionBuilder.builderDownload}
                      aria-label={pageCopy.supervisionBuilder.builderDownload}
                    >
                      <Icon icon="line-md:download-loop" width={20} height={20} aria-hidden />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`${shellStyles.heroIconBtn} ${shellStyles.heroIconBtnPrimary}`}
                    onClick={() => {
                      if (!builderClient) return;
                      setSaveNameError("");
                      if (editingDocumentId && !saveName.trim()) {
                        /* keep existing name when editing */
                      }
                      setShowSaveModal(true);
                    }}
                    disabled={!builderClient}
                    title={pageCopy.supervisionBuilder.builderSave}
                    aria-label={pageCopy.supervisionBuilder.builderSave}
                  >
                    <Icon icon="line-md:file-plus" width={20} height={20} aria-hidden />
                  </button>
                </div>
              </div>

              <div ref={builderSectionRef} className={shellStyles.builderBody}>

                <SaveSupervisionReportModal
                  open={showSaveModal}
                  saving={saving}
                  saveName={saveName}
                  onSaveNameChange={value => {
                    setSaveName(value);
                    if (saveNameError) setSaveNameError("");
                  }}
                  visibleToClient={saveVisibleToClient}
                  onVisibleToClientChange={setSaveVisibleToClient}
                  onClose={() => {
                    if (saving) return;
                    setShowSaveModal(false);
                    setSaveNameError("");
                  }}
                  onSubmit={() => handleSaveReport()}
                  clientName={builderClient?.name || builderClient?.nom || ""}
                  nameError={saveNameError}
                />

                {isSupervisionReportBuilderType(builderType) && builderClient && (
                  <MonitoringSteps
                    client={builderClient}
                    activeStepIndex={builderStepIndex}
                    onStepChange={setBuilderStepIndex}
                    onOpenComments={handleOpenEquipmentComments}
                    onRefreshClient={handleRefreshBuilderClient}
                    onEquipmentSaved={handleReportEquipmentSaved}
                    equipmentCommentCounts={equipmentCommentCounts}
                    equipmentTicketCounts={equipmentTicketCounts}
                    equipmentTicketsByKey={equipmentTicketsByKey}
                    equipmentAlertCounts={equipmentAlertCounts}
                    equipmentComments={equipmentComments}
                    highlightedEquipmentKey={highlightedEquipmentKey}
                    monitoringSyncStatus={equipmentMonitoringStatus}
                    equipmentCheckMKData={equipmentCheckMKData}
                    isSyncingMonitoring={isSyncingMonitoring}
                    onSyncCheckMK={handleSyncSingleEquipment}
                    syncingEquipmentKey={syncingEquipmentKey}
                    isSyncingOffice365Report={isSyncingOffice365Report}
                    allCommentsChronological={allCommentsChronological}
                    summaryContentRef={summaryContentRef}
                    stockageReportState={stepStorageState}
                    onSetStorageReportState={setStepStorageState}
                    commentsPane={builderCommentsPane}
                    customSynthesis={customSynthesis}
                    onCustomSynthesisChange={setCustomSynthesis}
                  />
                )}

              </div>
            </div>
            </div>
          </div> : isInterventionDraft ? <ReportInterventionBuilder copy={pageCopy} reportType={draftReport.type} client={draftReport.client} initialData={draftReport.initialData} documentId={draftReport.documentId} documentName={draftReport.documentName} initialVaultFileId={draftReport.vaultFileId || null} initialVisibleToClient={Boolean(draftReport.visibleToClient)} onBack={handleBackFromDraftReport} /> : isAuditGate ? <div className={cyberStyles.mspLayout}>
            <div className={cyberStyles.mspMain}>
              <AuditSubtypeGate
                locale={pageCopy.localeCode || locale}
                reportType={draftReport.type}
                client={draftReport.client}
                initialSubtypeId={draftReport.initialData?.subtypeId}
                onBack={handleBackFromDraftReport}
                onConfirm={({ subtypeId }) => {
                  setPendingLaunchAction({ kind: "auditSubtype", subtypeId });
                  setLaunchDisclaimerOpen(true);
                }}
              />
            </div>
          </div> : isAuditBuilder ? <RapportAuditBuilder
            copy={pageCopy}
            reportType={draftReport.type}
            client={draftReport.client}
            subtypeId={draftReport.auditSubtypeId}
            initialData={draftReport.initialData}
            documentId={draftReport.documentId}
            documentName={draftReport.documentName}
            initialVaultFileId={draftReport.vaultFileId || null}
            initialVisibleToClient={Boolean(draftReport.visibleToClient)}
            onBack={handleBackFromDraftReport}
            onChangeSubtype={() => {
              setDraftReport(prev => prev ? { ...prev, auditSubtypeId: null, initialData: null } : prev);
            }}
          /> : isSupervisionDraft ? <div className={cyberStyles.mspLayout}>
            <div className={cyberStyles.mspMain}>
              <SupervisionPeriodGate copy={pageCopy} reportType={draftReport.type} client={draftReport.client} onBack={handleBackFromDraftReport} onConfirm={handleConfirmSupervisionPeriod} confirming={startingSupervisionBuilder} />
            </div>
          </div> : isDraftWizard ? <ReportBuilderPlaceholder copy={pageCopy} reportType={draftReport.type} client={draftReport.client} onBack={handleBackFromDraftReport} /> : <div className={cyberStyles.mspLayout}>
            <div className={cyberStyles.mspMain}>
              <main className={`${cyberStyles.mspContent} ${cyberStyles.mspContentList} ${layout.contentNoHero}`} data-guide="report-hero">
                <h1 className={layout.srOnly}>{pageCopy.pageTitle}</h1>
                <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
                  <div className={styles.wizardFill}>
                    {error ? <div className={styles.alertError}>{error}</div> : null}
                    <div className={styles.homeSplit}>
                      <div className={styles.homeMain}>
                        <ReportCreateWizard
                          copy={pageCopy}
                          reportTypes={reportTypes}
                          clients={clients}
                          loading={loading || openingSavedReport}
                          step={createWizardStep}
                          onStepChange={setCreateWizardStep}
                          selectedClientId={selectedClientId}
                          onSelectClient={handleWizardSelectClient}
                          selectedReportTypeId={selectedReportTypeId}
                          onSelectType={handleWizardSelectType}
                          onStartReport={handleStartDraftReport}
                        />
                      </div>
                      <aside className={styles.homeSide}>
                        <RapportSavedDocuments
                          copy={pageCopy}
                          refreshKey={savedDocsRefreshKey}
                          onEditDocument={doc => { void openSavedReport(doc); }}
                        />
                      </aside>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>}
      </div>
      <PageGuideTour open={pageGuideOpen} steps={rapportGuide.steps} title={rapportGuide.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
      <ReportSyncProgressModal
        open={syncProgress.open}
        copy={pageCopy.supervisionBuilder.syncProgress || {}}
        items={syncProgress.items}
        currentIndex={syncProgress.currentIndex}
        etaMs={syncProgress.etaMs}
        phase={syncProgress.phase}
        onCancel={cancelSyncProgress}
        onClose={closeSyncProgressModal}
      />
      <ConfirmModal
        open={builderLeaveModalOpen}
        title={pageCopy.supervisionBuilder.unsavedTitle}
        message={pageCopy.supervisionBuilder.unsavedMessage}
        confirmLabel={pageCopy.supervisionBuilder.leaveConfirm}
        cancelLabel={pageCopy.supervisionBuilder.leaveCancel}
        icon="mdi:content-save-alert-outline"
        onClose={handleBuilderLeaveCancel}
        onConfirm={handleBuilderLeaveConfirm}
      />
      <ConfirmModal
        open={launchDisclaimerOpen}
        title={pageCopy.supervisionBuilder.unsavedTitle}
        message={pageCopy.supervisionBuilder.unsavedMessage}
        confirmLabel={pageCopy.supervisionBuilder.unsavedConfirm}
        cancelLabel={pageCopy.supervisionBuilder.unsavedCancel || pageCopy.wizard?.back}
        icon="mdi:content-save-alert-outline"
        onClose={handleLaunchDisclaimerClose}
        onConfirm={handleLaunchDisclaimerConfirm}
      />
    </>;
}
