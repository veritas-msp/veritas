import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./ClientDashboard.module.css";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import pageStyles from "./ClientPortalPages.module.css";
import { getClientPortalCopy } from "./clientPortalI18n";
import { usePortalDashboard } from "./usePortalDashboard";
import ClientCybersecurityDetailView from "./ClientCybersecurityDetailView";

export default function ClientCybersecurityPage() {
  const {
    dashboard: rawData,
    scopedDashboard,
    loading,
    error
  } = usePortalDashboard();
  const data = scopedDashboard || rawData;
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.cybersecurity;

  const antivirusItems = useMemo(() => {
    const group = data?.cloudServices?.find(entry => entry.type === "antivirus");
    return group?.items || [];
  }, [data?.cloudServices]);

  const antispamItems = useMemo(() => {
    const group = data?.cloudServices?.find(entry => entry.type === "antispam");
    return group?.items || [];
  }, [data?.cloudServices]);

  const hasContent = antivirusItems.length > 0 || antispamItems.length > 0;
  const subtitleCount = antivirusItems.length + antispamItems.length;

  if (loading && !data) {
    return (
      <div className={`${styles.mainScrollFill} ${styles.portalPage}`}>
        <div className={styles.loadingInline}>
          <span className={styles.spinner} />
          <span>{copy.common.loading}</span>
        </div>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className={`${styles.mainScrollFill} ${styles.portalPage}`}>
        <div className={styles.emptyState}>
          <Icon icon="mdi:alert-circle-outline" className={styles.emptyStateIcon} aria-hidden />
          <p className={styles.emptyStateTitle}>{copy.layout.loadError}</p>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className={`${styles.mainScrollFill} ${styles.portalPage}`}>
      <div className={`${styles.mainContent} ${styles.portalShell}`}>
        <MspPageHero
          className={pageStyles.portalPageHero}
          eyebrow={t.eyebrow}
          title={t.pageTitle}
          subtitle={hasContent ? copy.formatServiceCount(subtitleCount) : undefined}
          icon="mdi:shield-lock-outline"
        />

        {hasContent ? (
          <ClientCybersecurityDetailView
            antivirusItems={antivirusItems}
            antispamItems={antispamItems}
            copy={t}
            formatDate={copy.formatPortalDate}
          />
        ) : (
          <section className={styles.panel}>
            <div className={styles.emptyState}>
              <Icon icon="mdi:shield-off-outline" className={styles.emptyStateIcon} aria-hidden />
              <p className={styles.emptyStateTitle}>{t.emptyTitle}</p>
              <p className={styles.empty}>{t.emptyDesc}</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
