import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useContractModuleOptions } from "../../hooks/useContractModuleOptions";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./ClientDashboard.module.css";
import pageStyles from "./ClientPortalPages.module.css";
import contractStyles from "./ClientContractPage.module.css";
import portalStyles from "./ClientPortalTickets.module.css";
import { getClientPortalCopy } from "./clientPortalI18n";
import { usePortalDashboard, mapPortalComputers } from "./usePortalDashboard";
import { buildContractOptionsGroups } from "./clientPortalContract";

export default function ClientContractPage() {
  const { dashboard: data, loading, error } = usePortalDashboard();
  const { modules: contractModules } = useContractModuleOptions();
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.contract;
  const layoutCopy = copy.layout;
  const enrichedData = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      mappedComputers: mapPortalComputers(data)
    };
  }, [data]);
  const optionGroups = useMemo(() => {
    if (!enrichedData) return [];
    return buildContractOptionsGroups(enrichedData, copy, contractModules);
  }, [enrichedData, copy, contractModules]);

  if (loading && !data) {
    return (
      <div className={`${styles.mainScrollFill} ${layout.page}`}>
        <div className={styles.loadingInline}>
          <span className={styles.spinner} />
          <span>{copy.common.loading}</span>
        </div>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className={`${styles.mainScrollFill} ${layout.page}`}>
        <div className={styles.emptyState}>
          <Icon icon="mdi:alert-circle-outline" className={styles.emptyStateIcon} aria-hidden />
          <p className={styles.emptyStateTitle}>{layoutCopy.loadError}</p>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { client, contrat, commercial } = data;
  const factItems = [
    {
      key: "start",
      icon: "mdi:calendar-start",
      tone: "blue",
      value: contrat?.debut ? copy.formatPortalDate(contrat.debut) : "—",
      label: layoutCopy.contractStart
    },
    {
      key: "expiration",
      icon: "mdi:calendar-end",
      tone: "amber",
      value: contrat?.expiration ? copy.formatPortalDate(contrat.expiration) : "—",
      label: layoutCopy.contractExpiration
    },
    {
      key: "status",
      icon: contrat?.suspendu ? "mdi:pause-circle-outline" : "mdi:check-circle-outline",
      tone: contrat?.suspendu ? "orange" : "green",
      value: contrat?.suspendu ? layoutCopy.contractSuspended : layoutCopy.contractActive,
      label: layoutCopy.contractStatus
    },
    {
      key: "company",
      icon: "mdi:office-building-outline",
      tone: "violet",
      value: client?.name || "—",
      label: copy.dashboard.companyName
    }
  ];

  return (
    <div className={`${styles.mainScrollFill} ${layout.page}`}>
      <div className={`${styles.mainContent} ${styles.portalShell}`}>
        <header className={styles.topBar}>
          <div>
            <p className={styles.pageEyebrow}>
              <Icon icon="mdi:file-document-outline" aria-hidden />
              {t.eyebrow}
            </p>
            <h1 className={styles.pageTitle}>{t.pageTitle}</h1>
          </div>
        </header>

        <div className={pageStyles.kpiRowFamily}>
          {factItems.map(item => (
            <div key={item.key} className={layout.kpiCard}>
              <div className={`${layout.kpiIconWrap} ${layout[`kpiIcon_${item.tone}`] || layout.kpiIcon_blue}`}>
                <Icon icon={item.icon} aria-hidden />
              </div>
              <div className={layout.kpiBody}>
                <span className={layout.kpiValue}>{item.value}</span>
                <span className={layout.kpiLabel}>{item.label}</span>
              </div>
            </div>
          ))}
        </div>

        {commercial ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>
                <Icon icon="mdi:account-tie-outline" aria-hidden />
                {t.referentPanelTitle}
              </span>
            </div>
            <dl className={`${styles.infoCardFacts} ${contractStyles.referentFacts}`}>
              <div>
                <dt>{layoutCopy.referentName}</dt>
                <dd>{commercial.name || "—"}</dd>
              </div>
              <div>
                <dt>{layoutCopy.referentEmail}</dt>
                <dd>
                  {commercial.email ? (
                    <a href={`mailto:${commercial.email}`} className={portalStyles.tableLink}>
                      {commercial.email}
                    </a>
                  ) : "—"}
                </dd>
              </div>
            </dl>
          </section>
        ) : null}

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>{t.optionsTitle}</span>
          </div>
          <div className={contractStyles.optionGroups}>
            {optionGroups.map(group => (
              <div key={group.key} className={contractStyles.optionGroup}>
                <h2 className={contractStyles.optionGroupTitle}>{group.title}</h2>
                <ul className={contractStyles.optionList}>
                  {group.items.map(item => {
                    const statusLabel = item.subscribed ? t.optionActive : t.optionInactive;
                    return (
                      <li
                        key={item.key}
                        className={`${contractStyles.optionChip} ${item.subscribed ? contractStyles.optionChipActive : contractStyles.optionChipInactive}`.trim()}
                        title={statusLabel}
                      >
                        <Icon icon={item.icon} className={contractStyles.optionChipIcon} aria-hidden />
                        <span className={contractStyles.optionChipLabel}>{item.label}</span>
                        <span className={contractStyles.optionChipDot} aria-hidden />
                        <span className={contractStyles.srOnly}>{statusLabel}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
