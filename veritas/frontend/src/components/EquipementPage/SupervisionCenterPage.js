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
import { buildUnifiedSupervisionQueue, filterSupervisionQueue, countQueueBySeverity, mergeQueueWithAlertState, countQueueByWorkflow, buildSupervisionSupportTicketPrefill } from "./supervisionQueueUtils";
import SupervisionOpsQueue from "./SupervisionOpsQueue";
import SupervisionAlertHistory from "./SupervisionAlertHistory";
import {
  ackSupervisionAlert,
  unackSupervisionAlert,
  dismissSupervisionAlert,
  ensureSupervisionAlertsSeen,
  fetchSupervisionAlertStates,
  fetchSupervisionAlertsHistory,
  linkSupervisionAlert,
  resolveSupervisionAlert,
  subscribeSupervisionAlertStream
} from "../../api/supervisionAlerts";
import { toast } from "react-toastify";
import { getEquipmentFleetIssues, getEquipmentFleetCoverage } from "../../api/equipment";
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
  const [deviceIssues, setDeviceIssues] = useState([]);
  const [deviceIssuesLoading, setDeviceIssuesLoading] = useState(true);
  const [deviceIssuesError, setDeviceIssuesError] = useState(null);
  const [coverageFamilies, setCoverageFamilies] = useState([]);
  const [opsSeverityFilter, setOpsSeverityFilter] = useState("all");
  const [opsSearchQuery, setOpsSearchQuery] = useState("");
  const [opsWorkflowFilter, setOpsWorkflowFilter] = useState("all");
  const [alertStates, setAlertStates] = useState([]);
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
  const useServerDeviceIssues = typeof resolveMonitorStatus !== "function";
  const loading = useServerDeviceIssues ? deviceIssuesLoading : parentLoading;
  const error = useServerDeviceIssues ? deviceIssuesError || parentError : parentError;
  const unifiedQueue = useMemo(() => buildUnifiedSupervisionQueue({
    statsItems: useServerDeviceIssues ? [] : statsItems,
    resolveMonitorStatus: useServerDeviceIssues ? undefined : resolveMonitorStatus,
    deviceIssueItems: useServerDeviceIssues ? deviceIssues : null,
    alertRules,
    checkmkEnabled: checkmkIntegrationEnabled,
    isMkMapped,
    labels: {
      noName: pageCopy.priority?.noName || "-"
    }
  }), [useServerDeviceIssues, statsItems, resolveMonitorStatus, deviceIssues, alertRules, checkmkIntegrationEnabled, isMkMapped, pageCopy]);
  const unifiedQueueIdsKey = useMemo(() => unifiedQueue.map(item => item.id).join("|"), [unifiedQueue]);
  const unifiedQueueRef = useRef(unifiedQueue);
  unifiedQueueRef.current = unifiedQueue;
  const enrichedQueue = useMemo(() => mergeQueueWithAlertState(unifiedQueue, alertStates), [unifiedQueue, alertStates]);
  const filteredQueue = useMemo(() => filterSupervisionQueue(enrichedQueue, {
    severity: opsSeverityFilter,
    query: opsSearchQuery,
    workflowStatus: opsWorkflowFilter
  }), [enrichedQueue, opsSeverityFilter, opsSearchQuery, opsWorkflowFilter]);
  const severityCounts = useMemo(() => countQueueBySeverity(enrichedQueue), [enrichedQueue]);
  const workflowCounts = useMemo(() => countQueueByWorkflow(enrichedQueue), [enrichedQueue]);
  const totalIssues = enrichedQueue.length;
  const loadDeviceIssues = useCallback(async signal => {
    if (!useServerDeviceIssues) {
      setDeviceIssuesLoading(false);
      setDeviceIssues([]);
      setDeviceIssuesError(null);
      return;
    }
    setDeviceIssuesLoading(true);
    setDeviceIssuesError(null);
    try {
      const payload = await getEquipmentFleetIssues({
        signal
      });
      if (signal?.aborted) return;
      setDeviceIssues(Array.isArray(payload?.items) ? payload.items : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Error loading supervision device issues:", err);
      setDeviceIssues([]);
      setDeviceIssuesError(err?.message || "Error loading device issues");
    } finally {
      if (!signal?.aborted) setDeviceIssuesLoading(false);
    }
  }, [useServerDeviceIssues]);
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
    loadDeviceIssues(controller.signal);
    loadCoverage(controller.signal);
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (controller.signal.aborted) return;
      loadDeviceIssues(controller.signal);
      loadCoverage(controller.signal);
    }, 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [loadDeviceIssues, loadCoverage]);
  const refreshAlertStates = useCallback(async signal => {
    try {
      const items = unifiedQueueRef.current || [];
      const ids = items.map(item => item.id).filter(Boolean);
      if (!ids.length) {
        if (!signal?.aborted) setAlertStates([]);
        return;
      }
      const alerts = await fetchSupervisionAlertStates(ids, {
        signal
      });
      if (signal?.aborted) return;
      const known = new Set((Array.isArray(alerts) ? alerts : []).map(alert => alert.queueItemId));
      const missing = items.filter(item => item.id && !known.has(item.id));
      if (missing.length) {
        try {
          const synced = await ensureSupervisionAlertsSeen(missing, {
            signal
          });
          if (signal?.aborted) return;
          setAlertStates(Array.isArray(synced) && synced.length ? synced : alerts || []);
          return;
        } catch (syncErr) {
          if (syncErr?.name === "AbortError") return;
          console.error("Error recording supervision alert raise time:", syncErr);
        }
      }
      if (!signal?.aborted) setAlertStates(Array.isArray(alerts) ? alerts : []);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error loading supervision alerts:", err);
      }
    }
  }, [unifiedQueueIdsKey]);

  const refreshLiveQueue = useCallback(async () => {
    const controller = createTrackedAbortController();
    try {
      await Promise.all([
        loadDeviceIssues(controller.signal),
        loadCoverage(controller.signal)
      ]);
      await refreshAlertStates(controller.signal);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error refreshing supervision queue during sync:", err);
      }
    }
  }, [loadDeviceIssues, loadCoverage, refreshAlertStates]);

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
    refreshAlertStates(controller.signal);
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (controller.signal.aborted) return;
      refreshAlertStates(controller.signal);
    }, 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [refreshAlertStates]);
  useEffect(() => {
    const controller = createTrackedAbortController();
    refreshHistory(controller.signal);
    return () => controller.abort();
  }, [refreshHistory]);
  const applyAlertResult = useCallback(result => {
    const alert = result?.alert;
    if (!alert?.queueItemId) {
      refreshAlertStates();
      return;
    }
    setAlertStates(prev => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const idx = next.findIndex(a => a.queueItemId === alert.queueItemId);
      // Keep closed alerts in state so the queue can hide them (source issues may still exist).
      if (idx >= 0) next[idx] = alert;else next.unshift(alert);
      return next;
    });
  }, [refreshAlertStates]);
  useEffect(() => {
    const unsubscribe = subscribeSupervisionAlertStream({
      onEvent: payload => {
        if (payload?.type !== "alert" || !payload.alert) return;
        applyAlertResult(payload);
        if (payload.alert.status === "closed" || payload.action === "reopen" || payload.action === "resolved" || payload.action === "dismissed") {
          refreshHistory();
        }
      },
      onError: err => {
        console.warn("[supervision-alerts] stream:", err?.message || err);
      }
    });
    return unsubscribe;
  }, [applyAlertResult, refreshHistory]);
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
  const showBootLoader = loading && !deviceIssues.length && !statsItems.length;
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
                    <SupervisionOpsQueue items={filteredQueue} kpi={severityCounts} coverageFamilies={coverageFamilies} workflowCounts={workflowCounts} severityFilter={opsSeverityFilter} workflowFilter={opsWorkflowFilter} searchQuery={opsSearchQuery} onSeverityFilter={setOpsSeverityFilter} onWorkflowFilter={setOpsWorkflowFilter} onSearchChange={setOpsSearchQuery} onOpenItem={handleOpenQueueItem} onTicketSupport={handleTicketSupport} onAck={handleAckAlert} onUnack={handleUnackAlert} onResolve={handleResolveAlert} onDismiss={handleDismissAlert} busyId={alertActionBusyId} localeTag={localeTag} copy={pageCopy.ops} showDomain={false} animateNewRows />
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
                        refreshAlertStates();
                        refreshHistory();
                      }}
                      onReopened={() => {
                        refreshAlertStates();
                        refreshHistory();
                      }}
                      localeTag={localeTag}
                      copy={pageCopy.history}
                      showDomain={false}
                    />
                  </div>
                </div> : null}

              {activeTab === "settings" && canManageAlertRules && !error ? <div className={`${cyberStyles.tabContent} ${styles.content}`}>
                  <MonitoringAlertRulesPanel catalog={alertRulesCatalog} rules={alertRules} isAdmin={canManageAlertRules} onSaved={applyRules} />
                </div> : null}

              {error ? <div className={styles.panel}>
                  <MspEmptyState icon="mdi:alert-circle-outline" title={pageCopy.error.title} text={error} />
                </div> : null}
            </div>
          </main>
        </div>
      </div>
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

