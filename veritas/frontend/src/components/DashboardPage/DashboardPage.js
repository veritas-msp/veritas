import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { downloadKpiReportPdf, emailKpiReport, fetchAnalyticsDashboard } from "../../api/dashboard";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getDashboardPageCopy } from "./dashboardPageI18n";
import DashboardPeriodModal from "./DashboardPeriodModal";
import DashboardDistributionModal from "./DashboardDistributionModal";
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
import DashboardSupportCockpit from "./DashboardSupportCockpit";
import DashboardDevicesCockpit from "./DashboardDevicesCockpit";
import DashboardEnterpriseCockpit from "./DashboardEnterpriseCockpit";
import DashboardKnowledgeCockpit from "./DashboardKnowledgeCockpit";
import styles from "./DashboardPage.module.css";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getDashboardGuide } from "../PageGuide/dashboardGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";

const DASHBOARD_TABS = [{
  key: "support",
  icon: "mdi:headset"
}, {
  key: "devices",
  icon: "mdi:devices"
}, {
  key: "enterprise",
  icon: "mdi:domain"
}, {
  key: "knowledge",
  icon: "mdi:book-open-page-variant-outline"
}];

export default function DashboardPage() {
  const locale = useAppLocale();
  const formatters = useAppFormatters();
  const copy = useMemo(() => getDashboardPageCopy(locale), [locale]);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const kpiGuide = useMemo(() => getDashboardGuide(locale, {
    showSupport: () => setActiveTab("support")
  }), [locale]);
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
  const enterprise = data?.enterprise || data?.crm || {};
  const devices = data?.devices || data?.infrastructure || {};
  const knowledge = data?.knowledge || {};
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
      return <DashboardSupportCockpit data={data} copy={copy} locale={locale} />;
    }
    if (activeTab === "devices") {
      return <DashboardDevicesCockpit data={data} copy={copy} locale={locale} scopeHint={scopeActive ? <p className={styles.scopeHint}>
              <Icon icon="mdi:information-outline" aria-hidden />
              {copy.scopeFilter.infrastructureHint}
            </p> : null} />;
    }
    if (activeTab === "enterprise") {
      return <DashboardEnterpriseCockpit data={data} copy={copy} locale={locale} />;
    }
    if (activeTab === "knowledge") {
      return <DashboardKnowledgeCockpit data={data} copy={copy} />;
    }
    return null;
  };
  return <div className={`${mspStyles.mspPage} ${styles.dashboardPage} msp-page-insight`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero guideId="kpi-hero" eyebrow={copy.eyebrow} title={copy.title} subtitle={heroSubtitle} icon="mdi:chart-box-outline" actions={<>
                <button type="button" className={styles.periodOpenBtn} onClick={() => setPeriodModalOpen(true)} aria-label={copy.periodButtonAria} data-guide="kpi-period">
                  <Icon icon="mdi:calendar-range" aria-hidden />
                  <span className={styles.periodOpenLabel}>{periodLabel}</span>
                </button>
                <div className={styles.exportMenuWrap} ref={exportMenuRef} data-guide="kpi-export">
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

          <main className={`${mspStyles.mspContent} ${mspStyles.mspContentList}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
              <div className={styles.contentToolbar}>
                <div className={`${mspStyles.mspTabBar} ${styles.toolbarTabs}`} role="tablist" aria-label={copy.tabsAria} data-guide="kpi-tabs">
                  {DASHBOARD_TABS.map(({
                key,
                icon
              }) => <button key={key} type="button" role="tab" aria-selected={activeTab === key} className={`${mspStyles.mspTab} ${activeTab === key ? mspStyles.mspTabActive : ""}`} onClick={() => setActiveTab(key)}>
                      <Icon icon={icon} className={mspStyles.mspTabIcon} aria-hidden />
                      {copy.tabs[key]}
                    </button>)}
                </div>
                <div data-guide="kpi-scope">
                  <DashboardScopeFilter compact copy={copy.scopeFilter} value={scopeFilter} onChange={setScopeFilter} disabled={loading || refreshing} />
                </div>
              </div>
              <div className={styles.tabContent} role="tabpanel" data-guide="kpi-content">
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
                    <motion.div key={`${activeTab}-${periodFilterKey}-${scopeFilterKey}`} className={`${styles.tabStack} ${activeTab === "support" || activeTab === "devices" || activeTab === "enterprise" || activeTab === "knowledge" ? styles.tabStackFill : ""}`} initial={{
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
          {!loading && !proRequired && data ? <AiBriefingPanel variant="fab" featureKey="dashboardBriefing" cacheKey="dashboard_ai_analytics_briefing" buildPayload={() => ({
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
            knowledge: {
              overview: data?.knowledge?.overview
            },
            period: {
              since: data?.since,
              until: data?.until
            }
          })} onGenerate={(stats, loc) => generateDashboardBriefingAi({
            stats,
            source: "analytics",
            locale: loc,
            scopeKey: "dashboard_ai_analytics_briefing"
          })} /> : null}
        </div>
      </div>

      <DashboardPeriodModal open={periodModalOpen} copy={copy} initialFilter={periodFilter} onClose={() => setPeriodModalOpen(false)} onApply={setPeriodFilter} />
      <DashboardExportModal open={Boolean(exportModal)} mode={exportModal || "email"} copy={copy} defaultCategories={[activeTab]} onClose={() => setExportModal(null)} onSubmit={handleExportSubmit} />
      <DashboardScheduleModal open={scheduleOpen} copy={copy} formatters={formatters} onClose={() => setScheduleOpen(false)} />
      <DashboardDistributionModal open={Boolean(distributionModal)} title={distributionModal?.title} icon={distributionModal?.icon} subtitle={distributionModal?.subtitle} items={distributionModal?.items || []} emptyLabel={copy.empty} closeLabel={copy.support.distributionModalClose} onClose={() => setDistributionModal(null)} />
      <PageGuideTour open={pageGuideOpen} steps={kpiGuide.steps} title={kpiGuide.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
    </div>;
}
