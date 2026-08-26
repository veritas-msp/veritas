import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { getClientPortalCopy } from "./clientPortalI18n";
import portalStyles from "./ClientDashboard.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import pageStyles from "./ClientPortalPages.module.css";
import tableStyles from "../TicketPage/TicketPage.module.css";
import listStyles from "./ClientDevicesListTab.module.css";
import PortalTabBar from "./PortalTabBar";
import ClientPortalTenantView from "./ClientPortalTenantView";
import styles from "./ClientServicesDetailView.module.css";

function getExpirationMeta(dateValue, copy) {
  if (!dateValue) {
    return { label: copy.expirationUnknown, tone: "muted" };
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return { label: copy.expirationUnknown, tone: "muted" };
  }
  const days = (date.getTime() - Date.now()) / 86400000;
  if (days < 0) return { label: copy.expirationExpired, tone: "bad" };
  if (days <= 30) return { label: copy.expirationSoon, tone: "warn" };
  if (days <= 90) return { label: copy.expirationWarning, tone: "warn" };
  return { label: copy.expirationOk, tone: "ok" };
}

function ExpirationBadge({ dateValue, copy, formatDate }) {
  const meta = getExpirationMeta(dateValue, copy);
  return (
    <span className={`${styles.expBadge} ${styles[`exp_${meta.tone}`]}`}>
      {dateValue ? formatDate(dateValue) : copy.expirationUnknown}
      <span className={styles.expBadgeSub}>{meta.label}</span>
    </span>
  );
}

function StatusBadge({ active, copy }) {
  return (
    <span className={`${listStyles.statusBadge} ${active ? listStyles.statusActive : listStyles.statusInactive}`}>
      {active ? copy.statusActive : copy.statusInactive}
    </span>
  );
}

