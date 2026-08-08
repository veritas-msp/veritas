import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { ANTIVIRUS_OVERVIEW_GROUPS, ANTIVIRUS_OVERVIEW_SECTIONS } from "./antivirusOverviewSections";
import { fetchGravityZoneDashboard, fetchBitdefenderStatistics, fetchBitdefenderEnrichedEndpoints } from "../../api/clientBitdefender";
import { syncAndPersistAntivirusSolution } from "./antivirusSolutionUtils";
import AntivirusOverviewCharts from "./AntivirusOverviewCharts";
import { showError, showSuccess } from "../../utils/toast";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./AntivirusOverviewModal.module.css";
import SolutionDetailPageLayout from "./SolutionDetailPageLayout";
import { KpiCard, StatsDashboardBody, StatsPanel, buildDistributionItems, statsDashboardStyles as dashStyles } from "./StatsDashboardWidgets";
function formatDate(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-GB");
  } catch {
    return String(value);
  }
}
function formatDateShort(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-GB");
  } catch {
    return String(value);
  }
}
function daysUntilExpiration(value) {
  if (!value) return null;
  const exp = new Date(value);
  if (Number.isNaN(exp.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
}
function LicenseExpirationNotice({
  expirationDate
}) {
  if (!expirationDate) return null;
  const daysLeft = daysUntilExpiration(expirationDate);
  let bannerClass = styles.licenseExpirationBanner;
  let icon = "mdi:calendar-clock";
  let message = `Licenses valid until ${formatDateShort(expirationDate)}.`;
  if (daysLeft != null && daysLeft < 0) {
    bannerClass = `${styles.licenseExpirationBanner} ${styles.licenseExpirationBannerDanger}`;
    icon = "mdi:alert-circle-outline";
    message = `Licenses expired on ${formatDateShort(expirationDate)}.`;
  } else if (daysLeft != null && daysLeft <= 30) {
    bannerClass = `${styles.licenseExpirationBanner} ${styles.licenseExpirationBannerWarn}`;
    icon = "mdi:alert-outline";
    message = `Expires on ${formatDateShort(expirationDate)} · ${daysLeft} day${daysLeft > 1 ? "s" : ""} remaining.`;
  }
  return <div className={bannerClass}>
      <Icon icon={icon} aria-hidden />
      <span>{message}</span>
    </div>;
}
function resolveApiDisplayStatus(status, preview = false) {
  if (!preview) return status;
  if (status === "error") return "preview";
  return status;
}
function StatusPill({
  status,
  preview = false,
  compact = false
}) {
  const resolved = resolveApiDisplayStatus(status, preview);
  const map = {
    ok: {
      className: styles.statusOk,
      label: "OK",
      icon: "mdi:check-circle"
    },
    empty: {
      className: styles.statusEmpty,
      label: "Empty",
      icon: "mdi:minus-circle-outline"
    },
    error: {
      className: styles.statusError,
      label: "Error",
      icon: "mdi:close-circle"
    },
    permission_denied: {
      className: styles.statusDenied,
      label: compact ? "API key" : "Unauthorized",
      icon: "mdi:lock-outline"
    },
    info: {
      className: styles.statusInfo,
      label: "Info",
      icon: "mdi:information-outline"
    },
    preview: {
      className: styles.statusPreview,
      label: compact ? "Disabled" : "Preview",
      icon: "mdi:dots-horizontal-circle-outline"
    }
  };
  const meta = map[resolved] || map.info;
  return <span className={`${styles.statusPill} ${compact ? styles.statusPillCompact : ""} ${meta.className}`}>
      {!compact ? <Icon icon={meta.icon} aria-hidden /> : null}
      {meta.label}
    </span>;
}
function SectionError({
  error
}) {
  if (!error) return null;
  return <div className={styles.errorBox}>{error}</div>;
}
function DataTable({
  columns,
  rows,
  emptyLabel = "No data"
}) {
  if (!rows?.length) {
    return <div className={styles.emptyState}>{emptyLabel}</div>;
  }
  return <div className={styles.tableScroll}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            {columns.map(col => <th key={col.key}>{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => <tr key={row.id || `${index}`}>
              {columns.map(col => <td key={col.key} className={col.mono ? styles.mono : undefined}>
                  {col.render ? col.render(row) : row[col.key] ?? "-"}
                </td>)}
            </tr>)}
        </tbody>
      </table>
    </div>;
}
function renderListSection(section, {
  preview = false
} = {}) {
  if (!section) return <div className={styles.emptyState}>Section unavailable</div>;
  return <>
      {preview ? <div className={styles.previewBanner}>
          <Icon icon="mdi:flask-outline" aria-hidden />
          <span>
            API enabled for your GravityZone key but not yet integrated with Veritas. Data
            displayed read-only from GravityZone.
          </span>
        </div> : null}
      <SectionError error={section.error} />
      <div style={{
      marginBottom: "0.75rem"
    }}>
        <StatusPill status={section.status} />
        {section.total != null ? <span style={{
        marginLeft: "0.5rem",
        fontSize: "0.78rem",
        color: "var(--msp-muted)"
      }}>
            {section.total} item{section.total > 1 ? "s" : ""}
          </span> : null}
      </div>
      <DataTable columns={section.columns} rows={section.items} emptyLabel={section.status === "permission_denied" ? "Access denied · enable this API for the GravityZone key" : "No data returned"} />
    </>;
}
export function AntivirusOverviewPanel({
  active = true,
  client,
  antivirusItem,
  onClose,
  onSynced,
  asPage = false,
  onBack,
  backLabel = "Back"
}) {
  const [activeSection, setActiveSection] = useState("overview");
  const [patchTab, setPatchTab] = useState("missing");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [enrichedSummary, setEnrichedSummary] = useState(null);
  const [lastPersistedAt, setLastPersistedAt] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const credentialContext = useMemo(() => ({
    clientId: client?.id,
    bitdefenderTenantId: antivirusItem?.bitdefenderTenantId,
    mappingMode: antivirusItem?.mappingMode || "reseller"
  }), [client?.id, antivirusItem]);
  const companyId = antivirusItem?.companyId;
  const loadDashboard = useCallback(async ({
    persist = false
  } = {}) => {
    if (!companyId) return;
    setLoading(true);
    setLoadError(null);
    try {
      if (persist && client?.id) {
        const persisted = await syncAndPersistAntivirusSolution(client.id, antivirusItem);
        await onSynced?.();
        showSuccess("Antivirus data refreshed and saved.");
        if (persisted.dashboard) setDashboard(persisted.dashboard);
        setStatistics(persisted.statistics || null);
        setEnrichedSummary(persisted.enrichedSummary || null);
        setLastPersistedAt(persisted.updatedPayload?.syncData?.lastSync || new Date().toISOString());
        return;
      }
      const [dashboardData, statisticsRes, enrichedRes] = await Promise.all([fetchGravityZoneDashboard(companyId, credentialContext), fetchBitdefenderStatistics(companyId, credentialContext).catch(() => null), fetchBitdefenderEnrichedEndpoints(companyId, credentialContext).catch(() => null)]);
      setDashboard(dashboardData);
      setStatistics(statisticsRes?.statistics || antivirusItem?.syncData?.statistics || null);
      setEnrichedSummary(enrichedRes?.summary || antivirusItem?.syncData?.enrichedSummary || null);
      setLastPersistedAt(antivirusItem?.syncData?.lastSync || null);
    } catch (err) {
      setLoadError(err.message);
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, credentialContext, client?.id, antivirusItem, onSynced]);
  useEffect(() => {
    if (active && companyId) {
      setActiveSection("overview");
      setPatchTab("missing");
      const cached = antivirusItem?.syncData;
      if (cached?.dashboard) setDashboard(cached.dashboard);
      if (cached?.statistics) setStatistics(cached.statistics);
      if (cached?.enrichedSummary) setEnrichedSummary(cached.enrichedSummary);
      if (cached?.lastSync) setLastPersistedAt(cached.lastSync);
      loadDashboard();
    }
  }, [active, companyId, loadDashboard, antivirusItem?.syncData]);
  const sections = dashboard?.sections || {};
  const companyName = sections.company?.data?.name || antivirusItem?.companyName || antivirusItem?.nom || antivirusItem?.name || "GravityZone";
  const sectionViews = useMemo(() => {
    const endpoints = sections.endpoints;
    const policies = sections.policies;
    const reports = sections.reports;
    return {
      endpoints: endpoints ? {
        ...endpoints,
        columns: [{
          key: "name",
          label: "Poste"
        }, {
          key: "type",
          label: "Type"
        }, {
          key: "os",
          label: "OS"
        }, {
          key: "ip",
          label: "IP"
        }, {
          key: "isManaged",
          label: "Managed",
          render: row => row.isManaged ? "Yes" : "No"
        }]
      } : null,
      policies: policies ? {
        ...policies,
        columns: [{
          key: "name",
          label: "Politique"
        }, {
          key: "id",
          label: "ID",
          mono: true
        }]
      } : null,
      reports: reports ? {
        ...reports,
        columns: [{
          key: "name",
          label: "Report"
        }, {
          key: "type",
          label: "Type"
        }, {
          key: "lastRun",
          label: "Last run",
          render: r => formatDate(r.lastRun)
        }]
      } : null,
      incidents: sections.incidents ? {
        ...sections.incidents,
        columns: [{
          key: "name",
          label: "Menace / incident"
        }, {
          key: "severity",
          label: "Severity"
        }, {
          key: "status",
          label: "Status"
        }, {
          key: "endpoint",
          label: "Poste"
        }, {
          key: "detectedAt",
          label: "Detected",
          render: r => formatDate(r.detectedAt)
        }]
      } : null,
      quarantine: sections.quarantine ? {
        ...sections.quarantine,
        columns: [{
          key: "fileName",
          label: "File"
        }, {
          key: "threat",
          label: "Menace"
        }, {
          key: "endpoint",
          label: "Poste"
        }, {
          key: "quarantinedAt",
          label: "Date",
          render: r => formatDate(r.quarantinedAt)
        }]
      } : null,
      phasr: sections.phasr ? {
        ...sections.phasr,
        columns: [{
          key: "name",
          label: "Recommandation"
        }, {
          key: "severity",
          label: "Risque"
        }, {
          key: "status",
          label: "Status"
        }, {
          key: "resource",
          label: "Ressource"
        }]
      } : null,
      packages: sections.packages ? {
        ...sections.packages,
        columns: [{
          key: "name",
          label: "Package"
        }, {
          key: "type",
          label: "Type"
        }, {
          key: "os",
          label: "OS"
        }, {
          key: "id",
          label: "ID",
          mono: true
        }]
      } : null,
      maintenance: sections.maintenance ? {
        ...sections.maintenance,
        columns: [{
          key: "name",
          label: "Window"
        }, {
          key: "type",
          label: "Type"
        }, {
          key: "schedule",
          label: "Planification"
        }, {
          key: "enabled",
          label: "Active",
          render: r => r.enabled === true ? "Yes" : r.enabled === false ? "No" : "-"
        }]
      } : null,
      blocklist: sections.blocklist ? {
        ...sections.blocklist,
        columns: [{
          key: "fileName",
          label: "File"
        }, {
          key: "hash",
          label: "Hash",
          mono: true
        }, {
          key: "source",
          label: "Source"
        }]
      } : null
    };
  }, [sections]);
  const renderOverview = () => {
    const license = sections.license?.data;
    const licenseExpiration = license?.expirationDate || antivirusItem?.expiration || antivirusItem?.syncData?.license?.expirationDate;
    const endpoints = sections.endpoints;
    const apiRows = [{
      name: "Companies & accounts",
      exploited: true,
      status: sections.company?.status
    }, {
      name: "Network (workstations)",
      exploited: true,
      status: endpoints?.status
    }, {
      name: "Licenses",
      exploited: true,
      status: sections.license?.status
    }, {
      name: "Politiques",
      exploited: true,
      status: sections.policies?.status
    }, {
      name: "Reports",
      exploited: true,
      status: sections.reports?.status
    }, {
      name: "Incidents",
      exploited: false,
      status: sections.incidents?.status
    }, {
      name: "Quarantaine",
      exploited: false,
      status: sections.quarantine?.status
    }, {
      name: "Patch Management",
      exploited: false,
      status: sections.patchManagement?.missing?.status
    }, {
      name: "PHASR",
      exploited: false,
      status: sections.phasr?.status
    }, {
      name: "Investigation",
      exploited: false,
      status: sections.investigation?.status || "info"
    }, {
      name: "Event Push Service",
      exploited: false,
      status: sections.push?.settings?.status
    }, {
      name: "Packages",
      exploited: false,
      status: sections.packages?.status
    }, {
      name: "Integrations",
      exploited: false,
      status: sections.integrations?.status
    }, {
      name: "Maintenance windows",
      exploited: false,
      status: sections.maintenance?.status
    }, {
      name: "Blocklist EDR",
      exploited: false,
      status: sections.blocklist?.status
    }];
    const exploitedRows = apiRows.filter(row => row.exploited);
    const previewRows = apiRows.filter(row => !row.exploited);
    const renderApiGroup = (title, rows) => <>
        <h5 className={styles.apiMatrixGroupTitle}>{title}</h5>
        <div className={styles.apiMatrix}>
          {rows.map(row => <div key={row.name} className={styles.apiMatrixRow} title={row.status === "permission_denied" ? "Enable the API on the GravityZone key" : row.status === "empty" ? "No data" : row.status === "error" && !row.exploited ? "API not enabled on this key or not available on this tenant" : undefined}>
              <span className={styles.apiMatrixName}>{row.name}</span>
              <StatusPill status={row.status} preview={!row.exploited} compact />
            </div>)}
        </div>
      </>;
    if (asPage) {
      const okApis = apiRows.filter(row => row.status === "ok").length;
      const licenseUsagePct = license?.used != null && license?.total ? Math.round(license.used / license.total * 100) : null;
      const syncLabel = lastPersistedAt ? `Last backup: ${formatDate(lastPersistedAt)}` : "Not saved locally";
      const endpointTypeDistribution = buildDistributionItems([{
        name: "Physiques",
        count: statistics?.endpoints?.byType?.physical || 0
      }, {
        name: "Virtuels",
        count: statistics?.endpoints?.byType?.virtual || 0
      }, {
        name: "Autres",
        count: statistics?.endpoints?.byType?.other || 0
      }]);
      return <StatsDashboardBody>
          <StatsPanel title={companyName} icon="simple-icons:bitdefender">
            <p className={dashStyles.panelDesc}>
              GravityZone company linked to {client?.name}. Last API read:{" "}
              {formatDate(dashboard?.fetchedAt)} · {syncLabel}
            </p>
          </StatsPanel>

          <LicenseExpirationNotice expirationDate={licenseExpiration} />

          <section className={dashStyles.kpiGrid}>
            <KpiCard icon="mdi:desktop-classic" label="Inventoried workstations" value={endpoints?.total ?? "-"} sub={`${sections.policies?.total ?? 0} politique(s) actives`} />
            <KpiCard icon="mdi:license" label="Licenses" value={license?.used != null && license?.total != null ? `${license.used}/${license.total}` : "-"} sub={licenseUsagePct != null ? `${licenseUsagePct}% used` : "License consumption"} tone={licenseUsagePct == null ? "neutral" : licenseUsagePct >= 95 ? "bad" : licenseUsagePct >= 80 ? "warn" : "good"} />
            <KpiCard icon="mdi:calendar-clock" label="License expiration" value={formatDateShort(licenseExpiration)} sub={mappingLabel} />
            <KpiCard icon="mdi:shield-alert-outline" label="Incidents" value={sections.incidents?.total ?? 0} sub="GravityZone overview" tone={(sections.incidents?.total ?? 0) > 0 ? "warn" : "good"} />
            <KpiCard icon="mdi:api" label="Operational APIs" value={`${okApis}/${apiRows.length}`} sub={`${exploitedRows.length} integrated · ${previewRows.length} in preview`} tone={okApis >= exploitedRows.length ? "good" : "warn"} />
            <KpiCard icon="mdi:heart-pulse" label="Endpoint health" value={enrichedSummary?.total ? `${Math.max(0, enrichedSummary.total - (enrichedSummary.infected || 0))}/${enrichedSummary.total}` : "-"} sub={enrichedSummary?.infected ? `${enrichedSummary.infected} infected` : "Analyse malware"} tone={enrichedSummary?.infected ? "bad" : "good"} />
          </section>

          <AntivirusOverviewCharts variant="fleet" statistics={statistics} enrichedSummary={enrichedSummary} incidents={sections.incidents} />

          <section className={dashStyles.columns}>
            <StatsPanel title="APIs integrated in Veritas" icon="mdi:check-decagram-outline">
              <ul className={dashStyles.metricList}>
                {exploitedRows.map(row => <li key={row.name}>
                    <span>{row.name}</span>
                    <StatusPill status={row.status} compact />
                  </li>)}
              </ul>
            </StatsPanel>
            <StatsPanel title="APIs available in preview" icon="mdi:flask-outline">
              <ul className={dashStyles.metricList}>
                {previewRows.map(row => <li key={row.name}>
                    <span>{row.name}</span>
                    <StatusPill status={row.status} preview compact />
                  </li>)}
              </ul>
            </StatsPanel>
          </section>

          {endpointTypeDistribution.total > 0 ? <section className={dashStyles.chartBarGrid}>
              <StatsPanel title="Types de postes" icon="mdi:desktop-tower-monitor">
                <ul className={dashStyles.metricList}>
                  {endpointTypeDistribution.items.map(item => <li key={item.name}>
                      <span>{item.name}</span>
                      <strong>
                        {item.count} ({item.pct}%)
                      </strong>
                    </li>)}
                </ul>
              </StatsPanel>
            </section> : null}
        </StatsDashboardBody>;
    }
    return <>
        <div className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{companyName}</h3>
          <p className={formStyles.sectionDesc}>
            GravityZone company linked to {client?.name}. Last API read:{" "}
            {formatDate(dashboard?.fetchedAt)}
            {lastPersistedAt ? <>
                {" "}
                · Last saved: {formatDate(lastPersistedAt)}
              </> : null}
            .
          </p>
        </div>

        <LicenseExpirationNotice expirationDate={licenseExpiration} />

        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{endpoints?.total ?? "-"}</div>
            <div className={styles.kpiLabel}>Inventoried workstations</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>
              {license?.used != null && license?.total != null ? `${license.used}/${license.total}` : "-"}
            </div>
            <div className={styles.kpiLabel}>Used licenses</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={`${styles.kpiValue} ${styles.kpiValueSmall}`}>
              {formatDateShort(licenseExpiration)}
            </div>
            <div className={styles.kpiLabel}>License expiration</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{sections.policies?.total ?? "-"}</div>
            <div className={styles.kpiLabel}>Politiques</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{sections.incidents?.total ?? "-"}</div>
            <div className={styles.kpiLabel}>Incidents (preview)</div>
          </div>
        </div>

        <AntivirusOverviewCharts statistics={statistics} enrichedSummary={enrichedSummary} incidents={sections.incidents} />

        <h4 className={styles.apiMatrixTitle}>GravityZone API status</h4>
        {renderApiGroup("Integrated in Veritas", exploitedRows)}
        {renderApiGroup("Available in preview", previewRows)}
      </>;
  };
  const renderLicense = () => {
    const license = sections.license;
    if (license?.status === "error" || license?.status === "permission_denied") {
      return <>
          <SectionError error={license?.error} />
          <div className={styles.emptyState}>License inaccessible</div>
        </>;
    }
    const data = license?.data;
    const expirationDate = data?.expirationDate || antivirusItem?.expiration || antivirusItem?.syncData?.license?.expirationDate;
    if (!data) {
      return <>
          <SectionError error={license?.error} />
          <div className={styles.emptyState}>No license information</div>
        </>;
    }
    return <>
        <LicenseExpirationNotice expirationDate={expirationDate} />
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{data.total ?? "-"}</div>
            <div className={styles.kpiLabel}>Total licenses</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{data.used ?? "-"}</div>
            <div className={styles.kpiLabel}>Used licenses</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={`${styles.kpiValue} ${styles.kpiValueSmall}`}>
              {formatDateShort(expirationDate)}
            </div>
            <div className={styles.kpiLabel}>Date d'expiration</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>
              {data.total != null && data.used != null ? data.total - data.used : "-"}
            </div>
            <div className={styles.kpiLabel}>Available licenses</div>
          </div>
        </div>
      </>;
  };
  const renderPatch = () => {
    const patch = sections.patchManagement;
    const active = patchTab === "missing" ? patch?.missing : patch?.installed;
    const columns = patchTab === "missing" ? [{
      key: "name",
      label: "Patch"
    }, {
      key: "severity",
      label: "Severity"
    }, {
      key: "product",
      label: "Produit"
    }, {
      key: "endpoint",
      label: "Poste"
    }] : [{
      key: "name",
      label: "Patch"
    }, {
      key: "installedAt",
      label: "Installed on",
      render: r => formatDate(r.installedAt)
    }, {
      key: "endpoint",
      label: "Poste"
    }];
    return <>
        <div className={styles.previewBanner}>
          <Icon icon="mdi:flask-outline" aria-hidden />
          <span>Patch Management · live preview (not persisted in Veritas).</span>
        </div>
        <div className={styles.subTabs}>
          <button type="button" className={`${styles.subTab} ${patchTab === "missing" ? styles.subTabActive : ""}`} onClick={() => setPatchTab("missing")}>
            Manquants ({patch?.missing?.total ?? 0})
          </button>
          <button type="button" className={`${styles.subTab} ${patchTab === "installed" ? styles.subTabActive : ""}`} onClick={() => setPatchTab("installed")}>
            Installed ({patch?.installed?.total ?? 0})
          </button>
        </div>
        {renderListSection({
        ...active,
        columns
      }, {
        preview: true
      })}
      </>;
  };
  const renderInvestigation = () => <>
      <div className={styles.previewBanner}>
        <Icon icon="mdi:flask-outline" aria-hidden />
        <span>{sections.investigation?.message}</span>
      </div>
      <p className={formStyles.sectionDesc}>Available API methods:</p>
      <ul className={styles.apiMatrix} style={{
      listStyle: "none",
      padding: 0
    }}>
        {(sections.investigation?.methods || []).map(method => <li key={method} className={styles.apiMatrixRow}>
            <span className={styles.mono}>{method}</span>
          </li>)}
      </ul>
    </>;
  const renderPush = () => {
    const push = sections.push;
    return <>
        <div className={styles.previewBanner}>
          <Icon icon="mdi:flask-outline" aria-hidden />
          <span>Event Push Service · configuration et statistiques de push.</span>
        </div>
        <h4 className={formStyles.sectionTitle} style={{
        fontSize: "0.9rem"
      }}>
          Settings
        </h4>
        <StatusPill status={push?.settings?.status} />
        {push?.settings?.error ? <SectionError error={push.settings.error} /> : null}
        {push?.settings?.data ? <pre className={styles.jsonPreview}>{JSON.stringify(push.settings.data, null, 2)}</pre> : <div className={styles.emptyState}>No push settings</div>}
        <h4 className={formStyles.sectionTitle} style={{
        fontSize: "0.9rem",
        marginTop: "1rem"
      }}>
          Statistics
        </h4>
        <StatusPill status={push?.stats?.status} />
        {push?.stats?.data ? <pre className={styles.jsonPreview}>{JSON.stringify(push.stats.data, null, 2)}</pre> : <div className={styles.emptyState}>No statistics</div>}
      </>;
  };
  const renderIntegrations = () => {
    const integrations = sections.integrations;
    return <>
        <div className={styles.previewBanner}>
          <Icon icon="mdi:flask-outline" aria-hidden />
          <span>Third-party integrations (e.g. Amazon EC2) · API preview.</span>
        </div>
        <StatusPill status={integrations?.status} />
        <SectionError error={integrations?.error} />
        {integrations?.hint ? <p className={formStyles.sectionDesc}>{integrations.hint}</p> : null}
        {integrations?.data ? <pre className={styles.jsonPreview}>{JSON.stringify(integrations.data, null, 2)}</pre> : <div className={styles.emptyState}>No configured or accessible integration</div>}
      </>;
  };
  const renderSectionContent = () => {
    if (!asPage && loading) {
      return <div className={styles.loadingBlock}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          Loading GravityZone data…
        </div>;
    }
    if (loadError) {
      return <SectionError error={loadError} />;
    }
    let content;
    switch (activeSection) {
      case "overview":
        content = renderOverview();
        break;
      case "endpoints":
        content = renderListSection(sectionViews.endpoints);
        break;
      case "license":
        content = renderLicense();
        break;
      case "policies":
        content = renderListSection(sectionViews.policies);
        break;
      case "reports":
        content = renderListSection(sectionViews.reports);
        break;
      case "incidents":
        content = renderListSection(sectionViews.incidents, {
          preview: true
        });
        break;
      case "quarantine":
        content = renderListSection(sectionViews.quarantine, {
          preview: true
        });
        break;
      case "patch":
        content = renderPatch();
        break;
      case "phasr":
        content = renderListSection(sectionViews.phasr, {
          preview: true
        });
        break;
      case "investigation":
        content = renderInvestigation();
        break;
      case "push":
        content = renderPush();
        break;
      case "packages":
        content = renderListSection(sectionViews.packages, {
          preview: true
        });
        break;
      case "integrations":
        content = renderIntegrations();
        break;
      case "maintenance":
        content = renderListSection(sectionViews.maintenance, {
          preview: true
        });
        break;
      case "blocklist":
        content = renderListSection(sectionViews.blocklist, {
          preview: true
        });
        break;
      default:
        content = renderOverview();
    }
    if (asPage && activeSection !== "overview") {
      return <StatsDashboardBody>
          <StatsPanel>{content}</StatsPanel>
        </StatsDashboardBody>;
    }
    return content;
  };
  const navEntries = useMemo(() => {
    const entries = [];
    let prevGroup = null;
    ANTIVIRUS_OVERVIEW_SECTIONS.forEach(section => {
      if (section.group !== prevGroup) {
        const group = ANTIVIRUS_OVERVIEW_GROUPS.find(g => g.id === section.group);
        entries.push({
          type: "group",
          key: `group-${section.group}`,
          label: group?.label
        });
        prevGroup = section.group;
      }
      entries.push({
        type: "section",
        key: section.id,
        section
      });
    });
    return entries;
  }, []);
  if (!active || !antivirusItem?.companyId) return null;
  const mappingLabel = antivirusItem.mappingMode === "dedicated" ? "Dedicated tenant" : "Global tenant";
  if (asPage) {
    return <SolutionDetailPageLayout accent="gravityzone" eyebrow="Cybersecurity · GravityZone" title={`Antivirus · ${companyName}`} titleIcon="simple-icons:bitdefender" subtitle={client?.name} backLabel={backLabel} onBack={onBack} loading={loading} loadingMessage="Loading GravityZone data…" onRefresh={() => loadDashboard()} footerHint={mappingLabel} onRefreshSave={() => loadDashboard({
      persist: true
    })} refreshSaveLabel="Refresh and save" navEntries={navEntries} activeSection={activeSection} onSectionChange={setActiveSection} navAriaLabel="GravityZone sections">
        {renderSectionContent()}
      </SolutionDetailPageLayout>;
  }
  const shell = <div className={`${formStyles.shell} ${styles.shellWide}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="antivirus-overview-title">
      <div className={styles.accentBarGravityZone} aria-hidden />
      <header className={formStyles.header}>
        <div className={formStyles.headerMain}>
          <div className={`${formStyles.headerIconWrap} ${styles.headerIconGravityZone}`} aria-hidden>
            <Icon icon="simple-icons:bitdefender" />
          </div>
          <div className={formStyles.headerText}>
            <p className={formStyles.eyebrow}>Cybersecurity · GravityZone</p>
            <h2 className={formStyles.title} id="antivirus-overview-title">
              Antivirus · {companyName}
            </h2>
            <p className={formStyles.subtitle}>{client?.name}</p>
          </div>
        </div>
        {!asPage ? <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={loading} aria-label="Close">
            <FaTimes />
          </button> : null}
      </header>

      <div className={formStyles.body}>
        <nav className={formStyles.nav} aria-label="Sections GravityZone">
          {navEntries.map(entry => entry.type === "group" ? <div key={entry.key} className={styles.navGroupLabel}>
                {entry.label}
              </div> : <button key={entry.key} type="button" className={`${formStyles.navItem} ${activeSection === entry.section.id ? formStyles.navItemActive : ""}`} onClick={() => setActiveSection(entry.section.id)} aria-current={activeSection === entry.section.id ? "step" : undefined}>
                <Icon icon={entry.section.icon} className={formStyles.navItemIcon} aria-hidden />
                <span className={formStyles.navItemText}>
                  <span className={formStyles.navItemLabel}>{entry.section.label}</span>
                  <span className={formStyles.navItemHint}>{entry.section.description}</span>
                </span>
              </button>)}
        </nav>

        <div className={formStyles.content}>{renderSectionContent()}</div>
      </div>

      <footer className={formStyles.footer}>
        <span className={formStyles.footerHint}>{mappingLabel}</span>
        <div className={formStyles.footerActions}>
          <button type="button" className={formStyles.primaryBtn} onClick={() => loadDashboard({
          persist: true
        })} disabled={loading}>
            <Icon icon={loading ? "mdi:loading" : "mdi:refresh"} className={loading ? formStyles.spinning : ""} aria-hidden />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </footer>
    </div>;
  return createPortal(<div className={formStyles.overlay} onClick={loading ? undefined : onClose} role="presentation">
      {shell}
    </div>, document.getElementById("modal-root") || document.body);
}
export default function AntivirusOverviewModal(props) {
  return <AntivirusOverviewPanel {...props} active={props.open} />;
}
