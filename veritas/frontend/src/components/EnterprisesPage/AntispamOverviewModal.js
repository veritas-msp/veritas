import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { ANTISPAM_OVERVIEW_GROUPS, ANTISPAM_OVERVIEW_SECTIONS } from "./antispamOverviewSections";
import { fetchMailinblackDashboard } from "../../api/clientMailinblack";
import { syncAndPersistAntispamSolution } from "./antispamSolutionUtils";
import { showError, showSuccess } from "../../utils/toast";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./AntivirusOverviewModal.module.css";
import SolutionDetailPageLayout from "./SolutionDetailPageLayout";
import { KpiCard, StatsPieChart, StatsDistributionBars, StatsDashboardBody, StatsPanel, buildDistributionItems, statsDashboardStyles as dashStyles } from "./StatsDashboardWidgets";
function formatDate(value) {
  if (value == null || value === "" || value === 0 || value === "0") return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 1990) return "-";
    return d.toLocaleString("en-GB");
  } catch {
    return String(value);
  }
}
function StatusPill({
  status,
  preview = false,
  compact = false
}) {
  const resolved = preview && status === "error" ? "preview" : status;
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
      label: compact ? "Auth" : "Unauthorized",
      icon: "mdi:lock-outline"
    },
    preview: {
      className: styles.statusPreview,
      label: compact ? "Preview" : "Preview",
      icon: "mdi:dots-horizontal-circle-outline"
    },
    info: {
      className: styles.statusInfo,
      label: "Info",
      icon: "mdi:information-outline"
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
function formatCellValue(value) {
  if (value == null || value === "" || value === 0 || value === "0") return "-";
  if (typeof value === "object") return "-";
  return String(value);
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
                  {col.render ? col.render(row) : formatCellValue(row[col.key])}
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
          <span>Mailinblack API available · read-only preview.</span>
        </div> : null}
      <SectionError error={section.error} />
      <div style={{
      marginBottom: "0.75rem"
    }}>
        <StatusPill status={section.status} preview={preview} />
        {section.total != null ? <span style={{
        marginLeft: "0.5rem",
        fontSize: "0.78rem",
        color: "var(--msp-muted)"
      }}>
            {section.total} item{section.total > 1 ? "s" : ""}
          </span> : null}
      </div>
      <DataTable columns={section.columns} rows={section.items} emptyLabel={section.status === "permission_denied" ? "Access denied · check the auth key and client ID" : section.error ? section.error : "No data returned"} />
    </>;
}
const SECTION_COLUMNS = {
  domains: [{
    key: "name",
    label: "Domain"
  }, {
    key: "status",
    label: "Status"
  }, {
    key: "mx",
    label: "MX"
  }, {
    key: "expiration",
    label: "Expiration",
    render: r => formatDate(r.expiration)
  }, {
    key: "autoRenew",
    label: "Auto-renew",
    render: r => r.autoRenew === true || r.autoRenew === "Yes" ? "Yes" : r.autoRenew === false || r.autoRenew === "No" ? "No" : "-"
  }],
  users: [{
    key: "email",
    label: "E-mail"
  }, {
    key: "name",
    label: "Name"
  }, {
    key: "role",
    label: "Role"
  }, {
    key: "status",
    label: "Status"
  }, {
    key: "lastLogin",
    label: "Last login",
    render: r => formatDate(r.lastLogin)
  }],
  emails: [{
    key: "email",
    label: "E-mail"
  }, {
    key: "domain",
    label: "Domain"
  }, {
    key: "type",
    label: "Type"
  }, {
    key: "primary",
    label: "Primary",
    render: r => r.primary === true ? "Yes" : r.primary === false ? "No" : "-"
  }, {
    key: "status",
    label: "Status"
  }],
  servers: [{
    key: "name",
    label: "Server"
  }, {
    key: "ip",
    label: "IP",
    mono: true
  }, {
    key: "type",
    label: "Type"
  }, {
    key: "domain",
    label: "Domain"
  }, {
    key: "status",
    label: "Status"
  }],
  senders: [{
    key: "email",
    label: "Sender"
  }, {
    key: "domain",
    label: "Domain"
  }, {
    key: "status",
    label: "Status"
  }, {
    key: "authorized",
    label: "Allowed",
    render: r => r.authorized === true ? "Yes" : r.authorized === false ? "No" : "-"
  }, {
    key: "lastSeen",
    label: "Last seen",
    render: r => formatDate(r.lastSeen)
  }],
  spools: [{
    key: "subject",
    label: "Subject"
  }, {
    key: "sender",
    label: "From"
  }, {
    key: "recipient",
    label: "To"
  }, {
    key: "status",
    label: "Status"
  }, {
    key: "category",
    label: "Category"
  }, {
    key: "threat",
    label: "Threat"
  }, {
    key: "receivedAt",
    label: "Received",
    render: r => formatDate(r.receivedAt)
  }],
  detectSpools: [{
    key: "subject",
    label: "Subject"
  }, {
    key: "sender",
    label: "From"
  }, {
    key: "status",
    label: "Status"
  }, {
    key: "category",
    label: "Category"
  }, {
    key: "threat",
    label: "Detection"
  }, {
    key: "receivedAt",
    label: "Received",
    render: r => formatDate(r.receivedAt)
  }]
};
const API_STATUS_LABELS = {
  ok: "OK",
  error: "Error",
  empty: "Empty",
  permission_denied: "Unauthorized",
  preview: "Preview",
  info: "Info"
};
export function AntispamOverviewPanel({
  active = true,
  client,
  antispamItem,
  onClose,
  onSynced,
  asPage = false,
  onNavigate
}) {
  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(() => !antispamItem?.syncData?.dashboard);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [lastPersistedAt, setLastPersistedAt] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);
  const dashboardRef = useRef(null);
  const credentialContext = useMemo(() => ({
    clientId: client?.id,
    mailinblackTenantId: antispamItem?.mailinblackTenantId,
    mappingMode: antispamItem?.mappingMode || "reseller"
  }), [client?.id, antispamItem]);
  const customerId = antispamItem?.customerId;
  const loadDashboard = useCallback(async ({
    persist = false
  } = {}) => {
    if (!customerId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    const hasContent = Boolean(dashboardRef.current || antispamItem?.syncData?.dashboard);
    if (hasContent) setRefreshing(true);else setLoading(true);
    setLoadError(null);
    try {
      const signal = controller.signal;
      if (persist && client?.id) {
        const persisted = await syncAndPersistAntispamSolution(client.id, antispamItem, {
          signal
        });
        if (signal.aborted || requestId !== requestIdRef.current) return;
        await onSynced?.();
        if (signal.aborted || requestId !== requestIdRef.current) return;
        showSuccess("Antispam data refreshed and saved.");
        if (persisted.dashboard) {
          dashboardRef.current = persisted.dashboard;
          setDashboard(persisted.dashboard);
        }
        setLastPersistedAt(persisted.updatedPayload?.syncData?.lastSync || new Date().toISOString());
        return;
      }
      const dashboardData = await fetchMailinblackDashboard(customerId, {
        ...credentialContext,
        signal
      });
      if (signal.aborted || requestId !== requestIdRef.current) return;
      dashboardRef.current = dashboardData;
      setDashboard(dashboardData);
      setLastPersistedAt(antispamItem?.syncData?.lastSync || null);
    } catch (err) {
      if (err?.name === "AbortError" || controller.signal.aborted || requestId !== requestIdRef.current) return;
      setLoadError(err.message);
      showError(err.message);
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId, credentialContext, client?.id, antispamItem, onSynced]);
  useEffect(() => {
    if (active && customerId) {
      setActiveSection("overview");
      const cached = antispamItem?.syncData?.dashboard;
      if (cached) {
        dashboardRef.current = cached;
        setDashboard(cached);
      }
      if (antispamItem?.syncData?.lastSync) setLastPersistedAt(antispamItem.syncData.lastSync);
      loadDashboard();
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [active, customerId, loadDashboard, antispamItem?.syncData]);
  const sections = dashboard?.sections || {};
  const customerName = sections.customer?.data?.name || antispamItem?.customerName || antispamItem?.nom || antispamItem?.name || "Mailinblack Protect";
  const sectionViews = useMemo(() => {
    const views = {};
    Object.entries(SECTION_COLUMNS).forEach(([key, columns]) => {
      const section = sections[key];
      if (section) views[key] = {
        ...section,
        columns
      };
    });
    return views;
  }, [sections]);
  const renderOverview = () => {
    const customer = sections.customer?.data;
    const apiRows = [{
      name: "Client / compte",
      exploited: true,
      status: sections.customer?.status
    }, {
      name: "Domains (admin)",
      exploited: true,
      status: sections.domains?.status
    }, {
      name: "Users (admin)",
      exploited: true,
      status: sections.users?.status
    }, {
      name: "E-mails (admin)",
      exploited: true,
      status: sections.emails?.status
    }, {
      name: "Servers (admin)",
      exploited: true,
      status: sections.servers?.status
    }, {
      name: "Senders (protect)",
      exploited: true,
      status: sections.senders?.status
    }, {
      name: "Spools (protect)",
      exploited: true,
      status: sections.spools?.status
    }, {
      name: "Advanced spools",
      exploited: true,
      status: sections.detectSpools?.status
    }];
    const usersTotal = sections.users?.total ?? antispamItem?.utilisateursProteges ?? 0;
    const domainsTotal = sections.domains?.total ?? antispamItem?.domainesSurveilles ?? 0;
    const emailsTotal = sections.emails?.total ?? 0;
    const serversTotal = sections.servers?.total ?? 0;
    const sendersTotal = sections.senders?.total ?? 0;
    const spoolsTotal = sections.spools?.total ?? 0;
    const detectTotal = sections.detectSpools?.total ?? 0;
    if (asPage) {
      const volumeDistribution = buildDistributionItems([{
        name: "Users",
        count: usersTotal
      }, {
        name: "Domains",
        count: domainsTotal
      }, {
        name: "E-mails",
        count: emailsTotal
      }, {
        name: "Servers",
        count: serversTotal
      }, {
        name: "Senders",
        count: sendersTotal
      }, {
        name: "Spools",
        count: spoolsTotal
      }, {
        name: "Advanced spools",
        count: detectTotal
      }]);
      const apiStatusCounts = {};
      apiRows.forEach(row => {
        const key = row.status || "info";
        apiStatusCounts[key] = (apiStatusCounts[key] || 0) + 1;
      });
      const apiStatusDistribution = buildDistributionItems(Object.entries(apiStatusCounts).map(([status, count]) => ({
        name: API_STATUS_LABELS[status] || status,
        count
      })));
      const moduleBars = buildDistributionItems([{
        name: "Domains",
        count: domainsTotal
      }, {
        name: "Users",
        count: usersTotal
      }, {
        name: "E-mails",
        count: emailsTotal
      }, {
        name: "Servers",
        count: serversTotal
      }, {
        name: "Senders",
        count: sendersTotal
      }, {
        name: "Spools",
        count: spoolsTotal
      }, {
        name: "Advanced spools",
        count: detectTotal
      }]);
      const okApis = apiRows.filter(row => row.status === "ok").length;
      const syncLabel = lastPersistedAt ? `Last backup: ${formatDate(lastPersistedAt)}` : "Not saved locally";
      return <StatsDashboardBody>
          <StatsPanel title={customerName} icon="mdi:email-secure-outline">
            <p className={dashStyles.panelDesc}>
              Mailinblack Protect client linked to {client?.name}. Last API read:{" "}
              {formatDate(dashboard?.fetchedAt)} · {syncLabel}
            </p>
          </StatsPanel>

          <section className={dashStyles.kpiGrid}>
            <KpiCard icon="mdi:account-group-outline" label="Users" value={usersTotal || "-"} sub="Protected accounts" />
            <KpiCard icon="mdi:web" label="Domains" value={domainsTotal || "-"} sub="Monitored domains" />
            <KpiCard icon="mdi:email-outline" label="E-mails" value={emailsTotal || "-"} sub="Admin addresses" />
            <KpiCard icon="mdi:email-arrow-right-outline" label="Senders" value={sendersTotal || "-"} sub="Protect list" />
            <KpiCard icon="mdi:email-multiple-outline" label="Spools" value={spoolsTotal || "-"} sub="Queued messages" />
            <KpiCard icon="mdi:radar" label="Advanced spools" value={detectTotal || "-"} sub="U-Mail Advanced" />
            <KpiCard icon="mdi:api" label="Operational APIs" value={`${okApis}/${apiRows.length}`} sub={`${apiRows.filter(row => row.exploited).length} integrated in Veritas`} tone={okApis === apiRows.length ? "good" : okApis >= apiRows.length - 1 ? "warn" : "bad"} />
            <KpiCard icon="mdi:cloud-sync-outline" label="Synchronization" value={lastPersistedAt ? "Saved" : "Lecture seule"} sub={syncLabel} tone={lastPersistedAt ? "good" : "neutral"} />
          </section>

          <section className={dashStyles.chartGrid3}>
            <StatsPanel title="Fleet distribution" icon="mdi:chart-donut">
              <StatsPieChart items={volumeDistribution.items} total={volumeDistribution.total} emptyLabel="No volume reported by the API" />
            </StatsPanel>
            <StatsPanel title="API status" icon="mdi:shield-check-outline">
              <StatsPieChart items={apiStatusDistribution.items} total={apiStatusDistribution.total} emptyLabel="Statuss API indisponibles" />
            </StatsPanel>
            {customer ? <StatsPanel title="Information client" icon="mdi:card-account-details-outline">
                <ul className={dashStyles.metricList}>
                  <li>
                    <span>ID client</span>
                    <strong className={dashStyles.metricMono}>{customer.id}</strong>
                  </li>
                  {customer.domain ? <li>
                      <span>Domaine principal</span>
                      <strong>{customer.domain}</strong>
                    </li> : null}
                  {customer.status ? <li>
                      <span>Status</span>
                      <strong>{customer.status}</strong>
                    </li> : null}
                  {dashboard?.session?.clientId ? <li>
                      <span>ClientId auth</span>
                      <strong className={dashStyles.metricMono}>{dashboard.session.clientId}</strong>
                    </li> : null}
                </ul>
              </StatsPanel> : null}
          </section>

          <section className={dashStyles.columns}>
            <StatsPanel title="Volumes par module" icon="mdi:chart-bar">
              <StatsDistributionBars items={moduleBars.items} emptyLabel="No volume available" />
            </StatsPanel>
            <StatsPanel title="Mailinblack API status" icon="mdi:api">
              <ul className={dashStyles.metricList}>
                {apiRows.map(row => <li key={row.name}>
                    <span>{row.name}</span>
                    <StatusPill status={row.status} preview={!row.exploited} compact />
                  </li>)}
              </ul>
            </StatsPanel>
          </section>
        </StatsDashboardBody>;
    }
    return <>
        <div className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{customerName}</h3>
          <p className={formStyles.sectionDesc}>
            Mailinblack Protect client linked to {client?.name}. Last API read:{" "}
            {formatDate(dashboard?.fetchedAt)}
            {lastPersistedAt ? <> · Last saved: {formatDate(lastPersistedAt)}</> : null}
          </p>
        </div>

        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Users</span>
            <span className={styles.kpiValue}>
              {sections.users?.total ?? antispamItem?.utilisateursProteges ?? "-"}
            </span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Domains</span>
            <span className={styles.kpiValue}>
              {sections.domains?.total ?? antispamItem?.domainesSurveilles ?? "-"}
            </span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>E-mails</span>
            <span className={styles.kpiValue}>{sections.emails?.total ?? "-"}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Senders</span>
            <span className={styles.kpiValue}>{sections.senders?.total ?? "-"}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Spools</span>
            <span className={styles.kpiValue}>{sections.spools?.total ?? "-"}</span>
          </div>
        </div>

        {customer ? <div className={styles.metaPanel}>
            <div>
              <strong>ID client</strong>
              <span className={styles.mono}>{customer.id}</span>
            </div>
            {customer.domain ? <div>
                <strong>Domaine principal</strong>
                <span>{customer.domain}</span>
              </div> : null}
            {dashboard?.session?.clientId ? <div>
                <strong>ClientId auth</strong>
                <span className={styles.mono}>{dashboard.session.clientId}</span>
              </div> : null}
            {customer.status ? <div>
                <strong>Status</strong>
                <span>{customer.status}</span>
              </div> : null}
          </div> : null}

        <h4 className={formStyles.sectionTitle} style={{
        fontSize: "0.92rem",
        marginTop: "1.25rem"
      }}>
          Mailinblack API status
        </h4>
        <div className={styles.apiMatrix}>
          {apiRows.map(row => <div key={row.name} className={styles.apiMatrixRow}>
              <span className={styles.apiMatrixName}>{row.name}</span>
              <StatusPill status={row.status} preview={!row.exploited} compact />
            </div>)}
        </div>
      </>;
  };
  const renderSectionContent = () => {
    if (!asPage && loading) {
      return <div className={styles.loadingBlock}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          Loading Mailinblack data…
        </div>;
    }
    if (loadError) return <SectionError error={loadError} />;
    let content;
    switch (activeSection) {
      case "domains":
        content = renderListSection(sectionViews.domains);
        break;
      case "users":
        content = renderListSection(sectionViews.users);
        break;
      case "emails":
        content = renderListSection(sectionViews.emails);
        break;
      case "servers":
        content = renderListSection(sectionViews.servers);
        break;
      case "senders":
        content = renderListSection(sectionViews.senders);
        break;
      case "spools":
        content = renderListSection(sectionViews.spools);
        break;
      case "detectSpools":
        content = renderListSection(sectionViews.detectSpools);
        break;
      default:
        content = renderOverview();
    }
    return content;
  };
  const navEntries = useMemo(() => {
    const entries = [];
    let prevGroup = null;
    ANTISPAM_OVERVIEW_SECTIONS.forEach(section => {
      if (section.group !== prevGroup) {
        const group = ANTISPAM_OVERVIEW_GROUPS.find(g => g.id === section.group);
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
  if (!active || !customerId) return null;
  const mappingLabel = antispamItem?.mappingMode === "dedicated" ? "Dedicated tenant" : "Tenant global";
  const openEnterprise = () => {
    if (!client?.id || !onNavigate) return;
    onNavigate("ContratDetail", {
      clientId: client.id,
      name: client.name
    });
  };
  if (asPage) {
    const clientName = client?.name || "-";
    const subtitle = <>
        {client?.id && onNavigate ? <button type="button" className={styles.subtitleLink} onClick={openEnterprise}>
            {clientName}
          </button> : clientName}
        {` · ${mappingLabel}`}
      </>;
    return <SolutionDetailPageLayout accent="mailinblack" eyebrow="Cybersecurity · Mailinblack Protect" title={`Antispam · ${customerName}`} titleIcon="mdi:email-secure-outline" subtitle={subtitle} loading={loading} refreshing={refreshing} loadingMessage="Loading des data Mailinblack…" onRefresh={() => loadDashboard({
      persist: true
    })} refreshLabel="Refresh and save" footerHint={`${mappingLabel}${customerId ? ` · ID ${customerId}` : ""}`} navEntries={navEntries} activeSection={activeSection} onSectionChange={setActiveSection} navAriaLabel="Sections">
        {renderSectionContent()}
      </SolutionDetailPageLayout>;
  }
  const shell = <div className={`${formStyles.shell} ${styles.shellWide}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="antispam-overview-title">
      <div className={styles.accentBarMailinblack} aria-hidden />
      <header className={formStyles.header}>
        <div className={formStyles.headerMain}>
          <div className={`${formStyles.headerIconWrap} ${styles.headerIconMailinblack}`} aria-hidden>
            <Icon icon="mdi:email-secure-outline" />
          </div>
          <div className={formStyles.headerText}>
            <p className={formStyles.eyebrow}>Cybersecurity · Mailinblack Protect</p>
            <h2 className={formStyles.title} id="antispam-overview-title">
              Antispam · {customerName}
            </h2>
            <p className={formStyles.subtitle}>
              {client?.name} · {mappingLabel}
            </p>
          </div>
        </div>
        <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>
      </header>

      <div className={formStyles.body}>
        <nav className={formStyles.nav} aria-label="Sections overview antispam">
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
        <span className={formStyles.footerHint}>
          {mappingLabel}
          {customerId ? ` · ID ${customerId}` : ""}
        </span>
        <div className={formStyles.footerActions}>
          <button type="button" className={formStyles.primaryBtn} onClick={() => loadDashboard({
          persist: true
        })} disabled={loading || refreshing}>
            <Icon icon="mdi:cloud-sync-outline" aria-hidden />
            Refresh and save
          </button>
        </div>
      </footer>
    </div>;
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      {shell}
    </div>, document.getElementById("modal-root") || document.body);
}
export default function AntispamOverviewModal(props) {
  return <AntispamOverviewPanel {...props} active={props.open} />;
}
