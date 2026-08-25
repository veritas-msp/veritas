import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import styles from "./CheckMKMonitoringPanel.module.css";
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
  isCalendarMonthFilter,
  getEventCalendarMonths,
  getEventsFilterShortLabel,
  formatCalendarFilterLabel,
  formatRelativeFrench
} from "./checkmkMonitoringUtils";

const EVENTS_PER_PAGE = 12;
const HOST_STATE_COLORS = {
  UP: "#13BA8E",
  DOWN: "#ef4444",
  UNREACHABLE: "#f59e0b"
};

function TrendBadge({ value }) {
  if (value == null || value === 0) {
    return <span className={styles.kpiTrendFlat}>stable</span>;
  }
  const isUp = value > 0;
  return (
    <span className={isUp ? styles.kpiTrendUp : styles.kpiTrendDown}>
      {isUp ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
}

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
  if (raw == null || raw === "") return "—";
  const num = Number(raw);
  if (!Number.isNaN(num) && num > 0) {
    const ms = num < 1e12 ? num * 1000 : num;
    return formatRelativeFrench(new Date(ms).toISOString());
  }
  return formatRelativeFrench(raw);
}

function HostInfoItem({ label, value, mono = false }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className={styles.hostInfoItem}>
      <span className={styles.hostInfoLabel}>{label}</span>
      <span className={`${styles.hostInfoValue} ${mono ? styles.hostInfoMono : ""}`} title={String(value)}>
        {String(value)}
      </span>
    </div>
  );
}

