import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useContractModuleOptions } from "../../hooks/useContractModuleOptions";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./ClientDashboard.module.css";
import contractStyles from "./ClientContractPage.module.css";
import portalStyles from "./ClientPortalTickets.module.css";
import { getClientPortalCopy } from "./clientPortalI18n";
import { usePortalDashboard, mapPortalComputers } from "./usePortalDashboard";
import { buildContractOptionsGroups } from "./clientPortalContract";
export default function ClientContractPage() {
  const {
    dashboard: data,
    loading,
    error
  } = usePortalDashboard();
  const {
    modules: contractModules
  } = useContractModuleOptions();
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
          <p className={styles.emptyStateTitle}>{layoutCopy.loadError}</p>
        </div>
      </div>;
  }
  if (!data) return null;
  const {
    client,
    contrat,
    commercial
  } = data;
  return <div className={`${styles.mainScrollFill} ${layout.page}`}>
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

        <div className={styles.twoCol}>
          <section className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <Icon icon="mdi:file-document-outline" aria-hidden />
              <span>{t.contractPanelTitle}</span>
            </div>
            <dl className={styles.infoCardFacts}>
              <div>
                <dt>{layoutCopy.contractStart}</dt>
                <dd>{contrat?.debut ? copy.formatPortalDate(contrat.debut) : "-"}</dd>
              </div>
              <div>
                <dt>{layoutCopy.contractExpiration}</dt>
                <dd>{contrat?.expiration ? copy.formatPortalDate(contrat.expiration) : "-"}</dd>
              </div>
              <div>
                <dt>{layoutCopy.contractStatus}</dt>
                <dd className={contrat?.suspendu ? styles.textWarn : styles.textOk}>
                  {contrat?.suspendu ? layoutCopy.contractSuspended : layoutCopy.contractActive}
                </dd>
              </div>
              {client?.name ? <div>
                  <dt>{copy.dashboard.companyName}</dt>
                  <dd>{client.name}</dd>
                </div> : null}
            </dl>
          </section>

          {commercial ? <section className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <Icon icon="mdi:account-tie-outline" aria-hidden />
                <span>{t.referentPanelTitle}</span>
              </div>
              <dl className={styles.infoCardFacts}>
                <div>
                  <dt>{layoutCopy.referentName}</dt>
                  <dd>{commercial.name || "-"}</dd>
                </div>
                <div>
                  <dt>{layoutCopy.referentEmail}</dt>
                  <dd>
                    {commercial.email ? <a href={`mailto:${commercial.email}`} className={portalStyles.tableLink}>
                        {commercial.email}
                      </a> : "-"}
                  </dd>
                </div>
              </dl>
            </section> : <section className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <Icon icon="mdi:office-building-outline" aria-hidden />
                <span>{copy.dashboard.companyPanelTitle}</span>
              </div>
              <dl className={styles.infoCardFacts}>
                <div>
                  <dt>{copy.dashboard.companyName}</dt>
                  <dd>{client?.name || "-"}</dd>
                </div>
                {client?.city ? <div>
                    <dt>{copy.dashboard.companyLocation}</dt>
                    <dd>
                      {client.city}
                      {client.country ? `, ${client.country}` : ""}
                    </dd>
                  </div> : null}
              </dl>
            </section>}
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>{t.optionsTitle}</span>
          </div>

          <div className={contractStyles.optionGroups}>
            {optionGroups.map(group => <div key={group.key} className={contractStyles.optionGroup}>
                <h2 className={contractStyles.optionGroupTitle}>{group.title}</h2>
                <ul className={contractStyles.optionList}>
                  {group.items.map(item => {
                const statusLabel = item.subscribed ? t.optionActive : t.optionInactive;
                return <li key={item.key} className={`${contractStyles.optionChip} ${item.subscribed ? contractStyles.optionChipActive : contractStyles.optionChipInactive}`.trim()} title={statusLabel}>
                        <Icon icon={item.icon} className={contractStyles.optionChipIcon} aria-hidden />
                        <span className={contractStyles.optionChipLabel}>{item.label}</span>
                        <span className={contractStyles.optionChipDot} aria-hidden />
                        <span className={contractStyles.srOnly}>{statusLabel}</span>
                      </li>;
              })}
                </ul>
              </div>)}
          </div>
        </section>
      </div>
    </div>;
}
