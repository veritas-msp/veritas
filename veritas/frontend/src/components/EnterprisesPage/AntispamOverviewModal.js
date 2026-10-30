import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { ANTISPAM_OVERVIEW_SECTIONS } from "./antispamOverviewSections";
import { fetchMailinblackDashboard } from "../../api/clientMailinblack";
import { formatAntispamSolutionSummary, persistAntispamEventLog, resolveAntispamProviderImage, syncAndPersistAntispamSolution } from "./antispamSolutionUtils";
import { buildAntispamEventLogUpdate, getAntispamEventTypeMeta, normalizeAntispamEventLog } from "./antispamEventLogUtils";
import { getAntispamProvider } from "./antispamFormConfig";
import { showError, showSuccess } from "../../utils/toast";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./AntivirusOverviewModal.module.css";
import SolutionDetailPageLayout from "./SolutionDetailPageLayout";
import { KpiCard, StatsDashboardBody, StatsPanel, statsDashboardStyles as dashStyles } from "./StatsDashboardWidgets";
import AntispamOverviewCharts from "./AntispamOverviewCharts";
import SolutionOverviewDataTable from "./SolutionOverviewDataTable";
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
    return d.toLocaleString("fr-FR");
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
  emptyLabel = "Aucune donnée",
  fillHeight = false,
  searchable = false,
  searchPlaceholder = "Rechercher"
}) {
  return (
    <SolutionOverviewDataTable
      columns={columns}
      rows={rows}
      emptyLabel={emptyLabel}
      fillHeight={fillHeight}
      formatCell={formatCellValue}
      searchable={searchable}
      searchPlaceholder={searchPlaceholder}
    />
  );
}
function renderListSection(section, {
  preview = false,
  fillHeight = false,
  searchable = false,
  searchPlaceholder = "Rechercher"
} = {}) {
  const safe = section || {
    status: "empty",
    error: null,
    items: [],
    total: 0,
    columns: []
  };
  const error = isBenignListError(safe.error) ? null : safe.error;
  const status = safe.status === "error" && !error ? "empty" : safe.status;
  return <div className={fillHeight ? styles.listSectionFill : undefined}>
      {preview ? <div className={styles.previewBanner}>
          <Icon icon="mdi:flask-outline" aria-hidden />
          <span>Données Mailinblack · aperçu en lecture seule.</span>
        </div> : null}
      <SectionError error={error} />
      <DataTable
        columns={safe.columns || []}
        rows={safe.items || []}
        emptyLabel={status === "permission_denied" ? "Accès refusé · vérifiez la clé et l’ID client" : "Aucune donnée"}
        fillHeight={fillHeight}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
      />
    </div>;
}
const SECTION_COLUMNS = {
  domains: [{
    key: "name",
    label: "Domaine"
  }, {
    key: "status",
    label: "Statut"
  }, {
    key: "mx",
    label: "MX"
  }, {
    key: "expiration",
    label: "Expiration",
    render: r => formatDate(r.expiration)
  }, {
    key: "autoRenew",
    label: "Renouvellement auto",
    render: r => r.autoRenew === true || r.autoRenew === "Yes" ? "Oui" : r.autoRenew === false || r.autoRenew === "No" ? "Non" : "-"
  }],
  users: [{
    key: "email",
    label: "E-mail",
    render: r => displayText(r.email, looksLikeEmail(r.name) ? r.name : null, r.mail, r.login)
  }, {
    key: "name",
    label: "Nom"
  }, {
    key: "role",
    label: "Rôle",
    render: r => displayText(r.role, r.profile, r.userType)
  }, {
    key: "status",
    label: "Statut",
    render: r => displayText(r.status, r.state)
  }, {
    key: "lastLogin",
    label: "Dernière connexion",
    render: r => formatDate(r.lastLogin || r.lastAuthDate || r.lastConnectionDate)
  }],
  licenses: [{
    key: "product",
    label: "Produit"
  }, {
    key: "total",
    label: "Sièges"
  }, {
    key: "used",
    label: "Utilisés"
  }, {
    key: "status",
    label: "Statut"
  }, {
    key: "expiration",
    label: "Expiration",
    render: r => formatDate(r.expiration)
  }],
  emails: [{
    key: "email",
    label: "E-mail"
  }, {
    key: "domain",
    label: "Domaine"
  }, {
    key: "type",
    label: "Type"
  }, {
    key: "primary",
    label: "Principal",
    render: r => r.primary === true ? "Oui" : r.primary === false ? "Non" : "-"
  }, {
    key: "status",
    label: "Statut"
  }],
  servers: [{
    key: "name",
    label: "Serveur"
  }, {
    key: "ip",
    label: "IP",
    mono: true
  }, {
    key: "type",
    label: "Type"
  }, {
    key: "domain",
    label: "Domaine"
  }, {
    key: "status",
    label: "Statut"
  }],
  senders: [{
    key: "email",
    label: "Expéditeur"
  }, {
    key: "domain",
    label: "Domaine"
  }, {
    key: "status",
    label: "Statut"
  }, {
    key: "authorized",
    label: "Autorisé",
    render: r => r.authorized === true ? "Oui" : r.authorized === false ? "Non" : "-"
  }, {
    key: "lastSeen",
    label: "Dernière vue",
    render: r => formatDate(r.lastSeen || r.creationDate || r.createdAt || r.addedDate || r.date)
  }],
  spools: [{
    key: "subject",
    label: "Objet"
  }, {
    key: "sender",
    label: "De",
    render: r => displayText(r.sender, r.from, r.mailFrom, r.expediteur)
  }, {
    key: "recipient",
    label: "À",
    render: r => displayText(r.recipient, r.to, r.mailTo, r.destinataire)
  }, {
    key: "status",
    label: "Statut",
    render: r => displayText(r.status, r.state, r.statut)
  }, {
    key: "category",
    label: "Catégorie"
  }, {
    key: "threat",
    label: "Menace",
    render: r => displayText(r.threat, r.reason, r.detection, r.spamType)
  }, {
    key: "receivedAt",
    label: "Reçu",
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
  const [eventLog, setEventLog] = useState(() => normalizeAntispamEventLog(cachedSync?.eventLog));
  const [lastPersistedAt, setLastPersistedAt] = useState(() => cachedSync?.lastSync || null);
  const [loadError, setLoadError] = useState(null);
  const eventLogRef = useRef(normalizeAntispamEventLog(cachedSync?.eventLog));
  eventLogRef.current = eventLog;
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
        showSuccess("Données antispam actualisées et enregistrées.");
        if (persisted.dashboard) {
          dashboardRef.current = persisted.dashboard;
          setDashboard(persisted.dashboard);
        }
        setEventLog(normalizeAntispamEventLog(persisted.eventLog || persisted.updatedPayload?.syncData?.eventLog));
        setLastPersistedAt(persisted.updatedPayload?.syncData?.lastSync || new Date().toISOString());
        return;
      }
      const dashboardData = await fetchMailinblackDashboard(customerId, {
        ...credentialContext,
        signal
      });
      if (signal.aborted || requestId !== requestIdRef.current) return;
      const latest = antispamItemRef.current;
      const { eventLog: nextEventLog, addedCount } = buildAntispamEventLogUpdate(
        eventLogRef.current.length ? eventLogRef.current : latest?.syncData?.eventLog,
        latest?.syncData?.dashboard,
        dashboardData
      );
      dashboardRef.current = dashboardData;
      setDashboard(dashboardData);
      setEventLog(nextEventLog);
      setLastPersistedAt(latest?.syncData?.lastSync || null);
      if (addedCount > 0 && clientId && latest) {
        try {
          await persistAntispamEventLog(clientId, latest, nextEventLog, { signal });
          if (!signal.aborted && requestId === requestIdRef.current) {
            await onSyncedRef.current?.();
          }
        } catch (persistErr) {
          if (persistErr?.name !== "AbortError") {
            console.warn("Antispam event log persist failed:", persistErr);
          }
        }
      }
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
    if (cached?.eventLog) setEventLog(normalizeAntispamEventLog(cached.eventLog));
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
      if (!section) {
        views[key] = {
          status: "empty",
          error: null,
          items: [],
          total: 0,
          columns
        };
        return;
      }
      const benignError = section.status === "error" && isBenignListError(section.error);
      views[key] = {
        ...section,
        status: benignError ? "empty" : section.status,
        error: benignError ? null : section.error,
        items: section.items || [],
        total: section.total ?? (section.items || []).length,
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
    const licenseSummary = sections.licenses?.summary;
    if ((!views.licenses?.items || views.licenses.items.length === 0) && (licenseSummary?.total != null || licenseSummary?.used != null)) {
      views.licenses = {
        ...(views.licenses || {
          status: "ok",
          error: null,
          columns: SECTION_COLUMNS.licenses
        }),
        status: "ok",
        items: [{
          id: "protect",
          product: "Protect",
          total: licenseSummary.total,
          used: licenseSummary.used,
          status: "Active"
        }],
        total: 1,
        columns: SECTION_COLUMNS.licenses
      };
    }
    return views;
  }, [sections]);

  const eventColumns = useMemo(
    () => [
      {
        key: "at",
        label: "Date",
        sortValue: row => {
          const ms = row.at ? new Date(row.at).getTime() : NaN;
          return Number.isFinite(ms) ? ms : 0;
        },
        render: row => formatDate(row.at)
      },
      {
        key: "type",
        label: "Type",
        sortValue: row => getAntispamEventTypeMeta(row.type).label,
        render: row => {
          const meta = getAntispamEventTypeMeta(row.type);
          return (
            <span className={`${styles.eventTypeBadge} ${styles[`eventTone_${meta.tone}`] || ""}`}>
              <Icon icon={meta.icon} width={16} height={16} aria-hidden />
              {meta.label}
            </span>
          );
        }
      },
      {
        key: "subjectName",
        label: "Élément",
        sortValue: row => row.subjectName || "",
        render: row => row.subjectName || "-"
      },
      {
        key: "message",
        label: "Événement",
        sortValue: row => row.message || "",
        render: row => <span className={styles.cellTruncate}>{row.message || "-"}</span>
      }
    ],
    []
  );

  const renderOverview = () => {
    const customer = sections.customer?.data;
    const usersTotal = sections.users?.total ?? antispamItem?.utilisateursProteges ?? 0;
    const domainsTotal = sections.domains?.total ?? antispamItem?.domainesSurveilles ?? 0;
    const emailsTotal = sectionViews.emails?.total ?? sections.emails?.total ?? 0;
    const licenseTotal = sections.licenses?.summary?.total ?? antispamItem?.licencesTotales ?? null;
    const licenseUsed = sections.licenses?.summary?.used ?? antispamItem?.licencesUtilisees ?? null;
    const serversTotal = sections.servers?.total ?? 0;
    const sendersTotal = sections.senders?.total ?? 0;
    const spoolsTotal = sections.spools?.total ?? 0;
    if (asPage || embedded || embed) {
      const clientPanel = customer ? <StatsPanel title="Information client">
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
                <span>Statut</span>
                <strong>{customer.status}</strong>
              </li> : null}
            {licenseTotal != null || licenseUsed != null ? <li>
                <span>Licences</span>
                <strong>{licenseUsed != null && licenseTotal != null ? `${licenseUsed} / ${licenseTotal}` : licenseTotal ?? licenseUsed}</strong>
              </li> : null}
          </ul>
        </StatsPanel> : <StatsPanel title="Information client">
          <p className={dashStyles.panelDesc}>Aucune information client disponible.</p>
        </StatsPanel>;
      return <StatsDashboardBody className={dashStyles.bodyFill}>
          <div className={dashStyles.bodyFillTop}>
            <section className={dashStyles.sectionBlock}>
              <div className={dashStyles.kpiDualRow}>
                <div className={dashStyles.kpiDualGroup}>
                  <h3 className={dashStyles.sectionBlockTitle}>KPI globales</h3>
                  <div className={`${dashStyles.kpiGrid} ${dashStyles.kpiGrid5}`}>
                    <KpiCard icon="mdi:account-group-outline" label="Utilisateurs" value={usersTotal || 0} sub="Comptes protégés" />
                    <KpiCard icon="mdi:web" label="Domaines" value={domainsTotal || 0} sub="Domaines surveillés" />
                    <KpiCard icon="mdi:email-outline" label="E-mails" value={emailsTotal || 0} sub="Adresses admin" />
                    <KpiCard icon="mdi:email-arrow-right-outline" label="Expéditeurs" value={sendersTotal || 0} sub="Liste Protect" />
                    <KpiCard icon="mdi:email-multiple-outline" label="Files d’attente" value={spoolsTotal || 0} sub="Messages en file" />
                  </div>
                </div>
                <div className={dashStyles.kpiDualGroup}>
                  <h3 className={dashStyles.sectionBlockTitle}>KPI licences</h3>
                  <div className={`${dashStyles.kpiGrid} ${dashStyles.kpiGrid3}`}>
                    <KpiCard icon="mdi:license" label="Total" value={licenseTotal ?? 0} sub="Sièges achetés" />
                    <KpiCard icon="mdi:account-check-outline" label="Utilisées" value={licenseUsed ?? 0} sub="Sièges attribués" />
                    <KpiCard
                      icon="mdi:gauge"
                      label="Disponibles"
                      value={licenseTotal != null && licenseUsed != null ? Math.max(0, Number(licenseTotal) - Number(licenseUsed)) : 0}
                      sub="Restantes"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className={dashStyles.sectionBlock}>
              <h3 className={dashStyles.sectionBlockTitle}>Graphiques</h3>
              <AntispamOverviewCharts
                usersTotal={usersTotal}
                domainsTotal={domainsTotal}
                emailsTotal={emailsTotal}
                serversTotal={serversTotal}
                sendersTotal={sendersTotal}
                spoolsTotal={spoolsTotal}
                clientPanel={clientPanel}
              />
            </section>
          </div>

          <section className={`${dashStyles.sectionBlock} ${dashStyles.bodyFillSection}`}>
            <h3 className={dashStyles.sectionBlockTitle}>Événements</h3>
            <div className={styles.listSectionFill}>
              <SolutionOverviewDataTable
                fillHeight
                searchable
                searchPlaceholder="Rechercher un événement…"
                emptyLabel="Aucun événement enregistré pour l’instant."
                emptyIcon="mdi:history"
                rows={eventLog}
                columns={eventColumns}
              />
            </div>
          </section>
        </StatsDashboardBody>;
    }
    return <>
        <div className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{customerName}</h3>
          <p className={formStyles.sectionDesc}>
            Client Mailinblack Protect lié à {client?.name}. Dernière mise à jour :{" "}
            {formatDate(dashboard?.fetchedAt)}
            {lastPersistedAt ? <> · Dernier enregistrement : {formatDate(lastPersistedAt)}</> : null}
          </p>
        </div>

        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Utilisateurs</span>
            <span className={styles.kpiValue}>
              {sections.users?.total ?? antispamItem?.utilisateursProteges ?? "-"}
            </span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Licences</span>
            <span className={styles.kpiValue}>
              {licenseUsed != null && licenseTotal != null ? `${licenseUsed} / ${licenseTotal}` : licenseTotal ?? licenseUsed ?? "-"}
            </span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Domaines</span>
            <span className={styles.kpiValue}>
              {sections.domains?.total ?? antispamItem?.domainesSurveilles ?? "-"}
            </span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>E-mails</span>
            <span className={styles.kpiValue}>{sectionViews.emails?.total ?? sections.emails?.total ?? "-"}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Expéditeurs</span>
            <span className={styles.kpiValue}>{sections.senders?.total ?? "-"}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Files d’attente</span>
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
          Chargement des données Mailinblack…
        </div>;
    }
    if (loadError && !asPage && !embedded && !embed) return <SectionError error={loadError} />;
    let content;
    switch (activeSection) {
      case "directory":
      case "domains":
      case "users":
        content = (
          <div className={fillTables ? `${styles.dualTables} ${styles.listSectionFill}` : styles.dualTables}>
            <section className={styles.dualTablePane}>
              <h3 className={styles.dualTableTitle}>
                <Icon icon="mdi:web" width={14} height={14} aria-hidden />
                Domaines
              </h3>
              {renderListSection(sectionViews.domains, {
                fillHeight: fillTables
              })}
            </section>
            <section className={styles.dualTablePane}>
              <h3 className={styles.dualTableTitle}>
                <Icon icon="mdi:account-group-outline" width={14} height={14} aria-hidden />
                Utilisateurs
              </h3>
              {renderListSection(sectionViews.users, {
                fillHeight: fillTables,
                searchable: true,
                searchPlaceholder: "Rechercher un utilisateur…"
              })}
            </section>
          </div>
        );
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
  const mappingLabel = antispamItem?.mappingMode === "dedicated" ? "Tenant dédié" : "Tenant global";
  const openEnterprise = () => {
    if (!client?.id || !onNavigate) return;
    onNavigate("ContratDetail", {
      clientId: client.id,
      name: client.name
    });
  };
  if (embed) {
    if (loading && !dashboard && !loadError) {
      return <div className={styles.loadingBlock}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          Chargement des données Mailinblack…
        </div>;
    }
    return renderSectionContent();
  }
  const solutionSummary = formatAntispamSolutionSummary(antispamItem);
  const provider = getAntispamProvider(solutionSummary.providerId || "mailinblack");
  const providerImage = resolveAntispamProviderImage(solutionSummary.providerId || "mailinblack", provider);
  const providerIcon = provider?.icon || "mdi:email-secure-outline";

  if (asPage || embedded) {
    const clientName = client?.name || customerName || "-";
    const subtitle = client?.id && onNavigate ? <button type="button" className={styles.subtitleLink} onClick={openEnterprise}>
            {clientName}
          </button> : clientName;
    const syncAt = lastPersistedAt || dashboard?.fetchedAt;
    const headerMeta = syncAt ? <>
        <Icon icon="mdi:cloud-sync-outline" width={14} height={14} aria-hidden />
        <span>
          Dernière sync · <strong>{formatDate(syncAt)}</strong>
        </span>
      </> : <>
        <Icon icon="mdi:cloud-off-outline" width={14} height={14} aria-hidden />
        <span>Jamais synchronisé</span>
      </>;
    return <SolutionDetailPageLayout embedded={embedded} accent="mailinblack" title="Antispam" titleIcon={providerIcon} titleImage={providerImage} subtitle={subtitle} headerMeta={headerMeta} headerError={loadError} loading={loading} refreshing={refreshing} loadingMessage="Chargement des données Mailinblack…" onRefresh={embedded ? undefined : () => loadDashboard({
      persist: true
    })} refreshLabel="Actualiser et enregistrer" footerHint={`${mappingLabel}${customerId ? ` · ID ${customerId}` : ""}`} navEntries={navEntries} activeSection={activeSection} onSectionChange={setActiveSection} navAriaLabel="Sections">
        {renderSectionContent()}
      </SolutionDetailPageLayout>;
  }
  const shell = <div className={`${formStyles.shell} ${styles.shellWide}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="antispam-overview-title">
      <div className={styles.accentBarMailinblack} aria-hidden />
      <header className={formStyles.header}>
        <div className={formStyles.headerMain}>
          <div className={`${formStyles.headerIconWrap} ${providerImage ? styles.headerIconLogo : styles.headerIconMailinblack}`} aria-hidden>
            {providerImage ? <img src={providerImage} alt="" className={styles.headerLogoImg} /> : <Icon icon={providerIcon} />}
          </div>
          <div className={formStyles.headerText}>
            <p className={formStyles.eyebrow}>Cybersécurité · Mailinblack Protect</p>
            <h2 className={formStyles.title} id="antispam-overview-title">
              Antispam · {customerName}
            </h2>
            {mappingLabel ? <p className={formStyles.subtitle}>{mappingLabel}</p> : null}
          </div>
        </div>
        <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label="Fermer">
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
            Actualiser et enregistrer
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
