import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { downloadKpiReportPdf, emailKpiReport, fetchAnalyticsDashboard } from "../../api/dashboard";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getDashboardPageCopy } from "./dashboardPageI18n";
import DashboardPeriodModal from "./DashboardPeriodModal";
import DashboardDistributionModal from "./DashboardDistributionModal";
import DashboardTopCard from "./DashboardTopCard";
import DashboardScopeFilter from "./DashboardScopeFilter";
import DashboardExportModal from "./DashboardExportModal";
import DashboardScheduleModal from "./DashboardScheduleModal";
import AiBriefingPanel from "../Misc/AiBriefingPanel/AiBriefingPanel";
import { generateDashboardBriefingAi } from "../../api/ai";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import SmartTooltip from "../SmartTooltip";
import { DEFAULT_PERIOD_FILTER, getPeriodFilterLabel } from "./dashboardPeriodUtils";
import { DEFAULT_SCOPE_FILTER, getScopeFilterKey, isScopeFilterActive, isScopeFilterReady } from "./dashboardScopeUtils";
import { CategoryIntro, DistributionPanel, formatHours, formatNumber, formatPercent, formatRating, KpiRow, MiniStat, Panel, PiePanel, SectionTitle, TrendBars, buildDistributionItems } from "./dashboardWidgets";
import styles from "./DashboardPage.module.css";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";

const DASHBOARD_TABS = [{
  key: "support",
  icon: "mdi:headset"
}, {
  key: "devices",
  icon: "mdi:devices"
}, {
  key: "enterprise",
  icon: "mdi:domain"
}];

function AgentRankingTable({
  rows,
  copy
}) {
  if (!rows?.length) return <p className={styles.emptyHint}>{copy.empty}</p>;
  const cols = copy.support.agentColumns;
  return <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>{cols.agent}</th>
            <th>{cols.assigned}</th>
            <th>{cols.closed}</th>
            <th>{cols.open}</th>
            <th>{cols.resolution}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => <tr key={row.userId || row.label}>
              <td>
                <span className={styles.rankBadge}>{index + 1}</span>
                {row.label}
              </td>
              <td>{formatNumber(row.assignedCount)}</td>
              <td>{formatNumber(row.closedCount)}</td>
              <td>{formatNumber(row.openCount)}</td>
              <td>{formatHours(copy, row.avgResolutionHours)}</td>
            </tr>)}
        </tbody>
      </table>
    </div>;
}

function SatisfactionAgentTable({
  rows,
  copy
}) {
  if (!rows?.length) return <p className={styles.emptyHint}>{copy.empty}</p>;
  const cols = copy.support.agentColumns;
  return <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>{cols.agent}</th>
            <th>{cols.responses}</th>
            <th>{cols.rating}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => <tr key={row.userId || row.label}>
              <td>{row.label}</td>
              <td>{formatNumber(row.responses)}</td>
              <td>{formatRating(copy, row.avgRating)}</td>
            </tr>)}
        </tbody>
      </table>
    </div>;
}

function FamilyTable({
  rows,
  copy
}) {
  if (!rows?.length) return <p className={styles.emptyHint}>{copy.empty}</p>;
  const cols = copy.devices.familyColumns;
  return <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>{cols.family}</th>
            <th>{cols.total}</th>
            <th>{cols.monitored}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => <tr key={row.key || row.label}>
              <td>{row.label}</td>
              <td>{formatNumber(row.count)}</td>
              <td>{formatNumber(row.monitored)}</td>
            </tr>)}
        </tbody>
      </table>
    </div>;
}

