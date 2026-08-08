import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { getClientPortalCopy } from "./clientPortalI18n";
import portalStyles from "./ClientDashboard.module.css";
import tableStyles from "../TicketPage/TicketPage.module.css";
import listStyles from "./ClientDevicesListTab.module.css";
import styles from "./ClientServicesDetailView.module.css";
function getExpirationMeta(dateValue, copy) {
  if (!dateValue) {
    return {
      label: copy.expirationUnknown,
      tone: "muted"
    };
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return {
      label: copy.expirationUnknown,
      tone: "muted"
    };
  }
  const days = (date.getTime() - Date.now()) / 86400000;
  if (days < 0) return {
    label: copy.expirationExpired,
    tone: "bad"
  };
  if (days <= 30) return {
    label: copy.expirationSoon,
    tone: "warn"
  };
  if (days <= 90) return {
    label: copy.expirationWarning,
    tone: "warn"
  };
  return {
    label: copy.expirationOk,
    tone: "ok"
  };
}
function ExpirationBadge({
  dateValue,
  copy,
  formatDate
}) {
  const meta = getExpirationMeta(dateValue, copy);
  return <span className={`${styles.expBadge} ${styles[`exp_${meta.tone}`]}`}>
      {dateValue ? formatDate(dateValue) : copy.expirationUnknown}
      <span className={styles.expBadgeSub}>{meta.label}</span>
    </span>;
}
function formatLicenseSummary(item, copy) {
  const total = item.licensesTotal;
  const used = item.licensesUsed;
  if (total != null && used != null) {
    return interpolate(copy.licensesSummary, {
      used: String(used),
      total: String(total)
    });
  }
  if (used != null) {
    return interpolate(copy.licensesSummaryUsedOnly, {
      used: String(used)
    });
  }
  if (total != null) {
    return interpolate(copy.licensesSummaryTotalOnly, {
      total: String(total)
    });
  }
  if (item.licenses?.length) {
    return String(item.licenses.length);
  }
  return "—";
}
function buildDetailLines(item, copy, formatDate) {
  const details = item.details || {};
  const lines = [];
  if (details.kind === "ndd" && details.domain) {
    lines.push({
      label: copy.domain,
      value: details.domain
    });
  }
  if (details.registrar) {
    lines.push({
      label: copy.registrar,
      value: details.registrar
    });
  }
  if (details.autoRenew != null) {
    lines.push({
      label: copy.tableDetails,
      value: details.autoRenew ? copy.autoRenewYes : copy.autoRenewNo
    });
  }
  if (details.userCount != null) {
    lines.push({
      label: copy.tableLicenses,
      value: details.userCount > 1 ? interpolate(copy.userCount, {
        count: String(details.userCount)
      }) : interpolate(copy.userCountOne, {
        count: String(details.userCount)
      })
    });
  }
  if (details.endpointCount != null) {
    lines.push({
      label: copy.tableDetails,
      value: details.endpointCount > 1 ? interpolate(copy.endpointCount, {
        count: String(details.endpointCount)
      }) : interpolate(copy.endpointCountOne, {
        count: String(details.endpointCount)
      })
    });
  }
  if (details.capacity) {
    lines.push({
      label: copy.capacity,
      value: details.capacity
    });
  }
  if (details.site) {
    lines.push({
      label: copy.site,
      value: details.site
    });
  }
  if (details.jobCount != null) {
    lines.push({
      label: copy.jobType,
      value: details.jobCount > 1 ? interpolate(copy.jobCount, {
        count: String(details.jobCount)
      }) : interpolate(copy.jobCountOne, {
        count: String(details.jobCount)
      })
    });
  }
  if (details.lastBackup) {
    lines.push({
      label: copy.lastBackup,
      value: formatDate(details.lastBackup)
    });
  }
  if (details.jobType && details.kind === "saveJob") {
    lines.push({
      label: copy.jobType,
      value: details.jobType
    });
  }
  return lines;
}
function ServiceCard({
  item,
  group,
  copy,
  formatDate
}) {
  const detailLines = buildDetailLines(item, copy, formatDate);
  const hasLicenseTable = item.licenses?.length > 0;
  return <article className={styles.serviceCard}>
      <header className={styles.serviceCardHeader}>
        <div className={styles.serviceCardTitleWrap}>
          <div className={`${styles.serviceIcon} ${styles[`icon_${group.type}`] || ""}`}>
            <Icon icon={group.icon} aria-hidden />
          </div>
          <div>
            <h3 className={styles.serviceName}>{item.name}</h3>
            <p className={styles.serviceProduct}>{item.product || group.label}</p>
          </div>
        </div>
        <div className={styles.serviceCardMeta}>
          <span className={`${listStyles.statusBadge} ${item.active ? listStyles.statusActive : listStyles.statusInactive}`}>
            {item.active ? copy.statusActive : copy.statusInactive}
          </span>
          <ExpirationBadge dateValue={item.expiration} copy={copy} formatDate={formatDate} />
        </div>
      </header>

      <div className={styles.serviceSummaryRow}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>{copy.tableLicenses}</span>
          <strong>{formatLicenseSummary(item, copy)}</strong>
        </div>
        {detailLines.slice(0, 3).map(line => <div key={`${line.label}-${line.value}`} className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{line.label}</span>
            <strong>{line.value}</strong>
          </div>)}
      </div>

      {hasLicenseTable ? <div className={tableStyles.tablePanel}>
          <div className={tableStyles.tableScroll}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>{copy.licenseName}</th>
                  <th>{copy.licenseTotal}</th>
                  <th>{copy.licenseUsed}</th>
                  <th>{copy.licenseExpiration}</th>
                </tr>
              </thead>
              <tbody>
                {item.licenses.map(lic => <tr key={`${lic.name}-${lic.expiration || "na"}`}>
                    <td>{lic.name}</td>
                    <td>{lic.total ?? "—"}</td>
                    <td>{lic.used ?? "—"}</td>
                    <td>
                      <ExpirationBadge dateValue={lic.expiration} copy={copy} formatDate={formatDate} />
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div> : null}

      {!hasLicenseTable && detailLines.length > 3 ? <ul className={styles.detailList}>
          {detailLines.slice(3).map(line => <li key={`${line.label}-${line.value}`}>
              <span>{line.label}</span>
              <strong>{line.value}</strong>
            </li>)}
        </ul> : null}
    </article>;
}
export default function ClientServicesDetailView({
  cloudServices = []
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.services;
  const groups = useMemo(() => (cloudServices || []).filter(group => group?.items?.length > 0), [cloudServices]);
  const [typeFilter, setTypeFilter] = useState("all");
  const visibleGroups = useMemo(() => {
    if (typeFilter === "all") return groups;
    return groups.filter(group => group.type === typeFilter);
  }, [groups, typeFilter]);
  const totalCount = groups.reduce((sum, group) => sum + group.items.length, 0);
  if (!groups.length) {
    return <div className={portalStyles.emptyState}>
        <Icon icon="mdi:cloud-off-outline" className={portalStyles.emptyStateIcon} aria-hidden />
        <p className={portalStyles.emptyStateTitle}>{t.emptyTitle}</p>
        <p className={portalStyles.empty}>{t.emptyDesc}</p>
      </div>;
  }
  return <div className={styles.root}>
      <div className={listStyles.filterBar}>
        <span className={listStyles.filterLabel}>{t.filterByType}</span>
        <div className={listStyles.filterChips} role="tablist" aria-label={t.filterByType}>
          <button type="button" role="tab" aria-selected={typeFilter === "all"} className={`${listStyles.chip} ${typeFilter === "all" ? listStyles.chipActive : ""}`.trim()} onClick={() => setTypeFilter("all")}>
            {t.filterAll}
            <span className={listStyles.chipCount}>{totalCount}</span>
          </button>
          {groups.map(group => <button key={group.type} type="button" role="tab" aria-selected={typeFilter === group.type} className={`${listStyles.chip} ${typeFilter === group.type ? listStyles.chipActive : ""}`.trim()} onClick={() => setTypeFilter(group.type)}>
              <Icon icon={group.icon} aria-hidden />
              {group.label}
              <span className={listStyles.chipCount}>{group.items.length}</span>
            </button>)}
        </div>
      </div>

      {visibleGroups.map(group => <section key={group.type} className={portalStyles.panel}>
          <div className={portalStyles.panelHeader}>
            <span className={portalStyles.panelTitle}>
              <Icon icon={group.icon} aria-hidden />
              {group.label}
            </span>
            <span className={portalStyles.panelCount}>{group.items.length}</span>
          </div>
          <div className={styles.cardsGrid}>
            {group.items.map(item => <ServiceCard key={item.id} item={item} group={group} copy={t} formatDate={copy.formatPortalDate} />)}
          </div>
        </section>)}
    </div>;
}
