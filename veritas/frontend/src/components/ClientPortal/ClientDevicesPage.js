import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./ClientDashboard.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import pageStyles from "./ClientPortalPages.module.css";
import ClientPortalFleetStats from "./ClientPortalFleetStats";
import ClientDevicesListTab from "./ClientDevicesListTab";
import { getClientPortalCopy } from "./clientPortalI18n";
import { mapPortalComputers, usePortalDashboard } from "./usePortalDashboard";
export default function ClientDevicesPage() {
  const {
    dashboard: data,
    loading,
    error
  } = usePortalDashboard();
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.devices;
  const [activeTab, setActiveTab] = useState("overview");
  const pageTabs = useMemo(() => [{
    key: "overview",
    label: t.tabOverview,
    icon: "mdi:chart-box-outline",
    tone: "blue"
  }, {
    key: "devices",
    label: t.tabDevices,
    icon: "mdi:devices",
    tone: "violet"
  }], [t.tabOverview, t.tabDevices]);
  const mappedComputers = useMemo(() => mapPortalComputers(data), [data]);
  if (loading && !data) {
    return <div className={`${styles.mainScrollFill} ${layout.page}`}>
        <div className={styles.loadingInline}>
          <span className={styles.spinner} />
          <span>{copy.common.loading}</span>
        </div>
      </div>;
  }
  if (error && !data) {
    return <div className={`${styles.mainScrollFill} ${layout.page}`}>
        <div className={styles.emptyState}>
          <Icon icon="mdi:alert-circle-outline" className={styles.emptyStateIcon} aria-hidden />
          <p className={styles.emptyStateTitle}>{copy.layout.loadError}</p>
        </div>
      </div>;
  }
  if (!data) return null;
  const {
    stats,
    infrastructure,
    computers
  } = data;
  const computerCount = mappedComputers.length || computers?.length || 0;
  const hasWorkstations = computerCount > 0;
  const hasInfra = infrastructure?.length > 0;
  const isEmpty = !hasWorkstations && !hasInfra;
  return <div className={`${styles.mainScrollFill} ${layout.page}`}>
      <div className={`${styles.mainContent} ${styles.portalShell}`}>
        <header className={styles.topBar}>
          <div>
            <p className={styles.pageEyebrow}>
              <Icon icon="mdi:devices" aria-hidden />
              {t.eyebrow}
            </p>
            <h1 className={styles.pageTitle}>{t.pageTitle}</h1>
          </div>
          <span className={styles.panelCount}>
            {copy.formatEquipmentCount(stats?.totalEquipment ?? 0)}
          </span>
        </header>

        {isEmpty ? <section className={styles.panel}>
            <div className={styles.emptyState}>
              <Icon icon="mdi:devices" className={styles.emptyStateIcon} aria-hidden />
              <p className={styles.emptyStateTitle}>{t.emptyTitle}</p>
              <p className={styles.empty}>{t.emptyDesc}</p>
            </div>
          </section> : <>
            <div className={pageStyles.kpiRow2}>
              {pageTabs.map(tab => {
            const active = activeTab === tab.key;
            return <button key={tab.key} type="button" className={`${layout.kpiCard} ${active ? layout.kpiCardActive : ""}`.trim()} onClick={() => setActiveTab(tab.key)} aria-pressed={active}>
                    <div className={`${layout.kpiIconWrap} ${layout[`kpiIcon_${tab.tone}`] || layout.kpiIcon_blue}`}>
                      <Icon icon={tab.icon} aria-hidden />
                    </div>
                    <div className={layout.kpiBody}>
                      <span className={layout.kpiLabel}>{tab.label}</span>
                    </div>
                  </button>;
          })}
            </div>

            {activeTab === "overview" ? <>
                {mappedComputers.length > 0 ? <section className={styles.panel}>
                    <ClientPortalFleetStats computers={mappedComputers} />
                  </section> : hasWorkstations ? <section className={styles.panel}>
                    <div className={styles.emptyState}>
                      <Icon icon="mdi:chart-box-outline" className={styles.emptyStateIcon} aria-hidden />
                      <p className={styles.empty}>{t.noWorkstationsData}</p>
                    </div>
                  </section> : <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <span className={styles.panelTitle}>{copy.dashboard.infraTitle}</span>
                      <span className={styles.panelCount}>
                        {copy.formatEquipmentCount(stats?.infraCount ?? 0)}
                      </span>
                    </div>
                    <p className={styles.empty}>{t.emptyDesc}</p>
                  </section>}
              </> : <ClientDevicesListTab mappedComputers={mappedComputers} rawComputers={computers || []} infrastructure={infrastructure || []} />}
          </>}
      </div>
    </div>;
}