function AlertTable({
  rows,
  emptyLabel,
  sort,
  onToggleSort,
  onOpenRow,
  page,
  totalPages,
  onPageChange,
  totalCount
}) {
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => onToggleSort("state")}>
                Statut {sort.col === "state" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th onClick={() => onToggleSort("service")}>
                Service {sort.col === "service" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th>Message</th>
              <th onClick={() => onToggleSort("timestamp")}>
                Date {sort.col === "timestamp" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyMsg}>
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((event, idx) => {
                const stateNum = getEventStateNum(event);
                const meta = EVENT_STATE_META[Math.min(stateNum, 3)] || EVENT_STATE_META[3];
                const svc = event.service ?? event.log_service_description ?? "—";
                const msg = event.message ?? event.plugin_output ?? event.event_text ?? "—";
                return (
                  <tr key={event.id ?? idx} className={styles.dataRow} onClick={() => onOpenRow?.(event)}>
                    <td>
                      <span className={styles.statusBadge} style={{ backgroundColor: meta.color }}>
                        {meta.label}
                      </span>
                    </td>
                    <td className={styles.serviceName} title={svc}>
                      {svc}
                    </td>
                    <td className={styles.messageCell} title={msg}>
                      {msg}
                    </td>
                    <td className={styles.timeCell}>{formatEventTimestamp(event)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button type="button" className={styles.pageBtn} disabled={page === 1} onClick={() => onPageChange(1)}>
            <Icon icon="mdi:chevron-double-left" />
          </button>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <Icon icon="mdi:chevron-left" />
          </button>
          <span className={styles.pageInfo}>
            {page} / {totalPages} ({totalCount})
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            <Icon icon="mdi:chevron-right" />
          </button>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page === totalPages}
            onClick={() => onPageChange(totalPages)}
          >
            <Icon icon="mdi:chevron-double-right" />
          </button>
        </div>
      )}
    </>
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
  layout = "default",
  onAvailabilityPeriodChange,
  onOpenService,
  onOpenEvent,
  onOpenMapping
}) {
  const [serviceStateFilter, setServiceStateFilter] = useState(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceSort, setServiceSort] = useState({ col: "state", dir: "asc" });
  const [eventsDateFilter, setEventsDateFilter] = useState("1m");
  const [eventStateFilter, setEventStateFilter] = useState(null);
  const [eventServiceFilter, setEventServiceFilter] = useState(null);
  const [eventsSearch, setEventsSearch] = useState("");
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsSort, setEventsSort] = useState({ col: "timestamp", dir: "desc" });
  const [notifDateFilter, setNotifDateFilter] = useState("1m");
  const [notifStateFilter, setNotifStateFilter] = useState(null);
  const [notifSearch, setNotifSearch] = useState("");
  const [notifPage, setNotifPage] = useState(1);
  const [notifSort, setNotifSort] = useState({ col: "timestamp", dir: "desc" });

  const panelClass = layout === "tab" ? `${styles.panel} ${styles.panelTab}` : styles.panel;
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
        eventsDateFilter
      }),
    [services, allEvents, availabilityByPeriod, eventsDateFilter]
  );
  const availUp = getCheckMKAvailabilityUp(
    checkmkData?.availability ?? availabilityByPeriod[checkmkAvailabilityPeriod]
  );
  const notifsInRange = useMemo(
    () => getCheckMKEventsInDateRange(allNotifications, notifDateFilter),
    [allNotifications, notifDateFilter]
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

  const eventsInRange = useMemo(
    () => filterAlertEventsOnly(getCheckMKEventsInDateRange(allEvents, eventsDateFilter)),
    [allEvents, eventsDateFilter]
  );
  const calendarMonthOptions = useMemo(
    () => getEventCalendarMonths(filterAlertEventsOnly(allEvents)),
    [allEvents]
  );
  const isCalendarFilter = isCalendarMonthFilter(eventsDateFilter);
  const eventsFilterLabel = getEventsFilterShortLabel(eventsDateFilter);
  const eventServices = useMemo(() => {
    const set = new Set(eventsInRange.map(e => e.service ?? e.log_service_description).filter(Boolean));
    return [...set].sort();
  }, [eventsInRange]);

  const sortAlertRows = (list, sort) =>
    [...list].sort((a, b) => {
      let cmp = 0;
      if (sort.col === "state") cmp = getEventStateNum(a) - getEventStateNum(b);
      else if (sort.col === "timestamp") {
        cmp = (getCheckMKEventTimeMs(a) ?? 0) - (getCheckMKEventTimeMs(b) ?? 0);
      } else if (sort.col === "service") {
        cmp = (a.service ?? "").localeCompare(b.service ?? "");
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });

  const filteredEvents = useMemo(() => {
    let list = eventsInRange;
    if (eventStateFilter !== null) list = list.filter(e => getEventStateNum(e) === eventStateFilter);
    if (eventServiceFilter) {
      list = list.filter(e => (e.service ?? e.log_service_description) === eventServiceFilter);
    }
    if (eventsSearch.trim()) {
      const q = eventsSearch.toLowerCase();
      list = list.filter(e => {
        const msg = e.message ?? e.plugin_output ?? e.event_text ?? "";
        const svc = e.service ?? e.log_service_description ?? "";
        return `${msg} ${svc}`.toLowerCase().includes(q);
      });
    }
    return sortAlertRows(list, eventsSort);
  }, [eventsInRange, eventStateFilter, eventServiceFilter, eventsSearch, eventsSort]);

  const filteredNotifications = useMemo(() => {
    let list = notifsInRange;
    if (notifStateFilter !== null) list = list.filter(e => getEventStateNum(e) === notifStateFilter);
    if (notifSearch.trim()) {
      const q = notifSearch.toLowerCase();
      list = list.filter(e => {
        const msg = e.message ?? e.plugin_output ?? "";
        const svc = e.service ?? "";
        const type = e.type ?? "";
        return `${msg} ${svc} ${type}`.toLowerCase().includes(q);
      });
    }
    return sortAlertRows(list, notifSort);
  }, [notifsInRange, notifStateFilter, notifSearch, notifSort]);

  const totalEventPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));
  const paginatedEvents = filteredEvents.slice((eventsPage - 1) * EVENTS_PER_PAGE, eventsPage * EVENTS_PER_PAGE);
  const totalNotifPages = Math.max(1, Math.ceil(filteredNotifications.length / EVENTS_PER_PAGE));
  const paginatedNotifications = filteredNotifications.slice(
    (notifPage - 1) * EVENTS_PER_PAGE,
    notifPage * EVENTS_PER_PAGE
  );

  const toggleServiceSort = col => {
    setServiceSort(prev =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }
    );
  };
  const toggleEventsSort = col => {
    setEventsSort(prev =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }
    );
  };
  const toggleNotifSort = col => {
    setNotifSort(prev =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }
    );
  };

  const serviceCounts = {
    all: services.length,
    0: services.filter(s => (s.state ?? 3) === 0).length,
    1: services.filter(s => (s.state ?? 3) === 1).length,
    2: services.filter(s => (s.state ?? 3) === 2).length,
    3: services.filter(s => (s.state ?? 3) === 3).length
  };
  const eventStateCounts = {
    all: eventsInRange.length,
    1: eventsInRange.filter(e => getEventStateNum(e) === 1).length,
    2: eventsInRange.filter(e => getEventStateNum(e) === 2).length
  };
  const notifStateCounts = {
    all: notifsInRange.length,
    1: notifsInRange.filter(e => getEventStateNum(e) === 1).length,
    2: notifsInRange.filter(e => getEventStateNum(e) === 2).length
  };

  if (!checkmkMapping?.checkmk_host_name) {
    return (
      <section className={panelClass}>
        <div className={styles.emptyMsg}>
          <Icon icon="simple-icons:checkmk" className={styles.emptyIcon} aria-hidden />
          <h5 className={styles.emptyTitle}>Périphérique non mappé</h5>
          <p className={styles.emptyText}>Mappez cet équipement à CheckMK pour afficher la supervision.</p>
          <button type="button" className={styles.mapCta} onClick={onOpenMapping}>
            Mapper CheckMK
          </button>
        </div>
      </section>
    );
  }

  if (loadingCheckMK && !checkmkData) {
    return (
      <section className={panelClass}>
        <div className={`${styles.skeleton} ${styles.skeletonHeader}`} />
        <div className={styles.kpiGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className={`${styles.skeleton} ${styles.skeletonKpi}`} />
          ))}
        </div>
        <div className={`${styles.skeleton} ${styles.skeletonSection}`} />
        <div className={`${styles.skeleton} ${styles.skeletonSection}`} />
      </section>
    );
  }

  if (!checkmkData) {
    return (
      <section className={panelClass}>
        <div className={styles.emptyMsg}>Aucune donnée CheckMK disponible.</div>
      </section>
    );
  }

  const hostState = checkmkHostDetails?.state;
  const hostStateColor = HOST_STATE_COLORS[hostState] || "#6b7280";
  const hostStats = checkmkHostDetails?.serviceStats || {};
  const hostGroups = Array.isArray(checkmkHostDetails?.hostGroups)
    ? checkmkHostDetails.hostGroups.join(", ")
    : "";
  const contactGroups = Array.isArray(checkmkHostDetails?.contactGroups)
    ? checkmkHostDetails.contactGroups.join(", ")
    : "";

  return (
    <section className={panelClass}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>
            <Icon icon="simple-icons:checkmk" className={styles.titleIcon} />
            {checkmkHostDetails?.hostName || checkmkHostDetails?.title || checkmkMapping.checkmk_host_name}
            {checkmkHostDetails?.alias ? <span className={styles.alias}>({checkmkHostDetails.alias})</span> : null}
          </h2>
          <div className={styles.metaRow}>
            {hostState ? (
              <span
                className={styles.hostStateBadge}
                style={{
                  background: `${hostStateColor}22`,
                  color: hostStateColor,
                  border: `1px solid ${hostStateColor}55`
                }}
              >
                <Icon icon={hostState === "UP" ? "mdi:check-circle" : "mdi:alert-circle"} />
                {hostState}
              </span>
            ) : null}
            {checkmkMapping.checkmk_site ? (
              <span className={styles.labelChip}>Site · {checkmkMapping.checkmk_site}</span>
            ) : null}
            {checkmkHostDetails?.ipAddress ? (
              <span className={styles.ipText}>{checkmkHostDetails.ipAddress}</span>
            ) : null}
            {checkmkHostDetails?.inDowntime ? (
              <span className={styles.labelChip}>Downtime</span>
            ) : null}
            {checkmkHostDetails?.acknowledged ? (
              <span className={styles.labelChip}>Ack</span>
            ) : null}
            {checkmkHostDetails?.labels &&
              Object.entries(checkmkHostDetails.labels)
                .slice(0, 8)
                .map(([k, v]) => (
                  <span key={k} className={styles.labelChip}>
                    {k}: {String(v)}
                  </span>
                ))}
          </div>
        </div>
      </div>

      <div className={styles.hostInfoSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <Icon icon="mdi:server" className={styles.sectionTitleIcon} />
            Hôte CheckMK
          </h3>
        </div>
        <div className={styles.hostInfoGrid}>
          <HostInfoItem label="OS" value={checkmkHostDetails?.os || checkmkHostDetails?.osFamily} />
          <HostInfoItem label="Agent" value={checkmkHostDetails?.agentVersion} />
          <HostInfoItem label="Commande" value={checkmkHostDetails?.checkCommand} mono />
          <HostInfoItem label="Dernier check" value={formatHostTimestamp(checkmkHostDetails?.lastCheck)} />
          <HostInfoItem label="Dernier changement" value={formatHostTimestamp(checkmkHostDetails?.lastStateChange)} />
          <HostInfoItem label="Période notif." value={checkmkHostDetails?.notificationPeriod} />
          <HostInfoItem label="Groupes hôte" value={hostGroups} />
          <HostInfoItem label="Contacts" value={contactGroups} />
          <HostInfoItem
            label="Services (hôte)"
            value={
              hostStats.total != null
                ? `${hostStats.ok ?? 0} OK · ${hostStats.warn ?? 0} warn · ${hostStats.crit ?? 0} crit · ${hostStats.unknown ?? 0} unk / ${hostStats.total}`
                : null
            }
          />
          <HostInfoItem label="Sortie plugin" value={checkmkHostDetails?.pluginOutput} />
          {equipment?.name ? <HostInfoItem label="Équipement Veritas" value={equipment.name} /> : null}
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Santé services</span>
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
            {kpis.okServices} OK · {kpis.warnServices} warn · {kpis.critServices} crit
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Services monitorés</span>
          <span className={styles.kpiValue}>{kpis.totalServices}</span>
          <span className={styles.kpiSub}>état temps réel CheckMK</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Disponibilité</span>
          <span className={`${styles.kpiValue} ${styles.kpiValueAccent}`}>
            {loadingAvailability ? "…" : availUp != null ? `${Math.round(availUp)}%` : "—"}
          </span>
          <div className={styles.kpiPeriodRow}>
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
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Alertes ({eventsFilterLabel})</span>
          <span className={styles.kpiValue}>{kpis.eventsInPeriod}</span>
          <span className={styles.kpiSub}>
            ~{kpis.eventsPerDay}/j · <TrendBadge value={kpis.eventTrend} />
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Critiques</span>
          <span className={`${styles.kpiValue} ${kpis.critCount > 0 ? styles.kpiValueBad : styles.kpiValueGood}`}>
            {kpis.critCount}
          </span>
          <span className={styles.kpiSub}>{kpis.warnCount} warnings sur la période</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Notifications</span>
          <span className={styles.kpiValue}>{notifsInRange.length}</span>
          <span className={styles.kpiSub}>
            {checkmkData?.notifications?.last_notification_timestamp
              ? `Dernière · ${formatRelativeFrench(checkmkData.notifications.last_notification_timestamp)}`
              : "envoyées par CheckMK"}
          </span>
        </div>
      </div>

      <div className={styles.sectionsStack}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Icon icon="mdi:server-network" className={styles.sectionTitleIcon} />
              Services monitorés
            </h3>
            <span className={styles.sectionCount}>
              {filteredServices.length} / {services.length}
            </span>
          </div>
          <div className={styles.toolbar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Rechercher un service…"
              value={serviceSearch}
              onChange={e => setServiceSearch(e.target.value)}
            />
            <div className={styles.filterPills}>
              <button
                type="button"
                className={`${styles.filterPill} ${serviceStateFilter === null ? styles.filterPillActive : ""}`}
                onClick={() => setServiceStateFilter(null)}
              >
                Tous ({serviceCounts.all})
              </button>
              {SERVICE_STATE_META.map(({ state, label, color }) => (
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
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => toggleServiceSort("state")}>
                    Statut {serviceSort.col === "state" ? (serviceSort.dir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => toggleServiceSort("service")}>
                    Service {serviceSort.col === "service" ? (serviceSort.dir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>Sortie</th>
                  <th onClick={() => toggleServiceSort("age")}>
                    Âge {serviceSort.col === "age" ? (serviceSort.dir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyMsg}>
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
                        <td>
                          <button
                            type="button"
                            className={styles.openBtn}
                            onClick={e => {
                              e.stopPropagation();
                              onOpenService(service);
                            }}
                            title="Ouvrir dans CheckMK"
                          >
                            <Icon icon="mdi:open-in-new" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Icon icon="mdi:timeline-alert" className={styles.sectionTitleIcon} />
              Events
            </h3>
            <span className={styles.sectionCount}>
              {filteredEvents.length} alerte{filteredEvents.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className={styles.periodBar}>
            <span className={styles.periodBarLabel}>Période :</span>
            {CHECKMK_DATE_FILTER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`${styles.periodPill} ${eventsDateFilter === value ? styles.periodPillActive : ""}`}
                onClick={() => {
                  setEventsDateFilter(value);
                  setEventsPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.calendarFilterBar}>
            <div className={styles.calendarFilterRow}>
              <span className={styles.periodBarLabel}>Mois :</span>
              <input
                type="month"
                className={styles.monthInput}
                value={isCalendarFilter ? eventsDateFilter : ""}
                onChange={e => {
                  const val = e.target.value;
                  if (val) {
                    setEventsDateFilter(val);
                    setEventsPage(1);
                  }
                }}
                max={`${new Date().getFullYear() + 5}-12`}
                min="2010-01"
              />
              {isCalendarFilter ? (
                <>
                  <button
                    type="button"
                    className={styles.calendarClearBtn}
                    onClick={() => {
                      setEventsDateFilter("1m");
                      setEventsPage(1);
                    }}
                  >
                    <Icon icon="mdi:close" />
                  </button>
                  <span className={styles.calendarActiveLabel}>{formatCalendarFilterLabel(eventsDateFilter)}</span>
                </>
              ) : null}
            </div>
            {calendarMonthOptions.length > 0 ? (
              <div className={styles.calendarMonthChips}>
                {calendarMonthOptions.map(({ key, count, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.calendarMonthChip} ${eventsDateFilter === key ? styles.calendarMonthChipActive : ""}`}
                    onClick={() => {
                      setEventsDateFilter(key);
                      setEventsPage(1);
                    }}
                  >
                    {label}
                    <span className={styles.calendarMonthChipCount}>{count}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className={styles.toolbar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Rechercher…"
              value={eventsSearch}
              onChange={e => {
                setEventsSearch(e.target.value);
                setEventsPage(1);
              }}
            />
            <div className={styles.filterPills}>
              <button
                type="button"
                className={`${styles.filterPill} ${eventStateFilter === null ? styles.filterPillActive : ""}`}
                onClick={() => {
                  setEventStateFilter(null);
                  setEventsPage(1);
                }}
              >
                Warn + Crit ({eventStateCounts.all})
              </button>
              {EVENT_STATE_META.filter(m => m.state === 1 || m.state === 2).map(({ state, label, color }) => (
                <button
                  key={state}
                  type="button"
                  className={`${styles.filterPill} ${eventStateFilter === state ? styles.filterPillActive : ""}`}
                  style={eventStateFilter === state ? { borderColor: color, color } : undefined}
                  onClick={() => {
                    setEventStateFilter(eventStateFilter === state ? null : state);
                    setEventsPage(1);
                  }}
                >
                  {label} ({eventStateCounts[state]})
                </button>
              ))}
            </div>
          </div>
          {eventServices.length > 0 ? (
            <div className={styles.toolbar} style={{ paddingTop: 0, borderBottom: "none" }}>
              <div className={styles.filterPills}>
                <button
                  type="button"
                  className={`${styles.filterPill} ${!eventServiceFilter ? styles.filterPillActive : ""}`}
                  onClick={() => {
                    setEventServiceFilter(null);
                    setEventsPage(1);
                  }}
                >
                  Tous services
                </button>
                {eventServices.slice(0, 8).map(svc => (
                  <button
                    key={svc}
                    type="button"
                    className={`${styles.filterPill} ${eventServiceFilter === svc ? styles.filterPillActive : ""}`}
                    onClick={() => {
                      setEventServiceFilter(eventServiceFilter === svc ? null : svc);
                      setEventsPage(1);
                    }}
                    title={svc}
                  >
                    {svc.length > 18 ? `${svc.slice(0, 16)}…` : svc}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <AlertTable
            rows={paginatedEvents}
            emptyLabel="Aucune alerte warning/critical sur cette période"
            sort={eventsSort}
            onToggleSort={toggleEventsSort}
            onOpenRow={onOpenEvent}
            page={eventsPage}
            totalPages={totalEventPages}
            onPageChange={setEventsPage}
            totalCount={filteredEvents.length}
          />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Icon icon="mdi:bell-ring" className={styles.sectionTitleIcon} />
              Notifications
            </h3>
            <span className={styles.sectionCount}>
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className={styles.periodBar}>
            <span className={styles.periodBarLabel}>Période :</span>
            {CHECKMK_DATE_FILTER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`${styles.periodPill} ${notifDateFilter === value ? styles.periodPillActive : ""}`}
                onClick={() => {
                  setNotifDateFilter(value);
                  setNotifPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.toolbar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Rechercher…"
              value={notifSearch}
              onChange={e => {
                setNotifSearch(e.target.value);
                setNotifPage(1);
              }}
            />
            <div className={styles.filterPills}>
              <button
                type="button"
                className={`${styles.filterPill} ${notifStateFilter === null ? styles.filterPillActive : ""}`}
                onClick={() => {
                  setNotifStateFilter(null);
                  setNotifPage(1);
                }}
              >
                Toutes ({notifStateCounts.all})
              </button>
              {EVENT_STATE_META.filter(m => m.state === 1 || m.state === 2).map(({ state, label, color }) => (
                <button
                  key={state}
                  type="button"
                  className={`${styles.filterPill} ${notifStateFilter === state ? styles.filterPillActive : ""}`}
                  style={notifStateFilter === state ? { borderColor: color, color } : undefined}
                  onClick={() => {
                    setNotifStateFilter(notifStateFilter === state ? null : state);
                    setNotifPage(1);
                  }}
                >
                  {label} ({notifStateCounts[state]})
                </button>
              ))}
            </div>
          </div>
          <AlertTable
            rows={paginatedNotifications}
            emptyLabel="Aucune notification CheckMK sur cette période"
            sort={notifSort}
            onToggleSort={toggleNotifSort}
            onOpenRow={onOpenEvent}
            page={notifPage}
            totalPages={totalNotifPages}
            onPageChange={setNotifPage}
            totalCount={filteredNotifications.length}
          />
        </div>
      </div>
    </section>
  );
}