export default function DashboardPage() {
  const locale = useAppLocale();
  const formatters = useAppFormatters();
  const copy = useMemo(() => getDashboardPageCopy(locale), [locale]);
  const [activeTab, setActiveTab] = useState("support");
  const [periodFilter, setPeriodFilter] = useState(DEFAULT_PERIOD_FILTER);
  const [scopeFilter, setScopeFilter] = useState(DEFAULT_SCOPE_FILTER);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportModal, setExportModal] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [proRequired, setProRequired] = useState(false);
  const [distributionModal, setDistributionModal] = useState(null);
  const exportMenuRef = useRef(null);
  const loadAbortRef = useRef(null);
  const periodFilterKey = useMemo(() => JSON.stringify(periodFilter), [periodFilter]);
  const scopeReady = isScopeFilterReady(scopeFilter);
  const scopeFilterKey = useMemo(() => scopeReady ? getScopeFilterKey(scopeFilter) : null, [scopeFilter, scopeReady]);
  const scopeActive = isScopeFilterActive(scopeFilter);
  const loadDashboard = useCallback(async (period, scope, {
    silent = false
  } = {}) => {
    loadAbortRef.current?.abort();
    const controller = createTrackedAbortController();
    loadAbortRef.current = controller;
    if (!silent) {
      setLoading(true);
      setData(null);
    } else {
      setRefreshing(true);
    }
    setError(null);
    setProRequired(false);
    try {
      const payload = await fetchAnalyticsDashboard(period, scope, {
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      setData(payload);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (err?.code === "PRO_FEATURE_REQUIRED") {
        setProRequired(true);
        setData(null);
      } else {
        setError(err?.message || copy.errorLoad);
        setData(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [copy.errorLoad]);
  useEffect(() => {
    if (!scopeReady || scopeFilterKey == null) return undefined;
    loadDashboard(periodFilter, scopeFilter);
    return () => loadAbortRef.current?.abort();
  }, [periodFilterKey, scopeFilterKey, scopeReady, loadDashboard, periodFilter, scopeFilter]);
  useEffect(() => {
    if (!exportMenuOpen) return undefined;
    const onClick = event => {
      if (!exportMenuRef.current?.contains(event.target)) setExportMenuOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [exportMenuOpen]);
  const periodLabel = useMemo(() => getPeriodFilterLabel(periodFilter, copy, formatters), [periodFilter, copy, formatters]);
  const generatedLabel = useMemo(() => {
    if (!data?.generatedAt) return null;
    const generated = formatters.formatDateTime(data.generatedAt);
    let base;
    if (data.since && data.until) {
      base = copy.generatedAtRange.replace("{start}", formatters.formatDateTime(data.since)).replace("{end}", formatters.formatDateTime(data.until)).replace("{date}", generated);
    } else if (data.since) {
      base = copy.generatedAtRange.replace("{start}", formatters.formatDateTime(data.since)).replace("{end}", formatters.formatDateTime(data.generatedAt)).replace("{date}", generated);
    } else {
      base = copy.generatedAt.replace("{date}", generated);
    }
    if (data.filters?.active || scopeActive) return `${base} · ${copy.scopeFilter.filteredBadge}`;
    return base;
  }, [copy.generatedAt, copy.generatedAtRange, copy.scopeFilter.filteredBadge, data, formatters, scopeActive]);
  const formatWeekdayLabel = useCallback(value => {
    const dow = Number(value);
    if (!Number.isFinite(dow) || dow < 1 || dow > 7) return "-";
    const date = new Date(2024, 0, dow);
    const localeTag = locale === "en" ? "en-GB" : locale || "fr-FR";
    return date.toLocaleDateString(localeTag, {
      weekday: "short"
    });
  }, [locale]);
  const formatMonthLabel = useCallback(value => {
    if (!value) return "-";
    try {
      const date = new Date(value);
      return formatters.formatMonthYear?.(date) || formatters.formatDate(date);
    } catch {
      return String(value);
    }
  }, [formatters]);
  const openDistributionModal = useCallback(({
    title,
    icon,
    items
  }) => {
    const total = items.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
    setDistributionModal({
      title,
      icon,
      items,
      subtitle: copy.support.distributionModalSubtitle.replace("{total}", formatNumber(total)).replace("{count}", formatNumber(items.length))
    });
  }, [copy.support.distributionModalSubtitle]);
  const enterprise = data?.enterprise || data?.crm || {};
  const devices = data?.devices || data?.infrastructure || {};
  const distributions = useMemo(() => {
    if (!data) return {};
    const solutionLabels = copy.enterprise.solutionLabels || {};
    return {
      supportStatus: buildDistributionItems(data.support?.byStatus || []).items,
      supportPriority: buildDistributionItems(data.support?.byPriority || []).items,
      supportType: buildDistributionItems(data.support?.byType || []).items,
      supportCategory: buildDistributionItems(data.support?.byCategory || []).items,
      supportChannel: buildDistributionItems(data.support?.byChannel || []).items,
      planningType: buildDistributionItems(data.planning?.byType || []).items,
      planningAgent: buildDistributionItems((data.planning?.byAgent || []).map(row => ({
        name: row.label,
        count: row.count
      }))).items,
      reportsType: buildDistributionItems(data.reports?.byType || []).items,
      deviceFamilies: buildDistributionItems((devices.families || []).map(row => ({
        name: row.label,
        count: row.count
      }))).items,
      modules: buildDistributionItems((enterprise.modules || []).map(row => ({
        name: row.label,
        count: row.count
      }))).items,
      solutions: buildDistributionItems((enterprise.solutions || []).map(row => ({
        name: solutionLabels[row.key] || row.key,
        count: row.count
      }))).items,
      topClients: buildDistributionItems((data.support?.topClients || []).map(row => ({
        name: row.label,
        count: row.count
      }))).items,
      topContacts: buildDistributionItems((data.support?.topContacts || []).map(row => ({
        name: row.label,
        count: row.count
      }))).items
    };
  }, [copy.enterprise.solutionLabels, data, devices.families, enterprise.modules, enterprise.solutions]);
  const triggerPdfDownload = async categories => {
    const file = await downloadKpiReportPdf(periodFilter, scopeFilter, {
      categories,
      locale
    });
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(copy.exportModal.pdfReady);
  };
  const handleExportSubmit = async payload => {
    if (exportModal === "pdf") {
      await triggerPdfDownload(payload.categories);
      return;
    }
    await emailKpiReport(periodFilter, scopeFilter, {
      recipients: payload.recipients,
      categories: payload.categories,
      locale
    });
    toast.success(copy.exportModal.emailSent);
  };
  const heroSubtitle = useMemo(() => {
    if (loading && !data) return copy.loading;
    if (generatedLabel) return generatedLabel;
    return copy.subtitle;
  }, [loading, data, generatedLabel, copy.loading, copy.subtitle]);
  const renderTabContent = () => {
    if (!data) return null;
    if (activeTab === "support") {
      return <>
          <CategoryIntro title={copy.tabs.support} text={copy.intros.support} />
          <KpiRow items={[{
          key: "created",
          icon: "mdi:plus-circle-outline",
          value: formatNumber(data.support?.overview?.created),
          label: copy.support.created
        }, {
          key: "closed",
          icon: "mdi:check-circle-outline",
          value: formatNumber(data.support?.overview?.closed),
          label: copy.support.closed
        }, {
          key: "open",
          icon: "mdi:ticket-outline",
          value: formatNumber(data.support?.overview?.openNow),
          label: copy.support.openNow
        }, {
          key: "closure",
          icon: "mdi:percent-outline",
          value: formatPercent(copy, data.support?.overview?.closureRate),
          label: copy.support.closureRate
        }, {
          key: "response",
          icon: "mdi:timer-outline",
          value: formatHours(copy, data.support?.timing?.avgFirstResponseHours),
          label: copy.support.firstResponse
        }, {
          key: "resolution",
          icon: "mdi:clock-check-outline",
          value: formatHours(copy, data.support?.timing?.avgResolutionHours),
          label: copy.support.resolution
        }]} />
          <AiBriefingPanel featureKey="dashboardBriefing" cacheKey="dashboard_ai_analytics_briefing" buildPayload={() => ({
          summary: data?.summary || {},
          support: {
            overview: data?.support?.overview,
            timing: data?.support?.timing,
            byStatus: data?.support?.byStatus
          },
          planning: {
            overview: data?.planning?.overview
          },
          enterprise,
          devices,
          period: {
            since: data?.since,
            until: data?.until
          }
        })} onGenerate={(stats, loc) => generateDashboardBriefingAi({
          stats,
          source: "analytics",
          locale: loc
        })} />
          <div className={styles.grid2}>
            <Panel title={copy.support.weekdayTrend} icon="mdi:chart-bar" note={`${copy.support.withResponse.replace("{count}", formatNumber(data.support?.timing?.ticketsWithFirstResponse))} · ${copy.support.resolvedCount.replace("{count}", formatNumber(data.support?.timing?.resolvedCount))}`}>
              <TrendBars items={data.support?.weekdayTrend} formatLabel={formatWeekdayLabel} emptyLabel={copy.empty} />
            </Panel>
            <Panel title={copy.support.monthlyTrend} icon="mdi:chart-timeline-variant">
              <TrendBars items={data.support?.monthlyTrend} formatLabel={formatMonthLabel} emptyLabel={copy.empty} />
            </Panel>
          </div>
          <div className={styles.grid2}>
            <PiePanel title={copy.support.byStatus} icon="mdi:ticket-percent-outline" items={distributions.supportStatus} emptyLabel={copy.empty} />
            <DistributionPanel title={copy.support.byChannel} icon="mdi:message-text-outline" items={distributions.supportChannel} emptyLabel={copy.empty} />
          </div>
          <div className={styles.grid2}>
            <DistributionPanel title={copy.support.byPriority} icon="mdi:flag-outline" items={distributions.supportPriority} emptyLabel={copy.empty} />
            <DistributionPanel title={copy.support.byType} icon="mdi:shape-outline" items={distributions.supportType} emptyLabel={copy.empty} />
          </div>
          <div className={styles.grid3}>
            <DashboardTopCard title={copy.support.topCategories} icon="mdi:tag-outline" items={distributions.supportCategory} previewCount={5} emptyLabel={copy.empty} viewAllLabel={copy.support.viewAllStats} othersLabel={copy.support.othersCount.replace("{count}", String(Math.max(0, distributions.supportCategory.length - 5)))} onOpen={() => openDistributionModal({
            title: copy.support.allCategories,
            icon: "mdi:tag-outline",
            items: distributions.supportCategory
          })} />
            <DashboardTopCard title={copy.support.topCompanies} icon="mdi:domain" items={distributions.topClients} previewCount={5} emptyLabel={copy.empty} viewAllLabel={copy.support.viewAllStats} othersLabel={copy.support.othersCount.replace("{count}", String(Math.max(0, distributions.topClients.length - 5)))} onOpen={() => openDistributionModal({
            title: copy.support.allCompanies,
            icon: "mdi:domain",
            items: distributions.topClients
          })} />
            <DashboardTopCard title={copy.support.topContacts} icon="mdi:account-outline" items={distributions.topContacts} previewCount={5} emptyLabel={copy.empty} viewAllLabel={copy.support.viewAllStats} othersLabel={copy.support.othersCount.replace("{count}", String(Math.max(0, distributions.topContacts.length - 5)))} onOpen={() => openDistributionModal({
            title: copy.support.allContacts,
            icon: "mdi:account-outline",
            items: distributions.topContacts
          })} />
          </div>
          <Panel title={copy.support.topAgents} icon="mdi:account-star-outline">
            <AgentRankingTable rows={data.support?.topAgents} copy={copy} />
          </Panel>
          {data.modules?.satisfaction && data.support?.satisfaction ? <div className={styles.grid2}>
              <Panel title={copy.support.satisfaction} icon="mdi:emoticon-happy-outline">
                <div className={styles.miniStats}>
                  <MiniStat label={copy.support.satisfaction} value={formatRating(copy, data.support.satisfaction.avgRating)} />
                  <MiniStat label={copy.support.csat} value={formatPercent(copy, data.support.satisfaction.csatPercent)} />
                  <MiniStat label={copy.support.detractors} value={formatPercent(copy, data.support.satisfaction.detractorPercent)} />
                  <MiniStat label={copy.support.agentColumns.responses} value={formatNumber(data.support.satisfaction.responses)} />
                </div>
              </Panel>
              <Panel title={copy.support.satisfactionByAgent} icon="mdi:account-heart-outline">
                <SatisfactionAgentTable rows={data.support.satisfaction.byAgent} copy={copy} />
              </Panel>
            </div> : null}
          {data.modules?.planning ? <>
              <SectionTitle icon="mdi:calendar-clock-outline" title={copy.support.planningTitle} />
              <KpiRow items={[{
            key: "total",
            icon: "mdi:calendar-multiselect",
            value: formatNumber(data.planning?.overview?.total),
            label: copy.planning.total
          }, {
            key: "maint",
            icon: "mdi:cog-outline",
            value: formatNumber(data.planning?.overview?.maintenanceInPeriod),
            label: copy.planning.maintenancePeriod
          }, {
            key: "upcoming",
            icon: "mdi:calendar-arrow-right",
            value: formatNumber(data.planning?.overview?.upcoming),
            label: copy.planning.upcoming
          }]} />
              <div className={styles.grid2}>
                <PiePanel title={copy.planning.byType} icon="mdi:calendar-multiselect" items={distributions.planningType} emptyLabel={copy.empty} />
                <DistributionPanel title={copy.planning.byAgent} icon="mdi:account-hard-hat" items={distributions.planningAgent} emptyLabel={copy.empty} />
              </div>
            </> : null}
        </>;
    }
    if (activeTab === "devices") {
      return <>
          <CategoryIntro title={copy.tabs.devices} text={copy.intros.devices} />
          {scopeActive ? <p className={styles.scopeHint}>
              <Icon icon="mdi:information-outline" aria-hidden />
              {copy.scopeFilter.infrastructureHint}
            </p> : null}
          <KpiRow items={[{
          key: "fleet",
          icon: "mdi:devices",
          value: formatNumber(devices.equipTotal ?? devices.equipMonitoredTotal),
          label: copy.devices.fleet
        }, {
          key: "supervised",
          icon: "mdi:radar",
          value: formatNumber(devices.equipUnderSurveillanceCount),
          label: copy.devices.supervised
        }, {
          key: "rate",
          icon: "mdi:percent-outline",
          value: formatPercent(copy, devices.equipSurveillancePercent),
          label: copy.devices.surveillance
        }, {
          key: "rmm",
          icon: "mdi:remote-desktop",
          value: `${formatNumber(devices.rmmOnline)} / ${formatNumber(devices.rmmAgents)}`,
          label: copy.devices.rmmOnline
        }, {
          key: "computers",
          icon: "mdi:laptop",
          value: formatNumber(devices.computersTotal),
          label: copy.devices.computers
        }, {
          key: "computersActive",
          icon: "mdi:laptop-check",
          value: formatNumber(devices.computersActive),
          label: copy.devices.computersActive
        }]} />
          <div className={styles.grid2}>
            <DistributionPanel title={copy.devices.families} icon="mdi:server-network" items={distributions.deviceFamilies} emptyLabel={copy.empty} />
            <Panel title={copy.devices.familyTable} icon="mdi:table">
              <FamilyTable rows={devices.families} copy={copy} />
            </Panel>
          </div>
        </>;
    }
    return <>
        <CategoryIntro title={copy.tabs.enterprise} text={copy.intros.enterprise} />
        <KpiRow items={[{
        key: "clients",
        icon: "mdi:domain",
        value: formatNumber(enterprise.clientsPortfolio ?? enterprise.clientsTotal),
        label: copy.enterprise.clients
      }, {
        key: "contacts",
        icon: "mdi:account-group-outline",
        value: formatNumber(enterprise.contactsTotal),
        label: copy.enterprise.contacts
      }, {
        key: "new",
        icon: "mdi:account-plus-outline",
        value: formatNumber(enterprise.contactsNew),
        label: copy.enterprise.contactsNew
      }, {
        key: "active",
        icon: "mdi:file-sign",
        value: formatNumber(enterprise.contractsActive),
        label: copy.enterprise.contractsActive
      }, {
        key: "expiring",
        icon: "mdi:calendar-alert",
        value: formatNumber(enterprise.contractsExpiring),
        label: copy.enterprise.contractsExpiring
      }, {
        key: "expired",
        icon: "mdi:calendar-remove",
        value: formatNumber(enterprise.contractsExpired),
        label: copy.enterprise.contractsExpired
      }, {
        key: "suspended",
        icon: "mdi:pause-circle-outline",
        value: formatNumber(enterprise.contractsSuspended),
        label: copy.enterprise.contractsSuspended
      }]} />
        <div className={styles.grid2}>
          <DistributionPanel title={copy.enterprise.modules} icon="mdi:puzzle-outline" items={distributions.modules} emptyLabel={copy.empty} />
          <DistributionPanel title={copy.enterprise.solutions} icon="mdi:shield-check-outline" items={distributions.solutions} emptyLabel={copy.empty} />
        </div>
        {data.modules?.reports ? <>
            <SectionTitle icon="mdi:file-chart-outline" title={copy.enterprise.reportsTitle} />
            <KpiRow items={[{
          key: "total",
          icon: "mdi:file-document-multiple-outline",
          value: formatNumber(data.reports?.total),
          label: copy.enterprise.reportsTotal
        }, {
          key: "period",
          icon: "mdi:file-chart-outline",
          value: formatNumber(data.reports?.inPeriod),
          label: copy.enterprise.reportsPeriod
        }]} />
            <div className={styles.grid2}>
              <DistributionPanel title={copy.enterprise.reportsByType} icon="mdi:file-chart-outline" items={distributions.reportsType} emptyLabel={copy.empty} />
              <Panel title={copy.enterprise.reportsMonthly} icon="mdi:chart-line">
                <TrendBars items={data.reports?.monthlyTrend} formatLabel={formatMonthLabel} emptyLabel={copy.empty} />
              </Panel>
            </div>
          </> : null}
      </>;
  };
  return <div className={`${mspStyles.mspPage} ${styles.dashboardPage} msp-page-insight`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero eyebrow={copy.eyebrow} title={copy.title} subtitle={heroSubtitle} icon="mdi:chart-box-outline" actions={<>
                <button type="button" className={styles.periodOpenBtn} onClick={() => setPeriodModalOpen(true)} aria-label={copy.periodButtonAria}>
                  <Icon icon="mdi:calendar-range" aria-hidden />
                  <span className={styles.periodOpenLabel}>{periodLabel}</span>
                </button>
                <div className={styles.exportMenuWrap} ref={exportMenuRef}>
                  <SmartTooltip content={copy.export}>
                    <button type="button" className={layout.iconBtn} onClick={() => setExportMenuOpen(open => !open)} aria-haspopup="menu" aria-expanded={exportMenuOpen} aria-label={copy.exportMenuAria}>
                      <Icon icon="mdi:export-variant" aria-hidden />
                    </button>
                  </SmartTooltip>
                  {exportMenuOpen ? <div className={styles.exportMenu} role="menu">
                      <button type="button" role="menuitem" onClick={() => {
                    setExportMenuOpen(false);
                    setExportModal("pdf");
                  }}>
                        <Icon icon="mdi:file-pdf-box" aria-hidden />
                        {copy.exportPdf}
                      </button>
                      <button type="button" role="menuitem" onClick={() => {
                    setExportMenuOpen(false);
                    setExportModal("email");
                  }}>
                        <Icon icon="mdi:email-fast-outline" aria-hidden />
                        {copy.exportEmail}
                      </button>
                    </div> : null}
                </div>
                <SmartTooltip content={copy.headerSchedule}>
                  <button type="button" className={layout.iconBtn} onClick={() => setScheduleOpen(true)} aria-label={copy.headerScheduleAria}>
                    <Icon icon="mdi:calendar-clock-outline" aria-hidden />
                  </button>
                </SmartTooltip>
                <SmartTooltip content={copy.refresh}>
                  <button type="button" className={layout.iconBtn} onClick={() => loadDashboard(periodFilter, scopeFilter, {
                  silent: true
                })} disabled={loading || refreshing} aria-label={copy.refresh}>
                    <Icon icon="mdi:refresh" className={refreshing ? styles.spinner : undefined} aria-hidden />
                  </button>
                </SmartTooltip>
              </>} />

          <main className={mspStyles.mspContent}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
              <div className={styles.contentToolbar}>
                <div className={`${mspStyles.mspTabBar} ${styles.toolbarTabs}`} role="tablist" aria-label={copy.tabsAria}>
                  {DASHBOARD_TABS.map(({
                key,
                icon
              }) => <button key={key} type="button" role="tab" aria-selected={activeTab === key} className={`${mspStyles.mspTab} ${activeTab === key ? mspStyles.mspTabActive : ""}`} onClick={() => setActiveTab(key)}>
                      <Icon icon={icon} className={mspStyles.mspTabIcon} aria-hidden />
                      {copy.tabs[key]}
                    </button>)}
                </div>
                <DashboardScopeFilter compact copy={copy.scopeFilter} value={scopeFilter} onChange={setScopeFilter} disabled={loading || refreshing} />
              </div>
              <div className={styles.tabContent} role="tabpanel">
                {loading && <div className={styles.loadingState}>
                    <Icon icon="mdi:loading" className={styles.spinner} aria-hidden />
                    <span>{copy.loading}</span>
                  </div>}
                {proRequired && <div className={styles.proBanner}>
                    <Icon icon="mdi:lock-outline" aria-hidden />
                    <span>{copy.proRequired}</span>
                  </div>}
                {error && !proRequired ? <div className={styles.errorBanner}>
                    <Icon icon="mdi:alert-circle-outline" aria-hidden />
                    <span>{error}</span>
                  </div> : null}
                {!loading && !error && !proRequired && data && <AnimatePresence mode="wait">
                    <motion.div key={`${activeTab}-${periodFilterKey}-${scopeFilterKey}`} className={styles.tabStack} initial={{
                  opacity: 0,
                  y: 6
                }} animate={{
                  opacity: 1,
                  y: 0
                }} exit={{
                  opacity: 0,
                  y: -4
                }} transition={{
                  duration: 0.2
                }}>
                      {renderTabContent()}
                    </motion.div>
                  </AnimatePresence>}
              </div>
            </div>
          </main>
        </div>
      </div>

      <DashboardPeriodModal open={periodModalOpen} copy={copy} initialFilter={periodFilter} onClose={() => setPeriodModalOpen(false)} onApply={setPeriodFilter} />
      <DashboardExportModal open={Boolean(exportModal)} mode={exportModal || "email"} copy={copy} defaultCategories={[activeTab]} onClose={() => setExportModal(null)} onSubmit={handleExportSubmit} />
      <DashboardScheduleModal open={scheduleOpen} copy={copy} formatters={formatters} onClose={() => setScheduleOpen(false)} />
      <DashboardDistributionModal open={Boolean(distributionModal)} title={distributionModal?.title} icon={distributionModal?.icon} subtitle={distributionModal?.subtitle} items={distributionModal?.items || []} emptyLabel={copy.empty} closeLabel={copy.support.distributionModalClose} onClose={() => setDistributionModal(null)} />
    </div>;
}
