import MonitoringAlertRulesPanel from "./SupervisionAlertRulesPanel";
import { useSupervisionAlertRules } from "../../hooks/useSupervisionAlertRules";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import PageSkeleton from "../Misc/Skeleton/PageSkeleton";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getSupervisionCenterGuideSteps } from "../PageGuide/supervisionCenterGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getLocaleTag } from "../../i18n/locales";
import { isAdminOrSuperAdminProfile } from "../../utils/profileProtection";
import { getSupervisionCenterCopy } from "./supervisionCenterPageI18n";
import { buildQueueItemsFromSupervisionAlerts, filterSupervisionQueue, countQueueBySeverity, countQueueByWorkflow, buildSupervisionSupportTicketPrefill } from "./supervisionQueueUtils";
import SupervisionOpsQueue from "./SupervisionOpsQueue";
import SupervisionAlertHistory from "./SupervisionAlertHistory";
import SupervisionAlertDiagnosticModal from "./SupervisionAlertDiagnosticModal";
import { syncEquipmentCheckMKMonitoring } from "../../api/equipment";
import { updateEquipmentAlertSuspension } from "../../api/equipmentMonitoringAlerts";
import {
  ackSupervisionAlert,
  unackSupervisionAlert,
  dismissSupervisionAlert,
  fetchSupervisionAlertsActive,
  fetchSupervisionAlertsHistory,
  linkSupervisionAlert,
  resolveSupervisionAlert,
  subscribeSupervisionAlertStream
} from "../../api/supervisionAlerts";
import { toast } from "react-toastify";
import { getEquipmentFleetCoverage } from "../../api/equipment";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { useCheckMKIntegrationEnabled } from "../../hooks/useCheckMKIntegrationEnabled";
import { Icon } from "@iconify/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [coverageFamilies, setCoverageFamilies] = useState([]);
  const [opsSeverityFilter, setOpsSeverityFilter] = useState("all");
  const [opsSearchQuery, setOpsSearchQuery] = useState("");
  const [opsWorkflowFilter, setOpsWorkflowFilter] = useState("all");
  const [showMutedAlerts, setShowMutedAlerts] = useState(false);
  const [resyncBusyId, setResyncBusyId] = useState(null);
  const [diagnoseAlertId, setDiagnoseAlertId] = useState(null);
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
  const mutedCount = useMemo(() => enrichedQueue.filter(item => item.muted).length, [enrichedQueue]);
  const visibleQueue = useMemo(
    () => (showMutedAlerts ? enrichedQueue : enrichedQueue.filter(item => !item.muted)),
    [enrichedQueue, showMutedAlerts]
  );
  const filteredQueue = useMemo(() => filterSupervisionQueue(visibleQueue, {
    severity: opsSeverityFilter,
    query: opsSearchQuery,
    workflowStatus: opsWorkflowFilter
  }), [visibleQueue, opsSeverityFilter, opsSearchQuery, opsWorkflowFilter]);
  const severityCounts = useMemo(() => countQueueBySeverity(visibleQueue), [visibleQueue]);
  const workflowCounts = useMemo(() => countQueueByWorkflow(visibleQueue), [visibleQueue]);
  const totalIssues = visibleQueue.length;
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
  const loadCoverage = useCallback(async signal => {
    try {
      const payload = await getEquipmentFleetCoverage({
        signal
      });
      if (signal?.aborted) return;
      setCoverageFamilies(Array.isArray(payload?.families) ? payload.families : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Error loading supervision coverage KPIs:", err);
      if (!signal?.aborted) setCoverageFamilies([]);
    }
  }, []);
  useEffect(() => {
    const controller = createTrackedAbortController();
    loadActiveAlerts(controller.signal);
    loadCoverage(controller.signal);
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (controller.signal.aborted) return;
      loadActiveAlerts(controller.signal);
      loadCoverage(controller.signal);
    }, 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [loadActiveAlerts, loadCoverage]);

  const refreshLiveQueue = useCallback(async () => {
    const controller = createTrackedAbortController();
    try {
      await Promise.all([
        loadActiveAlerts(controller.signal),
        loadCoverage(controller.signal)
      ]);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error refreshing supervision queue during sync:", err);
      }
    }
  }, [loadActiveAlerts, loadCoverage]);

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
  const handleResolveAlert = useCallback(item => runAlertAction(item, i => resolveSupervisionAlert(i), "resolved"), [runAlertAction]);
  const handleDismissAlert = useCallback(item => runAlertAction(item, i => dismissSupervisionAlert(i), "dismissed"), [runAlertAction]);

  const resolveMuteFamily = useCallback(item => {
    return item?.family || item?.alertState?.meta?.family || item?.equipment?.family || null;
  }, []);

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

  const handleMuteEquipment = useCallback(async (item, payload = {}) => {
    const equipmentId = item?.equipmentId || item?.equipment?.id;
    const clientId = item?.clientId;
    const family = resolveMuteFamily(item);
    if (!equipmentId || !clientId || !family) {
      toast.error(pageCopy.ops?.toasts?.muteFail || "Mute impossible");
      return;
    }
    try {
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
              durationMinutes: payload.durationMinutes || 120,
              reason: "Mute depuis le centre de supervision"
            };
      await updateEquipmentAlertSuspension(clientId, equipmentId, body);
      await loadActiveAlerts();
      toast.success(pageCopy.ops?.toasts?.muted || "Muted");
    } catch (err) {
      toast.error(err?.message || pageCopy.ops?.toasts?.muteFail || "Mute impossible");
    }
  }, [loadActiveAlerts, pageCopy.ops?.toasts, resolveMuteFamily]);

  const handleUnmuteEquipment = useCallback(async item => {
    const equipmentId = item?.equipmentId || item?.equipment?.id;
    const clientId = item?.clientId;
    const family = resolveMuteFamily(item);
    if (!equipmentId || !clientId || !family) {
      toast.error(pageCopy.ops?.toasts?.muteFail || "Mute impossible");
      return;
    }
    try {
      await updateEquipmentAlertSuspension(clientId, equipmentId, {
        family,
        equipmentName: item?.equipment?.name || item?.subtitle,
        suspensionType: "none",
        alertsEnabled: true
      });
      await loadActiveAlerts();
      toast.success(pageCopy.ops?.toasts?.unmuted || "Unmuted");
    } catch (err) {
      toast.error(err?.message || pageCopy.ops?.toasts?.muteFail || "Mute impossible");
    }
  }, [loadActiveAlerts, pageCopy.ops?.toasts, resolveMuteFamily]);
  const linkRemediation = useCallback(async (item, link) => {
    if (!item?.id) return;
    try {
      const result = await linkSupervisionAlert(item, link);
      applyAlertResult(result);
      toast.success(pageCopy.ops?.toasts?.linked || "Linked");
    } catch (err) {
      toast.error(err?.message || pageCopy.ops?.toasts?.actionFailed || "Error");
    }
  }, [applyAlertResult, pageCopy.ops]);
  const handleTicketSupport = useCallback(item => {
    const prefill = buildSupervisionSupportTicketPrefill(item, alertRules);
    if (!prefill?.supportFormId) {
      toast.error(pageCopy.ops?.toasts?.supportFormRequired || "Configure a support form in the alert rule before creating a ticket.");
      return;
    }
    linkRemediation(item, {
      linkedTicketKind: "support"
    });
    onNavigate?.("TicketCreate", prefill);
  }, [onNavigate, linkRemediation, alertRules, pageCopy.ops?.toasts?.supportFormRequired]);
  const handleOpenQueueItem = useCallback(item => {
    if (!item?.equipment) return;
    onEquipmentOpen?.(item.equipment);
  }, [onEquipmentOpen]);
  const visibleTabs = useMemo(() => {
    return (pageCopy.tabs || []).filter(tab => tab.id !== "settings" || canManageAlertRules);
  }, [pageCopy.tabs, canManageAlertRules]);
  const tabBadges = {
    operations: totalIssues,
    history: historyAlerts.length,
    settings: 0
  };
  const showBootLoader = loading && !activeAlerts.length;
  if (showBootLoader) {
    return <div className={`${cyberStyles.mspPage} ${layout.page} msp-page-grid`}>
        <div className={cyberStyles.mspLayout}>
          <div className={`${cyberStyles.mspMain} ${styles.pageColumn}`}>
            <PageSkeleton variant="panels" panels={3} label={pageCopy.loading} />
          </div>
        </div>
      </div>;
  }
  return <div className={`${cyberStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={cyberStyles.mspLayout}>
        <div className={`${cyberStyles.mspMain} ${styles.pageColumn}`}>
          <header className={cyberStyles.mspHero} data-guide="supervision-hero">
            <div className={cyberStyles.mspHeroMain}>
              <div className={`${cyberStyles.mspBrandMark} ${styles.brandMarkSupervision}`} aria-hidden>
                <Icon icon="mdi:radar" className={cyberStyles.mspBrandMarkIcon} />
              </div>
              <div className={cyberStyles.mspHeroCopy}>
                <span className={cyberStyles.mspEyebrow}>{pageCopy.eyebrow}</span>
                <h1 className={cyberStyles.mspTitle}>{pageCopy.pageTitle}</h1>
                <p className={cyberStyles.mspSubtitle}>{pageCopy.subtitle}</p>
              </div>
            </div>
            <div className={cyberStyles.mspHeroActions}>
              {checkmkIntegrationEnabled && syncStatus ? (
                <div
                  className={`${styles.pollerStatus} ${
                    syncStatus.pollerActive ? styles.pollerStatusActive : styles.pollerStatusSuspended
                  }`}
                  title={
                    syncStatus.pollerActive
                      ? pageCopy.fleetSync?.poller?.titleActive
                      : pageCopy.fleetSync?.poller?.titleSuspended
                  }
                >
                  <div className={styles.pollerStatusRow}>
                    <span className={styles.pollerStatusDot} aria-hidden />
                    <span className={styles.pollerStatusStrong}>
                      {pageCopy.fleetSync?.poller?.label || "Sync auto"}
                      {" · "}
                      {syncStatus.pollerActive
                        ? pageCopy.fleetSync?.poller?.active || "Actif"
                        : pageCopy.fleetSync?.poller?.suspended || "Suspendu"}
                    </span>
                    {syncStatus.pollerActive && syncStatus.syncIntervalMinutes ? (
                      <span className={styles.pollerStatusMeta}>
                        {(pageCopy.fleetSync?.poller?.interval || "toutes les {minutes} min").replace(
                          "{minutes}",
                          String(syncStatus.syncIntervalMinutes)
                        )}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.pollerStatusRow}>
                    <span>
                      {(pageCopy.fleetSync?.poller?.lastAuto || "Dernière auto") +
                        " · " +
                        (syncStatus.lastPollerAt
                          ? new Date(syncStatus.lastPollerAt).toLocaleString(localeTag, {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : pageCopy.fleetSync?.poller?.never || "Jamais")}
                    </span>
                  </div>
                  <div className={styles.pollerStatusRow}>
                    <span>
                      {(pageCopy.fleetSync?.poller?.lastManual || "Dernière manuelle") +
                        " · " +
                        (syncStatus.lastManualAt
                          ? new Date(syncStatus.lastManualAt).toLocaleString(localeTag, {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : pageCopy.fleetSync?.poller?.never || "Jamais")}
                    </span>
                  </div>
                </div>
              ) : null}
              {checkmkIntegrationEnabled ? (
                fleetSyncActive && !fleetSyncExpanded ? (
                  <div className={`${styles.fleetSyncProgress} ${fleetSyncProgress?.error || fleetSyncProgress?.tone === "err" ? styles.fleetSyncProgressErr : ""} ${fleetSyncProgress?.isTerminal && !fleetSyncProgress?.error && fleetSyncProgress?.tone !== "err" ? styles.fleetSyncProgressDone : ""}`}>
                    <button
                      type="button"
                      className={styles.fleetSyncProgressMain}
                      onClick={() => setFleetSyncExpanded(true)}
                      title={pageCopy.fleetSync?.expandTitle || "Afficher la synchronisation"}
                      aria-label={pageCopy.fleetSync?.expandAria || "Afficher la synchronisation"}
                    >
                      <span className={styles.fleetSyncProgressTop}>
                        <Icon
                          icon={
                            fleetSyncProgress?.error || fleetSyncProgress?.tone === "err"
                              ? "mdi:alert-circle-outline"
                              : fleetSyncProgress?.isTerminal
                                ? (fleetSyncProgress?.tone === "muted" ? "mdi:cancel" : "mdi:check-circle-outline")
                                : "mdi:sync"
                          }
                          className={!fleetSyncProgress?.isTerminal && !fleetSyncProgress?.error ? styles.fleetSyncSpin : ""}
                          aria-hidden
                        />
                        <span className={styles.fleetSyncProgressLabel}>
                          {fleetSyncProgress?.statusLabel || pageCopy.fleetSync?.buttonBusy || "Sync en cours..."}
                        </span>
                        <strong className={styles.fleetSyncProgressPct}>
                          {fleetSyncProgress?.total > 0
                            ? `${fleetSyncProgress.pct}%`
                            : fleetSyncProgress?.starting
                              ? "..."
                              : fleetSyncProgress?.isTerminal
                                ? "100%"
                                : ""}
                        </strong>
                      </span>
                      <span className={styles.fleetSyncProgressTrack} aria-hidden>
                        <span
                          className={styles.fleetSyncProgressFill}
                          style={{ width: `${Math.max(fleetSyncProgress?.pct || 0, fleetSyncProgress?.starting ? 4 : 0)}%` }}
                        />
                      </span>
                      <span className={styles.fleetSyncProgressMeta}>
                        {fleetSyncProgress?.startedBy || fleetSyncProgress?.run?.details?.startedBy ? (
                          <span>
                            {(pageCopy.fleetSync?.startedBy || "Lancee par {user}").replace(
                              "{user}",
                              fleetSyncProgress?.startedBy || fleetSyncProgress?.run?.details?.startedBy
                            )}
                          </span>
                        ) : null}
                        {fleetSyncProgress?.currentHost && !fleetSyncProgress?.isTerminal ? (
                          <span>
                            {(pageCopy.fleetSync?.currentHost || "En cours - {host}").replace("{host}", fleetSyncProgress.currentHost)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    {!fleetSyncProgress?.isTerminal && !fleetSyncProgress?.error ? (
                      <button
                        type="button"
                        className={styles.fleetSyncProgressStop}
                        onClick={stopFleetSync}
                        disabled={fleetSyncCancelling}
                        aria-label={pageCopy.fleetSync?.cancelAria || "Arreter la synchronisation"}
                        title={pageCopy.fleetSync?.cancel || "Arreter"}
                      >
                        <Icon icon={fleetSyncCancelling ? "mdi:loading" : "mdi:stop-circle-outline"} className={fleetSyncCancelling ? styles.fleetSyncSpin : ""} aria-hidden />
                      </button>
                    ) : null}
                    {fleetSyncProgress?.isTerminal || fleetSyncProgress?.error ? (
                      <button
                        type="button"
                        className={styles.fleetSyncProgressDismiss}
                        onClick={dismissFleetSync}
                        aria-label={pageCopy.fleetSync?.closeAria || "Fermer"}
                        title={pageCopy.fleetSync?.close || "Fermer"}
                      >
                        <Icon icon="mdi:close" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.fleetSyncBtn}
                    title={pageCopy.fleetSync?.buttonTitle}
                    aria-label={pageCopy.fleetSync?.buttonAria || pageCopy.fleetSync?.buttonTitle || "Synchroniser"}
                    onClick={startFleetSync}
                    disabled={fleetSyncActive}
                  >
                    <Icon icon={fleetSyncActive ? "mdi:loading" : "mdi:sync"} className={fleetSyncActive ? styles.fleetSyncSpin : ""} aria-hidden />
                  </button>
                )
              ) : null}
              <nav className={cyberStyles.mspTabBar} role="tablist" aria-label={pageCopy.tabSectionsAria} data-guide="supervision-tabs">
              {visibleTabs.map(tab => {
              const badge = tabBadges[tab.id] || 0;
              const isActive = activeTab === tab.id;
              const showBadge = tab.id === "operations" || tab.id === "history";
              return <button key={tab.id} type="button" role="tab" aria-selected={isActive} className={`${cyberStyles.mspTab} ${isActive ? cyberStyles.mspTabActive : ""}`} onClick={() => setActiveTab(tab.id)}>
                    <Icon icon={tab.icon} className={cyberStyles.mspTabIcon} />
                    <span className={cyberStyles.mspTabLabelRow}>
                      <span>{tab.label}</span>
                      {showBadge ? <span className={`${styles.tabCount} ${badge === 0 ? styles.tabCountMuted : ""}`}>
                          {badge}
                        </span> : null}
                    </span>
                  </button>;
            })}
              </nav>
            </div>
          </header>

          <main className={cyberStyles.mspContent}>
            <div className={`${layout.shell} ${layout.shellFull} ${styles.contentShell}`}>
              {activeTab === "operations" && !error ? <div className={`${dashStyles.dashboard} ${styles.dashboard}`} data-guide="supervision-ops">
                  <div className={`${cyberStyles.tabContent} ${styles.content}`}>
                    <SupervisionOpsQueue items={filteredQueue} kpi={severityCounts} coverageFamilies={coverageFamilies} workflowCounts={workflowCounts} severityFilter={opsSeverityFilter} workflowFilter={opsWorkflowFilter} searchQuery={opsSearchQuery} onSeverityFilter={setOpsSeverityFilter} onWorkflowFilter={setOpsWorkflowFilter} onSearchChange={setOpsSearchQuery} onOpenItem={handleOpenQueueItem} onTicketSupport={handleTicketSupport} onAck={handleAckAlert} onUnack={handleUnackAlert} onResolve={handleResolveAlert} onDismiss={handleDismissAlert} onResync={handleResyncHost} onMute={handleMuteEquipment} onUnmute={handleUnmuteEquipment} onDiagnose={item => setDiagnoseAlertId(item.alertId)} canDiagnose={canManageAlertRules} resyncBusyId={resyncBusyId} showMuted={showMutedAlerts} mutedCount={mutedCount} onToggleMuted={setShowMutedAlerts} busyId={alertActionBusyId} localeTag={localeTag} copy={pageCopy.ops} showDomain={false} animateNewRows />
                  </div>
                </div> : null}

              {activeTab === "history" && !error ? <div className={`${dashStyles.dashboard} ${styles.dashboard}`} data-guide="supervision-history">
                  <div className={`${cyberStyles.tabContent} ${styles.content}`}>
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
                      localeTag={localeTag}
                      copy={pageCopy.history}
                      showDomain={false}
                    />
                  </div>
                </div> : null}

              {activeTab === "settings" && canManageAlertRules && !error ? <div className={`${cyberStyles.tabContent} ${styles.content}`}>
                  <MonitoringAlertRulesPanel catalog={alertRulesCatalog} rules={alertRules} isAdmin={canManageAlertRules} onSaved={applyRules} scope="centre" />
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

