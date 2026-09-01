import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { ANTIVIRUS_OVERVIEW_SECTIONS } from "./antivirusOverviewSections";
import { fetchGravityZoneDashboard, fetchBitdefenderStatistics, fetchBitdefenderEnrichedEndpoints } from "../../api/clientBitdefender";
import { formatAntivirusEndpointType, syncAndPersistAntivirusSolution } from "./antivirusSolutionUtils";
import AntivirusOverviewCharts from "./AntivirusOverviewCharts";
import { showError, showSuccess } from "../../utils/toast";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./AntivirusOverviewModal.module.css";
import SolutionDetailPageLayout from "./SolutionDetailPageLayout";
import { KpiCard, StatsDashboardBody, StatsPanel, statsDashboardStyles as dashStyles } from "./StatsDashboardWidgets";
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
function collectPolicyUsage(endpoints = []) {
  const list = Array.isArray(endpoints) ? endpoints : Array.isArray(endpoints?.endpoints) ? endpoints.endpoints : [];
  const byId = new Map();
  for (const ep of list) {
    const policyId = ep?.policy?.id;
    if (policyId == null) continue;
    const key = String(policyId);
    const current = byId.get(key) || {
      count: 0,
      applied: 0
    };
    current.count += 1;
    if (ep.policy?.applied) current.applied += 1;
    byId.set(key, current);
  }
  return byId;
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
  emptyLabel = "No data",
  fillHeight = false
}) {
  if (!rows?.length) {
    return <div className={fillHeight ? styles.tableScrollFill : undefined}>
        <div className={styles.emptyState}>{emptyLabel}</div>
      </div>;
  }
  return <div className={fillHeight ? styles.tableScrollFill : styles.tableScroll}>
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
  preview = false,
  fillHeight = false
} = {}) {
  if (!section) return <div className={styles.emptyState}>Section unavailable</div>;
  return <div className={fillHeight ? styles.listSectionFill : undefined}>
      {preview ? <div className={styles.previewBanner}>
          <Icon icon="mdi:flask-outline" aria-hidden />
          <span>
            API enabled for your GravityZone key but not yet integrated with Veritas. Data
            displayed read-only from GravityZone.
          </span>
        </div> : null}
      <SectionError error={section.error} />
      <div className={styles.listSectionMeta}>
        <StatusPill status={section.status} />
        {section.total != null ? <span className={styles.listSectionCount}>
            {section.total} item{section.total > 1 ? "s" : ""}
          </span> : null}
      </div>
      <DataTable columns={section.columns} rows={section.items} emptyLabel={section.status === "permission_denied" ? "Access denied · enable this API for the GravityZone key" : "No data returned"} fillHeight={fillHeight} />
    </div>;
}
export function AntivirusOverviewPanel({
  active = true,
  client,
  antivirusItem,
  onClose,
  onSynced,
  asPage = false,
  onNavigate,
  cachedOnly = false,
  embed = false,
  embedded = false,
  activeSection: controlledSection,
  onSectionChange
}) {
  const [internalSection, setInternalSection] = useState("overview");
  const activeSection = controlledSection ?? internalSection;
  const setActiveSection = onSectionChange || setInternalSection;
  const cachedSync = antivirusItem?.syncData;
  const [loading, setLoading] = useState(() => !cachedSync?.dashboard);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(() => cachedSync?.dashboard || null);
  const [statistics, setStatistics] = useState(() => cachedSync?.statistics || null);
  const [enrichedSummary, setEnrichedSummary] = useState(() => cachedSync?.enrichedSummary || null);
  const [enrichedEndpoints, setEnrichedEndpoints] = useState(() => cachedSync?.enrichedEndpoints || null);
  const [lastPersistedAt, setLastPersistedAt] = useState(() => cachedSync?.lastSync || null);
  const [loadError, setLoadError] = useState(null);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);
  const dashboardRef = useRef(cachedSync?.dashboard || null);
  const loadedKeyRef = useRef(null);
  const antivirusItemRef = useRef(antivirusItem);
  const onSyncedRef = useRef(onSynced);
  antivirusItemRef.current = antivirusItem;
  onSyncedRef.current = onSynced;
  const companyId = antivirusItem?.companyId;
  const clientId = client?.id;
  const tenantId = antivirusItem?.bitdefenderTenantId || null;
  const mappingMode = antivirusItem?.mappingMode || "reseller";
  const credentialContext = useMemo(() => ({
    clientId,
    bitdefenderTenantId: tenantId,
    mappingMode
  }), [clientId, tenantId, mappingMode]);
  const loadDashboard = useCallback(async ({
    persist = false
  } = {}) => {
    if (!companyId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    const item = antivirusItemRef.current;
    const hasContent = Boolean(dashboardRef.current || item?.syncData?.dashboard);
    if (hasContent) setRefreshing(true);else setLoading(true);
    setLoadError(null);
    try {
      const signal = controller.signal;
      if (persist && clientId) {
        const persisted = await syncAndPersistAntivirusSolution(clientId, item, {
          signal
        });
        if (signal.aborted || requestId !== requestIdRef.current) return;
        await onSyncedRef.current?.();
        if (signal.aborted || requestId !== requestIdRef.current) return;
        showSuccess("Antivirus data refreshed and saved.");
        if (persisted.dashboard) {
          dashboardRef.current = persisted.dashboard;
          setDashboard(persisted.dashboard);
        }
        setStatistics(persisted.statistics || null);
        setEnrichedSummary(persisted.enrichedSummary || null);
        setEnrichedEndpoints(persisted.enrichedEndpoints || persisted.updatedPayload?.syncData?.enrichedEndpoints || null);
        setLastPersistedAt(persisted.updatedPayload?.syncData?.lastSync || new Date().toISOString());
        return;
      }
      const ignoreUnlessAbort = err => {
        if (err?.name === "AbortError") throw err;
        return null;
      };
      const [dashboardData, statisticsRes, enrichedRes] = await Promise.all([fetchGravityZoneDashboard(companyId, {
        ...credentialContext,
        signal
      }), fetchBitdefenderStatistics(companyId, {
        ...credentialContext,
        signal
      }).catch(ignoreUnlessAbort), fetchBitdefenderEnrichedEndpoints(companyId, {
        ...credentialContext,
        signal
      }).catch(ignoreUnlessAbort)]);
      if (signal.aborted || requestId !== requestIdRef.current) return;
      const latest = antivirusItemRef.current;
      dashboardRef.current = dashboardData;
      setDashboard(dashboardData);
      setStatistics(statisticsRes?.statistics || latest?.syncData?.statistics || null);
      setEnrichedSummary(enrichedRes?.summary || latest?.syncData?.enrichedSummary || null);
      setEnrichedEndpoints(enrichedRes?.endpoints || latest?.syncData?.enrichedEndpoints || null);
      setLastPersistedAt(latest?.syncData?.lastSync || null);
    } catch (err) {
      if (err?.name === "AbortError" || controller.signal.aborted || requestId !== requestIdRef.current) return;
      setLoadError(err.message);
      showError(err.message);
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, credentialContext, clientId]);
  useEffect(() => {
    if (controlledSection != null) return;
    setActiveSection("overview");
  }, [companyId, controlledSection, setActiveSection]);
  useEffect(() => {
    if (!active || !companyId) return undefined;
    const cached = antivirusItemRef.current?.syncData;
    if (cached?.dashboard) {
      dashboardRef.current = cached.dashboard;
      setDashboard(cached.dashboard);
    }
    if (cached?.statistics) setStatistics(cached.statistics);
    if (cached?.enrichedSummary) setEnrichedSummary(cached.enrichedSummary);
    if (cached?.enrichedEndpoints) setEnrichedEndpoints(cached.enrichedEndpoints);
    if (cached?.lastSync) setLastPersistedAt(cached.lastSync);
    if (cachedOnly) {
      setLoading(false);
      setRefreshing(false);
      return undefined;
    }
    const loadKey = `${companyId}:${tenantId || ""}:${mappingMode}`;
    if (loadedKeyRef.current === loadKey && dashboardRef.current) {
      setLoading(false);
      return undefined;
    }
    loadedKeyRef.current = loadKey;
    loadDashboard();
  }, [active, companyId, tenantId, mappingMode, cachedOnly, loadDashboard]);
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, [companyId]);
  const sections = dashboard?.sections || {};
  const companyName = sections.company?.data?.name || antivirusItem?.companyName || antivirusItem?.nom || antivirusItem?.name || "GravityZone";
  const sectionViews = useMemo(() => {
    const endpoints = sections.endpoints;
    const policies = sections.policies;
    const policyUsage = collectPolicyUsage(enrichedEndpoints);
    return {
      endpoints: endpoints ? {
        ...endpoints,
        columns: [{
          key: "name",
          label: "Poste"
        }, {
          key: "type",
          label: "Type",
          render: row => formatAntivirusEndpointType(row.type ?? row.machineType)
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
        items: (policies.items || []).map(policy => {
          const usage = policyUsage.get(String(policy.id));
          const workstations = usage?.count ?? policy.endpointsCount ?? 0;
          return {
            ...policy,
            workstations,
            appliedCount: usage?.applied ?? 0
          };
        }),
        columns: [{
          key: "name",
          label: "Politique",
          render: row => <span className={styles.policyNameCell}>
              <Icon icon="mdi:shield-account-outline" width={16} height={16} aria-hidden />
              {row.name || "-"}
            </span>
        }, {
          key: "workstations",
          label: "Workstations",
          render: row => row.workstations ?? 0
        }, {
          key: "appliedCount",
          label: "Applied",
          render: row => {
            const total = row.workstations ?? 0;
            const applied = row.appliedCount ?? 0;
            if (!total) return "0 / 0";
            return <span className={applied > 0 ? styles.appliedOk : styles.appliedIdle}>
                {applied} / {total}
              </span>;
          }
        }]
      } : null
    };
  }, [sections, enrichedEndpoints]);
  const renderOverview = () => {
    const license = sections.license?.data;
    const endpoints = sections.endpoints;
    const licenseUsagePct = license?.used != null && license?.total ? Math.round(license.used / license.total * 100) : null;
    const syncLabel = lastPersistedAt ? `Last backup: ${formatDate(lastPersistedAt)}` : "Not saved locally";
    if (asPage || embedded) {
      return <StatsDashboardBody>
          <StatsPanel title={companyName} icon="simple-icons:bitdefender">
            <p className={dashStyles.panelDesc}>
              GravityZone company linked to {client?.name}. Last API read:{" "}
              {formatDate(dashboard?.fetchedAt)} · {syncLabel}
            </p>
          </StatsPanel>

          <section className={`${dashStyles.kpiGrid} ${dashStyles.kpiGrid4}`}>
            <KpiCard icon="mdi:desktop-classic" label="Inventoried workstations" value={endpoints?.total ?? "-"} sub={`${sections.policies?.total ?? 0} politique(s) actives`} />
            <KpiCard icon="mdi:license" label="Licenses" value={license?.used != null && license?.total != null ? `${license.used}/${license.total}` : "-"} sub={licenseUsagePct != null ? `${licenseUsagePct}% used` : "License consumption"} tone={licenseUsagePct == null ? "neutral" : licenseUsagePct >= 95 ? "bad" : licenseUsagePct >= 80 ? "warn" : "good"} />
            <KpiCard icon="mdi:shield-alert-outline" label="Incidents" value={sections.incidents?.total ?? 0} sub="GravityZone overview" tone={(sections.incidents?.total ?? 0) > 0 ? "warn" : "good"} />
            <KpiCard icon="mdi:heart-pulse" label="Endpoint health" value={enrichedSummary?.total ? `${Math.max(0, enrichedSummary.total - (enrichedSummary.infected || 0))}/${enrichedSummary.total}` : "-"} sub={enrichedSummary?.infected ? `${enrichedSummary.infected} infected` : "Analyse malware"} tone={enrichedSummary?.infected ? "bad" : "good"} />
          </section>

          <AntivirusOverviewCharts variant="fleet" statistics={statistics} enrichedSummary={enrichedSummary} incidents={sections.incidents} />
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
            <div className={styles.kpiValue}>{sections.policies?.total ?? "-"}</div>
            <div className={styles.kpiLabel}>Politiques</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{sections.incidents?.total ?? "-"}</div>
            <div className={styles.kpiLabel}>Incidents</div>
          </div>
        </div>

        <AntivirusOverviewCharts statistics={statistics} enrichedSummary={enrichedSummary} incidents={sections.incidents} />
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
    if (!data) {
      return <>
          <SectionError error={license?.error} />
          <div className={styles.emptyState}>No license information</div>
        </>;
    }
    const expirationDate = data.expirationDate || antivirusItem?.expiration || antivirusItem?.syncData?.license?.expirationDate;
    return <div className={styles.kpiGridLicense}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{data.total ?? "-"}</div>
            <div className={styles.kpiLabel}>Total licenses</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{data.used ?? "-"}</div>
            <div className={styles.kpiLabel}>Used licenses</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>
              {data.total != null && data.used != null ? data.total - data.used : "-"}
            </div>
            <div className={styles.kpiLabel}>Available licenses</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{formatDateShort(expirationDate)}</div>
            <div className={styles.kpiLabel}>Expiration date</div>
          </div>
        </div>;
  };
  const renderSectionContent = () => {
    if (!asPage && !embedded && loading) {
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
        content = renderListSection(sectionViews.endpoints, {
          fillHeight: true
        });
        break;
      case "license":
        content = renderLicense();
        break;
      case "policies":
        content = renderListSection(sectionViews.policies, {
          fillHeight: true
        });
        break;
      default:
        content = renderOverview();
    }
    return content;
  };
  const navEntries = useMemo(() => ANTIVIRUS_OVERVIEW_SECTIONS.map(section => ({
    type: "section",
    key: section.id,
    section
  })), []);
  if (!active || !antivirusItem?.companyId) return null;
  const mappingLabel = antivirusItem.mappingMode === "dedicated" ? "Dedicated tenant" : "Global tenant";
  const openEnterprise = () => {
    if (!client?.id || !onNavigate) return;
    onNavigate("ContratDetail", {
      clientId: client.id,
      name: client.name
    });
  };
  if (embed) {
    if (loading && !dashboard) {
      return <div className={styles.loadingBlock}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          Loading GravityZone data…
        </div>;
    }
    if (loadError && !dashboard) return <SectionError error={loadError} />;
    return renderSectionContent();
  }
  if (asPage || embedded) {
    const clientName = client?.name || "-";
    const subtitle = client?.id && onNavigate ? <button type="button" className={styles.subtitleLink} onClick={openEnterprise}>
        {clientName}
      </button> : clientName;
    return <SolutionDetailPageLayout embedded={embedded} accent="gravityzone" eyebrow="Cybersecurity · GravityZone" title={`Antivirus · ${companyName}`} titleIcon="simple-icons:bitdefender" subtitle={subtitle} loading={loading} refreshing={refreshing} loadingMessage="Loading GravityZone data…" onRefresh={embedded ? undefined : () => loadDashboard({
      persist: true
    })} refreshLabel="Refresh and save" footerHint={mappingLabel} navEntries={navEntries} activeSection={activeSection} onSectionChange={setActiveSection} navAriaLabel="Sections">
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
        {!asPage ? <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label="Close">
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
        })} disabled={loading || refreshing}>
            <Icon icon={loading || refreshing ? "mdi:loading" : "mdi:refresh"} className={loading || refreshing ? formStyles.spinning : ""} aria-hidden />
            {loading || refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </footer>
    </div>;
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      {shell}
    </div>, document.getElementById("modal-root") || document.body);
}
export default function AntivirusOverviewModal(props) {
  return <AntivirusOverviewPanel {...props} active={props.open} />;
}
