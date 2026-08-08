import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./ClientDashboard.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import ClientServicesDetailView from "./ClientServicesDetailView";
import { getClientPortalCopy } from "./clientPortalI18n";
import { usePortalDashboard } from "./usePortalDashboard";
export default function ClientServicesPage() {
  const {
    dashboard: data,
    loading,
    error
  } = usePortalDashboard();
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.services;
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
    cloudServices,
    stats
  } = data;
  const hasServices = cloudServices?.some(group => group?.items?.length > 0);
  return <div className={`${styles.mainScrollFill} ${layout.page}`}>
      <div className={`${styles.mainContent} ${styles.portalShell}`}>
        <header className={styles.topBar}>
          <div>
            <p className={styles.pageEyebrow}>
              <Icon icon="mdi:cloud-outline" aria-hidden />
              {t.eyebrow}
            </p>
            <h1 className={styles.pageTitle}>{t.pageTitle}</h1>
          </div>
          <span className={styles.panelCount}>
            {copy.formatServiceCount(stats?.cloudCount ?? 0)}
          </span>
        </header>

        {hasServices ? <ClientServicesDetailView cloudServices={cloudServices} /> : <section className={styles.panel}>
            <div className={styles.emptyState}>
              <Icon icon="mdi:cloud-off-outline" className={styles.emptyStateIcon} aria-hidden />
              <p className={styles.emptyStateTitle}>{t.emptyTitle}</p>
              <p className={styles.empty}>{t.emptyDesc}</p>
            </div>
          </section>}
      </div>
    </div>;
}
