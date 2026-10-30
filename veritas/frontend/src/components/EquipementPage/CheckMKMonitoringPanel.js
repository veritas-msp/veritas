import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import SortIcon from "../Misc/SortableHeader/SortIcon";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";
import { fetchEquipmentRecentAlerts } from "../../api/supervisionAlerts";
import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import { formatEquipmentDetailRelative } from "./equipmentDetailPageI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./CheckMKMonitoringPanel.module.css";
import equipmentStyles from "./EquipmentPage.module.css";
import EquipmentEmptyState from "./EquipmentEmptyState";
import {
  CHECKMK_DATE_FILTER_OPTIONS,
  CHECKMK_AVAILABILITY_PERIOD_OPTIONS,
  SERVICE_STATE_META,
  EVENT_STATE_META,
  getCheckMKEventsInDateRange,
  getCheckMKAvailabilityUp,
  getCheckMKEventTimeMs,
  getEventStateNum,
  computeCheckMKKpis,
  formatEventTimestamp,
  formatServiceAge,
  getServiceLabel,
  filterAlertEventsOnly,
  formatRelativeFrench
} from "./checkmkMonitoringUtils";

const ROWS_PER_PAGE = 10;
const HOST_STATE_COLORS = {
  UP: "#13BA8E",
  DOWN: "#ef4444",
  UNREACHABLE: "#f59e0b"
};

function getServiceOutput(service) {
  return (
    service?.pluginOutput ||
    service?.plugin_output ||
    service?.longPluginOutput ||
    service?.long_plugin_output ||
    service?.output ||
    ""
  );
}

function formatHostTimestamp(raw) {
  if (raw == null || raw === "") return null;
  const num = Number(raw);
  if (!Number.isNaN(num) && num > 0) {
    const ms = num < 1e12 ? num * 1000 : num;
    return formatRelativeFrench(new Date(ms).toISOString());
  }
  return formatRelativeFrench(raw);
}

function severityToState(severity) {
  const key = String(severity || "").toLowerCase();
  if (key.includes("crit")) return 2;
  if (key.includes("warn")) return 1;
  if (key.includes("info") || key.includes("ok")) return 0;
  return 3;
}

