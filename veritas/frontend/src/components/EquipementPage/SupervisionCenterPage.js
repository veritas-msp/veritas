import MonitoringAlertRulesPanel from "./SupervisionAlertRulesPanel";
import { useSupervisionAlertRules } from "../../hooks/useSupervisionAlertRules";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import PageGuideTour from "../PageGuide/PageGuideTour";
import SupervisionCenterPageSkeleton from "./SupervisionCenterPageSkeleton";
import { getSupervisionCenterGuideSteps } from "../PageGuide/supervisionCenterGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getLocaleTag } from "../../i18n/locales";
import { isAdminOrSuperAdminProfile } from "../../utils/profileProtection";
import { getSupervisionCenterCopy } from "./supervisionCenterPageI18n";
import { buildQueueItemsFromSupervisionAlerts, filterSupervisionQueue, countQueueBySeverity, createSupervisionSupportTicket } from "./supervisionQueueUtils";
import { interpolate } from "../../i18n/translate";
import SupervisionOpsQueue from "./SupervisionOpsQueue";
import SupervisionMaintenanceSidebar from "./SupervisionMaintenanceSidebar";
import SupervisionAlertHistory from "./SupervisionAlertHistory";
import SupervisionAlertDiagnosticModal from "./SupervisionAlertDiagnosticModal";
import SupervisionIgnoreModal from "./SupervisionIgnoreModal";
import SupervisionMaintenanceModal from "./SupervisionMaintenanceModal";
import { syncEquipmentCheckMKMonitoring } from "../../api/equipment";
import { updateEquipmentAlertSuspension } from "../../api/equipmentMonitoringAlerts";
import {
  ackSupervisionAlert,
  unackSupervisionAlert,
  createSupervisionExclusion,
  deleteSupervisionExclusion,
  dismissSupervisionAlert,
  fetchSupervisionAlertsActive,
  fetchSupervisionAlertsHistory,
  fetchSupervisionExclusions,
  resolveSupervisionAlert,
  subscribeSupervisionAlertStream
} from "../../api/supervisionAlerts";
import { toast } from "react-toastify";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { useCheckMKIntegrationEnabled } from "../../hooks/useCheckMKIntegrationEnabled";
import { Icon } from "@iconify/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SmartTooltip from "../SmartTooltip";
import { uiKitLayoutsStyles as kit } from "../UiKit";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import dashStyles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import styles from "./SupervisionCenterPage.module.css";
import SupervisionFleetSyncModal, { getFleetSyncProgress } from "./SupervisionFleetSyncModal";
import {
  cancelCheckmkFleetSync,
  fetchActiveCheckmkSyncRun,
  fetchCheckmkSyncStatus
} from "../../api/checkmkSyncLogs";
import { countTriageBuckets } from "./supervisionTriageUtils";

