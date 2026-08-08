import { useMemo } from "react";
import { Icon } from "@iconify/react";
import AppVersion from "../Misc/AppVersion";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { getAuthCopy } from "./authI18n";
import styles from "./SystemOutagePage.module.css";
export default function SystemOutagePage({
  serverStatus,
  dbStatus,
  lastCheck,
  onRetry,
  retrying = false,
  locale: localeProp
}) {
  const contextLocale = useAppLocale();
  const locale = localeProp || contextLocale;
  const copy = useMemo(() => getAuthCopy(locale).outage, [locale]);
  const footer = useMemo(() => getAuthCopy(locale).footer, [locale]);
  const issues = [];
  if (serverStatus === "error") issues.push(copy.apiUnavailable);
  if (dbStatus === "error") issues.push(copy.dbUnavailable);
  return <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>V</div>
          <span className={styles.brandName}>Veritas</span>
          <AppVersion variant="dark" />
        </div>

        <div className={styles.iconWrap} aria-hidden="true">
          <Icon icon="mdi:server-network-off" className={styles.mainIcon} />
        </div>

        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lead}>{copy.lead}</p>
        <p className={styles.sub}>{copy.sub}</p>

        {issues.length > 0 && <ul className={styles.issueList}>
            {issues.map(issue => <li key={issue} className={styles.issueItem}>
                <Icon icon="mdi:alert-circle-outline" aria-hidden />
                <span>{issue}</span>
              </li>)}
          </ul>}

        <div className={styles.actions}>
          <button type="button" className={styles.retryBtn} onClick={onRetry} disabled={retrying}>
            <Icon icon={retrying ? "mdi:loading" : "mdi:refresh"} className={retrying ? styles.spin : ""} aria-hidden />
            {retrying ? copy.retrying : copy.retry}
          </button>
          {lastCheck && <p className={styles.meta}>{interpolate(copy.lastCheck, {
            time: lastCheck
          })}</p>}
        </div>
      </div>

      <footer className={styles.footer}>
        <p>{footer}</p>
      </footer>
    </div>;
}
