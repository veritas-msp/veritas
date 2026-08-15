import { Fragment, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import SmartTooltip from "../SmartTooltip";
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
    return new Date(value).toLocaleString(localeTag || undefined, {
      dateStyle: "short",
      timeStyle: "short"
    });
  } catch {
    return String(value);
  }
}

function actorLabel(event, copy) {
  if (event?.actorName) return event.actorName;
  if (event?.actorUserId) return copy.unknownActor || "—";
  return copy.systemActor || "System";
}

function statusBadgeClass(status) {
  if (status === "closed") return styles.statusClosed;
  if (status === "acked") return styles.statusAcked;
  if (status === "linked") return styles.statusLinked;
  return styles.statusOpen;
}

function HistoryActionButton({
  hint,
  icon,
  onClick,
  disabled = false
}) {
  return <SmartTooltip as="span" content={hint}>
      <button type="button" className={styles.actionBtn} title={hint} aria-label={hint} disabled={disabled} onClick={e => {
      e.stopPropagation();
      onClick?.(e);
    }}>
        <Icon icon={icon} aria-hidden />
      </button>
    </SmartTooltip>;
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
  const columns = copy.columns || {};
  const hints = copy.actionHints || {};

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

      {loading ? <div className={styles.loading}>{copy.loading}</div> : alerts.length === 0 ? <MspEmptyState icon="mdi:history" title={copy.emptyTitle} text={copy.emptyText} /> : <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{columns.alert || "Alerte"}</th>
                <th>{columns.company || "Entreprise"}</th>
                <th>{columns.domain || "Domaine"}</th>
                <th>{columns.status || "Statut"}</th>
                <th>{columns.when || "Date"}</th>
                <th className={styles.actionsCol}>{columns.actions || "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => {
              const open = expandedId === alert.id;
              const events = eventsByAlert[alert.id] || [];
              const domainLabel = copy.domains?.[alert.domain] || alert.domain;
              const expandHint = open ? hints.collapse || copy.collapse || "Replier la timeline" : hints.expand || copy.expand || "Voir la timeline";
              const reopenHint = hints.reopen || copy.reopen;
              return <Fragment key={alert.id}>
                    <tr className={`${styles.dataRow} ${open ? styles.dataRowOpen : ""}`} onClick={() => setExpandedId(open ? null : alert.id)}>
                      <td className={styles.alertCell}>
                        <span className={styles.title}>{alert.title || alert.queueItemId}</span>
                        {alert.label || alert.subtitle ? <span className={styles.meta}>{[alert.label, alert.subtitle].filter(Boolean).join(" · ")}</span> : null}
                      </td>
                      <td>{alert.clientName || "—"}</td>
                      <td>
                        <span className={styles.domainCell}>
                          <span className={styles.domainIcon} aria-hidden>
                            <Icon icon={DOMAIN_ICONS[alert.domain] || "mdi:alert"} />
                          </span>
                          {domainLabel}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusBadgeClass(alert.status)}`}>
                          {copy.status[alert.status] || alert.status}
                        </span>
                      </td>
                      <td className={styles.whenCell}>
                        <time dateTime={alert.closedAt || alert.updatedAt || undefined}>{formatWhen(alert.closedAt || alert.updatedAt, localeTag)}</time>
                      </td>
                      <td className={styles.actionsCol} onClick={e => e.stopPropagation()}>
                        <div className={styles.rowActions} role="group">
                          {alert.status === "closed" ? <HistoryActionButton hint={reopenHint} icon="mdi:restore" disabled={busyId === alert.id} onClick={() => handleReopen(alert)} /> : null}
                          <HistoryActionButton hint={expandHint} icon={open ? "mdi:chevron-up" : "mdi:history"} onClick={() => setExpandedId(open ? null : alert.id)} />
                        </div>
                      </td>
                    </tr>
                    {open ? <tr className={styles.detailRow}>
                        <td colSpan={6}>
                          <div className={styles.detail}>
                            <div className={styles.detailHeader}>
                              <span className={styles.timelineTitle}>{copy.timelineTitle || "Timeline"}</span>
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
                          </div>
                        </td>
                      </tr> : null}
                  </Fragment>;
            })}
            </tbody>
          </table>
        </div>}
    </div>;
}