function sortAlertRows(list, sort) {
  return [...list].sort((a, b) => {
    let cmp = 0;
    if (sort.col === "state") cmp = getEventStateNum(a) - getEventStateNum(b);
    else if (sort.col === "timestamp") {
      cmp = (getCheckMKEventTimeMs(a) ?? 0) - (getCheckMKEventTimeMs(b) ?? 0);
    } else if (sort.col === "service") {
      cmp = (a.service ?? "").localeCompare(b.service ?? "");
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

function CompactAlertList({ rows, emptyLabel, onOpenRow, locale }) {
  if (!rows.length) {
    return <EquipmentEmptyState icon="mdi:bell-off-outline" message={emptyLabel} compact />;
  }
  return (
    <ul className={styles.compactList}>
      {rows.map((event, idx) => {
        const stateNum = getEventStateNum(event);
        const meta = EVENT_STATE_META[Math.min(stateNum, 3)] || EVENT_STATE_META[3];
        const svc = event.service ?? event.log_service_description ?? "—";
        const msg = event.message ?? event.plugin_output ?? event.event_text ?? "—";
        const origin = event._origin;
        const when =
          event._whenLabel ||
          formatEventTimestamp(event) ||
          (event.at ? formatEquipmentDetailRelative(event.at, locale) : "—");
        return (
          <li
            key={event.id ?? `${origin || "ev"}-${svc}-${idx}`}
            className={styles.compactRow}
            onClick={() => onOpenRow?.(event)}
          >
            <span className={styles.statusBadge} style={{ backgroundColor: meta.color }}>
              {meta.label}
            </span>
            <div className={styles.compactRowMain}>
              <span className={styles.compactRowTitleRow}>
                {origin ? (
                  <span
                    className={`${styles.originChip} ${
                      origin === "centre"
                        ? styles.originChipCentre
                        : origin === "notif"
                          ? styles.originChipNotif
                          : styles.originChipCheckmk
                    }`}
                  >
                    {origin === "centre" ? "Centre" : origin === "notif" ? "Notif." : "CheckMK"}
                  </span>
                ) : null}
                <span className={styles.compactRowTitle} title={svc}>
                  {svc}
                </span>
              </span>
              {msg && msg !== "—" ? (
                <span className={styles.compactRowMsg} title={msg}>
                  {msg}
                </span>
              ) : null}
            </div>
            <span className={styles.compactRowTime}>{when}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function CheckMKMonitoringPanel({
  equipment,
  checkmkMapping,
  checkmkData,
  checkmkHostDetails,
  loadingCheckMK,
  loadingAvailability,
  checkmkAvailabilityPeriod,
  lastSyncedAt = null,
  layout = "default",
  /** "services" | "events" | null — filtre la vue (modale supervision). */
  section = null,
  /** When false (keep-alive hidden), skip heavy alert refetch. */
  active = true,
  onAvailabilityPeriodChange,
  onOpenService,
  onOpenEvent,
  onOpenMapping
}) {
  const locale = useAppLocale();
  const [serviceStateFilter, setServiceStateFilter] = useState(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceSort, setServiceSort] = useState({ col: "state", dir: "asc" });
  const [eventsSource, setEventsSource] = useState("centre");
  const [historyFilter, setHistoryFilter] = useState("1m");
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [centreAlerts, setCentreAlerts] = useState([]);
  const [loadingCentre, setLoadingCentre] = useState(false);
  const centreLoadedForRef = useRef("");

  const equipmentId = useMemo(() => getEquipmentDbId(equipment), [equipment]);
  const isReport = layout === "report";
  const panelClass =
    layout === "tab" || isReport
      ? `${styles.panel} ${styles.panelTab}${isReport ? ` ${styles.panelReport}` : ""}`
      : styles.panel;
  const services = checkmkData?.services?.services || [];

  const allEvents = useMemo(() => {
    const primary = checkmkData?.events?.events || [];
    const detailed = checkmkData?.hostEventsDetailed?.events || [];
    if (!detailed.length) return primary;
    const map = new Map();
    for (const e of [...primary, ...detailed]) {
      const key = `${e.id ?? ""}|${e.time ?? e.timestamp ?? ""}|${e.service ?? ""}|${String(e.message || "").slice(0, 60)}`;
      map.set(key, e);
    }
    return [...map.values()];
  }, [checkmkData]);

  const allNotifications =
    checkmkData?.notifications?.notifications || checkmkData?.notifications?.events || [];
  const availabilityByPeriod = checkmkData?.availabilityByPeriod || {};
  const kpis = useMemo(
    () =>
      computeCheckMKKpis({
        services,
        events: allEvents,
        availabilityByPeriod,
        eventsDateFilter: historyFilter
      }),
    [services, allEvents, availabilityByPeriod, historyFilter]
  );
  const availUp = getCheckMKAvailabilityUp(
    checkmkData?.availability ?? availabilityByPeriod[checkmkAvailabilityPeriod]
  );

  useEffect(() => {
    if (!equipmentId) {
      setCentreAlerts([]);
      centreLoadedForRef.current = "";
      return undefined;
    }
    if (!active) return undefined;
    if (centreLoadedForRef.current === String(equipmentId)) return undefined;
    let cancelled = false;
    (async () => {
      setLoadingCentre(true);
      try {
        const rows = await fetchEquipmentRecentAlerts(equipmentId, { days: 365, limit: 200 });
        if (!cancelled) {
          centreLoadedForRef.current = String(equipmentId);
          setCentreAlerts(
            (Array.isArray(rows) ? rows : []).filter(row => {
              const src = String(row.source || "").toLowerCase();
              return src === "supervision" || src === "monitoring";
            })
          );
        }
      } catch {
        if (!cancelled) setCentreAlerts([]);
      } finally {
        if (!cancelled) setLoadingCentre(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, equipmentId]);

  const liveProblemCount = useMemo(
    () => services.filter(s => {
      const state = s.state ?? 3;
      return state === 1 || state === 2;
    }).length,
    [services]
  );

  const filteredServices = useMemo(() => {
    let list = services;
    if (serviceStateFilter !== null) {
      list = list.filter(s => (s.state ?? 3) === serviceStateFilter);
    }
    if (serviceSearch.trim()) {
      const q = serviceSearch.toLowerCase();
      list = list.filter(s => {
        const label = getServiceLabel(s).toLowerCase();
        const output = getServiceOutput(s).toLowerCase();
        return label.includes(q) || output.includes(q);
      });
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (serviceSort.col === "state") cmp = (a.state ?? 3) - (b.state ?? 3);
      else if (serviceSort.col === "service") cmp = getServiceLabel(a).localeCompare(getServiceLabel(b));
      else if (serviceSort.col === "age") {
        const ts = s => s.lastStateChange ?? s.last_state_change ?? s.lastCheck ?? s.last_check ?? 0;
        cmp = ts(a) - ts(b);
      }
      return serviceSort.dir === "asc" ? cmp : -cmp;
    });
  }, [services, serviceStateFilter, serviceSearch, serviceSort]);

  const centreEventRows = useMemo(() => {
    return centreAlerts.map(alert => ({
      id: alert.id,
      service: alert.title || alert.typeKey || "Alerte",
      message: alert.subtitle || alert.criterionKey || "",
      state: severityToState(alert.severity),
      time: alert.at,
      at: alert.at,
      _origin: "centre",
      _whenLabel: formatEquipmentDetailRelative(alert.at, locale),
      _raw: alert
    }));
  }, [centreAlerts, locale]);

  const checkmkEventRows = useMemo(() => {
    const events = (allEvents || []).map(event => ({
      ...event,
      service: event.service ?? event.log_service_description ?? "—",
      message: event.message ?? event.plugin_output ?? event.event_text ?? "—",
      _origin: "checkmk"
    }));
    const notifs = (allNotifications || []).map(event => ({
      ...event,
      service: event.service ?? event.log_service_description ?? event.contact ?? "Notification",
      message: event.message ?? event.plugin_output ?? event.event_text ?? "—",
      _origin: "notif"
    }));
    const rangedEvents = filterAlertEventsOnly(getCheckMKEventsInDateRange(events, historyFilter));
    const rangedNotifs = getCheckMKEventsInDateRange(notifs, historyFilter);
    const eventList = rangedEvents.length || !events.length ? rangedEvents : getCheckMKEventsInDateRange(events, historyFilter);
    return [...eventList, ...rangedNotifs];
  }, [allEvents, allNotifications, historyFilter]);

  const centreFiltered = useMemo(() => {
    const ranged = getCheckMKEventsInDateRange(centreEventRows, historyFilter);
    if (!historySearch.trim()) return sortAlertRows(ranged, { col: "timestamp", dir: "desc" });
    const q = historySearch.toLowerCase();
    return sortAlertRows(
      ranged.filter(e => `${e.service} ${e.message}`.toLowerCase().includes(q)),
      { col: "timestamp", dir: "desc" }
    );
  }, [centreEventRows, historyFilter, historySearch]);

  const checkmkFiltered = useMemo(() => {
    if (!historySearch.trim()) return sortAlertRows(checkmkEventRows, { col: "timestamp", dir: "desc" });
    const q = historySearch.toLowerCase();
    return sortAlertRows(
      checkmkEventRows.filter(e => `${e.service} ${e.message} ${e._origin}`.toLowerCase().includes(q)),
      { col: "timestamp", dir: "desc" }
    );
  }, [checkmkEventRows, historySearch]);

  const activeHistory = eventsSource === "centre" ? centreFiltered : checkmkFiltered;
  const totalHistoryPages = Math.max(1, Math.ceil(activeHistory.length / ROWS_PER_PAGE));
  const paginatedHistory = activeHistory.slice(
    (historyPage - 1) * ROWS_PER_PAGE,
    historyPage * ROWS_PER_PAGE
  );

  const serviceCounts = {
    all: services.length,
    0: services.filter(s => (s.state ?? 3) === 0).length,
    1: services.filter(s => (s.state ?? 3) === 1).length,
    2: services.filter(s => (s.state ?? 3) === 2).length,
    3: services.filter(s => (s.state ?? 3) === 3).length
  };

  const toggleServiceSort = col => {
    setServiceSort(prev => {
      const next = cycleSortState({
        column: col,
        sortBy: prev.col,
        sortDirection: prev.dir,
        defaultSortBy: "state",
        defaultSortDirection: "asc"
      });
      return { col: next.sortBy, dir: next.sortDirection };
    });
  };

  if (!checkmkMapping?.checkmk_host_name) {
    return (
      <section className={`${panelClass} ${styles.panelTabEmpty}`.trim()}>
        <EquipmentEmptyState
          icon="mdi:radar"
          message="Mappez CheckMK pour afficher la supervision"
        >
          {onOpenMapping ? (
            <button type="button" className={styles.mapCta} onClick={onOpenMapping}>
              Mapper CheckMK
            </button>
          ) : null}
        </EquipmentEmptyState>
      </section>
    );
  }

  if (loadingCheckMK && !checkmkData) {
    return (
      <section className={`${panelClass} ${styles.panelCompact}`}>
        {!isReport ? (
          <div className={styles.hostHeader}>
            <div className={`${styles.skeleton} ${styles.skeletonHeader}`} />
            <div className={styles.kpiGrid}>
              {[1, 2, 3].map(i => (
                <div key={i} className={`${styles.skeleton} ${styles.skeletonKpi}`} />
              ))}
            </div>
          </div>
        ) : null}
        <div className={styles.splitLayout}>
          <div className={`${styles.skeleton} ${styles.skeletonSection}`} />
          {!isReport ? <div className={`${styles.skeleton} ${styles.skeletonSection}`} /> : null}
        </div>
      </section>
    );
  }

  if (!checkmkData) {
    return (
      <section className={`${panelClass} ${styles.panelTabEmpty}`.trim()}>
        <EquipmentEmptyState
          icon="mdi:radar"
          message="Aucune donnée CheckMK disponible"
        />
      </section>
    );
  }

  const hostState = checkmkHostDetails?.state;
  const hostStateColor = HOST_STATE_COLORS[hostState] || "#6b7280";
  const hostName =
    checkmkHostDetails?.hostName || checkmkHostDetails?.title || checkmkMapping.checkmk_host_name;
  const hostAlias = checkmkHostDetails?.alias || "";
  const showAlias = Boolean(hostAlias && hostAlias !== hostName);
  const lastCheckLabel = formatHostTimestamp(checkmkHostDetails?.lastCheck);
  const syncedLabel = lastSyncedAt
    ? formatEquipmentDetailRelative(lastSyncedAt, locale) || lastCheckLabel
    : lastCheckLabel;
  const cmkEventTotal = allEvents.length + allNotifications.length;
  const eventTotal = centreAlerts.length + cmkEventTotal;

  const showServices = !section || section === "services";
  const showEvents = !section || section === "events";
  const splitClass =
    section === "services" || section === "events"
      ? `${styles.splitLayout} ${styles.splitLayoutSingle}`
      : styles.splitLayout;

  const serviceFilterPills = (
    <div className={styles.filterPills}>
      <button
        type="button"
        className={`${styles.filterPill} ${serviceStateFilter === null ? styles.filterPillActive : ""}`}
        onClick={() => setServiceStateFilter(null)}
      >
        Tous
      </button>
      {SERVICE_STATE_META.filter(m => m.state !== 3).map(({ state, label, color }) => (
        <button
          key={state}
          type="button"
          className={`${styles.filterPill} ${serviceStateFilter === state ? styles.filterPillActive : ""}`}
          style={serviceStateFilter === state ? { borderColor: color, color } : undefined}
          onClick={() => setServiceStateFilter(serviceStateFilter === state ? null : state)}
        >
          {label} ({serviceCounts[state] || 0})
        </button>
      ))}
    </div>
  );

  const servicesTableBody = (
    <tbody>
      {filteredServices.length === 0 ? (
        <tr>
          <td colSpan={4} className={styles.emptyMsg}>
            Aucun service
          </td>
        </tr>
      ) : (
        filteredServices.map((service, idx) => {
          const state = service.state ?? 3;
          const meta = SERVICE_STATE_META[state] || SERVICE_STATE_META[3];
          const output = getServiceOutput(service);
          return (
            <tr key={service.id || idx} className={styles.dataRow} onClick={() => onOpenService(service)}>
              <td>
                <span className={styles.statusBadge} style={{ backgroundColor: meta.color }}>
                  {meta.label}
                </span>
              </td>
              <td className={styles.serviceName} title={getServiceLabel(service)}>
                {getServiceLabel(service)}
              </td>
              <td className={styles.messageCell} title={output || undefined}>
                {output || "—"}
              </td>
              <td className={styles.timeCell}>{formatServiceAge(service)}</td>
            </tr>
          );
        })
      )}
    </tbody>
  );

  const hostIdentityBlock = (
    <div className={styles.hostIdentity}>
      <Icon icon="simple-icons:checkmk" className={styles.hostIdentityIcon} aria-hidden />
      <div className={styles.hostIdentityBody}>
        <div className={styles.hostIdentityPrimary}>
          <span className={styles.hostName}>{hostName}</span>
          {hostState ? (
            <span
              className={styles.hostStateBadge}
              style={{
                background: `${hostStateColor}22`,
                color: hostStateColor,
                border: `1px solid ${hostStateColor}55`
              }}
            >
              <Icon icon={hostState === "UP" ? "mdi:check-circle" : "mdi:alert-circle"} aria-hidden />
              {hostState}
            </span>
          ) : null}
        </div>
        <div className={styles.hostIdentityMeta}>
          {[
            showAlias ? { key: "alias", label: hostAlias } : null,
            checkmkHostDetails?.ipAddress
              ? { key: "ip", label: checkmkHostDetails.ipAddress, mono: true }
              : null,
            checkmkMapping.checkmk_site
              ? { key: "site", label: `Site ${checkmkMapping.checkmk_site}` }
              : null
          ]
            .filter(Boolean)
            .map((part, index) => (
              <React.Fragment key={part.key}>
                {index > 0 ? <span className={styles.hostMetaSep} aria-hidden>·</span> : null}
                <span className={part.mono ? styles.ipText : undefined}>{part.label}</span>
              </React.Fragment>
            ))}
        </div>
      </div>
      {syncedLabel ? (
        <span className={styles.hostSync} title={lastSyncedAt || undefined}>
          <Icon icon="mdi:update" aria-hidden />
          {syncedLabel}
        </span>
      ) : null}
    </div>
  );

  const kpiGrid = (
    <div className={styles.kpiGrid} role="group" aria-label="Indicateurs CheckMK">
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Santé</span>
        <span
          className={`${styles.kpiValue} ${
            kpis.healthScore >= 90
              ? styles.kpiValueGood
              : kpis.healthScore >= 70
                ? styles.kpiValueWarn
                : styles.kpiValueBad
          }`}
        >
          {kpis.healthScore != null ? `${kpis.healthScore}%` : "—"}
        </span>
        <span className={styles.kpiSub}>
          {serviceCounts[0]} OK · {serviceCounts[1]} W · {serviceCounts[2]} C
          {liveProblemCount ? ` · ${liveProblemCount} alerte${liveProblemCount > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Disponibilité</span>
        <span className={`${styles.kpiValue} ${styles.kpiValueAccent}`}>
          {loadingAvailability ? "…" : availUp != null ? `${Math.round(availUp)}%` : "—"}
        </span>
        <div className={styles.kpiPeriodRow} role="group" aria-label="Période de disponibilité">
          {CHECKMK_AVAILABILITY_PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`${styles.periodPill} ${checkmkAvailabilityPeriod === value ? styles.periodPillActive : ""}`}
              onClick={() => onAvailabilityPeriodChange(value)}
              disabled={loadingAvailability}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {section !== "services" ? (
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Événements</span>
          <span className={styles.kpiValue}>{eventTotal}</span>
          <span className={styles.kpiSub}>
            {centreAlerts.length} centre · {cmkEventTotal} CheckMK
          </span>
        </div>
      ) : null}
    </div>
  );

  const isTabLayout = layout === "tab";

  return (
    <section className={`${panelClass} ${styles.panelCompact}${isTabLayout ? ` ${styles.panelTabBoard}` : ""}`.trim()}>
      {!isReport ? (
        isTabLayout ? (
          <>
            <header className={styles.boardToolbar}>{hostIdentityBlock}</header>
            {kpiGrid}
          </>
        ) : (
          <header className={styles.hostHeader}>
            {!section ? (
              hostIdentityBlock
            ) : (
              <div className={styles.hostIdentityCompact}>
                {hostState ? (
                  <span
                    className={styles.hostStateBadge}
                    style={{
                      background: `${hostStateColor}22`,
                      color: hostStateColor,
                      border: `1px solid ${hostStateColor}55`
                    }}
                  >
                    <Icon icon={hostState === "UP" ? "mdi:check-circle" : "mdi:alert-circle"} aria-hidden />
                    {hostState}
                  </span>
                ) : null}
                {syncedLabel ? (
                  <span className={styles.hostSync} title={lastSyncedAt || undefined}>
                    <Icon icon="mdi:update" aria-hidden />
                    {syncedLabel}
                  </span>
                ) : null}
              </div>
            )}
            {kpiGrid}
          </header>
        )
      ) : null}

      <div className={`${splitClass}${isReport ? ` ${styles.splitLayoutReport}` : ""}${isTabLayout ? ` ${styles.boardStack}` : ""}`.trim()}>
        {showServices ? (
        <div className={`${styles.section}${isReport ? ` ${styles.sectionReport}` : ""}`}>
          {!isReport ? (
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <Icon icon="mdi:server-network" className={styles.sectionTitleIcon} />
                Services monitorés
              </h3>
              <span className={styles.sectionCount}>
                {filteredServices.length}/{services.length}
              </span>
            </div>
          ) : null}
          {isReport ? (
            <div className={`${equipmentStyles.hardwarePageEmbedded} ${styles.reportTableHost}`}>
              <div className={`${equipmentStyles.embeddedFilterBar} ${equipmentStyles.embeddedFilterBarToolbar}`}>
                <div className={equipmentStyles.embeddedSearchWrap}>
                  <div className={equipmentStyles.embeddedSearchBox}>
                    <Icon icon="mdi:magnify" className={equipmentStyles.embeddedSearchIcon} aria-hidden />
                    <input
                      type="search"
                      className={equipmentStyles.embeddedSearchInput}
                      value={serviceSearch}
                      onChange={e => setServiceSearch(e.target.value)}
                      placeholder="Rechercher"
                      aria-label="Rechercher un service"
                    />
                    {serviceSearch ? (
                      <button
                        type="button"
                        className={equipmentStyles.embeddedSearchClear}
                        onClick={() => setServiceSearch("")}
                        aria-label="Effacer la recherche"
                      >
                        <Icon icon="mdi:close" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  <div className={equipmentStyles.embeddedSearchActions}>{serviceFilterPills}</div>
                </div>
              </div>
              <div className={equipmentStyles.equipmentTableSectionEmbedded}>
                <div className={`${equipmentStyles.tableScrollShell} ${styles.reportTableShell}`}>
                  <div className={`${equipmentStyles.tableWrapper} ${equipmentStyles.tableWrapperEmbedded} ${styles.reportTableScroll}`}>
                    <div className={equipmentStyles.tableCardSurface}>
                      <table className={`${equipmentStyles.equipmentTableEmbedded} ${styles.reportTable}`}>
                        <thead>
                          <tr>
                            <th onClick={() => toggleServiceSort("state")}>
                              <span className={equipmentStyles.thContent}>
                                Statut
                                <SortIcon active={serviceSort.col === "state"} direction={serviceSort.dir} />
                              </span>
                            </th>
                            <th onClick={() => toggleServiceSort("service")}>
                              <span className={equipmentStyles.thContent}>
                                Service
                                <SortIcon active={serviceSort.col === "service"} direction={serviceSort.dir} />
                              </span>
                            </th>
                            <th>
                              <span className={equipmentStyles.thContent}>Sortie</span>
                            </th>
                            <th onClick={() => toggleServiceSort("age")} title="Durée dans l'état actuel">
                              <span className={equipmentStyles.thContent}>
                                Âge
                                <SortIcon active={serviceSort.col === "age"} direction={serviceSort.dir} />
                              </span>
                            </th>
                          </tr>
                        </thead>
                        {servicesTableBody}
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.toolbar}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Rechercher…"
                  value={serviceSearch}
                  onChange={e => setServiceSearch(e.target.value)}
                />
                {serviceFilterPills}
              </div>
              <div className={`${styles.tableWrap} ${styles.tableWrapFill}`}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th onClick={() => toggleServiceSort("state")}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          Statut
                          <SortIcon active={serviceSort.col === "state"} direction={serviceSort.dir} />
                        </span>
                      </th>
                      <th onClick={() => toggleServiceSort("service")}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          Service
                          <SortIcon active={serviceSort.col === "service"} direction={serviceSort.dir} />
                        </span>
                      </th>
                      <th>Sortie</th>
                      <th onClick={() => toggleServiceSort("age")} title="Durée dans l'état actuel">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          Âge
                          <SortIcon active={serviceSort.col === "age"} direction={serviceSort.dir} />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  {servicesTableBody}
                </table>
              </div>
            </>
          )}
        </div>
        ) : null}

        {showEvents ? (
        <div className={`${styles.section}${isReport ? ` ${styles.sectionReport}` : ""}`}>
          {!isReport ? (
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <Icon icon="mdi:bell-ring" className={styles.sectionTitleIcon} />
                Événements
              </h3>
              <div className={styles.rightTabs}>
                <button
                  type="button"
                  className={`${styles.rightTab} ${eventsSource === "centre" ? styles.rightTabActive : ""}`}
                  onClick={() => {
                    setEventsSource("centre");
                    setHistoryPage(1);
                  }}
                >
                  Centre ({centreAlerts.length})
                </button>
                <button
                  type="button"
                  className={`${styles.rightTab} ${eventsSource === "checkmk" ? styles.rightTabActive : ""}`}
                  onClick={() => {
                    setEventsSource("checkmk");
                    setHistoryPage(1);
                  }}
                >
                  CheckMK ({allEvents.length + allNotifications.length})
                </button>
              </div>
            </div>
          ) : (
            <div className={`${equipmentStyles.hardwarePageEmbedded} ${styles.reportEventsToolbar}`}>
              <div className={`${equipmentStyles.embeddedFilterBar} ${equipmentStyles.embeddedFilterBarToolbar}`}>
                <div className={equipmentStyles.embeddedSearchWrap}>
                  <div className={equipmentStyles.embeddedSearchBox}>
                    <Icon icon="mdi:magnify" className={equipmentStyles.embeddedSearchIcon} aria-hidden />
                    <input
                      type="search"
                      className={equipmentStyles.embeddedSearchInput}
                      value={historySearch}
                      onChange={e => {
                        setHistorySearch(e.target.value);
                        setHistoryPage(1);
                      }}
                      placeholder="Rechercher"
                      aria-label="Rechercher un événement"
                    />
                    {historySearch ? (
                      <button
                        type="button"
                        className={equipmentStyles.embeddedSearchClear}
                        onClick={() => {
                          setHistorySearch("");
                          setHistoryPage(1);
                        }}
                        aria-label="Effacer la recherche"
                      >
                        <Icon icon="mdi:close" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  <div className={equipmentStyles.embeddedSearchActions}>
                    <div className={styles.rightTabs}>
                      <button
                        type="button"
                        className={`${styles.rightTab} ${eventsSource === "centre" ? styles.rightTabActive : ""}`}
                        onClick={() => {
                          setEventsSource("centre");
                          setHistoryPage(1);
                        }}
                      >
                        Centre ({centreAlerts.length})
                      </button>
                      <button
                        type="button"
                        className={`${styles.rightTab} ${eventsSource === "checkmk" ? styles.rightTabActive : ""}`}
                        onClick={() => {
                          setEventsSource("checkmk");
                          setHistoryPage(1);
                        }}
                      >
                        CheckMK ({allEvents.length + allNotifications.length})
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={`${styles.periodBar}${isReport ? ` ${styles.periodBarReport}` : ""}`}>
            {CHECKMK_DATE_FILTER_OPTIONS.map(({ value, shortLabel, label }) => (
              <button
                key={value}
                type="button"
                className={`${styles.periodPill} ${historyFilter === value ? styles.periodPillActive : ""}`}
                onClick={() => {
                  setHistoryFilter(value);
                  setHistoryPage(1);
                }}
                title={label}
              >
                {shortLabel || label}
              </button>
            ))}
          </div>
          {!isReport ? (
          <div className={styles.toolbar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Rechercher…"
              value={historySearch}
              onChange={e => {
                setHistorySearch(e.target.value);
                setHistoryPage(1);
              }}
            />
          </div>
          ) : null}

          {loadingCentre && eventsSource === "centre" && !paginatedHistory.length ? (
            <EquipmentEmptyState message="Chargement…" icon={null} compact />
          ) : isReport ? (
            <div className={`${equipmentStyles.hardwarePageEmbedded} ${styles.reportEventsHost}`}>
              <div className={equipmentStyles.equipmentTableSectionEmbedded}>
                <div className={`${equipmentStyles.tableScrollShell} ${styles.reportTableShell}`}>
                  <div className={`${equipmentStyles.tableWrapper} ${equipmentStyles.tableWrapperEmbedded} ${styles.reportEventsScroll}`}>
                    <div className={equipmentStyles.tableCardSurface}>
                      <CompactAlertList
                        rows={paginatedHistory}
                        locale={locale}
                        emptyLabel={
                          eventsSource === "centre"
                            ? "Aucun événement du centre de supervision sur cette période."
                            : allEvents.length + allNotifications.length === 0
                              ? "Aucun event / notification CheckMK synchronisé."
                              : "Aucun événement CheckMK sur cette période."
                        }
                        onOpenRow={row => {
                          if (row?._origin === "centre") return;
                          onOpenEvent?.(row._raw || row);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <CompactAlertList
              rows={paginatedHistory}
              locale={locale}
              emptyLabel={
                eventsSource === "centre"
                  ? "Aucun événement du centre de supervision sur cette période."
                  : allEvents.length + allNotifications.length === 0
                    ? "Aucun event / notification CheckMK synchronisé."
                    : "Aucun événement CheckMK sur cette période."
              }
              onOpenRow={row => {
                if (row?._origin === "centre") return;
                onOpenEvent?.(row._raw || row);
              }}
            />
          )}

          {totalHistoryPages > 1 ? (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={historyPage === 1}
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
              >
                <Icon icon="mdi:chevron-left" />
              </button>
              <span className={styles.pageInfo}>
                {historyPage}/{totalHistoryPages} ({activeHistory.length})
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={historyPage === totalHistoryPages}
                onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
              >
                <Icon icon="mdi:chevron-right" />
              </button>
            </div>
          ) : null}
        </div>
        ) : null}
      </div>
    </section>
  );
}
