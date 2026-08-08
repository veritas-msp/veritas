import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import styles from "./CheckMKMonitoringModal.module.css";
import { filterCheckMKDisplayData } from "./checkmkReportCacheUtils";
export default function CheckMKMonitoringModal({
  isOpen,
  onClose,
  equipment,
  reportPeriod = {},
  preLoadedData = null,
  onRefresh = null,
  refreshing = false
}) {
  const equipmentName = equipment?.nom || equipment?.name || equipment?.logiciel || "Equipment";
  const hostName = equipment?.checkmk_host_name || equipment?.data?.checkmk_host_name || null;
  const [error, setError] = useState(null);
  const [refreshingError, setRefreshingError] = useState(null);
  const periodData = useMemo(() => filterCheckMKDisplayData(preLoadedData, reportPeriod), [preLoadedData, reportPeriod]);
  const services = periodData?.services ?? [];
  const events = periodData?.events ?? [];
  const availability = periodData?.availability ?? null;
  const hasCachedData = periodData != null;
  const periodLabel = useMemo(() => {
    const start = reportPeriod?.start || reportPeriod?.startTime || "-";
    const end = reportPeriod?.end || reportPeriod?.endTime || "-";
    const fmt = s => {
      if (!s || s === "-") return s;
      try {
        const d = new Date(s);
        return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US");
      } catch {
        return s;
      }
    };
    return `From ${fmt(start)} to ${fmt(end)}`;
  }, [reportPeriod]);
  const syncedAtLabel = useMemo(() => {
    if (!preLoadedData?.syncedAt) return null;
    try {
      const d = new Date(preLoadedData.syncedAt);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString("en-US");
    } catch {
      return null;
    }
  }, [preLoadedData?.syncedAt]);
  const handleRefresh = async () => {
    if (typeof onRefresh !== "function" || refreshing) return;
    setError(null);
    setRefreshingError(null);
    try {
      await onRefresh();
    } catch (err) {
      setRefreshingError(err?.message || "Error during synchronization.");
    }
  };
  const availabilityPercent = availability?.up != null ? Math.round(availability.up) : null;
  const availabilityClass = useMemo(() => {
    if (availabilityPercent == null) return "";
    if (availabilityPercent < 95) return styles.availabilityCrit;
    if (availabilityPercent < 99) return styles.availabilityWarn;
    return styles.availabilityOk;
  }, [availabilityPercent]);
  const getServiceStateClass = state => {
    const s = String(state ?? "").toUpperCase();
    if (s === "OK" || s === "0") return styles.stateOk;
    if (s === "WARN" || s === "WARNING" || s === "1") return styles.stateWarn;
    if (s === "CRIT" || s === "CRITICAL" || s === "2") return styles.stateCrit;
    return "";
  };
  const getEventTypeClass = state => {
    const s = String(state ?? "").toUpperCase();
    if (s === "CRIT" || s === "CRITICAL" || s === "2") return styles.eventCrit;
    if (s === "WARN" || s === "WARNING" || s === "1") return styles.eventWarn;
    return styles.eventInfo;
  };
  if (!isOpen) return null;
  const handleOverlayClick = () => onClose?.();
  const handleContentClick = e => e.stopPropagation();
  const content = <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={handleContentClick} role="dialog" aria-modal="true" aria-labelledby="checkmk-modal-title">
        <div className={styles.header}>
          <div className={styles.headerTitleBlock}>
            <h2 id="checkmk-modal-title" className={styles.title}>
              <Icon icon="simple-icons:checkmk" className={styles.titleIcon} />
              {equipmentName}
            </h2>
            <div className={styles.period}>{periodLabel}</div>
            {syncedAtLabel && <div className={styles.syncedAt}>Data from {syncedAtLabel}</div>}
          </div>
          <div className={styles.headerActions}>
            {hostName && typeof onRefresh === "function" && <button type="button" className={styles.refreshBtn} onClick={handleRefresh} disabled={refreshing} title="Refresh from CheckMK" aria-label="Refresh from CheckMK">
                <Icon icon="mdi:refresh" width={18} height={18} className={refreshing ? styles.refreshSpinning : undefined} />
              </button>}
            <button type="button" className={styles.closeBtn} onClick={onClose} title="Close" aria-label="Close">
              ×
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {!hostName ? <div className={styles.infoNotice}>
              No CheckMK mapping for this device. Configure the mapping
              from the equipment record to display monitoring data.
            </div> : error || refreshingError ? <div className={styles.infoNotice} style={{
          background: "#fef2f2",
          borderColor: "#fca5a5",
          color: "#991b1b"
        }}>
              {error || refreshingError}
            </div> : refreshing && !hasCachedData ? <div className={styles.infoNotice}>CheckMK synchronization in progress…</div> : !hasCachedData ? <div className={styles.infoNotice}>
              No CheckMK data recorded for this period. Use the sync
              button in the report header, the row button, or
              the refresh icon above.
            </div> : <>
              {availabilityPercent != null && <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Availability over the period</h3>
                  <div className={styles.availabilityBlock}>
                    <div className={styles.availabilityBar}>
                      <div className={`${styles.availabilityFill} ${availabilityClass}`} style={{
                  width: `${availabilityPercent}%`
                }} />
                    </div>
                    <span className={styles.availabilityPercent}>{availabilityPercent} %</span>
                  </div>
                </div>}

              {services.length > 0 && <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    Services alerting during the period
                  </h3>
                  <ul className={styles.serviceList}>
                    {services.slice(0, 20).map((svc, i) => <li key={svc.description || i} className={styles.serviceItem}>
                        <span className={styles.serviceName} title={svc.description}>
                          {svc.description || svc.display_name || `Service ${i + 1}`}
                        </span>
                        <span className={`${styles.serviceState} ${getServiceStateClass(svc.state)}`}>
                          {svc.state === 0 || svc.state === "0" || svc.state === "OK" ? "OK" : svc.state === 1 || svc.state === "1" || svc.state === "WARN" ? "WARN" : "CRIT"}
                        </span>
                      </li>)}
                  </ul>
                  {services.length > 20 && <div style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              marginTop: "0.25rem"
            }}>
                      … and {services.length - 20} more
                    </div>}
                </div>}

              {events.length > 0 && <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Critical notifications during the period</h3>
                  <ul className={styles.eventList}>
                    {events.slice(0, 15).map((evt, i) => {
                const state = evt.state ?? evt.log_level ?? evt.type;
                const msg = evt.message ?? evt.text ?? evt.output ?? "-";
                const ts = evt.timestamp ?? evt.time ?? evt.date;
                const dateStr = ts != null ? typeof ts === "number" && ts < 10000000000 ? new Date(ts * 1000).toLocaleString("en-US") : new Date(ts).toLocaleString("en-US") : "";
                return <li key={i} className={styles.eventItem}>
                          {dateStr && <span className={styles.eventDate}>{dateStr}</span>}
                          <span className={`${styles.eventType} ${getEventTypeClass(state)}`}>
                            {state === 0 || state === "0" ? "OK" : state === 1 || state === "1" ? "WARNING" : "CRITICAL"}
                          </span>
                          <span className={styles.eventMessage}>{msg}</span>
                        </li>;
              })}
                  </ul>
                  {events.length > 15 && <div style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              marginTop: "0.25rem"
            }}>
                      … and {events.length - 15} more events
                    </div>}
                </div>}

              {services.length === 0 && events.length === 0 && availabilityPercent == null && <div className={styles.infoNotice}>
                    No alerts or downtime during the monitored period.
                  </div>}
              {events.length === 0 && hostName && (services.length > 0 || availabilityPercent != null) && <div className={styles.infoNotice} style={{
            marginTop: "0.5rem"
          }}>
                    No critical notifications during the period.
                  </div>}
            </>}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </div>;
  return createPortal(content, document.body);
}
