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
  getEventsFilterShortLabel,
  formatRelativeFrench
} from "./checkmkMonitoringUtils";

const ROWS_PER_PAGE = 8;
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

function CompactAlertList({ rows, emptyLabel, onOpenRow }) {
  if (!rows.length) {
    return <div className={styles.compactEmpty}>{emptyLabel}</div>;
  }
  return (
    <ul className={styles.compactList}>
      {rows.map((event, idx) => {
        const stateNum = getEventStateNum(event);
        const meta = EVENT_STATE_META[Math.min(stateNum, 3)] || EVENT_STATE_META[3];
        const svc = event.service ?? event.log_service_description ?? "—";
        const msg = event.message ?? event.plugin_output ?? event.event_text ?? "—";
        return (
          <li key={event.id ?? `${svc}-${idx}`} className={styles.compactRow} onClick={() => onOpenRow?.(event)}>
            <span className={styles.statusBadge} style={{ backgroundColor: meta.color }}>
              {meta.label}
            </span>
            <div className={styles.compactRowMain}>
              <span className={styles.compactRowTitle} title={svc}>
                {svc}
              </span>
              <span className={styles.compactRowMsg} title={msg}>
                {msg}
              </span>
            </div>
            <span className={styles.compactRowTime}>{formatEventTimestamp(event)}</span>
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
  layout = "default",
  onAvailabilityPeriodChange,
  onOpenService,
  onOpenEvent,
  onOpenMapping
}) {
  const [serviceStateFilter, setServiceStateFilter] = useState(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceSort, setServiceSort] = useState({ col: "state", dir: "asc" });
  const [rightTab, setRightTab] = useState("events");
  const [historyFilter, setHistoryFilter] = useState("1m");
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);

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
        eventsDateFilter: historyFilter
      }),
    [services, allEvents, availabilityByPeriod, historyFilter]
  );
  const availUp = getCheckMKAvailabilityUp(
    checkmkData?.availability ?? availabilityByPeriod[checkmkAvailabilityPeriod]
  );

  // Live problems from current service states (independent of event history).
  const liveProblems = useMemo(() => {
    return services
      .filter(s => {
        const state = s.state ?? 3;
        return state === 1 || state === 2;
      })
      .map(s => ({
        id: `live-${s.id || getServiceLabel(s)}`,
        service: getServiceLabel(s),
        state: s.state ?? 3,
        message: getServiceOutput(s) || "Problème actuel",
        time: s.lastStateChange ?? s.last_state_change ?? s.lastCheck ?? s.last_check ?? null,
        _live: true
      }))
      .sort((a, b) => (b.state ?? 0) - (a.state ?? 0));
  }, [services]);

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

  const historySource = rightTab === "notifications" ? allNotifications : allEvents;
  const historyInRange = useMemo(() => {
    const ranged = getCheckMKEventsInDateRange(historySource, historyFilter);
    // Prefer alert rows; if history exists but none parse as alert, still show all.
    const alerts = filterAlertEventsOnly(ranged);
    return alerts.length > 0 || ranged.length === 0 ? alerts : ranged;
  }, [historySource, historyFilter]);

  const filteredHistory = useMemo(() => {
    let list = historyInRange;
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      list = list.filter(e => {
        const msg = e.message ?? e.plugin_output ?? e.event_text ?? "";
        const svc = e.service ?? e.log_service_description ?? "";
        const type = e.type ?? "";
        return `${msg} ${svc} ${type}`.toLowerCase().includes(q);
      });
    }
    return sortAlertRows(list, { col: "timestamp", dir: "desc" });
  }, [historyInRange, historySearch]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / ROWS_PER_PAGE));
  const paginatedHistory = filteredHistory.slice(
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
    setServiceSort(prev =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }
    );
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
        <div className={styles.kpiStrip}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`${styles.skeleton} ${styles.skeletonKpi}`} />
          ))}
        </div>
        <div className={styles.splitLayout}>
          <div className={`${styles.skeleton} ${styles.skeletonSection}`} />
          <div className={`${styles.skeleton} ${styles.skeletonSection}`} />
        </div>
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
  const hostName =
    checkmkHostDetails?.hostName || checkmkHostDetails?.title || checkmkMapping.checkmk_host_name;
  const lastCheckLabel = formatHostTimestamp(checkmkHostDetails?.lastCheck);
  const eventsFilterLabel = getEventsFilterShortLabel(historyFilter);
  const rawEventsCount = allEvents.length;
  const rawNotifsCount = allNotifications.length;

  return (
    <section className={`${panelClass} ${styles.panelCompact}`}>
      <div className={styles.infoCard}>
        <div className={styles.infoCardTop}>
          <div className={styles.titleBlock}>
            <h2 className={styles.title}>
              <Icon icon="simple-icons:checkmk" className={styles.titleIcon} />
              <span className={styles.titleHost}>{hostName}</span>
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
              {checkmkHostDetails?.os || checkmkHostDetails?.osFamily ? (
                <span className={styles.labelChip}>{checkmkHostDetails.os || checkmkHostDetails.osFamily}</span>
              ) : null}
              {equipment?.name ? <span className={styles.labelChip}>Veritas · {equipment.name}</span> : null}
              {lastCheckLabel ? <span className={styles.labelChip}>Check · {lastCheckLabel}</span> : null}
              {checkmkHostDetails?.inDowntime ? <span className={styles.labelChip}>Downtime</span> : null}
            </div>
          </div>
        </div>

        <div className={styles.kpiStrip}>
          <div className={styles.kpiChip}>
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
            </span>
          </div>
          <div className={styles.kpiChip}>
            <span className={styles.kpiLabel}>Services</span>
            <span className={styles.kpiValue}>{kpis.totalServices}</span>
            <span className={styles.kpiSub}>monitorés</span>
          </div>
          <div className={styles.kpiChip}>
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
          <div className={styles.kpiChip}>
            <span className={styles.kpiLabel}>Problèmes live</span>
            <span className={`${styles.kpiValue} ${liveProblems.length ? styles.kpiValueBad : styles.kpiValueGood}`}>
              {liveProblems.length}
            </span>
            <span className={styles.kpiSub}>warn / crit actuels</span>
          </div>
          <div className={styles.kpiChip}>
            <span className={styles.kpiLabel}>Historique ({eventsFilterLabel})</span>
            <span className={styles.kpiValue}>{kpis.eventsInPeriod}</span>
            <span className={styles.kpiSub}>
              {rawEventsCount} events · {rawNotifsCount} notif.
            </span>
          </div>
        </div>
      </div>

      <div className={styles.splitLayout}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Icon icon="mdi:server-network" className={styles.sectionTitleIcon} />
              Services monitorés
            </h3>
            <span className={styles.sectionCount}>
              {filteredServices.length}/{services.length}
            </span>
          </div>
          <div className={styles.toolbar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Rechercher…"
              value={serviceSearch}
              onChange={e => setServiceSearch(e.target.value)}
            />
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
          </div>
          <div className={`${styles.tableWrap} ${styles.tableWrapFill}`}>
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
                </tr>
              </thead>
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
            </table>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Icon icon="mdi:bell-ring" className={styles.sectionTitleIcon} />
              Events & notifications
            </h3>
            <div className={styles.rightTabs}>
              <button
                type="button"
                className={`${styles.rightTab} ${rightTab === "events" ? styles.rightTabActive : ""}`}
                onClick={() => {
                  setRightTab("events");
                  setHistoryPage(1);
                }}
              >
                Events ({rawEventsCount})
              </button>
              <button
                type="button"
                className={`${styles.rightTab} ${rightTab === "notifications" ? styles.rightTabActive : ""}`}
                onClick={() => {
                  setRightTab("notifications");
                  setHistoryPage(1);
                }}
              >
                Notif. ({rawNotifsCount})
              </button>
            </div>
          </div>

          {liveProblems.length > 0 ? (
            <div className={styles.liveProblemsBlock}>
              <div className={styles.liveProblemsTitle}>
                <Icon icon="mdi:alert-circle" />
                Problèmes actuels ({liveProblems.length})
              </div>
              <CompactAlertList
                rows={liveProblems.slice(0, 5)}
                emptyLabel=""
                onOpenRow={row => {
                  const svc = services.find(s => getServiceLabel(s) === row.service);
                  if (svc) onOpenService?.(svc);
                }}
              />
            </div>
          ) : null}

          <div className={styles.periodBar}>
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

          <CompactAlertList
            rows={paginatedHistory}
            emptyLabel={
              rightTab === "notifications"
                ? rawNotifsCount === 0
                  ? "Aucune notification synchronisée. Forcez une sync pour remonter l’historique CheckMK."
                  : "Aucune notification sur cette période."
                : rawEventsCount === 0
                  ? "Aucun event historique synchronisé. Les problèmes live ci-dessus viennent de l’état actuel des services."
                  : "Aucun event sur cette période."
            }
            onOpenRow={onOpenEvent}
          />

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
                {historyPage}/{totalHistoryPages} ({filteredHistory.length})
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
      </div>
    </section>
  );
}
