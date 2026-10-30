import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { ANTIVIRUS_OVERVIEW_SECTIONS } from "./antivirusOverviewSections";
import { fetchGravityZoneDashboard, fetchBitdefenderStatistics, fetchBitdefenderEnrichedEndpoints } from "../../api/clientBitdefender";
import { persistAntivirusEventLog, syncAndPersistAntivirusSolution } from "./antivirusSolutionUtils";
import { buildAntivirusEventLogUpdate, getAntivirusEventTypeMeta, normalizeAntivirusEventLog } from "./antivirusEventLogUtils";
import AntivirusOverviewCharts from "./AntivirusOverviewCharts";
import { showError, showSuccess } from "../../utils/toast";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./AntivirusOverviewModal.module.css";
import SolutionDetailPageLayout from "./SolutionDetailPageLayout";
import { KpiCard, StatsDashboardBody, statsDashboardStyles as dashStyles } from "./StatsDashboardWidgets";
import { UiKitKpiStrip } from "../UiKit";
import SolutionOverviewDataTable from "./SolutionOverviewDataTable";
import { getOsIconName } from "../EquipementPage/osIconUtils";

function formatDate(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("fr-FR");
  } catch {
    return String(value);
  }
}

function getEndpointOsLabel(row) {
  return row?.os || row?.operatingSystem || "";
}

/** Serveur vs poste de travail (OS + nom). */
function getEndpointRole(row) {
  const os = String(getEndpointOsLabel(row) || "").toLowerCase();
  const name = String(row?.name || row?.fqdn || "").toLowerCase();
  const looksServer =
    /\bserver\b/.test(os) ||
    os.includes("esxi") ||
    os.includes("hyper-v") ||
    os.includes("vcenter") ||
    os.includes("proxmox") ||
    /(^|[-_\s])(srv|server|dc|sql|exch|ad|fs)([-_\s]|$)/i.test(name);
  if (looksServer) {
    return { key: "server", label: "Serveur", icon: "mdi:server" };
  }
  return { key: "workstation", label: "Poste", icon: "mdi:laptop" };
}

function isEndpointInfected(row) {
  return row?.isInfected === true || row?.malwareDetected === true;
}

function buildEnrichedEndpointMap(list) {
  const map = new Map();
  for (const ep of Array.isArray(list) ? list : []) {
    if (ep?.id != null) {
      map.set(String(ep.id), ep);
      map.set(ep.id, ep);
    }
    const fallback = `${ep?.name ?? ""}|${ep?.ip ?? ""}|${ep?.fqdn ?? ""}`.trim();
    if (fallback && fallback !== "||") map.set(fallback, ep);
  }
  return map;
}