export default function MonitoringCenterPage({
  loading: parentLoading = false,
  error: parentError = null,
  statsItems = [],
  resolveMonitorStatus,
  onEquipmentOpen,
  onNavigate,
  checkmkIntegrationEnabled: checkmkProp,
  isMkMapped = () => false
}) {
  const [activeTab, setActiveTab] = useState("operations");
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState(null);
  const [opsSeverityFilter, setOpsSeverityFilter] = useState("all");
  const [opsSearchQuery, setOpsSearchQuery] = useState("");
  const [triageView, setTriageView] = useState("todo");
  const [exclusions, setExclusions] = useState([]);
  const [resyncBusyId, setResyncBusyId] = useState(null);
  const [diagnoseAlertId, setDiagnoseAlertId] = useState(null);
  const [ignoreItem, setIgnoreItem] = useState(null);
  const [maintenanceItem, setMaintenanceItem] = useState(null);
  const [triageModalBusy, setTriageModalBusy] = useState(false);
  const [alertActionBusyId, setAlertActionBusyId] = useState(null);
  const [historyAlerts, setHistoryAlerts] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [historyTrashMode, setHistoryTrashMode] = useState(false);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const [fleetSyncActive, setFleetSyncActive] = useState(false);
  const [fleetSyncExpanded, setFleetSyncExpanded] = useState(false);
  const [fleetSyncStartKey, setFleetSyncStartKey] = useState(0);
  const [fleetSyncProgress, setFleetSyncProgress] = useState(null);
  const [fleetSyncCancelling, setFleetSyncCancelling] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const fleetSyncRefreshAtRef = useRef(0);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const { user } = useAuthContext();
  const { isAdmin, realIsAdmin, can } = usePermissions();
  const canManageAlertRules =
    Boolean(realIsAdmin) ||
    Boolean(isAdmin) ||
    isAdminOrSuperAdminProfile(user?.profile) ||
    can("supervision.manage") ||
    can("admin_panel.supervision_alerts");
  const locale = useAppLocale();
  const localeTag = getLocaleTag(locale);
  const pageCopy = useMemo(() => getSupervisionCenterCopy(locale), [locale]);
  const guideSteps = useMemo(() => getSupervisionCenterGuideSteps({
    showOperations: () => setActiveTab("operations"),
    showHistory: () => setActiveTab("history")
  }, locale), [locale]);
  const {
    rules: alertRules,
    catalog: alertRulesCatalog,
    applyRules
  } = useSupervisionAlertRules();
  const {
    enabled: checkmkFromHook
  } = useCheckMKIntegrationEnabled();
  const checkmkIntegrationEnabled = checkmkProp ?? checkmkFromHook;
  const loading = alertsLoading || parentLoading;
  const error = alertsError || parentError;
  const enrichedQueue = useMemo(
    () =>
      buildQueueItemsFromSupervisionAlerts(activeAlerts, {
        noName: pageCopy.priority?.noName || "-"
      }),
    [activeAlerts, pageCopy.priority?.noName]
  );
  const visibleQueue = useMemo(
    () => enrichedQueue.filter(item => !item.muted),
    [enrichedQueue]
  );
  const triageCounts = useMemo(
    () => countTriageBuckets(enrichedQueue, exclusions),
    [enrichedQueue, exclusions]
  );
  const filteredQueue = useMemo(() => {
    if (triageView === "waiting") return [];
    const base = filterSupervisionQueue(visibleQueue, {
      severity: triageView === "todo" ? opsSeverityFilter : "all",
      query: opsSearchQuery,
      workflowStatus: triageView === "todo" ? "open" : "all"
    });
    if (triageView === "in_progress") {
      return base.filter(item => {
        const wf = item.workflowStatus || "open";
        return wf === "acked" || wf === "linked";
      });
    }
    return base;
  }, [visibleQueue, opsSeverityFilter, opsSearchQuery, triageView]);
  const severityCounts = useMemo(
    () => countQueueBySeverity(visibleQueue.filter(item => (item.workflowStatus || "open") === "open")),
    [visibleQueue]
  );
  const loadActiveAlerts = useCallback(async signal => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const alerts = await fetchSupervisionAlertsActive({ signal });
      if (signal?.aborted) return;
      setActiveAlerts(Array.isArray(alerts) ? alerts : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Error loading supervision alerts:", err);
      setActiveAlerts([]);
      setAlertsError(err?.message || "Error loading alerts");
    } finally {
      if (!signal?.aborted) setAlertsLoading(false);
    }
  }, []);
  const loadExclusions = useCallback(async signal => {
    try {
      const rows = await fetchSupervisionExclusions({ signal });
      if (signal?.aborted) return;
      setExclusions(Array.isArray(rows) ? rows : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Error loading supervision exclusions:", err);
      if (!signal?.aborted) setExclusions([]);
    }
  }, []);

  useEffect(() => {
    const controller = createTrackedAbortController();
    loadActiveAlerts(controller.signal);
    loadExclusions(controller.signal);
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (controller.signal.aborted) return;
      loadActiveAlerts(controller.signal);
      loadExclusions(controller.signal);
    }, 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [loadActiveAlerts, loadExclusions]);

  const refreshLiveQueue = useCallback(async () => {
    const controller = createTrackedAbortController();
    try {
      await Promise.all([
        loadActiveAlerts(controller.signal),
        loadExclusions(controller.signal)
      ]);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error refreshing supervision queue during sync:", err);
      }
    }
  }, [loadActiveAlerts, loadExclusions]);

  const handleFleetSyncProgress = useCallback(progress => {
    setFleetSyncProgress(progress);
    if (progress?.cancelling) setFleetSyncCancelling(true);
    const running = Boolean(progress?.starting || progress?.run?.status === "running");
    if (!running) return;
    const now = Date.now();
    if (now - fleetSyncRefreshAtRef.current < 2500) return;
    fleetSyncRefreshAtRef.current = now;
    refreshLiveQueue();
  }, [refreshLiveQueue]);

  const startFleetSync = useCallback(() => {
    setFleetSyncStartKey(key => key + 1);
    setFleetSyncActive(true);
    setFleetSyncExpanded(true);
    setFleetSyncProgress(null);
    setFleetSyncCancelling(false);
    fleetSyncRefreshAtRef.current = 0;
    setActiveTab("operations");
  }, []);

  const attachFleetSync = useCallback((run, { expand = false } = {}) => {
    if (!run?.id) return;
    setFleetSyncActive(true);
    if (expand) setFleetSyncExpanded(true);
    setFleetSyncCancelling(Boolean(run?.details?.cancelRequested));
    const progress = getFleetSyncProgress(run);
    setFleetSyncProgress({
      run,
      starting: false,
      error: null,
      statusLabel: pageCopy.fleetSync?.status?.[run.status] || run.status,
      ...progress,
      currentHost: run?.details?.currentHost || null,
      startedBy: run?.details?.startedBy || null,
      isTerminal: run.status !== "running"
    });
  }, [pageCopy.fleetSync]);

  const refreshSyncStatus = useCallback(async () => {
    if (!checkmkIntegrationEnabled) {
      setSyncStatus(null);
      return;
    }
    try {
      const data = await fetchCheckmkSyncStatus();
      setSyncStatus(data);
    } catch {
      /* ignore */
    }
  }, [checkmkIntegrationEnabled]);

  const dismissFleetSync = useCallback(() => {
    setFleetSyncActive(false);
    setFleetSyncExpanded(false);
    setFleetSyncProgress(null);
    setFleetSyncCancelling(false);
    refreshSyncStatus();
  }, [refreshSyncStatus]);

  const stopFleetSync = useCallback(async () => {
    const runId = fleetSyncProgress?.run?.id;
    if (!runId || fleetSyncCancelling) return;
    setFleetSyncCancelling(true);
    try {
      await cancelCheckmkFleetSync(runId, {
        cancelledBy: user?.username || user?.email || undefined
      });
    } catch (err) {
      setFleetSyncCancelling(false);
      toast.error(err?.message || pageCopy.fleetSync?.cancelError || "Impossible d'arreter la synchronisation.");
    }
  }, [fleetSyncProgress?.run?.id, fleetSyncCancelling, user?.username, user?.email, pageCopy.fleetSync?.cancelError]);

  useEffect(() => {
    if (!checkmkIntegrationEnabled) return undefined;
    let cancelled = false;
    const pollActive = async () => {
      try {
        const data = await fetchActiveCheckmkSyncRun();
        if (cancelled) return;
        const run = data?.run;
        if (run?.status === "running") {
          if (!fleetSyncActive) {
            attachFleetSync(run, { expand: false });
          } else if (!fleetSyncProgress?.run?.id || fleetSyncProgress.run.id === run.id) {
            // Keep header fresh when modal is minimized / another agent views the page.
            if (!fleetSyncExpanded) {
              const progress = getFleetSyncProgress(run);
              setFleetSyncProgress(prev => ({
                ...(prev || {}),
                run,
                starting: false,
                error: null,
                statusLabel: pageCopy.fleetSync?.status?.running || "Synchronisation en cours...",
                ...progress,
                currentHost: run?.details?.currentHost || null,
                startedBy: run?.details?.startedBy || prev?.startedBy || null,
                cancelling: Boolean(run?.details?.cancelRequested) || prev?.cancelling,
                isTerminal: false
              }));
              if (run?.details?.cancelRequested) setFleetSyncCancelling(true);
            }
          }
        }
      } catch {
        /* ignore poll errors */
      }
    };
    pollActive();
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      pollActive();
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    checkmkIntegrationEnabled,
    fleetSyncActive,
    fleetSyncExpanded,
    fleetSyncProgress?.run?.id,
    attachFleetSync,
    pageCopy.fleetSync?.status?.running
  ]);

  useEffect(() => {
    if (!checkmkIntegrationEnabled) {
      setSyncStatus(null);
      return undefined;
    }
    refreshSyncStatus();
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refreshSyncStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkmkIntegrationEnabled, refreshSyncStatus]);

  useEffect(() => {
    if (!fleetSyncProgress?.isTerminal) return;
    refreshSyncStatus();
  }, [fleetSyncProgress?.isTerminal, refreshSyncStatus]);

  const refreshHistory = useCallback(async signal => {
    if (!signal?.aborted) setHistoryLoading(true);
    try {
      const alerts = await fetchSupervisionAlertsHistory({
        domain: "devices",
        status: historyTrashMode || historyStatus === "all" ? undefined : historyStatus,
        q: historySearch || undefined,
        trash: historyTrashMode ? "1" : undefined,
        limit: 150,
        signal
      });
      if (signal?.aborted) return;
      setHistoryAlerts(Array.isArray(alerts) ? alerts : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Error loading supervision alert history:", err);
      if (!signal?.aborted) setHistoryAlerts([]);
    } finally {
      if (!signal?.aborted) setHistoryLoading(false);
    }
  }, [historyStatus, historySearch, historyTrashMode]);

  const handleFleetSyncFinished = useCallback((run, meta = {}) => {
    refreshLiveQueue();
    refreshHistory();
    setFleetSyncCancelling(false);
    const copy = pageCopy.fleetSync || {};
    if (meta?.error) {
      toast.error(meta.error);
      return;
    }
    const status = run?.status;
    const failures = Array.isArray(run?.details?.failures) ? run.details.failures : [];
    const failureHint = failures
      .slice(0, 3)
      .map(item => item?.hostName || item?.error)
      .filter(Boolean)
      .join(", ");
    if (status === "success") toast.success(copy.status?.success || "Synchronisation terminee");
    else if (status === "partial") {
      const base = copy.status?.partial || "Terminee avec des erreurs partielles";
      toast.warn(failureHint ? `${base} · ${failureHint}` : base);
    } else if (status === "cancelled") toast.info(copy.status?.cancelled || "Synchronisation arretee");
    else if (status === "error") {
      const base = copy.status?.error || "Echec de la synchronisation";
      toast.error(failureHint ? `${base} · ${failureHint}` : base);
    }
  }, [refreshLiveQueue, refreshHistory, pageCopy.fleetSync]);
  useEffect(() => {
    const controller = createTrackedAbortController();
    refreshHistory(controller.signal);
    return () => controller.abort();
  }, [refreshHistory]);
  const applyAlertResult = useCallback(result => {
    const alert = result?.alert || result;
    if (!alert?.queueItemId) {
      loadActiveAlerts();
      return;
    }
    setActiveAlerts(prev => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const idx = next.findIndex(a => a.queueItemId === alert.queueItemId);
      if (alert.status === "closed" || alert.deletedAt) {
        if (idx >= 0) next.splice(idx, 1);
        return next;
      }
      if (idx >= 0) next[idx] = alert;
      else next.unshift(alert);
      return next;
    });
  }, [loadActiveAlerts]);
  useEffect(() => {
    const unsubscribe = subscribeSupervisionAlertStream({
      onEvent: payload => {
        if (payload?.type !== "alert" || !payload.alert) return;
        applyAlertResult(payload);
        if (payload.alert.status === "closed" || payload.action === "reopen" || payload.action === "resolved" || payload.action === "dismissed") {
          refreshHistory();
        }
        if (payload.action === "reopen" || payload.action === "opened") {
          loadActiveAlerts();
        }
      },
      onError: err => {
        console.warn("[supervision-alerts] stream:", err?.message || err);
      }
    });
    return unsubscribe;
  }, [applyAlertResult, refreshHistory, loadActiveAlerts]);
  const runAlertAction = useCallback(async (item, actionFn, successKey) => {
    if (!item?.id) return;
    setAlertActionBusyId(item.id);
    try {
      const result = await actionFn(item);
      applyAlertResult(result);
      const msg = pageCopy.ops?.toasts?.[successKey];
      if (msg) toast.success(msg);
      if (successKey === "resolved" || successKey === "dismissed") {
        refreshHistory();
      }
    } catch (err) {
      toast.error(err?.message || pageCopy.ops?.toasts?.actionFailed || "Error");
    } finally {
      setAlertActionBusyId(null);
    }
  }, [applyAlertResult, pageCopy.ops, refreshHistory]);
  const handleAckAlert = useCallback(item => runAlertAction(item, i => ackSupervisionAlert(i), "acked"), [runAlertAction]);
  const handleUnackAlert = useCallback(item => runAlertAction(item, i => unackSupervisionAlert(i), "unacked"), [runAlertAction]);

  const resolveMuteFamily = useCallback(item => {
    return item?.family || item?.alertState?.meta?.family || item?.equipment?.family || null;
  }, []);

  const applyEquipmentMute = useCallback(async (item, payload = {}) => {
    const equipmentId = item?.equipmentId || item?.equipment?.id;
    const clientId = item?.clientId;
    const family = resolveMuteFamily(item);
    if (!equipmentId || !clientId || !family) {
      const err = new Error(pageCopy.ops?.toasts?.muteFail || "Mute impossible");
      throw err;
    }
    const body =
      payload.mode === "disabled"
        ? {
            family,
            equipmentName: item?.equipment?.name || item?.subtitle,
            suspensionType: "none",
            alertsEnabled: false
          }
        : {
            family,
            equipmentName: item?.equipment?.name || item?.subtitle,
            suspensionType: "temporary",
            alertsEnabled: true,
            ...(payload.suspendedUntil
              ? { suspendedUntil: payload.suspendedUntil }
              : { durationMinutes: payload.durationMinutes || 120 }),
            reason: payload.reason || "Mute depuis le centre de supervision"
          };
    await updateEquipmentAlertSuspension(clientId, equipmentId, body);
  }, [pageCopy.ops?.toasts?.muteFail, resolveMuteFamily]);

  const handleResolveAlert = useCallback(item => {
    const wf = item?.workflowStatus || "open";
    if (wf === "open") {
      toast.info(pageCopy.ops?.toasts?.ackRequiredResolve || "Prenez d’abord l’alerte en charge.");
      return;
    }
    return runAlertAction(item, i => resolveSupervisionAlert(i), "resolved");
  }, [pageCopy.ops?.toasts, runAlertAction]);

  const upsertExclusionFromPayload = useCallback(async exclusion => {
    if (!exclusion) return null;
    const family = exclusion.family || exclusion.equipmentFamily;
    if (!exclusion.clientId || !exclusion.equipmentId || !family) {
      throw new Error(pageCopy.ops?.toasts?.exclusionFail || "Exclusion impossible");
    }
    if (exclusion.scope === "device") {
      await applyEquipmentMute(
        {
          clientId: exclusion.clientId,
          equipmentId: exclusion.equipmentId,
          family,
          equipment: { name: exclusion.equipmentName },
          subtitle: exclusion.equipmentName
        },
        exclusion.excludedUntil
          ? {
              mode: "temporary",
              suspendedUntil: exclusion.excludedUntil,
              reason: exclusion.reason || "Maintenance supervision"
            }
          : {
              mode: "disabled",
              reason: exclusion.reason || "Maintenance supervision"
            }
      );
    }
    return createSupervisionExclusion({
      clientId: exclusion.clientId,
      equipmentId: exclusion.equipmentId,
      family,
      equipmentName: exclusion.equipmentName,
      scope: exclusion.scope || "service",
      kind: exclusion.kind || "maintenance",
      serviceKey: exclusion.serviceKey,
      serviceName: exclusion.serviceName,
      reason: exclusion.reason,
      excludedUntil: exclusion.excludedUntil
    });
  }, [applyEquipmentMute, pageCopy.ops?.toasts?.exclusionFail]);

  const handleConfirmIgnore = useCallback(async payload => {
    const item = ignoreItem;
    if (!item) return;
    setTriageModalBusy(true);
    setAlertActionBusyId(item.id);
    try {
      if (payload?.exclusion) {
        await upsertExclusionFromPayload(payload.exclusion);
      }
      const result = await dismissSupervisionAlert(item, {
        ignoreReason: payload?.ignoreReason,
        closureDetail: payload?.closureDetail
      });
      applyAlertResult(result);
      toast.success(pageCopy.ops?.toasts?.ignored || pageCopy.ops?.toasts?.dismissed || "Ignored");
      refreshHistory();
      await loadExclusions();
      setIgnoreItem(null);
    } catch (err) {
      toast.error(err?.message || pageCopy.ops?.toasts?.actionFailed || "Error");
    } finally {
      setTriageModalBusy(false);
      setAlertActionBusyId(null);
    }
  }, [applyAlertResult, ignoreItem, loadExclusions, pageCopy.ops?.toasts, refreshHistory, upsertExclusionFromPayload]);

  const handleConfirmMaintenance = useCallback(async payload => {
    const item = maintenanceItem;
    if (!item) return;
    setTriageModalBusy(true);
    setAlertActionBusyId(item.id);
    try {
      await upsertExclusionFromPayload(payload?.exclusion);
      if (payload?.dismissAlert) {
        const result = await dismissSupervisionAlert(item, {
          ignoreReason: "maintenance",
          closureDetail: payload?.exclusion?.reason || null,
          meta: { maintenance: true }
        });
        applyAlertResult(result);
        refreshHistory();
      }
      toast.success(pageCopy.ops?.toasts?.maintenanceOk || "Maintenance recorded");
      await loadExclusions();
      setMaintenanceItem(null);
      setTriageView("waiting");
    } catch (err) {
      toast.error(err?.message || pageCopy.ops?.toasts?.actionFailed || "Error");
    } finally {
      setTriageModalBusy(false);
      setAlertActionBusyId(null);
    }
  }, [applyAlertResult, loadExclusions, maintenanceItem, pageCopy.ops?.toasts, refreshHistory, upsertExclusionFromPayload]);

  const handleEndExclusion = useCallback(async row => {
    if (!row?.id) return;
    try {
      await deleteSupervisionExclusion(row.id);
      if (row.scope === "device" && row.clientId && row.equipmentId && row.equipmentFamily) {
        await updateEquipmentAlertSuspension(row.clientId, row.equipmentId, {
          family: row.equipmentFamily,
          equipmentName: row.equipmentName,
          suspensionType: "none",
          alertsEnabled: true
        });
      }
      toast.success(pageCopy.ops?.toasts?.exclusionEnded || "Maintenance ended");
      await loadExclusions();
      await loadActiveAlerts();
    } catch (err) {
      toast.error(err?.message || pageCopy.ops?.toasts?.actionFailed || "Error");
    }
  }, [loadActiveAlerts, loadExclusions, pageCopy.ops?.toasts]);

  const handleResyncHost = useCallback(async item => {
    const equipmentId = item?.equipmentId || item?.equipment?.id;
    const clientId = item?.clientId;
    const family = resolveMuteFamily(item);
    const hostName = item?.hostName || item?.alertState?.meta?.hostName;
    if (!equipmentId || !clientId || !family || !hostName) {
      toast.error(pageCopy.ops?.toasts?.resyncFail || "Resync impossible");
      return;
    }
    setResyncBusyId(item.id);
    try {
      await syncEquipmentCheckMKMonitoring({
        equipmentId,
        clientId,
        family,
        hostName,
        force: true
      });
      await loadActiveAlerts();
      toast.success(pageCopy.ops?.toasts?.resyncOk || "OK");
    } catch (err) {
      toast.error(err?.message || pageCopy.ops?.toasts?.resyncFail || "Resync impossible");
    } finally {
      setResyncBusyId(null);
    }
  }, [loadActiveAlerts, pageCopy.ops?.toasts, resolveMuteFamily]);

  const handleTicketSupport = useCallback(async item => {
    if (!item?.id) return;
    const wf = item?.workflowStatus || "open";
    if (wf === "open") {
      toast.info(pageCopy.ops?.toasts?.ackRequiredTicket || "Prenez d’abord l’alerte en charge avant de créer un ticket.");
      return;
    }
    setAlertActionBusyId(item.id);
    try {
      const result = await createSupervisionSupportTicket(item, alertRules);
      if (result?.needsManual) {
        if (result.reason === "support_form_required" || result.reason === "support_form_unavailable") {
          toast.error(pageCopy.ops?.toasts?.supportFormRequired || "Configure a support form in the alert rule before creating a ticket.");
          return;
        }
        if (result.reason === "required_fields") {
          toast.info(pageCopy.ops?.toasts?.ticketNeedsForm || "Complétez le formulaire pour créer le ticket.");
          onNavigate?.("TicketCreate", result.prefill);
          return;
        }
        onNavigate?.("TicketCreate", result.prefill);
        return;
      }
      if (result?.alert) applyAlertResult(result);
      const ticket = result?.ticket;
      const ticketId = ticket?.id || ticket?.ticketId;
      const ticketNumber = ticket?.ticketNumber || ticket?.ticket_number || ticket?.number;
      const title = ticket?.title || item?.title || "";
      const createdMsg = interpolate(pageCopy.ops?.toasts?.ticketCreated || "Ticket #{number} créé", {
        number: ticketNumber || "—"
      });
      const openLabel = pageCopy.ops?.toasts?.openTicket || "Ouvrir";
      toast.success(
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span>{createdMsg}</span>
          {ticketId ? (
            <button
              type="button"
              onClick={() => onNavigate?.("TicketDetail", { ticketId, ticketNumber, title })}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "inherit",
                textDecoration: "underline",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              {ticketNumber ? `#${ticketNumber}` : openLabel}
            </button>
          ) : null}
        </span>,
        { autoClose: 8000 }
      );
    } catch (err) {
      toast.error(err?.message || pageCopy.ops?.toasts?.actionFailed || "Error");
    } finally {
      setAlertActionBusyId(null);
    }
  }, [alertRules, applyAlertResult, onNavigate, pageCopy.ops?.toasts]);
  const handleOpenQueueItem = useCallback((item, options = {}) => {
    const equipment =
      item?.equipment ||
      (item?.equipmentId
        ? {
            id: item.equipmentId,
            dbId: item.equipmentId,
            clientId: item.clientId ?? null,
            name: item.equipmentName || item.name || item.title || null
          }
        : null);
    if (!equipment) return;
    onEquipmentOpen?.(equipment, options);
  }, [onEquipmentOpen]);
  const handleOpenExclusionDevice = useCallback((row, options = {}) => {
    const equipmentId = row?.equipmentId || row?.equipment_id;
    if (!equipmentId) return;
    onEquipmentOpen?.(
      {
        id: equipmentId,
        dbId: equipmentId,
        clientId: row.clientId ?? row.client_id ?? null,
        name: row.equipmentName || row.equipment_name || null,
        type: row.equipmentFamily || row.equipment_family || null
      },
      options
    );
  }, [onEquipmentOpen]);
  const handleOpenLinkedTicket = useCallback((item, payload = {}) => {
    const ticketId = payload.ticketId || item?.linkedTicketId || item?.alertState?.linkedTicketId;
    if (!ticketId) return;
    const ticketNumber =
      payload.ticketNumber ||
      item?.linkedTicketNumber ||
      item?.alertState?.linkedTicketNumber ||
      item?.alertState?.meta?.linkedTicketNumber ||
      null;
    const kind = String(payload.kind || item?.linkedTicketKind || item?.alertState?.linkedTicketKind || "support").toLowerCase();
    const isSales = kind === "prestation" || kind === "presta" || kind === "sales";
    const navOptions = payload.background ? { background: true } : undefined;
    onNavigate?.(
      isSales ? "TicketSalesDetail" : "TicketDetail",
      {
        ticketId,
        ticketNumber,
        title: item?.title || "",
        ticketFamily: isSales ? "sales" : "support",
        fromPage: isSales ? "TicketSales" : "Ticket"
      },
      navOptions
    );
  }, [onNavigate]);
  const visibleTabs = useMemo(() => {
    return (pageCopy.tabs || []).filter(tab => tab.id !== "settings" || canManageAlertRules);
  }, [pageCopy.tabs, canManageAlertRules]);
  const tabBadges = {
    operations: triageCounts.todo,
    history: historyAlerts.length,
    settings: 0
  };
  const pollerTooltip = useMemo(() => {
    if (!checkmkIntegrationEnabled || !syncStatus) return "";
    const poller = pageCopy.fleetSync?.poller || {};
    const fmt = value =>
      value
        ? new Date(value).toLocaleString(localeTag, {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          })
        : poller.never || "Jamais";
    const state = syncStatus.pollerActive ? poller.active || "Actif" : poller.suspended || "Suspendu";
    const interval =
      syncStatus.pollerActive && syncStatus.syncIntervalMinutes
        ? (poller.interval || "toutes les {minutes} min").replace(
            "{minutes}",
            String(syncStatus.syncIntervalMinutes)
          )
        : null;
    return [
      `${poller.label || "Sync auto"} · ${state}${interval ? ` · ${interval}` : ""}`,
      `${poller.lastAuto || "Dernière auto"} · ${fmt(syncStatus.lastPollerAt)}`,
      `${poller.lastManual || "Dernière manuelle"} · ${fmt(syncStatus.lastManualAt)}`
    ].join("\n");
  }, [checkmkIntegrationEnabled, syncStatus, pageCopy.fleetSync?.poller, localeTag]);

  const pageToolbarActions = (
    <div className={layout.toolbarActions} data-guide="supervision-hero">
      <nav className={styles.toolbarTabs} role="tablist" aria-label={pageCopy.tabSectionsAria} data-guide="supervision-tabs">
        {visibleTabs.map(tab => {
          const badge = tabBadges[tab.id] || 0;
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === "operations" || tab.id === "history";
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${styles.toolbarTab} ${isActive ? styles.toolbarTabActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
            >
              <Icon icon={tab.icon} className={styles.toolbarTabIcon} aria-hidden />
              <span className={styles.toolbarTabLabel}>{tab.label}</span>
              {showBadge ? (
                <span className={`${styles.tabCount} ${badge === 0 ? styles.tabCountMuted : ""}`}>{badge}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
      {checkmkIntegrationEnabled && syncStatus ? (
        <SmartTooltip
          content={pollerTooltip}
          className={`${styles.pollerChip} ${
            syncStatus.pollerActive ? styles.pollerChipActive : styles.pollerChipSuspended
          }`}
          aria-label={
            syncStatus.pollerActive
              ? pageCopy.fleetSync?.poller?.titleActive
              : pageCopy.fleetSync?.poller?.titleSuspended
          }
        >
          <Icon icon="mdi:cloud-sync-outline" aria-hidden />
        </SmartTooltip>
      ) : null}
      {checkmkIntegrationEnabled ? (
        fleetSyncActive && !fleetSyncExpanded ? (
          <>
            <SmartTooltip content={pageCopy.fleetSync?.expandTitle || "Afficher la synchronisation"}>
              <button
                type="button"
                className={`${kit.btnSquare} ${kit.btnSquareSecondary} ${styles.fleetSyncToolbarBtn}`}
                onClick={() => setFleetSyncExpanded(true)}
                aria-label={pageCopy.fleetSync?.expandAria || "Afficher la synchronisation"}
              >
                <Icon
                  icon={
                    fleetSyncProgress?.error || fleetSyncProgress?.tone === "err"
                      ? "mdi:alert-circle-outline"
                      : fleetSyncProgress?.isTerminal
                        ? fleetSyncProgress?.tone === "muted"
                          ? "mdi:cancel"
                          : "mdi:check-circle-outline"
                        : "mdi:sync"
                  }
                  className={!fleetSyncProgress?.isTerminal && !fleetSyncProgress?.error ? styles.fleetSyncSpin : ""}
                  aria-hidden
                />
              </button>
            </SmartTooltip>
            {!fleetSyncProgress?.isTerminal && !fleetSyncProgress?.error ? (
              <SmartTooltip content={pageCopy.fleetSync?.cancel || "Arrêter"}>
                <button
                  type="button"
                  className={`${kit.btnSquare} ${kit.btnSquareSecondary}`}
                  onClick={stopFleetSync}
                  disabled={fleetSyncCancelling}
                  aria-label={pageCopy.fleetSync?.cancelAria || "Arrêter la synchronisation"}
                >
                  <Icon
                    icon={fleetSyncCancelling ? "mdi:loading" : "mdi:stop-circle-outline"}
                    className={fleetSyncCancelling ? styles.fleetSyncSpin : ""}
                    aria-hidden
                  />
                </button>
              </SmartTooltip>
            ) : (
              <SmartTooltip content={pageCopy.fleetSync?.close || "Fermer"}>
                <button
                  type="button"
                  className={`${kit.btnSquare} ${kit.btnSquareSecondary}`}
                  onClick={dismissFleetSync}
                  aria-label={pageCopy.fleetSync?.closeAria || "Fermer"}
                >
                  <Icon icon="mdi:close" aria-hidden />
                </button>
              </SmartTooltip>
            )}
          </>
        ) : (
          <SmartTooltip content={pageCopy.fleetSync?.buttonTitle || "Synchroniser"}>
            <button
              type="button"
              className={`${kit.btnSquare} ${kit.btnSquareSecondary}`}
              aria-label={pageCopy.fleetSync?.buttonAria || pageCopy.fleetSync?.buttonTitle || "Synchroniser"}
              onClick={startFleetSync}
              disabled={fleetSyncActive}
            >
              <Icon
                icon={fleetSyncActive ? "mdi:loading" : "mdi:sync"}
                className={fleetSyncActive ? styles.fleetSyncSpin : ""}
                aria-hidden
              />
            </button>
          </SmartTooltip>
        )
      ) : null}
    </div>
  );

  const showBootLoader = loading && !activeAlerts.length;
  if (showBootLoader) {
    return <SupervisionCenterPageSkeleton label={pageCopy.loading} />;
  }
  return <div className={`${cyberStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={cyberStyles.mspLayout}>
        <div className={`${cyberStyles.mspMain} ${styles.pageColumn}`}>
          <main className={`${cyberStyles.mspContent} ${cyberStyles.mspContentList} ${layout.contentNoHero}`}>
            <h1 className={layout.srOnly}>{pageCopy.pageTitle}</h1>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull} ${styles.contentShell}`}>
              {(activeTab === "operations" || activeTab === "history") && !error ? <div
                  className={`${dashStyles.dashboard} ${styles.dashboard}`}
                  data-guide={activeTab === "operations" ? "supervision-ops" : "supervision-history"}
                >
                  <div className={`${cyberStyles.tabContent} ${styles.content}`}>
                    <div className={`${styles.opsSplit} ${activeTab === "history" ? styles.opsSplitCollapsed : ""}`}>
                      <div className={styles.opsMain}>
                        {activeTab === "operations" ? (
                          <SupervisionOpsQueue
                            items={filteredQueue}
                            kpi={severityCounts}
                            triageCounts={{ ...triageCounts, history: historyAlerts.length }}
                            severityFilter={opsSeverityFilter}
                            triageView={triageView}
                            searchQuery={opsSearchQuery}
                            onSeverityFilter={setOpsSeverityFilter}
                            onTriageView={setTriageView}
                            onSearchChange={setOpsSearchQuery}
                            onOpenItem={handleOpenQueueItem}
                            onOpenExclusionDevice={handleOpenExclusionDevice}
                            onOpenTicket={handleOpenLinkedTicket}
                            onTicketSupport={handleTicketSupport}
                            onAck={handleAckAlert}
                            onUnack={handleUnackAlert}
                            onResolve={handleResolveAlert}
                            onIgnore={item => setIgnoreItem(item)}
                            onMaintenance={item => setMaintenanceItem(item)}
                            onResync={handleResyncHost}
                            onDiagnose={item => setDiagnoseAlertId(item.alertId)}
                            onEndExclusion={handleEndExclusion}
                            exclusions={exclusions}
                            canDiagnose={canManageAlertRules}
                            resyncBusyId={resyncBusyId}
                            busyId={alertActionBusyId}
                            localeTag={localeTag}
                            copy={pageCopy.ops}
                            showDomain={false}
                            animateNewRows
                            toolbarActions={pageToolbarActions}
                          />
                        ) : (
                          <SupervisionAlertHistory
                            alerts={historyAlerts}
                            loading={historyLoading}
                            searchQuery={historySearch}
                            statusFilter={historyStatus}
                            trashMode={historyTrashMode}
                            onSearchChange={setHistorySearch}
                            onStatusFilter={setHistoryStatus}
                            onTrashModeChange={setHistoryTrashMode}
                            onChanged={() => {
                              loadActiveAlerts();
                              refreshHistory();
                            }}
                            onReopened={() => {
                              loadActiveAlerts();
                              refreshHistory();
                            }}
                            onOpenTicket={handleOpenLinkedTicket}
                            localeTag={localeTag}
                            copy={pageCopy.history}
                            showDomain={false}
                            toolbarActions={pageToolbarActions}
                          />
                        )}
                      </div>
                      <div className={styles.opsSide} aria-hidden={activeTab !== "operations"}>
                        <SupervisionMaintenanceSidebar
                          exclusions={exclusions}
                          localeTag={localeTag}
                          copy={pageCopy.ops?.maintenanceSidebar || {}}
                          onOpenDevice={onEquipmentOpen}
                          onEndExclusion={handleEndExclusion}
                        />
                      </div>
                    </div>
                  </div>
                </div> : null}

              {activeTab === "settings" && canManageAlertRules && !error ? <div className={`${cyberStyles.tabContent} ${styles.content}`} data-guide="supervision-settings">
                  <MonitoringAlertRulesPanel
                    catalog={alertRulesCatalog}
                    rules={alertRules}
                    isAdmin={canManageAlertRules}
                    onSaved={applyRules}
                    scope="centre"
                    toolbarActions={pageToolbarActions}
                  />
                </div> : null}

              {error ? <div className={styles.panel}>
                  <MspEmptyState icon="mdi:alert-circle-outline" title={pageCopy.error.title} text={error} />
                </div> : null}
            </div>
          </main>
        </div>
      </div>
      <SupervisionAlertDiagnosticModal
        open={Boolean(diagnoseAlertId)}
        alertId={diagnoseAlertId}
        locale={locale}
        copy={pageCopy.ops?.diagnose}
        onClose={() => setDiagnoseAlertId(null)}
      />
      <SupervisionIgnoreModal
        open={Boolean(ignoreItem)}
        item={ignoreItem}
        copy={pageCopy.ops}
        busy={triageModalBusy}
        onConfirm={handleConfirmIgnore}
        onClose={() => {
          if (triageModalBusy) return;
          setIgnoreItem(null);
        }}
      />
      <SupervisionMaintenanceModal
        open={Boolean(maintenanceItem)}
        item={maintenanceItem}
        copy={pageCopy.ops}
        busy={triageModalBusy}
        onConfirm={handleConfirmMaintenance}
        onClose={() => {
          if (triageModalBusy) return;
          setMaintenanceItem(null);
        }}
      />
      <PageGuideTour open={pageGuideOpen} steps={guideSteps} title={pageCopy.guide?.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
      <SupervisionFleetSyncModal
        active={fleetSyncActive}
        expanded={fleetSyncExpanded}
        startKey={fleetSyncStartKey}
        startedBy={user?.username || user?.email || null}
        copy={pageCopy.fleetSync || {}}
        onMinimize={() => setFleetSyncExpanded(false)}
        onExpand={() => setFleetSyncExpanded(true)}
        onDismiss={dismissFleetSync}
        onRunChange={handleFleetSyncProgress}
        onFinished={handleFleetSyncFinished}
      />
    </div>;
}

