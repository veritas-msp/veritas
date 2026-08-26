import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./ClientDashboard.module.css";
import ClientServicesDetailView from "./ClientServicesDetailView";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import pageStyles from "./ClientPortalPages.module.css";
import { getClientPortalCopy } from "./clientPortalI18n";
import { usePortalDashboard } from "./usePortalDashboard";
export default function ClientServicesPage() {
  const {
    dashboard: rawData,
    scopedDashboard,
    loading,
    error
  } = usePortalDashboard();
  const data = scopedDashboard || rawData;
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.services;
  if (loading && !data) {
    return <div className={`${styles.mainScrollFill} ${styles.portalPage}`}>
        <div className={styles.loadingInline}>
          <span className={styles.spinner} />
          <span>{copy.common.loading}</span>
        </div>
      </div>;
  }
  if (error && !data) {
    return <div className={`${styles.mainScrollFill} ${styles.portalPage}`}>
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
  const hasServices = cloudServices?.some(group =>
    group?.items?.length > 0 && group.type !== "antivirus" && group.type !== "antispam"
  );
  return <div className={`${styles.mainScrollFill} ${styles.portalPage}`}>
      <div className={`${styles.mainContent} ${styles.portalShell}`}>
        <MspPageHero
          className={pageStyles.portalPageHero}
          eyebrow={t.eyebrow}
          title={t.pageTitle}
          subtitle={copy.formatServiceCount(stats?.cloudCount ?? 0)}
          icon="mdi:cloud-outline"
        />

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
