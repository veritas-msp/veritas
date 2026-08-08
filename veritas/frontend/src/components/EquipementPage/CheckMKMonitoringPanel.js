import React, { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import styles from './CheckMKMonitoringPanel.module.css';
import { CHECKMK_DATE_FILTER_OPTIONS, CHECKMK_AVAILABILITY_PERIOD_OPTIONS, SERVICE_STATE_META, EVENT_STATE_META, getCheckMKEventsInDateRange, getCheckMKAvailabilityUp, getCheckMKEventTimeMs, getEventStateNum, computeCheckMKKpis, formatEventTimestamp, formatServiceAge, getServiceLabel, filterAlertEventsOnly, isCalendarMonthFilter, getEventCalendarMonths, getEventsFilterShortLabel, formatCalendarFilterLabel } from './checkmkMonitoringUtils';
const EVENTS_PER_PAGE = 12;
const HOST_STATE_COLORS = {
  UP: '#13BA8E',
  DOWN: '#ef4444',
  UNREACHABLE: '#f59e0b'
};
function TrendBadge({
  value
}) {
  if (value == null || value === 0) {
    return <span className={styles.kpiTrendFlat}>stable</span>;
  }
  const isUp = value > 0;
  return <span className={isUp ? styles.kpiTrendUp : styles.kpiTrendDown}>
      {isUp ? '▲' : '▼'} {Math.abs(value)}%
    </span>;
}
export default function CheckMKMonitoringPanel({
  equipment,
  checkmkMapping,
  checkmkData,
  checkmkHostDetails,
  loadingCheckMK,
  loadingAvailability,
  checkmkAvailabilityPeriod,
  onAvailabilityPeriodChange,
  onOpenService,
  onOpenEvent,
  onOpenMapping
}) {
  const [serviceStateFilter, setServiceStateFilter] = useState(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceSort, setServiceSort] = useState({
    col: 'state',
    dir: 'asc'
  });
  const [eventsDateFilter, setEventsDateFilter] = useState('1m');
  const [eventStateFilter, setEventStateFilter] = useState(null);
  const [eventServiceFilter, setEventServiceFilter] = useState(null);
  const [eventsSearch, setEventsSearch] = useState('');
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsSort, setEventsSort] = useState({
    col: 'timestamp',
    dir: 'desc'
  });
  const services = checkmkData?.services?.services || [];
  const allEvents = checkmkData?.events?.events || [];
  const availabilityByPeriod = checkmkData?.availabilityByPeriod || {};
  const kpis = useMemo(() => computeCheckMKKpis({
    services,
    events: allEvents,
    availabilityByPeriod,
    eventsDateFilter
  }), [services, allEvents, availabilityByPeriod, eventsDateFilter]);
  const availUp = getCheckMKAvailabilityUp(checkmkData?.availability ?? availabilityByPeriod[checkmkAvailabilityPeriod]);
  const gaugeRotation = availUp != null ? availUp / 100 * 180 - 90 : -90;
  const filteredServices = useMemo(() => {
    let list = services;
    if (serviceStateFilter !== null) {
      list = list.filter(s => (s.state ?? 3) === serviceStateFilter);
    }
    if (serviceSearch.trim()) {
      const q = serviceSearch.toLowerCase();
      list = list.filter(s => getServiceLabel(s).toLowerCase().includes(q));
    }
    const now = Math.floor(Date.now() / 1000);
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (serviceSort.col === 'state') cmp = (a.state ?? 3) - (b.state ?? 3);else if (serviceSort.col === 'service') {
        cmp = getServiceLabel(a).localeCompare(getServiceLabel(b));
      } else if (serviceSort.col === 'age') {
        const ts = s => s.lastStateChange ?? s.last_state_change ?? s.lastCheck ?? s.last_check ?? 0;
        cmp = ts(a) - ts(b);
      }
      return serviceSort.dir === 'asc' ? cmp : -cmp;
    });
  }, [services, serviceStateFilter, serviceSearch, serviceSort]);
  const eventsInRange = useMemo(() => filterAlertEventsOnly(getCheckMKEventsInDateRange(allEvents, eventsDateFilter)), [allEvents, eventsDateFilter]);
  const calendarMonthOptions = useMemo(() => getEventCalendarMonths(filterAlertEventsOnly(allEvents)), [allEvents]);
  const isCalendarFilter = isCalendarMonthFilter(eventsDateFilter);
  const eventsFilterLabel = getEventsFilterShortLabel(eventsDateFilter);
  const eventServices = useMemo(() => {
    const set = new Set(eventsInRange.map(e => e.service ?? e.log_service_description).filter(Boolean));
    return [...set].sort();
  }, [eventsInRange]);
  const filteredEvents = useMemo(() => {
    let list = eventsInRange;
    if (eventStateFilter !== null) {
      list = list.filter(e => getEventStateNum(e) === eventStateFilter);
    }
    if (eventServiceFilter) {
      list = list.filter(e => (e.service ?? e.log_service_description) === eventServiceFilter);
    }
    if (eventsSearch.trim()) {
      const q = eventsSearch.toLowerCase();
      list = list.filter(e => {
        const msg = e.message ?? e.plugin_output ?? e.event_text ?? '';
        const svc = e.service ?? e.log_service_description ?? '';
        return `${msg} ${svc}`.toLowerCase().includes(q);
      });
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (eventsSort.col === 'state') cmp = getEventStateNum(a) - getEventStateNum(b);else if (eventsSort.col === 'timestamp') {
        const getT = e => getCheckMKEventTimeMs(e) ?? 0;
        cmp = getT(a) - getT(b);
      } else if (eventsSort.col === 'service') {
        cmp = (a.service ?? '').localeCompare(b.service ?? '');
      }
      return eventsSort.dir === 'asc' ? cmp : -cmp;
    });
  }, [eventsInRange, eventStateFilter, eventServiceFilter, eventsSearch, eventsSort]);
  const totalEventPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));
  const paginatedEvents = filteredEvents.slice((eventsPage - 1) * EVENTS_PER_PAGE, eventsPage * EVENTS_PER_PAGE);
  const toggleServiceSort = col => {
    setServiceSort(prev => prev.col === col ? {
      col,
      dir: prev.dir === 'asc' ? 'desc' : 'asc'
    } : {
      col,
      dir: 'asc'
    });
  };
  const toggleEventsSort = col => {
    setEventsSort(prev => prev.col === col ? {
      col,
      dir: prev.dir === 'asc' ? 'desc' : 'asc'
    } : {
      col,
      dir: 'desc'
    });
  };
  const serviceCounts = {
    all: services.length,
    0: services.filter(s => (s.state ?? 3) === 0).length,
    1: services.filter(s => (s.state ?? 3) === 1).length,
    2: services.filter(s => (s.state ?? 3) === 2).length
  };
  const eventStateCounts = {
    all: eventsInRange.length,
    1: eventsInRange.filter(e => getEventStateNum(e) === 1).length,
    2: eventsInRange.filter(e => getEventStateNum(e) === 2).length
  };
  if (!checkmkMapping?.checkmk_host_name) {
    return <section className={styles.panel}>
        <div className={styles.emptyMsg}>
          <Icon icon="simple-icons:checkmk" style={{
          fontSize: '2.5rem',
          color: '#15D1A0',
          marginBottom: '0.75rem'
        }} />
          <h5 style={{
          margin: '0 0 0.5rem',
          color: 'var(--text-primary)'
        }}>Equipment not mapped</h5>
          <p style={{
          margin: '0 0 1rem',
          fontSize: '0.85rem'
        }}>
            Map this equipment to CheckMK to display monitoring.
          </p>
          <button type="button" className={styles.periodPillActive} style={{
          border: 'none',
          cursor: 'pointer'
        }} onClick={onOpenMapping}>
            Map to CheckMK
          </button>
        </div>
      </section>;
  }
  if (loadingCheckMK && !checkmkData) {
    return <section className={styles.panel}>
        <div className={`${styles.skeleton} ${styles.skeletonHeader}`} />
        <div className={styles.kpiGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className={`${styles.skeleton} ${styles.skeletonKpi}`} />)}
        </div>
        <div className={styles.gridLayout}>
          <div className={`${styles.skeleton} ${styles.skeletonSection}`} />
          <div className={`${styles.skeleton} ${styles.skeletonSection}`} />
        </div>
      </section>;
  }
  if (!checkmkData) {
    return <section className={styles.panel}>
        <div className={styles.emptyMsg}>No CheckMK data available.</div>
      </section>;
  }
  const hostState = checkmkHostDetails?.state;
  const hostStateColor = HOST_STATE_COLORS[hostState] || '#6b7280';
  return <section className={styles.panel}>
      {}
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>
            <Icon icon="simple-icons:checkmk" className={styles.titleIcon} />
            {checkmkHostDetails?.hostName || checkmkHostDetails?.title || checkmkMapping.checkmk_host_name}
            {checkmkHostDetails?.alias && <span className={styles.alias}>({checkmkHostDetails.alias})</span>}
          </h2>
          <div className={styles.metaRow}>
            {hostState && <span className={styles.hostStateBadge} style={{
            background: `${hostStateColor}22`,
            color: hostStateColor,
            border: `1px solid ${hostStateColor}55`
          }}>
                <Icon icon={hostState === 'UP' ? 'mdi:check-circle' : 'mdi:alert-circle'} />
                {hostState}
              </span>}
            {checkmkHostDetails?.labels && Object.entries(checkmkHostDetails.labels).slice(0, 6).map(([k, v]) => <span key={k} className={styles.labelChip}>
                  {k}: {String(v)}
                </span>)}
            {checkmkHostDetails?.ipAddress && <span className={styles.ipText}>{checkmkHostDetails.ipAddress}</span>}
          </div>
        </div>

        <div className={styles.gaugeWrap}>
          <div className={styles.gaugeContainer}>
            <div className={styles.gaugeTrack}>
              <div className={styles.gaugeNeedle} style={{
              transform: `rotate(${gaugeRotation}deg)`
            }} />
            </div>
            <div className={styles.gaugeValue}>
              {loadingAvailability ? '…' : availUp != null ? `${Math.round(availUp)}%` : '-'}
            </div>
          </div>
          <div className={styles.periodButtons}>
            {CHECKMK_AVAILABILITY_PERIOD_OPTIONS.map(({
            value,
            label
          }) => <button key={value} type="button" className={`${styles.periodBtn} ${checkmkAvailabilityPeriod === value ? styles.periodBtnActive : ''}`} onClick={() => onAvailabilityPeriodChange(value)} disabled={loadingAvailability}>
                {label}
              </button>)}
          </div>
        </div>
      </div>

      {}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Service health</span>
          <span className={styles.kpiValue} style={{
          color: kpis.healthScore >= 90 ? '#13BA8E' : kpis.healthScore >= 70 ? '#f59e0b' : '#ef4444'
        }}>
            {kpis.healthScore != null ? `${kpis.healthScore}%` : '-'}
          </span>
          <span className={styles.kpiSub}>
            {kpis.okServices} OK · {kpis.warnServices} warn · {kpis.critServices} crit
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Alerts ({eventsFilterLabel})</span>
          <span className={styles.kpiValue}>{kpis.eventsInPeriod}</span>
          <span className={styles.kpiSub}>
            ~{kpis.eventsPerDay}/day · <TrendBadge value={kpis.eventTrend} />{' '}
            {isCalendarFilter ? 'vs prev. month' : 'vs prev. period'}
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Critical</span>
          <span className={styles.kpiValue} style={{
          color: kpis.critCount > 0 ? '#ef4444' : '#13BA8E'
        }}>
            {kpis.critCount}
          </span>
          <span className={styles.kpiSub}>{kpis.warnCount} warnings during this period</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>1-month availability</span>
          <span className={styles.kpiValue} style={{
          color: '#15D1A0'
        }}>
            {kpis.avail1m != null ? `${Math.round(kpis.avail1m)}%` : '-'}
          </span>
          <span className={styles.kpiSub}>
            {kpis.availTrend != null ? <>vs 3 months: {kpis.availTrend >= 0 ? '+' : ''}{kpis.availTrend} pts</> : '-'}
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Most active service</span>
          <span className={styles.kpiValue} style={{
          fontSize: '0.95rem'
        }}>
            {kpis.topService ? kpis.topService.count : '-'}
          </span>
          <span className={styles.kpiSub} title={kpis.topService?.name}>
            {kpis.topService?.name ?? 'No events'}
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Monitored services</span>
          <span className={styles.kpiValue}>{kpis.totalServices}</span>
          <span className={styles.kpiSub}>real-time CheckMK status</span>
        </div>
      </div>

      <div className={styles.gridLayout}>
        {}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Icon icon="mdi:server-network" className={styles.sectionTitleIcon} />
              Monitored services
            </h3>
            <span className={styles.sectionCount}>{filteredServices.length} / {services.length}</span>
          </div>
          <div className={styles.toolbar}>
            <input type="text" className={styles.searchInput} placeholder="Search for a service…" value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} />
            <div className={styles.filterPills}>
              <button type="button" className={`${styles.filterPill} ${serviceStateFilter === null ? styles.filterPillActive : ''}`} onClick={() => setServiceStateFilter(null)}>
                All ({serviceCounts.all})
              </button>
              {SERVICE_STATE_META.slice(0, 3).map(({
              state,
              label,
              color
            }) => <button key={state} type="button" className={`${styles.filterPill} ${serviceStateFilter === state ? styles.filterPillActive : ''}`} style={serviceStateFilter === state ? {
              borderColor: color,
              color
            } : undefined} onClick={() => setServiceStateFilter(serviceStateFilter === state ? null : state)}>
                  {label} ({serviceCounts[state]})
                </button>)}
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => toggleServiceSort('state')}>
                    Status {serviceSort.col === 'state' ? serviceSort.dir === 'asc' ? '▲' : '▼' : ''}
                  </th>
                  <th onClick={() => toggleServiceSort('service')}>
                    Service {serviceSort.col === 'service' ? serviceSort.dir === 'asc' ? '▲' : '▼' : ''}
                  </th>
                  <th onClick={() => toggleServiceSort('age')}>
                    Age {serviceSort.col === 'age' ? serviceSort.dir === 'asc' ? '▲' : '▼' : ''}
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredServices.length === 0 ? <tr>
                    <td colSpan={4} className={styles.emptyMsg}>No services</td>
                  </tr> : filteredServices.map((service, idx) => {
                const state = service.state ?? 3;
                const meta = SERVICE_STATE_META[state] || SERVICE_STATE_META[3];
                return <tr key={idx} className={styles.dataRow} onClick={() => onOpenService(service)}>
                        <td>
                          <span className={styles.statusBadge} style={{
                      backgroundColor: meta.color
                    }}>
                            {meta.label}
                          </span>
                        </td>
                        <td className={styles.serviceName} title={getServiceLabel(service)}>
                          {getServiceLabel(service)}
                        </td>
                        <td className={styles.timeCell}>{formatServiceAge(service)}</td>
                        <td>
                          <button type="button" className={styles.openBtn} onClick={e => {
                      e.stopPropagation();
                      onOpenService(service);
                    }} title="Open dans CheckMK">
                            <Icon icon="mdi:open-in-new" />
                          </button>
                        </td>
                      </tr>;
              })}
              </tbody>
            </table>
          </div>
        </div>

        {}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Icon icon="mdi:bell-ring" className={styles.sectionTitleIcon} />
              Events & notifications
            </h3>
            <span className={styles.sectionCount}>{filteredEvents.length} alert{filteredEvents.length !== 1 ? 's' : ''}</span>
          </div>

          <div className={styles.periodBar}>
            <span className={styles.periodBarLabel}>Rolling:</span>
            {CHECKMK_DATE_FILTER_OPTIONS.map(({
            value,
            label
          }) => <button key={value} type="button" className={`${styles.periodPill} ${eventsDateFilter === value ? styles.periodPillActive : ''}`} onClick={() => {
            setEventsDateFilter(value);
            setEventsPage(1);
          }}>
                {label}
              </button>)}
          </div>

          <div className={styles.calendarFilterBar}>
            <div className={styles.calendarFilterRow}>
              <span className={styles.periodBarLabel}>Specific month:</span>
              <input type="month" className={styles.monthInput} value={isCalendarFilter ? eventsDateFilter : ''} onChange={e => {
              const val = e.target.value;
              if (val) {
                setEventsDateFilter(val);
                setEventsPage(1);
              }
            }} max={`${new Date().getFullYear() + 5}-12`} min="2010-01" title="Choose a month and year" />
              {isCalendarFilter && <button type="button" className={styles.calendarClearBtn} onClick={() => {
              setEventsDateFilter('1m');
              setEventsPage(1);
            }} title="Return to rolling filter">
                  <Icon icon="mdi:close" />
                </button>}
              {isCalendarFilter && <span className={styles.calendarActiveLabel}>
                  {formatCalendarFilterLabel(eventsDateFilter)}
                </span>}
            </div>
            {calendarMonthOptions.length > 0 && <div className={styles.calendarMonthChips}>
                <span className={styles.calendarChipsHint}>Shortcuts:</span>
                {calendarMonthOptions.map(({
              key,
              count,
              label
            }) => <button key={key} type="button" className={`${styles.calendarMonthChip} ${eventsDateFilter === key ? styles.calendarMonthChipActive : ''}`} onClick={() => {
              setEventsDateFilter(key);
              setEventsPage(1);
            }} title={`${count} event${count > 1 ? 's' : ''}`}>
                    {label}
                    <span className={styles.calendarMonthChipCount}>{count}</span>
                  </button>)}
              </div>}
          </div>

          <div className={styles.toolbar}>
            <input type="text" className={styles.searchInput} placeholder="Search…" value={eventsSearch} onChange={e => {
            setEventsSearch(e.target.value);
            setEventsPage(1);
          }} />
            <div className={styles.filterPills}>
              <button type="button" className={`${styles.filterPill} ${eventStateFilter === null ? styles.filterPillActive : ''}`} onClick={() => {
              setEventStateFilter(null);
              setEventsPage(1);
            }}>
                Warning + Critical ({eventStateCounts.all})
              </button>
              {EVENT_STATE_META.filter(m => m.state === 1 || m.state === 2).map(({
              state,
              label,
              color
            }) => <button key={state} type="button" className={`${styles.filterPill} ${eventStateFilter === state ? styles.filterPillActive : ''}`} style={eventStateFilter === state ? {
              borderColor: color,
              color
            } : undefined} onClick={() => {
              setEventStateFilter(eventStateFilter === state ? null : state);
              setEventsPage(1);
            }}>
                  {label} ({eventStateCounts[state]})
                </button>)}
            </div>
          </div>

          {eventServices.length > 0 && <div className={styles.toolbar} style={{
          paddingTop: 0,
          borderBottom: 'none'
        }}>
              <div className={styles.filterPills}>
                <button type="button" className={`${styles.filterPill} ${!eventServiceFilter ? styles.filterPillActive : ''}`} onClick={() => {
              setEventServiceFilter(null);
              setEventsPage(1);
            }}>
                  All services
                </button>
                {eventServices.slice(0, 8).map(svc => <button key={svc} type="button" className={`${styles.filterPill} ${eventServiceFilter === svc ? styles.filterPillActive : ''}`} onClick={() => {
              setEventServiceFilter(eventServiceFilter === svc ? null : svc);
              setEventsPage(1);
            }} title={svc}>
                    {svc.length > 18 ? `${svc.slice(0, 16)}…` : svc}
                  </button>)}
              </div>
            </div>}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => toggleEventsSort('state')}>
                    Status {eventsSort.col === 'state' ? eventsSort.dir === 'asc' ? '▲' : '▼' : ''}
                  </th>
                  <th onClick={() => toggleEventsSort('service')}>
                    Service {eventsSort.col === 'service' ? eventsSort.dir === 'asc' ? '▲' : '▼' : ''}
                  </th>
                  <th>Message</th>
                  <th onClick={() => toggleEventsSort('timestamp')}>
                    Date {eventsSort.col === 'timestamp' ? eventsSort.dir === 'asc' ? '▲' : '▼' : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.length === 0 ? <tr>
                    <td colSpan={4} className={styles.emptyMsg}>No warning or critical alerts during this period</td>
                  </tr> : paginatedEvents.map((event, idx) => {
                const stateNum = getEventStateNum(event);
                const meta = EVENT_STATE_META[Math.min(stateNum, 3)] || EVENT_STATE_META[3];
                const svc = event.service ?? event.log_service_description ?? '-';
                const msg = event.message ?? event.plugin_output ?? event.event_text ?? '-';
                return <tr key={idx} className={styles.dataRow} onClick={() => onOpenEvent(event)}>
                        <td>
                          <span className={styles.statusBadge} style={{
                      backgroundColor: meta.color
                    }}>
                            {meta.label}
                          </span>
                        </td>
                        <td className={styles.serviceName} title={svc}>{svc}</td>
                        <td className={styles.messageCell} title={msg}>{msg}</td>
                        <td className={styles.timeCell}>{formatEventTimestamp(event)}</td>
                      </tr>;
              })}
              </tbody>
            </table>
          </div>

          {totalEventPages > 1 && <div className={styles.pagination}>
              <button type="button" className={styles.pageBtn} disabled={eventsPage === 1} onClick={() => setEventsPage(1)}>
                <Icon icon="mdi:chevron-double-left" />
              </button>
              <button type="button" className={styles.pageBtn} disabled={eventsPage === 1} onClick={() => setEventsPage(p => Math.max(1, p - 1))}>
                <Icon icon="mdi:chevron-left" />
              </button>
              <span className={styles.pageInfo}>
                {eventsPage} / {totalEventPages} ({filteredEvents.length})
              </span>
              <button type="button" className={styles.pageBtn} disabled={eventsPage === totalEventPages} onClick={() => setEventsPage(p => Math.min(totalEventPages, p + 1))}>
                <Icon icon="mdi:chevron-right" />
              </button>
              <button type="button" className={styles.pageBtn} disabled={eventsPage === totalEventPages} onClick={() => setEventsPage(totalEventPages)}>
                <Icon icon="mdi:chevron-double-right" />
              </button>
            </div>}
        </div>
      </div>
    </section>;
}