function ServiceTable({ columns, rows, emptyLabel }) {
  if (!rows.length) {
    return <p className={listStyles.emptyCategory}>{emptyLabel}</p>;
  }
  return (
    <div className={tableStyles.tablePanel}>
      <div className={tableStyles.tableScroll}>
        <table className={`${tableStyles.table} ${styles.serviceTable}`}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                {columns.map(col => (
                  <td key={col.key}>{col.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function collectBackupJobs(items) {
  const jobs = [];
  items.forEach(item => {
    if (item.details?.kind === "saveJob") {
      jobs.push({
        id: item.id,
        name: item.name,
        instanceName: item.details.instanceName || item.product || "—",
        jobType: item.details.jobType,
        lastBackup: item.details.lastBackup,
        lastBackupDuration: item.details.lastBackupDuration,
        expiration: item.expiration
      });
      return;
    }
    (item.details?.jobs || []).forEach(job => {
      jobs.push({
        id: job.id,
        name: job.name,
        instanceName: item.name,
        jobType: job.jobType,
        lastBackup: job.lastBackup,
        lastBackupDuration: job.lastBackupDuration,
        expiration: item.expiration
      });
    });
  });
  return jobs;
}

function BackupView({ items, copy, formatDate }) {
  const instances = items.filter(item => item.details?.kind !== "saveJob");
  const jobs = collectBackupJobs(items);
  return (
    <>
      <div className={pageStyles.kpiRowFamily}>
        <div className={layout.kpiCard}>
          <div className={`${layout.kpiIconWrap} ${layout.kpiIcon_teal}`}>
            <Icon icon="mdi:backup-restore" aria-hidden />
          </div>
          <div className={layout.kpiBody}>
            <span className={layout.kpiValue}>{instances.length}</span>
            <span className={layout.kpiLabel}>{copy.instancesTitle}</span>
          </div>
        </div>
        <div className={layout.kpiCard}>
          <div className={`${layout.kpiIconWrap} ${layout.kpiIcon_cyan}`}>
            <Icon icon="mdi:calendar-clock" aria-hidden />
          </div>
          <div className={layout.kpiBody}>
            <span className={layout.kpiValue}>{jobs.length}</span>
            <span className={layout.kpiLabel}>{copy.jobsTitle}</span>
          </div>
        </div>
      </div>
      <section className={portalStyles.panel}>
        <div className={portalStyles.panelHeader}>
          <span className={portalStyles.panelTitle}>{copy.instancesTitle}</span>
          <span className={portalStyles.panelCount}>{instances.length}</span>
        </div>
        <ServiceTable
          emptyLabel={copy.noItems}
          columns={[
            { key: "name", label: copy.tableInstance, render: row => row.name },
            { key: "product", label: copy.tableSoftware, render: row => row.product || "—" },
            { key: "site", label: copy.site, render: row => row.details?.site || "—" },
            { key: "capacity", label: copy.capacity, render: row => row.details?.capacity || "—" },
            { key: "jobs", label: copy.jobsTitle, render: row => row.details?.jobCount ?? (row.details?.jobs?.length || 0) },
            { key: "status", label: copy.tableStatus, render: row => <StatusBadge active={row.active} copy={copy} /> }
          ]}
          rows={instances}
        />
      </section>
      <section className={portalStyles.panel}>
        <div className={portalStyles.panelHeader}>
          <span className={portalStyles.panelTitle}>{copy.jobsTitle}</span>
          <span className={portalStyles.panelCount}>{jobs.length}</span>
        </div>
        <ServiceTable
          emptyLabel={copy.noItems}
          columns={[
            { key: "name", label: copy.tableJobName, render: row => row.name },
            { key: "instance", label: copy.tableInstance, render: row => row.instanceName || "—" },
            { key: "type", label: copy.jobType, render: row => row.jobType || "—" },
            { key: "last", label: copy.lastBackup, render: row => row.lastBackup ? formatDate(row.lastBackup) : "—" }
          ]}
          rows={jobs}
        />
      </section>
    </>
  );
}

function DomainsView({ items, copy, formatDate }) {
  const expiringSoon = items.filter(item => {
    const meta = getExpirationMeta(item.expiration, copy);
    return meta.tone === "bad" || meta.tone === "warn";
  }).length;
  return (
    <>
      <div className={pageStyles.kpiRowFamily}>
        <div className={layout.kpiCard}>
          <div className={`${layout.kpiIconWrap} ${layout.kpiIcon_amber}`}>
            <Icon icon="mdi:domain" aria-hidden />
          </div>
          <div className={layout.kpiBody}>
            <span className={layout.kpiValue}>{items.length}</span>
            <span className={layout.kpiLabel}>{copy.domainsTitle}</span>
          </div>
        </div>
        <div className={layout.kpiCard}>
          <div className={`${layout.kpiIconWrap} ${layout.kpiIcon_orange}`}>
            <Icon icon="mdi:calendar-alert" aria-hidden />
          </div>
          <div className={layout.kpiBody}>
            <span className={layout.kpiValue}>{expiringSoon}</span>
            <span className={layout.kpiLabel}>{copy.expiringSoonCount}</span>
          </div>
        </div>
      </div>
      <section className={portalStyles.panel}>
        <div className={portalStyles.panelHeader}>
          <span className={portalStyles.panelTitle}>{copy.domainsTitle}</span>
          <span className={portalStyles.panelCount}>{items.length}</span>
        </div>
        <ServiceTable
          emptyLabel={copy.noItems}
          columns={[
            { key: "domain", label: copy.domain, render: row => row.details?.domain || row.name },
            { key: "registrar", label: copy.registrar, render: row => row.details?.registrar || "—" },
            { key: "role", label: copy.tableRole, render: row => row.details?.role || "—" },
            { key: "renew", label: copy.tableRenewal, render: row => row.details?.autoRenew == null ? "—" : row.details.autoRenew ? copy.autoRenewYes : copy.autoRenewNo },
            { key: "expiration", label: copy.tableExpiration, render: row => <ExpirationBadge dateValue={row.expiration} copy={copy} formatDate={formatDate} /> },
            { key: "status", label: copy.tableStatus, render: row => <StatusBadge active={row.active} copy={copy} /> }
          ]}
          rows={items}
        />
      </section>
    </>
  );
}

function GenericServiceView({ items, copy, formatDate, title }) {
  return (
    <section className={portalStyles.panel}>
      <div className={portalStyles.panelHeader}>
        <span className={portalStyles.panelTitle}>{title}</span>
        <span className={portalStyles.panelCount}>{items.length}</span>
      </div>
      <ServiceTable
        emptyLabel={copy.noItems}
        columns={[
          { key: "name", label: copy.tableService, render: row => row.name },
          { key: "product", label: copy.tableProduct, render: row => row.product || "—" },
          { key: "licenses", label: copy.tableLicenses, render: row => {
            if (row.licensesUsed != null && row.licensesTotal != null) {
              return interpolate(copy.licensesSummary, { used: String(row.licensesUsed), total: String(row.licensesTotal) });
            }
            if (row.licensesTotal != null) return String(row.licensesTotal);
            return "—";
          } },
          { key: "expiration", label: copy.tableExpiration, render: row => <ExpirationBadge dateValue={row.expiration} copy={copy} formatDate={formatDate} /> },
          { key: "status", label: copy.tableStatus, render: row => <StatusBadge active={row.active} copy={copy} /> }
        ]}
        rows={items}
      />
    </section>
  );
}

export default function ClientServicesDetailView({ cloudServices = [] }) {
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.services;
  const groups = useMemo(
    () => (cloudServices || []).filter(group => group?.items?.length > 0 && group.type !== "antivirus" && group.type !== "antispam"),
    [cloudServices]
  );
  const [activeType, setActiveType] = useState(null);
  const resolvedType = activeType && groups.some(group => group.type === activeType)
    ? activeType
    : groups[0]?.type || null;
  const activeGroup = groups.find(group => group.type === resolvedType) || null;
  const serviceTabs = useMemo(
    () => groups.map(group => ({
      key: group.type,
      label: group.label,
      icon: group.icon,
      count: group.items.length
    })),
    [groups]
  );

  if (!groups.length) {
    return (
      <div className={portalStyles.emptyState}>
        <Icon icon="mdi:cloud-off-outline" className={portalStyles.emptyStateIcon} aria-hidden />
        <p className={portalStyles.emptyStateTitle}>{t.emptyTitle}</p>
        <p className={portalStyles.empty}>{t.emptyDesc}</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <PortalTabBar
        items={serviceTabs}
        activeKey={resolvedType}
        onChange={setActiveType}
        ariaLabel={t.filterByType}
      />

      {activeGroup?.type === "o365" ? (
        <ClientPortalTenantView items={activeGroup.items} copy={t} />
      ) : activeGroup?.type === "save" ? (
        <BackupView items={activeGroup.items} copy={t} formatDate={copy.formatPortalDate} />
      ) : activeGroup?.type === "ndd" ? (
        <DomainsView items={activeGroup.items} copy={t} formatDate={copy.formatPortalDate} />
      ) : activeGroup ? (
        <GenericServiceView items={activeGroup.items} copy={t} formatDate={copy.formatPortalDate} title={activeGroup.label} />
      ) : null}
    </div>
  );
}
