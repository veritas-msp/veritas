import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import { fetchSupervisionAlertEvents, reopenSupervisionAlert } from "../../api/supervisionAlerts";
import styles from "./SupervisionAlertHistory.module.css";

const DOMAIN_ICONS = {
  devices: "mdi:devices",
  backups: "mdi:backup-restore",
  contracts: "mdi:file-document-alert-outline",
  rmm: "mdi:laptop-off"
};

function formatWhen(value, localeTag) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(localeTag || undefined);
  } catch {
    return String(value);
  }
}

function actorLabel(event, copy) {
  if (event?.actorName) return event.actorName;
  if (event?.actorUserId) return copy.unknownActor || "—";
  return copy.systemActor || "System";
}

export default function SupervisionAlertHistory({
  alerts = [],
  loading = false,
  searchQuery = "",
  domainFilter = "all",
  statusFilter = "all",
  onSearchChange,
  onDomainFilter,
  onStatusFilter,
  onReopened,
  localeTag,
  copy
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [eventsByAlert, setEventsByAlert] = useState({});
  const [loadingEvents, setLoadingEvents] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!expandedId || eventsByAlert[expandedId]) return undefined;
    let cancelled = false;
    (async () => {
      setLoadingEvents(expandedId);
      try {
        const events = await fetchSupervisionAlertEvents(expandedId);
        if (!cancelled) {
          setEventsByAlert(prev => ({
            ...prev,
            [expandedId]: events
          }));
        }
      } catch {
        if (!cancelled) {
          setEventsByAlert(prev => ({
            ...prev,
            [expandedId]: []
          }));
        }
      } finally {
        if (!cancelled) setLoadingEvents(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expandedId, eventsByAlert]);

  const handleReopen = async alert => {
    setBusyId(alert.id);
    try {
      await reopenSupervisionAlert(alert);
      setEventsByAlert(prev => {
        const next = {
          ...prev
        };
        delete next[alert.id];
        return next;
      });
      onReopened?.(alert);
    } finally {
      setBusyId(null);
    }
  };

  const domainChips = [{
    id: "all",
    label: copy.domains.all
  }, {
    id: "devices",
    label: copy.domains.devices
  }, {
    id: "backups",
    label: copy.domains.backups
  }, {
    id: "contracts",
    label: copy.domains.contracts
  }, {
    id: "rmm",
    label: copy.domains.rmm
  }];

  const statusChips = [{
    id: "closed",
    label: copy.status.closed
  }, {
    id: "acked",
    label: copy.status.acked
  }, {
    id: "linked",
    label: copy.status.linked
  }];

  return <div className={styles.root}>
      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Icon icon="mdi:magnify" aria-hidden />
          <input type="search" value={searchQuery} onChange={e => onSearchChange?.(e.target.value)} placeholder={copy.searchPlaceholder} />
        </label>
        <div className={styles.filtersBar} role="group" aria-label={copy.filterAria || "Filters"}>
          <div className={styles.filterGroup}>
            {domainChips.map(chip => <button key={chip.id} type="button" className={`${styles.chip} ${domainFilter === chip.id ? styles.chipActive : ""}`} onClick={() => onDomainFilter?.(chip.id)}>
                {chip.label}
              </button>)}
          </div>
          <span className={styles.filterSep} aria-hidden />
          <div className={styles.filterGroup}>
            {statusChips.map(chip => <button key={chip.id} type="button" className={`${styles.chip} ${statusFilter === chip.id ? styles.chipActive : ""}`} onClick={() => onStatusFilter?.(statusFilter === chip.id ? "all" : chip.id)}>
                {chip.label}
              </button>)}
          </div>
        </div>
      </div>

      {loading ? <div className={styles.loading}>{copy.loading}</div> : alerts.length === 0 ? <MspEmptyState icon="mdi:history" title={copy.emptyTitle} text={copy.emptyText} /> : <ul className={styles.list}>
          {alerts.map(alert => {
          const open = expandedId === alert.id;
          const events = eventsByAlert[alert.id] || [];
          return <li key={alert.id} className={styles.card}>
                <button type="button" className={styles.cardMain} onClick={() => setExpandedId(open ? null : alert.id)}>
                  <span className={styles.domainIcon}>
                    <Icon icon={DOMAIN_ICONS[alert.domain] || "mdi:alert"} aria-hidden />
                  </span>
                  <span className={styles.body}>
                    <span className={styles.title}>{alert.title || alert.queueItemId}</span>
                    <span className={styles.meta}>
                      {[copy.status[alert.status] || alert.status, alert.label, alert.subtitle, formatWhen(alert.closedAt || alert.updatedAt, localeTag)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} className={styles.chevron} aria-hidden />
                </button>
                {open ? <div className={styles.detail}>
                    <div className={styles.detailHeader}>
                      <span className={styles.timelineTitle}>{copy.timelineTitle || "Timeline"}</span>
                      {alert.status === "closed" ? <button type="button" className={styles.reopenBtn} disabled={busyId === alert.id} onClick={() => handleReopen(alert)}>
                          <Icon icon="mdi:restore" aria-hidden />
                          {copy.reopen}
                        </button> : null}
                    </div>
                    <ol className={styles.timeline}>
                      {loadingEvents === alert.id ? <li className={styles.timelineEmpty}>{copy.loadingEvents}</li> : events.length === 0 ? <li className={styles.timelineEmpty}>{copy.noEvents}</li> : events.map(ev => {
                    const who = actorLabel(ev, copy);
                    return <li key={ev.id} className={styles.timelineItem}>
                            <span className={styles.timelineDot} aria-hidden />
                            <div className={styles.timelineContent}>
                              <div className={styles.timelineTop}>
                                <strong>{copy.actions[ev.action] || ev.action}</strong>
                                <time dateTime={ev.createdAt || undefined}>{formatWhen(ev.createdAt, localeTag)}</time>
                              </div>
                              <span className={styles.timelineActor}>
                                <Icon icon="mdi:account-outline" aria-hidden />
                                {who}
                              </span>
                              {ev.note ? <em className={styles.timelineNote}>{ev.note}</em> : null}
                            </div>
                          </li>;
                  })}
                    </ol>
                  </div> : null}
              </li>;
        })}
        </ul>}
    </div>;
}
