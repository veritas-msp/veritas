import MonitoringAlertRulesPanel from "./SupervisionAlertRulesPanel";
import { useSupervisionAlertRules } from "../../hooks/useSupervisionAlertRules";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
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
import PlanningEventModalBridge from "../PlanningPage/PlanningEventModalBridge";
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
import { getEquipmentFleetIssues } from "../../api/equipment";
import { getEquipmentListKey } from "../../utils/equipmentIdentity";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { useCheckMKIntegrationEnabled } from "../../hooks/useCheckMKIntegrationEnabled";
import { Icon } from "@iconify/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import dashStyles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import styles from "./SupervisionCenterPage.module.css";

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
  const [opsSeverityFilter, setOpsSeverityFilter] = useState("all");
  const [opsSearchQuery, setOpsSearchQuery] = useState("");
  const [opsWorkflowFilter, setOpsWorkflowFilter] = useState("all");
  const [alertStates, setAlertStates] = useState([]);
  const [alertActionBusyId, setAlertActionBusyId] = useState(null);
  const [historyAlerts, setHistoryAlerts] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventPrefill, setEventPrefill] = useState({
    clientId: null,
    clientName: "",
    equipmentId: null
  });
  const [pendingLinkItem, setPendingLinkItem] = useState(null);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const { user } = useAuthContext();
  const { isAdmin } = usePermissions();
  const canManageAlertRules = isAdmin || isAdminOrSuperAdminProfile(user?.profile);
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
  useEffect(() => {
    const controller = createTrackedAbortController();
    loadDeviceIssues(controller.signal);
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (controller.signal.aborted) return;
      loadDeviceIssues(controller.signal);
    }, 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [loadDeviceIssues]);
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
  const refreshHistory = useCallback(async signal => {
    if (!signal?.aborted) setHistoryLoading(true);
    try {
      const alerts = await fetchSupervisionAlertsHistory({
        domain: "devices",
        status: historyStatus === "all" ? undefined : historyStatus,
        q: historySearch || undefined,
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
  }, [historyStatus, historySearch]);
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
  const openPlanningForContext = useCallback(({
    clientId,
    clientName,
    equipmentId
  }) => {
    setEventPrefill({
      clientId: clientId || null,
      clientName: clientName || "",
      equipmentId: equipmentId || null
    });
    setEventModalOpen(true);
  }, []);
  const handleTicketSupport = useCallback(item => {
    linkRemediation(item, {
      linkedTicketKind: "support"
    });
    onNavigate?.("TicketCreate", buildSupervisionSupportTicketPrefill(item));
  }, [onNavigate, linkRemediation]);
  const handleTicketPresta = useCallback(item => {
    linkRemediation(item, {
      linkedTicketKind: "prestation"
    });
    onNavigate?.("TicketSalesCreate", {
      kind: "prestation",
      clientId: item?.clientId || item?.equipment?.clientId || null
    });
  }, [onNavigate, linkRemediation]);
  const handlePlanEvent = useCallback(item => {
    const equipment = item?.equipment || item?.agent?.equipment || null;
    setPendingLinkItem(item);
    openPlanningForContext({
      clientId: item?.clientId || equipment?.clientId || null,
      clientName: item?.clientName || equipment?.clientName || "",
      equipmentId: equipment?.id || getEquipmentListKey(equipment) || null
    });
  }, [openPlanningForContext]);
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
        <div className={styles.loadingScreen} role="status" aria-live="polite" aria-busy="true">
          <Icon icon="mdi:loading" className={styles.loadingSpinner} aria-hidden />
          <p className={styles.loadingLabel}>{pageCopy.loading}</p>
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
          </header>

          <main className={cyberStyles.mspContent}>
            <div className={`${layout.shell} ${layout.shellFull} ${styles.contentShell}`}>
              {activeTab === "operations" && !error ? <div className={`${dashStyles.dashboard} ${styles.dashboard}`} data-guide="supervision-ops">
                  <div className={`${cyberStyles.tabContent} ${styles.content}`}>
                    <SupervisionOpsQueue items={filteredQueue} kpi={severityCounts} workflowCounts={workflowCounts} severityFilter={opsSeverityFilter} workflowFilter={opsWorkflowFilter} searchQuery={opsSearchQuery} onSeverityFilter={setOpsSeverityFilter} onWorkflowFilter={setOpsWorkflowFilter} onSearchChange={setOpsSearchQuery} onOpenItem={handleOpenQueueItem} onTicketSupport={handleTicketSupport} onTicketPresta={handleTicketPresta} onPlanEvent={handlePlanEvent} onAck={handleAckAlert} onUnack={handleUnackAlert} onResolve={handleResolveAlert} onDismiss={handleDismissAlert} busyId={alertActionBusyId} localeTag={localeTag} copy={pageCopy.ops} showDomain={false} />
                  </div>
                </div> : null}

              {activeTab === "history" && !error ? <div className={`${dashStyles.dashboard} ${styles.dashboard}`} data-guide="supervision-history">
                  <div className={`${cyberStyles.tabContent} ${styles.content}`}>
                    <SupervisionAlertHistory alerts={historyAlerts} loading={historyLoading} searchQuery={historySearch} statusFilter={historyStatus} onSearchChange={setHistorySearch} onStatusFilter={setHistoryStatus} onReopened={() => {
                refreshAlertStates();
                refreshHistory();
              }} localeTag={localeTag} copy={pageCopy.history} showDomain={false} />
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
      <PlanningEventModalBridge open={eventModalOpen} editingEvent={null} initialClientId={eventPrefill.clientId} initialClientName={eventPrefill.clientName} initialEquipmentId={eventPrefill.equipmentId} onClose={() => {
        setEventModalOpen(false);
        setPendingLinkItem(null);
      }} onSaved={saved => {
        if (pendingLinkItem) {
          linkRemediation(pendingLinkItem, {
            linkedEventId: saved?.id || saved?.event?.id || null,
            linkedTicketKind: "planning"
          });
        }
        setPendingLinkItem(null);
        setEventModalOpen(false);
      }} />
      <PageGuideTour open={pageGuideOpen} steps={guideSteps} title={pageCopy.guide?.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
    </div>;
}