function mergeEndpointWithEnriched(row, enrichedMap) {
  if (!row) return row;
  const fallback = `${row.name ?? ""}|${row.ip ?? ""}|${row.fqdn ?? ""}`.trim();
  const enriched =
    (row.id != null ? enrichedMap.get(String(row.id)) || enrichedMap.get(row.id) : null) ||
    (fallback && fallback !== "||" ? enrichedMap.get(fallback) : null) ||
    null;
  const merged = enriched
    ? {
        ...row,
        ...enriched,
        id: row.id ?? enriched.id,
        name: row.name || enriched.name,
        ip: row.ip || enriched.ip,
        fqdn: row.fqdn || enriched.fqdn,
        type: row.type || enriched.type,
        machineType: row.machineType ?? enriched.machineType,
        isManaged: row.isManaged ?? enriched.isManaged,
        os: getEndpointOsLabel(row) || enriched.operatingSystem || enriched.os || null,
        operatingSystem: enriched.operatingSystem || getEndpointOsLabel(row) || null,
        isInfected: isEndpointInfected(enriched) || isEndpointInfected(row),
        malwareDetected: enriched.malwareDetected === true || row.malwareDetected === true
      }
    : {
        ...row,
        os: getEndpointOsLabel(row) || null,
        isInfected: isEndpointInfected(row)
      };
  const role = getEndpointRole(merged);
  return {
    ...merged,
    roleKey: role.key,
    roleLabel: role.label
  };
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
    return d.toLocaleDateString("fr-FR");
  } catch {
    return String(value);
  }
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
  emptyLabel = "Aucune donnée",
  emptyIcon = "mdi:inbox-outline",
  fillHeight = false,
  searchable = false,
  searchPlaceholder = "Rechercher"
}) {
  return (
    <SolutionOverviewDataTable
      columns={columns}
      rows={rows}
      emptyLabel={emptyLabel}
      emptyIcon={emptyIcon}
      fillHeight={fillHeight}
      searchable={searchable}
      searchPlaceholder={searchPlaceholder}
    />
  );
}
function renderListSection(section, {
  preview = false,
  fillHeight = false,
  searchable = false,
  searchPlaceholder = "Rechercher",
  emptyIcon = "mdi:inbox-outline"
} = {}) {
  const safe = section || {
    status: "empty",
    error: null,
    items: [],
    total: 0,
    columns: []
  };
  return <div className={fillHeight ? styles.listSectionFill : undefined}>
      {preview ? <div className={styles.previewBanner}>
          <Icon icon="mdi:flask-outline" aria-hidden />
          <span>
            API activée pour votre clé GravityZone mais pas encore intégrée à Veritas. Données
            affichées en lecture seule depuis GravityZone.
          </span>
        </div> : null}
      <DataTable
        columns={safe.columns || []}
        rows={safe.items || []}
        emptyLabel={
          safe.status === "permission_denied"
            ? "Accès refusé · activez cette API pour la clé GravityZone"
            : "Aucune donnée"
        }
        emptyIcon={emptyIcon}
        fillHeight={fillHeight}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
      />
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
  const [eventLog, setEventLog] = useState(() => normalizeAntivirusEventLog(cachedSync?.eventLog));
  const [lastPersistedAt, setLastPersistedAt] = useState(() => cachedSync?.lastSync || null);
  const [loadError, setLoadError] = useState(null);
  const eventLogRef = useRef(normalizeAntivirusEventLog(cachedSync?.eventLog));
  eventLogRef.current = eventLog;
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
        showSuccess("Données antivirus actualisées et enregistrées.");
        if (persisted.dashboard) {
          dashboardRef.current = persisted.dashboard;
          setDashboard(persisted.dashboard);
        }
        setStatistics(persisted.statistics || null);
        setEnrichedSummary(persisted.enrichedSummary || null);
        setEnrichedEndpoints(persisted.enrichedEndpoints || persisted.updatedPayload?.syncData?.enrichedEndpoints || null);
        setEventLog(normalizeAntivirusEventLog(persisted.eventLog || persisted.updatedPayload?.syncData?.eventLog));
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
      const nextEndpoints = enrichedRes?.endpoints || latest?.syncData?.enrichedEndpoints || null;
      const { eventLog: nextEventLog, addedCount } = buildAntivirusEventLogUpdate(
        eventLogRef.current.length ? eventLogRef.current : latest?.syncData?.eventLog,
        latest?.syncData?.enrichedEndpoints,
        nextEndpoints
      );
      dashboardRef.current = dashboardData;
      setDashboard(dashboardData);
      setStatistics(statisticsRes?.statistics || latest?.syncData?.statistics || null);
      setEnrichedSummary(enrichedRes?.summary || latest?.syncData?.enrichedSummary || null);
      setEnrichedEndpoints(nextEndpoints);
      setEventLog(nextEventLog);
      setLastPersistedAt(latest?.syncData?.lastSync || null);
      if (addedCount > 0 && clientId && latest) {
        try {
          await persistAntivirusEventLog(clientId, latest, nextEventLog, { signal });
          if (!signal.aborted && requestId === requestIdRef.current) {
            await onSyncedRef.current?.();
          }
        } catch (persistErr) {
          if (persistErr?.name !== "AbortError") {
            console.warn("Antivirus event log persist failed:", persistErr);
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
    if (cached?.eventLog) setEventLog(normalizeAntivirusEventLog(cached.eventLog));
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
    const quarantine = sections.quarantine;
    const policyUsage = collectPolicyUsage(enrichedEndpoints);
    const enrichedMap = buildEnrichedEndpointMap(enrichedEndpoints);
    const endpointColumns = [{
      key: "type",
      label: "Type",
      sortValue: row => row.roleLabel || getEndpointRole(row).label,
      render: row => {
        const role = getEndpointRole(row);
        return (
          <span className={styles.cellWithIcon}>
            <Icon icon={role.icon} width={18} height={18} aria-hidden />
            {role.label}
          </span>
        );
      }
    }, {
      key: "name",
      label: "Poste",
      sortValue: row => row.name || ""
    }, {
      key: "os",
      label: "OS",
      sortValue: row => getEndpointOsLabel(row) || "",
      render: row => {
        const osLabel = getEndpointOsLabel(row) || "-";
        const osIcon = osLabel !== "-" ? getOsIconName(osLabel, { withFallback: true }) : null;
        return (
          <span className={styles.cellWithIcon}>
            {osIcon ? <Icon icon={osIcon} width={18} height={18} aria-hidden /> : null}
            <span className={styles.cellTruncate}>{osLabel}</span>
          </span>
        );
      }
    }, {
      key: "ip",
      label: "IP",
      mono: true,
      sortValue: row => row.ip || ""
    }, {
      key: "isManaged",
      label: "Géré",
      headerHint: (
        <div className={styles.thHintBody}>
          <p>
            <strong>Poste géré :</strong> machine avec l’agent Bitdefender installé, administrée depuis GravityZone (politiques, mises à jour, scans, rapports).
          </p>
          <p>
            <strong>Poste non géré :</strong> machine détectée sur le réseau mais sans agent Bitdefender actif sous GravityZone.
          </p>
        </div>
      ),
      sortValue: row => (row.isManaged ? 1 : 0),
      render: row => (row.isManaged ? "Oui" : "Non")
    }, {
      key: "isInfected",
      label: "Infecté",
      sortValue: row => (isEndpointInfected(row) ? 1 : 0),
      render: row => {
        const infected = isEndpointInfected(row);
        return (
          <span className={infected ? styles.infectedBad : styles.infectedNeutral}>
            {infected ? "Oui" : "Non"}
          </span>
        );
      }
    }];
    const policyColumns = [{
      key: "name",
      label: "Politique",
      sortValue: row => row.name || "",
      render: row => <span className={styles.policyNameCell}>
          <Icon icon="mdi:shield-account-outline" width={16} height={16} aria-hidden />
          {row.name || "-"}
        </span>
    }, {
      key: "workstations",
      label: "Postes",
      sortValue: row => Number(row.workstations) || 0,
      render: row => row.workstations ?? 0
    }, {
      key: "appliedCount",
      label: "Appliquée",
      sortValue: row => Number(row.appliedCount) || 0,
      render: row => {
        const total = row.workstations ?? 0;
        const applied = row.appliedCount ?? 0;
        if (!total) return "0 / 0";
        return <span className={applied > 0 ? styles.appliedOk : styles.appliedIdle}>
            {applied} / {total}
          </span>;
      }
    }];
    const quarantineColumns = [{
      key: "fileName",
      label: "Fichier",
      sortValue: row => row.fileName || "",
      render: row => (
        <span className={styles.cellWithIcon}>
          <Icon icon="mdi:file-alert-outline" width={18} height={18} aria-hidden />
          <span className={styles.cellTruncate}>{row.fileName || "-"}</span>
        </span>
      )
    }, {
      key: "filePath",
      label: "Chemin",
      sortValue: row => row.filePath || "",
      render: row => <span className={styles.cellTruncate}>{row.filePath || "-"}</span>
    }, {
      key: "threat",
      label: "Menace",
      sortValue: row => row.threat || "",
      render: row => (
        <span className={styles.cellWithIcon}>
          <Icon icon="mdi:virus-outline" width={18} height={18} aria-hidden />
          <span className={styles.cellTruncate}>{row.threat || "-"}</span>
        </span>
      )
    }, {
      key: "endpoint",
      label: "Poste",
      sortValue: row => row.endpoint || "",
      render: row => row.endpoint || "-"
    }, {
      key: "quarantinedAt",
      label: "Date",
      sortValue: row => {
        const ms = row.quarantinedAt ? new Date(row.quarantinedAt).getTime() : NaN;
        return Number.isFinite(ms) ? ms : 0;
      },
      render: row => formatDate(row.quarantinedAt)
    }];
    const emptySection = (columns, error = null) => ({
      status: error ? "error" : "empty",
      error,
      items: [],
      total: 0,
      columns
    });
    return {
      endpoints: endpoints ? {
        ...endpoints,
        items: (endpoints.items || []).map(row => mergeEndpointWithEnriched(row, enrichedMap)),
        total: endpoints.total ?? (endpoints.items || []).length,
        columns: endpointColumns
      } : emptySection(endpointColumns),
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
        total: policies.total ?? (policies.items || []).length,
        columns: policyColumns
      } : emptySection(policyColumns),
      quarantine: quarantine ? {
        ...quarantine,
        items: quarantine.items || [],
        total: quarantine.total ?? (quarantine.items || []).length,
        columns: quarantineColumns
      } : emptySection(quarantineColumns)
    };
  }, [sections, enrichedEndpoints]);

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
        sortValue: row => getAntivirusEventTypeMeta(row.type).label,
        render: row => {
          const meta = getAntivirusEventTypeMeta(row.type);
          return (
            <span className={`${styles.eventTypeBadge} ${styles[`eventTone_${meta.tone}`] || ""}`}>
              <Icon icon={meta.icon} width={16} height={16} aria-hidden />
              {meta.label}
            </span>
          );
        }
      },
      {
        key: "endpointName",
        label: "Poste",
        sortValue: row => row.endpointName || "",
        render: row => row.endpointName || "-"
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
    const license = sections.license?.data;
    const endpoints = sections.endpoints;
    const licenseTotal = license?.total ?? 0;
    const licenseUsed = license?.used ?? 0;
    const licenseAvailable = license?.total != null && license?.used != null ? Math.max(0, license.total - license.used) : 0;
    const expirationDate = license?.expirationDate || antivirusItem?.expiration || antivirusItem?.syncData?.license?.expirationDate;
    if (asPage || embedded || embed) {
      const byType = statistics?.endpoints?.byType;
      const physical = byType?.physical || 0;
      const virtual = byType?.virtual || 0;
      const other = byType?.other || 0;
      const typeTotal = physical + virtual + other;
      const typePct = count => typeTotal > 0 ? Math.round(count / typeTotal * 100) : 0;
      return <StatsDashboardBody className={dashStyles.bodyFill}>
          <div className={dashStyles.bodyFillTop}>
            <section className={dashStyles.sectionBlock}>
              <div className={dashStyles.kpiDualRow}>
                <div className={dashStyles.kpiDualGroup}>
                  <h3 className={dashStyles.sectionBlockTitle}>KPI globales</h3>
                  <UiKitKpiStrip
                    variant="pills"
                    ariaLabel="KPI globales"
                    cards={[
                      { key: "endpoints", value: endpoints?.total ?? 0, label: "Postes" },
                      { key: "incidents", value: sections.incidents?.total ?? 0, label: "Incidents" },
                      { key: "quarantine", value: sections.quarantine?.total ?? 0, label: "Quarantaine" },
                      {
                        key: "health",
                        value: enrichedSummary?.total
                          ? `${Math.max(0, enrichedSummary.total - (enrichedSummary.infected || 0))}/${enrichedSummary.total}`
                          : "0/0",
                        label: "Santé"
                      }
                    ]}
                  />
                </div>
                <div className={dashStyles.kpiDualGroup}>
                  <h3 className={dashStyles.sectionBlockTitle}>KPI licences</h3>
                  <UiKitKpiStrip
                    variant="pills"
                    ariaLabel="KPI licences"
                    cards={[
                      { key: "license-total", value: licenseTotal, label: "Total" },
                      { key: "license-used", value: licenseUsed, label: "Utilisées" },
                      { key: "license-available", value: licenseAvailable, label: "Disponibles" },
                      { key: "license-exp", value: formatDateShort(expirationDate), label: "Expiration" }
                    ]}
                  />
                </div>
              </div>
            </section>

            <section className={dashStyles.sectionBlock}>
              <h3 className={dashStyles.sectionBlockTitle}>Types de postes</h3>
              <div className={`${dashStyles.kpiGrid} ${dashStyles.kpiGrid3}`}>
                <KpiCard icon="mdi:desktop-classic" label="Physiques" value={physical} sub={`${typePct(physical)} %`} />
                <KpiCard icon="mdi:cloud-outline" label="Virtuels" value={virtual} sub={`${typePct(virtual)} %`} />
                <KpiCard icon="mdi:devices" label="Autres" value={other} sub={`${typePct(other)} %`} />
              </div>
            </section>

            <section className={dashStyles.sectionBlock}>
              <h3 className={dashStyles.sectionBlockTitle}>Graphiques</h3>
              <AntivirusOverviewCharts variant="fleet" statistics={statistics} enrichedSummary={enrichedSummary} incidents={sections.incidents} hideEndpointTypes />
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
          <h3 className={formStyles.sectionTitle}>{companyName}</h3>
          <p className={formStyles.sectionDesc}>
            Société GravityZone liée à {client?.name}. Dernière lecture API :{" "}
            {formatDate(dashboard?.fetchedAt)}
            {lastPersistedAt ? <>
                {" "}
                · Dernier enregistrement : {formatDate(lastPersistedAt)}
              </> : null}
            .
          </p>
        </div>

        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{endpoints?.total ?? "-"}</div>
            <div className={styles.kpiLabel}>Postes inventoriés</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{sections.policies?.total ?? "-"}</div>
            <div className={styles.kpiLabel}>Politiques</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{sections.incidents?.total ?? "-"}</div>
            <div className={styles.kpiLabel}>Incidents</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{sections.quarantine?.total ?? "-"}</div>
            <div className={styles.kpiLabel}>Quarantaine</div>
          </div>
        </div>

        <div className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>Licences</h3>
        </div>
        <div className={styles.kpiGridLicense}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{licenseTotal}</div>
            <div className={styles.kpiLabel}>Total</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{licenseUsed}</div>
            <div className={styles.kpiLabel}>Utilisées</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{licenseAvailable}</div>
            <div className={styles.kpiLabel}>Disponibles</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{formatDateShort(expirationDate)}</div>
            <div className={styles.kpiLabel}>Expiration</div>
          </div>
        </div>

        <AntivirusOverviewCharts statistics={statistics} enrichedSummary={enrichedSummary} incidents={sections.incidents} />
      </>;
  };
  const renderSectionContent = () => {
    if (!asPage && !embedded && loading) {
      return <div className={styles.loadingBlock}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          Chargement des données GravityZone…
        </div>;
    }
    if (loadError && !asPage && !embedded && !embed) {
      return <SectionError error={loadError} />;
    }
    let content;
    switch (activeSection) {
      case "overview":
        content = renderOverview();
        break;
      case "endpoints":
        content = renderListSection(sectionViews.endpoints, {
          fillHeight: true,
          searchable: true,
          emptyIcon: "mdi:monitor-off"
        });
        break;
      case "policies":
        content = renderListSection(sectionViews.policies, {
          fillHeight: true,
          searchable: true,
          emptyIcon: "mdi:shield-account-outline"
        });
        break;
      case "quarantine":
        content = renderListSection(sectionViews.quarantine, {
          fillHeight: true,
          searchable: true,
          emptyIcon: "mdi:virus-outline"
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
  const mappingLabel = antivirusItem.mappingMode === "dedicated" ? "Tenant dédié" : "Tenant global";
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
          Chargement des données GravityZone…
        </div>;
    }
    return renderSectionContent();
  }
  if (asPage || embedded) {
    const clientName = client?.name || companyName || "-";
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
    return <SolutionDetailPageLayout embedded={embedded} accent="gravityzone" title="Antivirus" titleIcon="simple-icons:bitdefender" subtitle={subtitle} headerMeta={headerMeta} loading={loading} refreshing={refreshing} loadingMessage="Chargement des données GravityZone…" onRefresh={embedded ? undefined : () => loadDashboard({
      persist: true
    })} refreshLabel="Actualiser et enregistrer" footerHint={mappingLabel} navEntries={navEntries} activeSection={activeSection} onSectionChange={setActiveSection} navAriaLabel="Sections">
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
            <p className={formStyles.eyebrow}>Cybersécurité · GravityZone</p>
            <h2 className={formStyles.title} id="antivirus-overview-title">
              Antivirus · {companyName}
            </h2>
          </div>
        </div>
        {!asPage ? <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label="Fermer">
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
            {loading || refreshing ? "Actualisation…" : "Actualiser"}
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
