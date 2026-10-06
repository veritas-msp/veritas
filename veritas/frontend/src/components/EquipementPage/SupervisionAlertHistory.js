import { Fragment, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import SmartTooltip from "../SmartTooltip";
import { formatPageInfo } from "../../i18n/commonI18n";
import { interpolate } from "../../i18n/translate";
import {
  bulkActOnSupervisionAlerts,
  fetchSupervisionAlertEvents,
  purgeSupervisionAlert,
  reopenSupervisionAlert,
  restoreSupervisionAlert,
  trashSupervisionAlert
} from "../../api/supervisionAlerts";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./SupervisionAlertHistory.module.css";

const DOMAIN_ICONS = {
  devices: "mdi:radar",
  backups: "mdi:backup-restore",
  contracts: "mdi:file-document-alert-outline",
  rmm: "mdi:laptop-off"
};

function alertRowIcon(alert) {
  const domain = String(alert?.domain || "").toLowerCase();
  const severity = String(alert?.severity || "").toLowerCase();
  if (domain === "backups") return DOMAIN_ICONS.backups;
  if (domain === "contracts") return DOMAIN_ICONS.contracts;
  if (domain === "rmm") return DOMAIN_ICONS.rmm;
  if (severity === "critical") return "mdi:alert-octagon";
  if (severity === "warning") return "mdi:alert";
  if (severity === "info") return "mdi:information-outline";
  return DOMAIN_ICONS.devices;
}

function severityToneClass(severity) {
  const value = String(severity || "").toLowerCase();
  if (value === "critical") return styles.sevCritical;
  if (value === "warning") return styles.sevWarning;
  return styles.sevInfo;
}

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

function canReopenAlert(alert) {
  const status = String(alert?.status || "").toLowerCase();
  return status === "closed" || status === "linked" || status === "acked";
}

function HistoryActionButton({
  hint,
  icon,
  onClick,
  disabled = false,
  danger = false
}) {
  return <SmartTooltip as="span" content={hint}>
      <button type="button" className={`${styles.actionBtn} ${danger ? styles.actionBtnDanger : ""}`} aria-label={hint} disabled={disabled} onClick={e => {
      e.stopPropagation();
      onClick?.(e);
    }}>
        <Icon icon={icon} aria-hidden />
      </button>
    </SmartTooltip>;
}

function historyAlertDisplay(alert) {
  const client = String(alert?.clientName || alert?.meta?.clientName || "").trim().toLowerCase();
  const title = String(alert?.title || "").trim();
  const label = String(alert?.label || "").trim();
  const titleIsClient = Boolean(client && title.toLowerCase() === client);
  const isBare = value => /^(warning|critical|info)$/i.test(String(value || "").trim());
  const preferTitle = Boolean(
    title &&
      !titleIsClient &&
      (!label || isBare(label) || ((title.includes(" - ") || title.includes(" — ")) && !(label.includes(" - ") || label.includes(" — "))))
  );
  const reason = (preferTitle ? title : label) || (!titleIsClient ? title : "") || title || alert?.queueItemId || "—";
  const parts = [];
  if (title && title !== reason && !titleIsClient) parts.push(title);
  String(alert?.subtitle || "").split(" · ").forEach(bit => {
    const trimmed = bit.trim();
    if (!trimmed || trimmed === reason) return;
    if (client && trimmed.toLowerCase() === client) return;
    parts.push(trimmed);
  });
  return {
    reason,
    subject: [...new Set(parts)].join(" · "),
    clientName: String(alert?.clientName || alert?.meta?.clientName || "").trim()
  };
}

function alertWhen(alert) {
  return alert?.deletedAt || alert?.createdAt || null;
}

function SortableHeader({
  column,
  label,
  sortKey,
  sortDir,
  onSort,
  sortAria
}) {
  const active = sortKey === column;
  const ariaSort = active ? sortDir === "asc" ? "ascending" : "descending" : "none";
  return <th aria-sort={ariaSort}>
      <button type="button" className={styles.sortBtn} onClick={() => onSort?.(column)} aria-label={sortAria || label}>
        <span>{label}</span>
        <Icon icon={active ? sortDir === "asc" ? "mdi:arrow-up" : "mdi:arrow-down" : "mdi:unfold-more-horizontal"} aria-hidden />
      </button>
    </th>;
}

export default function SupervisionAlertHistory({
  alerts = [],
  loading = false,
  searchQuery = "",
  domainFilter = "all",
  statusFilter = "all",
  trashMode = false,
  onSearchChange,
  onDomainFilter,
  onStatusFilter,
  onTrashModeChange,
  onChanged,
  localeTag,
  copy,
  showDomain = true
}) {
  const common = useCommonCopy();
  const locale = useAppLocale();
  const [expandedId, setExpandedId] = useState(null);
  const [eventsByAlert, setEventsByAlert] = useState({});
  const [loadingEvents, setLoadingEvents] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [busyBulk, setBusyBulk] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const columns = copy.columns || {};
  const hints = copy.actionHints || {};
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useDefaultPageSize();
  const handleSort = column => {
    if (sortKey === column) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(column);
    setSortDir(column === "when" ? "desc" : "asc");
  };
  const sortedAlerts = useMemo(() => {
    if (!sortKey) return alerts;
    const factor = sortDir === "asc" ? 1 : -1;
    const text = value => String(value || "").toLowerCase();
    const statusRank = {
      open: 0,
      acked: 1,
      linked: 2,
      closed: 3
    };
    return [...alerts].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "alert":
          cmp = text(historyAlertDisplay(a).reason).localeCompare(text(historyAlertDisplay(b).reason), undefined, {
            sensitivity: "base"
          });
          break;
        case "company":
          cmp = text(historyAlertDisplay(a).clientName).localeCompare(text(historyAlertDisplay(b).clientName), undefined, {
            sensitivity: "base"
          });
          break;
        case "domain":
          cmp = text(a.domain).localeCompare(text(b.domain), undefined, {
            sensitivity: "base"
          });
          break;
        case "status":
          cmp = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
          break;
        case "when": {
          const ta = new Date(alertWhen(a) || 0).getTime();
          const tb = new Date(alertWhen(b) || 0).getTime();
          cmp = (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
          break;
        }
        default:
          cmp = 0;
      }
      return cmp * factor;
    });
  }, [alerts, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sortedAlerts.length / pageSize) || 1);
  const pagedAlerts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAlerts.slice(start, start + pageSize);
  }, [sortedAlerts, currentPage, pageSize]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, domainFilter, statusFilter, trashMode, sortKey, sortDir, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery, domainFilter, statusFilter, trashMode]);
  useEffect(() => {
    const valid = new Set(sortedAlerts.map(alert => alert.id).filter(Boolean));
    setSelectedIds(prev => {
      let changed = false;
      const next = new Set();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
        else changed = true;
      }
      return changed || next.size !== prev.size ? next : prev;
    });
  }, [sortedAlerts]);
  const sortAriaFor = label => interpolate(copy.sortBy || "Trier par {label}", {
    label
  });
  const pageIds = useMemo(() => pagedAlerts.map(alert => alert.id).filter(Boolean), [pagedAlerts]);
  const selectedCount = selectedIds.size;
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const somePageSelected = pageIds.some(id => selectedIds.has(id));
  const toggleSelectOne = (alertId, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(alertId);
      else next.delete(alertId);
      return next;
    });
  };
  const toggleSelectPage = checked => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };
  const selectAllFiltered = () => {
    setSelectedIds(new Set(sortedAlerts.map(alert => alert.id).filter(Boolean)));
  };
  const clearSelection = () => setSelectedIds(new Set());

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

  const clearEventsCache = alertId => {
    setEventsByAlert(prev => {
      const next = { ...prev };
      delete next[alertId];
      return next;
    });
  };

  const runRowAction = async (alert, actionFn) => {
    setBusyId(alert.id);
    try {
      await actionFn(alert);
      clearEventsCache(alert.id);
      if (expandedId === alert.id) setExpandedId(null);
      onChanged?.(alert);
    } catch (err) {
      toast.error(err?.message || "Error");
    } finally {
      setBusyId(null);
    }
  };

  const handleReopen = alert => runRowAction(alert, reopenSupervisionAlert);
  const handleTrash = alert => runRowAction(alert, trashSupervisionAlert);
  const handleRestore = alert => runRowAction(alert, restoreSupervisionAlert);
  const handlePurge = alert => {
    const ok = window.confirm(copy.purgeConfirm || "Delete permanently?");
    if (!ok) return;
    return runRowAction(alert, purgeSupervisionAlert);
  };

  const runBulkAction = async (action, { confirmMessage } = {}) => {
    const ids = [...selectedIds];
    if (!ids.length || busyBulk) return;
    if (confirmMessage) {
      const ok = window.confirm(confirmMessage);
      if (!ok) return;
    }
    setBusyBulk(true);
    try {
      const result = await bulkActOnSupervisionAlerts(action, ids);
      const okCount = Number(result?.ok) || 0;
      const failedCount = Number(result?.failed) || 0;
      if (failedCount > 0) {
        toast.warn(
          interpolate(copy.bulkPartial || "{ok} réussie(s), {failed} en échec", {
            ok: String(okCount),
            failed: String(failedCount)
          })
        );
      } else {
        toast.success(
          interpolate(copy.bulkSuccess || "{count} alerte(s) traitée(s)", {
            count: String(okCount)
          })
        );
      }
      clearSelection();
      setExpandedId(null);
      onChanged?.({ bulk: true, action, ids });
    } catch (err) {
      toast.error(err?.message || copy.bulkFailed || "Error");
    } finally {
      setBusyBulk(false);
    }
  };

  const domainChips = showDomain ? [{
    id: "all",
    label: copy.domains.all,
    icon: "mdi:view-grid-outline",
    kpiTone: "gray"
  }, {
    id: "devices",
    label: copy.domains.devices,
    icon: DOMAIN_ICONS.devices,
    kpiTone: "blue"
  }, {
    id: "backups",
    label: copy.domains.backups,
    icon: DOMAIN_ICONS.backups,
    kpiTone: "cyan"
  }, {
    id: "contracts",
    label: copy.domains.contracts,
    icon: DOMAIN_ICONS.contracts,
    kpiTone: "amber"
  }, {
    id: "rmm",
    label: copy.domains.rmm,
    icon: DOMAIN_ICONS.rmm,
    kpiTone: "violet"
  }] : [];

  const statusChips = [{
    id: "closed",
    label: copy.status.closed,
    icon: "mdi:check-circle",
    kpiTone: "green"
  }, {
    id: "acked",
    label: copy.status.acked,
    icon: "mdi:account-check",
    kpiTone: "teal"
  }, {
    id: "linked",
    label: copy.status.linked,
    icon: "mdi:link-variant",
    kpiTone: "violet"
  }];

  return <div className={styles.root}>
      <div className={`${layout.toolbar} ${layout.toolbarWithFilters}`}>
        <div className={layout.searchWrap}>
          <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
          <input type="search" inputMode="search" enterKeyHint="search" className={layout.searchInput} value={searchQuery} onChange={e => onSearchChange?.(e.target.value)} placeholder={copy.searchPlaceholder} aria-label={copy.searchPlaceholder} />
          {searchQuery ? <SmartTooltip content={copy.clearSearch || "Effacer"}>
              <button type="button" onClick={() => onSearchChange?.("")} className={layout.clearButton} aria-label={copy.clearSearch || "Effacer"}>
                <FaTimes />
              </button>
            </SmartTooltip> : null}
        </div>
        <div className={layout.statusChips} role="group" aria-label={copy.filterAria || "Filters"}>
          {domainChips.length && !trashMode ? <>
              {domainChips.map(chip => <button key={chip.id} type="button" className={`${layout.statusChip} ${domainFilter === chip.id ? layout.statusChipActive : ""}`} onClick={() => onDomainFilter?.(chip.id)}>
                  <span className={`${layout.statusChipIcon} ${layout[`kpiIcon_${chip.kpiTone}`] || layout.kpiIcon_gray}`}>
                    <Icon icon={chip.icon} />
                  </span>
                  <span className={layout.statusChipLabel}>{chip.label}</span>
                </button>)}
              <span className={layout.statusChipSeparator} aria-hidden />
            </> : null}
          {!trashMode ? statusChips.map(chip => <button key={chip.id} type="button" className={`${layout.statusChip} ${statusFilter === chip.id ? layout.statusChipActive : ""}`} onClick={() => onStatusFilter?.(statusFilter === chip.id ? "all" : chip.id)}>
                <span className={`${layout.statusChipIcon} ${layout[`kpiIcon_${chip.kpiTone}`] || layout.kpiIcon_gray}`}>
                  <Icon icon={chip.icon} />
                </span>
                <span className={layout.statusChipLabel}>{chip.label}</span>
              </button>) : null}
        </div>
        <button
          type="button"
          className={`${styles.trashToggle} ${trashMode ? styles.trashToggleActive : ""}`}
          onClick={() => onTrashModeChange?.(!trashMode)}
          aria-pressed={trashMode}
        >
          <Icon icon="mdi:delete-outline" aria-hidden />
          <span>{copy.trash || "Corbeille"}</span>
        </button>
      </div>

      {loading ? <div className={styles.loading}>{copy.loading}</div> : alerts.length === 0 ? <div className={styles.emptyWrap}>
          <MspEmptyState
            className={styles.emptyStateFill}
            icon={trashMode ? "mdi:delete-outline" : "mdi:history"}
            title={trashMode ? (copy.emptyTrashTitle || "Corbeille vide") : copy.emptyTitle}
            text={trashMode ? (copy.emptyTrashText || "") : copy.emptyText}
          />
        </div> : <>
        {selectedCount > 0 ? <div className={styles.bulkBar} role="region" aria-label={copy.bulkAria || "Actions de masse"}>
            <span className={styles.bulkInfo}>
              {interpolate(copy.bulkSelected || "{count} sélectionnée(s)", { count: String(selectedCount) })}
              {selectedCount < sortedAlerts.length ? <button type="button" className={styles.bulkLink} onClick={selectAllFiltered} disabled={busyBulk}>
                  {interpolate(copy.bulkSelectAll || "Tout sélectionner ({count})", { count: String(sortedAlerts.length) })}
                </button> : null}
            </span>
            <div className={styles.bulkActions}>
              {trashMode ? <>
                  <button type="button" className={styles.bulkBtn} disabled={busyBulk} onClick={() => runBulkAction("restore")}>
                    <Icon icon="mdi:delete-restore" aria-hidden />
                    {copy.bulkRestore || copy.restore || "Restaurer"}
                  </button>
                  <button
                    type="button"
                    className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`}
                    disabled={busyBulk}
                    onClick={() => runBulkAction("purge", {
                      confirmMessage: interpolate(copy.bulkPurgeConfirm || "Supprimer définitivement {count} alerte(s) ? Action irréversible.", {
                        count: String(selectedCount)
                      })
                    })}
                  >
                    <Icon icon="mdi:delete-forever-outline" aria-hidden />
                    {copy.bulkPurge || copy.purge || "Supprimer"}
                  </button>
                </> : <>
                  <button
                    type="button"
                    className={styles.bulkBtn}
                    disabled={busyBulk}
                    onClick={() => runBulkAction("reopen")}
                  >
                    <Icon icon="mdi:restore" aria-hidden />
                    {copy.bulkReopen || copy.reopen || "Réouvrir"}
                  </button>
                  <button
                    type="button"
                    className={styles.bulkBtn}
                    disabled={busyBulk}
                    onClick={() => runBulkAction("trash", {
                      confirmMessage: interpolate(copy.bulkTrashConfirm || "Mettre {count} alerte(s) à la corbeille ?", {
                        count: String(selectedCount)
                      })
                    })}
                  >
                    <Icon icon="mdi:delete-outline" aria-hidden />
                    {copy.bulkTrash || copy.trashHint || "Corbeille"}
                  </button>
                </>}
              <button type="button" className={styles.bulkBtnGhost} disabled={busyBulk} onClick={clearSelection}>
                {copy.bulkClear || "Effacer la sélection"}
              </button>
            </div>
          </div> : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colSelect} />
              <col className={styles.colSev} />
              <col className={styles.colAlert} />
              <col className={styles.colStatus} />
              <col className={styles.colCompany} />
              {showDomain ? <col className={styles.colDomain} /> : null}
              <col className={styles.colWhen} />
              <col className={styles.colActions} />
            </colgroup>
            <thead>
              <tr>
                <th className={styles.selectCol}>
                  <input
                    type="checkbox"
                    className={styles.selectCheck}
                    checked={allPageSelected}
                    ref={el => {
                      if (el) el.indeterminate = !allPageSelected && somePageSelected;
                    }}
                    onChange={e => toggleSelectPage(e.target.checked)}
                    aria-label={copy.bulkSelectPage || "Sélectionner la page"}
                    disabled={busyBulk || pageIds.length === 0}
                  />
                </th>
                <th className={styles.sevCol} aria-hidden />
                <SortableHeader column="alert" label={columns.alert || "Alerte"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.alert || "Alerte")} />
                <SortableHeader column="status" label={columns.status || "Statut"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.status || "Statut")} />
                <SortableHeader column="company" label={columns.company || "Entreprise"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.company || "Entreprise")} />
                {showDomain ? <SortableHeader column="domain" label={columns.domain || "Domaine"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.domain || "Domaine")} /> : null}
                <SortableHeader column="when" label={columns.when || "Date"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.when || "Date")} />
                <th className={styles.actionsCol}>{columns.actions || "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {pagedAlerts.map(alert => {
              const open = expandedId === alert.id;
              const events = eventsByAlert[alert.id] || [];
              const domainLabel = showDomain ? copy.domains?.[alert.domain] || alert.domain : null;
              const expandHint = open ? hints.collapse || "Replier" : hints.expand || "Déplier";
              const reopenHint = hints.reopen || copy.reopen;
              const display = historyAlertDisplay(alert);
              const when = alertWhen(alert);
              const isSelected = selectedIds.has(alert.id);
              return <Fragment key={alert.id}>
                    <tr className={`${styles.dataRow} ${open ? styles.dataRowOpen : ""} ${isSelected ? styles.dataRowSelected : ""}`} onClick={() => setExpandedId(open ? null : alert.id)}>
                      <td className={styles.selectCol} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className={styles.selectCheck}
                          checked={isSelected}
                          onChange={e => toggleSelectOne(alert.id, e.target.checked)}
                          aria-label={interpolate(copy.bulkSelectRow || "Sélectionner {title}", {
                            title: display.reason
                          })}
                          disabled={busyBulk}
                        />
                      </td>
                      <td className={styles.sevCol}>
                        <span className={styles.leadingIcons}>
                          <span className={styles.expandIcon} title={expandHint} aria-hidden>
                            <Icon icon={open ? "mdi:chevron-down" : "mdi:chevron-right"} />
                          </span>
                          <span className={`${styles.sevIcon} ${severityToneClass(alert.severity)}`} aria-hidden>
                            <Icon icon={alertRowIcon(alert)} />
                          </span>
                        </span>
                      </td>
                      <td className={styles.alertCell}>
                        <div className={styles.alertBody}>
                          <span className={styles.titleRow}>
                            <span className={styles.title}>{display.reason}</span>
                          </span>
                          {display.subject ? <span className={styles.meta}>{display.subject}</span> : null}
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusBadgeClass(alert.status)}`}>
                          {copy.status[alert.status] || alert.status}
                        </span>
                      </td>
                      <td className={styles.companyCell}>{display.clientName || "—"}</td>
                      {showDomain ? <td className={styles.domainCol}>
                        <span className={styles.domainCell}>
                          {domainLabel}
                        </span>
                      </td> : null}
                      <td className={styles.whenCell}>
                        <time dateTime={when || undefined}>{formatWhen(when, localeTag)}</time>
                      </td>
                      <td className={styles.actionsCol} onClick={e => e.stopPropagation()}>
                        <div className={styles.rowActions} role="group">
                          {trashMode ? <>
                              <HistoryActionButton hint={hints.restore || copy.restoreHint || copy.restore} icon="mdi:delete-restore" disabled={busyId === alert.id} onClick={() => handleRestore(alert)} />
                              <HistoryActionButton hint={hints.purge || copy.purgeHint || copy.purge} icon="mdi:delete-forever-outline" danger disabled={busyId === alert.id} onClick={() => handlePurge(alert)} />
                            </> : <>
                              {canReopenAlert(alert) ? <HistoryActionButton hint={reopenHint} icon="mdi:restore" disabled={busyId === alert.id} onClick={() => handleReopen(alert)} /> : null}
                              <HistoryActionButton hint={hints.trash || copy.trashHint || copy.trash} icon="mdi:delete-outline" disabled={busyId === alert.id} onClick={() => handleTrash(alert)} />
                            </>}
                        </div>
                      </td>
                    </tr>
                    {open ? <tr className={styles.detailRow}>
                        <td colSpan={showDomain ? 8 : 7}>
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
        </div>
        {sortedAlerts.length > 0 ? <div className={`${layout.pagination} ${styles.paginationBar}`}>
            <div className={layout.paginationLeft}>
              <span className={layout.paginationLabel}>{common.perPage}</span>
              <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className={layout.paginationRight}>
              <SmartTooltip content={common.prevPage}>
                <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} aria-label={common.prevPage}>
                  <FaChevronLeft />
                </button>
              </SmartTooltip>
              <span className={layout.paginationInfo}>
                {formatPageInfo(locale, currentPage, totalPages)}
              </span>
              <SmartTooltip content={common.nextPage}>
                <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} aria-label={common.nextPage}>
                  <FaChevronRight />
                </button>
              </SmartTooltip>
            </div>
          </div> : null}
      </>}
    </div>;
}
