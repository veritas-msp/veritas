import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { ANTISPAM_OVERVIEW_SECTIONS } from "./antispamOverviewSections";
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
    let d;
    if (typeof value === "number" || typeof value === "string" && /^\d+(\.\d+)?$/.test(String(value).trim())) {
      const n = Number(value);
      d = new Date(n < 1e12 ? n * 1000 : n);
    } else {
      d = new Date(value);
    }
    if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 1990) return "-";
    return d.toLocaleString("en-GB");
  } catch {
    return String(value);
  }
}
function isBenignListError(error) {
  if (!error) return true;
  const msg = String(error).toLowerCase();
  return msg === "not found" || msg.includes("not found") || /\b404\b/.test(msg);
}
function looksLikeEmail(value) {
  const str = String(value || "").trim();
  return Boolean(str.includes("@") && str.length > 3 && !/\s/.test(str));
}
function displayText(...values) {
  for (const value of values) {
    if (value == null || value === "" || value === 0 || value === "0" || value === "—") continue;
    if (typeof value === "object") continue;
    return String(value);
  }
  return "-";
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
                  {col.render ? col.render(row) : formatCellValue(row[col.key])}
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
  const error = isBenignListError(section.error) ? null : section.error;
  const status = section.status === "error" && !error ? "empty" : section.status;
  return <div className={fillHeight ? styles.listSectionFill : undefined}>
      {preview ? <div className={styles.previewBanner}>
          <Icon icon="mdi:flask-outline" aria-hidden />
          <span>Mailinblack data · read-only preview.</span>
        </div> : null}
      <SectionError error={error} />
      <div className={styles.listSectionMeta}>
        <StatusPill status={status} preview={preview} />
        {section.total != null ? <span className={styles.listSectionCount}>
            {section.total} item{section.total > 1 ? "s" : ""}
          </span> : null}
      </div>
      <DataTable columns={section.columns} rows={section.items} emptyLabel={status === "permission_denied" ? "Access denied · check the auth key and client ID" : "No data returned"} fillHeight={fillHeight} />
    </div>;
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
    label: "E-mail",
    render: r => displayText(r.email, looksLikeEmail(r.name) ? r.name : null, r.mail, r.login)
  }, {
    key: "name",
    label: "Name"
  }, {
    key: "role",
    label: "Role",
    render: r => displayText(r.role, r.profile, r.userType)
  }, {
    key: "status",
    label: "Status",
    render: r => displayText(r.status, r.state)
  }, {
    key: "lastLogin",
    label: "Last login",
    render: r => formatDate(r.lastLogin || r.lastAuthDate || r.lastConnectionDate)
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
    render: r => formatDate(r.lastSeen || r.creationDate || r.createdAt || r.addedDate || r.date)
  }],
  spools: [{
    key: "subject",
    label: "Subject"
  }, {
    key: "sender",
    label: "From",
    render: r => displayText(r.sender, r.from, r.mailFrom, r.expediteur)
  }, {
    key: "recipient",
    label: "To",
    render: r => displayText(r.recipient, r.to, r.mailTo, r.destinataire)
  }, {
    key: "status",
    label: "Status",
    render: r => displayText(r.status, r.state, r.statut)
  }, {
    key: "category",
    label: "Category"
  }, {
    key: "threat",
    label: "Threat",
    render: r => displayText(r.threat, r.reason, r.detection, r.spamType)
  }, {
    key: "receivedAt",
    label: "Received",
    render: r => formatDate(r.receivedAt || r.date || r.createdAt || r.receptionDate)
  }]
};
export function AntispamOverviewPanel({
  active = true,
  client,
  antispamItem,
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
  const cachedSync = antispamItem?.syncData;
  const [loading, setLoading] = useState(() => !cachedSync?.dashboard);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(() => cachedSync?.dashboard || null);
  const [lastPersistedAt, setLastPersistedAt] = useState(() => cachedSync?.lastSync || null);
  const [loadError, setLoadError] = useState(null);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);
  const dashboardRef = useRef(cachedSync?.dashboard || null);
  const loadedKeyRef = useRef(null);
  const antispamItemRef = useRef(antispamItem);
  const onSyncedRef = useRef(onSynced);
  antispamItemRef.current = antispamItem;
  onSyncedRef.current = onSynced;
  const customerId = antispamItem?.customerId;
  const clientId = client?.id;
  const tenantId = antispamItem?.mailinblackTenantId || null;
  const mappingMode = antispamItem?.mappingMode || "reseller";
  const credentialContext = useMemo(() => ({
    clientId,
    mailinblackTenantId: tenantId,
    mappingMode
  }), [clientId, tenantId, mappingMode]);
  const loadDashboard = useCallback(async ({
    persist = false
  } = {}) => {
    if (!customerId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    const item = antispamItemRef.current;
    const hasContent = Boolean(dashboardRef.current || item?.syncData?.dashboard);
    if (hasContent) setRefreshing(true);else setLoading(true);
    setLoadError(null);
    try {
      const signal = controller.signal;
      if (persist && clientId) {
        const persisted = await syncAndPersistAntispamSolution(clientId, item, {
          signal
        });
        if (signal.aborted || requestId !== requestIdRef.current) return;
        await onSyncedRef.current?.();
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
      setLastPersistedAt(antispamItemRef.current?.syncData?.lastSync || null);
    } catch (err) {
      if (err?.name === "AbortError" || controller.signal.aborted || requestId !== requestIdRef.current) return;
      setLoadError(err.message);
      showError(err.message);
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId, credentialContext, clientId]);
  useEffect(() => {
    if (controlledSection != null) return;
    setActiveSection("overview");
  }, [customerId, controlledSection, setActiveSection]);
  useEffect(() => {
    if (!active || !customerId) return undefined;
    const cached = antispamItemRef.current?.syncData;
    if (cached?.dashboard) {
      dashboardRef.current = cached.dashboard;
      setDashboard(cached.dashboard);
    }
    if (cached?.lastSync) setLastPersistedAt(cached.lastSync);
    if (cachedOnly) {
      setLoading(false);
      setRefreshing(false);
      return undefined;
    }
    const loadKey = `${customerId}:${tenantId || ""}:${mappingMode}`;
    if (loadedKeyRef.current === loadKey && dashboardRef.current) {
      setLoading(false);
      return undefined;
    }
    loadedKeyRef.current = loadKey;
    loadDashboard();
  }, [active, customerId, tenantId, mappingMode, cachedOnly, loadDashboard]);
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, [customerId]);
  const sections = dashboard?.sections || {};
  const customerName = sections.customer?.data?.name || antispamItem?.customerName || antispamItem?.nom || antispamItem?.name || "Mailinblack Protect";
  const sectionViews = useMemo(() => {
    const views = {};
    Object.entries(SECTION_COLUMNS).forEach(([key, columns]) => {
      const section = sections[key];
      if (!section) return;
      const benignError = section.status === "error" && isBenignListError(section.error);
      views[key] = {
        ...section,
        status: benignError ? "empty" : section.status,
        error: benignError ? null : section.error,
        columns
      };
    });
    if ((!views.emails?.items || views.emails.items.length === 0) && views.users?.items?.length) {
      const derived = views.users.items.filter(user => user?.email && user.email !== "—" && looksLikeEmail(user.email)).map(user => ({
        id: user.id,
        email: user.email,
        domain: user.email.includes("@") ? user.email.slice(user.email.lastIndexOf("@") + 1) : null,
        type: "primary",
        primary: true,
        status: user.status || null
      }));
      if (derived.length) {
        views.emails = {
          status: "ok",
          error: null,
          items: derived,
          total: derived.length,
          columns: SECTION_COLUMNS.emails
        };
      }
    }
    return views;
  }, [sections]);
  const renderOverview = () => {
    const customer = sections.customer?.data;
    const usersTotal = sections.users?.total ?? antispamItem?.utilisateursProteges ?? 0;
    const domainsTotal = sections.domains?.total ?? antispamItem?.domainesSurveilles ?? 0;
    const emailsTotal = sectionViews.emails?.total ?? sections.emails?.total ?? 0;
    const serversTotal = sections.servers?.total ?? 0;
    const sendersTotal = sections.senders?.total ?? 0;
    const spoolsTotal = sections.spools?.total ?? 0;
    if (asPage || embedded) {
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
      }]);
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
      }]);
      const syncLabel = lastPersistedAt ? `Last backup: ${formatDate(lastPersistedAt)}` : "Not saved locally";
      return <StatsDashboardBody>
          <StatsPanel title={customerName} icon="mdi:email-secure-outline">
            <p className={dashStyles.panelDesc}>
              Mailinblack Protect client linked to {client?.name}. Last update:{" "}
              {formatDate(dashboard?.fetchedAt)} · {syncLabel}
            </p>
          </StatsPanel>

          <section className={`${dashStyles.kpiGrid} ${dashStyles.kpiGrid5}`}>
            <KpiCard icon="mdi:account-group-outline" label="Users" value={usersTotal || "-"} sub="Protected accounts" />
            <KpiCard icon="mdi:web" label="Domains" value={domainsTotal || "-"} sub="Monitored domains" />
            <KpiCard icon="mdi:email-outline" label="E-mails" value={emailsTotal || "-"} sub="Admin addresses" />
            <KpiCard icon="mdi:email-arrow-right-outline" label="Senders" value={sendersTotal || "-"} sub="Protect list" />
            <KpiCard icon="mdi:email-multiple-outline" label="Spools" value={spoolsTotal || "-"} sub="Queued messages" />
          </section>

          <section className={dashStyles.chartGrid3}>
            <StatsPanel title="Fleet distribution" icon="mdi:chart-donut">
              <StatsPieChart items={volumeDistribution.items} total={volumeDistribution.total} emptyLabel="No volume reported" title="Fleet distribution" />
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
                </ul>
              </StatsPanel> : <StatsPanel title="Information client" icon="mdi:card-account-details-outline">
                <p className={dashStyles.panelDesc}>Aucune information client disponible.</p>
              </StatsPanel>}
            <StatsPanel title="Volumes par module" icon="mdi:chart-bar">
              <StatsDistributionBars items={moduleBars.items} emptyLabel="No volume available" />
            </StatsPanel>
          </section>
        </StatsDashboardBody>;
    }
    return <>
        <div className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{customerName}</h3>
          <p className={formStyles.sectionDesc}>
            Mailinblack Protect client linked to {client?.name}. Last update:{" "}
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
            <span className={styles.kpiValue}>{sectionViews.emails?.total ?? sections.emails?.total ?? "-"}</span>
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
            {customer.status ? <div>
                <strong>Status</strong>
                <span>{customer.status}</span>
              </div> : null}
          </div> : null}
      </>;
  };
  const fillTables = asPage || embedded;
  const renderSectionContent = () => {
    if (!asPage && !embedded && loading) {
      return <div className={styles.loadingBlock}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          Loading Mailinblack data…
        </div>;
    }
    if (loadError) return <SectionError error={loadError} />;
    let content;
    switch (activeSection) {
      case "domains":
        content = renderListSection(sectionViews.domains, {
          fillHeight: fillTables
        });
        break;
      case "users":
        content = renderListSection(sectionViews.users, {
          fillHeight: fillTables
        });
        break;
      case "emails":
        content = renderListSection(sectionViews.emails, {
          fillHeight: fillTables
        });
        break;
      case "servers":
        content = renderListSection(sectionViews.servers, {
          fillHeight: fillTables
        });
        break;
      case "senders":
        content = renderListSection(sectionViews.senders, {
          fillHeight: fillTables
        });
        break;
      case "spools":
        content = renderListSection(sectionViews.spools, {
          fillHeight: fillTables
        });
        break;
      default:
        content = renderOverview();
    }
    return content;
  };
  const navEntries = useMemo(() => ANTISPAM_OVERVIEW_SECTIONS.map(section => ({
    type: "section",
    key: section.id,
    section
  })), []);
  if (!active || !customerId) return null;
  const mappingLabel = antispamItem?.mappingMode === "dedicated" ? "Dedicated tenant" : "Tenant global";
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
          Loading Mailinblack data…
        </div>;
    }
    if (loadError && !dashboard) return <SectionError error={loadError} />;
    return renderSectionContent();
  }
  if (asPage || embedded) {
    const clientName = client?.name || "-";
    const subtitle = <>
        {client?.id && onNavigate ? <button type="button" className={styles.subtitleLink} onClick={openEnterprise}>
            {clientName}
          </button> : clientName}
        {` · ${mappingLabel}`}
      </>;
    return <SolutionDetailPageLayout embedded={embedded} accent="mailinblack" eyebrow="Cybersecurity · Mailinblack Protect" title={`Antispam · ${customerName}`} titleIcon="mdi:email-secure-outline" subtitle={subtitle} loading={loading} refreshing={refreshing} loadingMessage="Loading des data Mailinblack…" onRefresh={embedded ? undefined : () => loadDashboard({
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
