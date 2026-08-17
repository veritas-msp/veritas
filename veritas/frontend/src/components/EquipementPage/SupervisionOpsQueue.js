import { Icon } from "@iconify/react";
import { useMemo, useState } from "react";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import SmartTooltip from "../SmartTooltip";
import { interpolate } from "../../i18n/translate";
import styles from "./SupervisionOpsQueue.module.css";

function toneClass(tone, severity) {
  if (tone === "bad" || severity === "critical") return styles.sevCritical;
  if (tone === "warn" || severity === "warning") return styles.sevWarning;
  return styles.sevInfo;
}

const DOMAIN_ICONS = {
  devices: "mdi:devices",
  backups: "mdi:backup-restore",
  contracts: "mdi:file-document-alert-outline",
  rmm: "mdi:laptop-off"
};

function workflowBadgeClass(status) {
  if (status === "acked") return styles.wfAcked;
  if (status === "linked") return styles.wfLinked;
  return styles.wfOpen;
}

function severityBadgeClass(severity) {
  if (severity === "critical") return styles.sevBadgeCritical;
  if (severity === "warning") return styles.sevBadgeWarning;
  return styles.sevBadgeInfo;
}

function actionHint(copy, key) {
  return copy?.actionHints?.[key] || copy?.actions?.[key] || "";
}

function formatWhen(value, localeTag) {
  if (!value) return "—";
  try {
    const date = typeof value === "number" ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(localeTag || undefined, {
      dateStyle: "short",
      timeStyle: "short"
    });
  } catch {
    return "—";
  }
}

function remediationLabel(item, copy) {
  const kind = item.linkedTicketKind;
  if (kind === "support") return copy.collab?.ticketSupport;
  if (kind === "prestation" || kind === "presta" || kind === "sales") return copy.collab?.ticketPresta;
  if (kind === "planning" || item.linkedEventId) return copy.collab?.planning;
  if (item.linkedTicketId || item.linkedEventId) return copy.collab?.remediation;
  return null;
}

function QueueActionButton({
  hint,
  label,
  icon,
  onClick,
  disabled = false,
  primary = false
}) {
  const tip = hint || label;
  return <SmartTooltip as="span" content={tip}>
      <button type="button" className={`${styles.actionBtn} ${primary ? styles.actionBtnPrimary : ""}`} aria-label={tip} disabled={disabled} onClick={e => {
      e.stopPropagation();
      onClick?.(e);
    }}>
        <Icon icon={icon} aria-hidden />
      </button>
    </SmartTooltip>;
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

function FilterChip({
  active,
  onClick,
  label,
  count,
  tone
}) {
  return <button type="button" className={`${styles.filterChip} ${active ? styles.filterChipActive : ""} ${tone ? styles[`filterTone_${tone}`] || "" : ""}`} onClick={onClick}>
      {label}
      {count != null ? <span className={styles.filterCount}>{count}</span> : null}
    </button>;
}

export default function SupervisionOpsQueue({
  items = [],
  kpi = {},
  domainCounts = {},
  workflowCounts = {},
  severityFilter = "all",
  domainFilter = "all",
  workflowFilter = "all",
  searchQuery = "",
  onSeverityFilter,
  onDomainFilter,
  onWorkflowFilter,
  onSearchChange,
  onOpenItem,
  onTicketSupport,
  onTicketPresta,
  onPlanEvent,
  onAck,
  onResolve,
  onDismiss,
  busyId = null,
  localeTag,
  copy
}) {
  const columns = copy.columns || {};
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const handleSort = column => {
    if (sortKey === column) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(column);
    setSortDir(column === "when" ? "desc" : "asc");
  };
  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    const factor = sortDir === "asc" ? 1 : -1;
    const severityRank = {
      critical: 0,
      warning: 1,
      info: 2
    };
    const statusRank = {
      open: 0,
      acked: 1,
      linked: 2
    };
    const text = value => String(value || "").toLowerCase();
    const whenMs = item => {
      const raw = item.notifiedAt || item.alertState?.createdAt;
      if (raw == null || raw === "") return 0;
      const ms = typeof raw === "number" ? raw : new Date(raw).getTime();
      return Number.isNaN(ms) ? 0 : ms;
    };
    return [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "alert":
          cmp = text(a.title || a.label).localeCompare(text(b.title || b.label), undefined, {
            sensitivity: "base"
          });
          break;
        case "company":
          cmp = text(a.clientName).localeCompare(text(b.clientName), undefined, {
            sensitivity: "base"
          });
          break;
        case "domain":
          cmp = text(a.domain).localeCompare(text(b.domain), undefined, {
            sensitivity: "base"
          });
          break;
        case "severity":
          cmp = (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
          break;
        case "status":
          cmp = (statusRank[a.workflowStatus || "open"] ?? 9) - (statusRank[b.workflowStatus || "open"] ?? 9);
          break;
        case "when":
          cmp = whenMs(a) - whenMs(b);
          break;
        default:
          cmp = 0;
      }
      return cmp * factor;
    });
  }, [items, sortKey, sortDir]);
  const sortAriaFor = label => interpolate(copy.sortBy || "Trier par {label}", {
    label
  });
  const domainChips = [{
    id: "all",
    label: copy.domains.all,
    count: workflowCounts.total || 0
  }, {
    id: "devices",
    label: copy.domains.devices,
    count: domainCounts.devices || 0
  }, {
    id: "backups",
    label: copy.domains.backups,
    count: domainCounts.backups || 0
  }, {
    id: "contracts",
    label: copy.domains.contracts,
    count: domainCounts.contracts || 0
  }, {
    id: "rmm",
    label: copy.domains.rmm,
    count: domainCounts.rmm || 0
  }];

  const severityChips = [{
    id: "critical",
    label: copy.kpi.critical,
    count: kpi.critical || 0,
    tone: "critical"
  }, {
    id: "warning",
    label: copy.kpi.warning,
    count: kpi.warning || 0,
    tone: "warning"
  }];

  const workflowChips = [{
    id: "open",
    label: copy.workflow?.open || "Open",
    count: workflowCounts.open || 0
  }, {
    id: "acked",
    label: copy.workflow?.acked || "Acked",
    count: workflowCounts.acked || 0
  }, {
    id: "linked",
    label: copy.workflow?.linked || "Linked",
    count: workflowCounts.linked || 0
  }];

  return <div className={styles.root}>
      <div className={styles.toolbar} data-guide="supervision-filters">
        <label className={styles.searchBox}>
          <Icon icon="mdi:magnify" aria-hidden />
          <input type="search" value={searchQuery} onChange={e => onSearchChange?.(e.target.value)} placeholder={copy.searchPlaceholder} />
        </label>
      </div>

      <div className={styles.filtersBar} role="group" aria-label={copy.domainAria} data-guide="supervision-kpis">
        <div className={styles.filterGroup}>
          {domainChips.map(chip => <FilterChip key={chip.id} label={chip.label} count={chip.count} active={domainFilter === chip.id} onClick={() => onDomainFilter?.(chip.id)} />)}
        </div>
        <span className={styles.filterSep} aria-hidden />
        <div className={styles.filterGroup}>
          {severityChips.map(chip => <FilterChip key={chip.id} label={chip.label} count={chip.count} tone={chip.tone} active={severityFilter === chip.id} onClick={() => onSeverityFilter?.(severityFilter === chip.id ? "all" : chip.id)} />)}
        </div>
        <span className={styles.filterSep} aria-hidden />
        <div className={styles.filterGroup} role="group" aria-label={copy.workflow?.aria || "Workflow"}>
          {workflowChips.map(chip => <FilterChip key={chip.id} label={chip.label} count={chip.count} active={workflowFilter === chip.id} onClick={() => onWorkflowFilter?.(workflowFilter === chip.id ? "all" : chip.id)} />)}
        </div>
      </div>

      {items.length === 0 ? <div className={styles.emptyWrap} data-guide="supervision-queue">
          <MspEmptyState icon="mdi:bell-check-outline" title={copy.emptyTitle} text={copy.emptyText} />
        </div> : <div className={styles.tableWrap} data-guide="supervision-queue">
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colSev} />
              <col className={styles.colAlert} />
              <col className={styles.colCompany} />
              <col className={styles.colDomain} />
              <col className={styles.colSeverity} />
              <col className={styles.colStatus} />
              <col className={styles.colWhen} />
              <col className={styles.colActions} />
            </colgroup>
            <thead>
              <tr>
                <th className={styles.sevCol} aria-hidden />
                <SortableHeader column="alert" label={columns.alert || "Alerte"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.alert || "Alerte")} />
                <SortableHeader column="company" label={columns.company || "Entreprise"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.company || "Entreprise")} />
                <SortableHeader column="domain" label={columns.domain || "Domaine"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.domain || "Domaine")} />
                <SortableHeader column="severity" label={columns.severity || "Sévérité"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.severity || "Sévérité")} />
                <SortableHeader column="status" label={columns.status || "Statut"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.status || "Statut")} />
                <SortableHeader column="when" label={columns.when || "Date"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.when || "Date")} />
                <th className={styles.actionsCol}>{columns.actions || "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(item => {
              const wf = item.workflowStatus || "open";
              const busy = busyId === item.id;
              const domainLabel = copy.domains?.[item.domain] || item.domain;
              const severityLabel = item.severity === "critical" ? copy.kpi.critical : item.severity === "warning" ? copy.kpi.warning : copy.severityInfo || "Info";
              const when = formatWhen(item.notifiedAt || item.alertState?.createdAt, localeTag);
              const handler = item.handledByName || item.alertState?.ackedByName || null;
              const remediation = remediationLabel(item, copy);
              const metaBits = [item.subtitle].filter(Boolean);
              const collabBits = [];
              if (handler) {
                collabBits.push(interpolate(copy.collab?.handledBy || "{name}", {
                  name: handler
                }));
              }
              if (remediation) collabBits.push(remediation);
              return <tr key={item.id} className={`${styles.dataRow} ${wf !== "open" ? styles.rowHandled : ""}`} onClick={() => onOpenItem?.(item)}>
                    <td className={styles.sevCol}>
                      <span className={`${styles.sevDot} ${toneClass(item.tone, item.severity)}`} aria-hidden />
                    </td>
                    <td className={styles.alertCell}>
                      <div className={styles.alertBody}>
                        <span className={styles.rowTitle}>{item.title}</span>
                        {metaBits.length ? <span className={styles.rowMeta}>{metaBits.join(" · ")}</span> : null}
                        {collabBits.length ? <span className={styles.rowCollab}>
                            <Icon icon="mdi:account-outline" aria-hidden />
                            {collabBits.join(" · ")}
                          </span> : null}
                      </div>
                    </td>
                    <td className={styles.companyCell}>{item.clientName || "—"}</td>
                    <td className={styles.domainCol}>
                      <span className={styles.domainCell}>
                        <span className={`${styles.domainIcon} ${styles[`domain_${item.domain}`] || ""}`} aria-hidden>
                          <Icon icon={DOMAIN_ICONS[item.domain] || "mdi:bell-outline"} />
                        </span>
                        {domainLabel}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.chipBadge} ${severityBadgeClass(item.severity)}`}>{severityLabel}</span>
                    </td>
                    <td>
                      <span className={`${styles.wfBadge} ${workflowBadgeClass(wf)}`}>{copy.workflow?.[wf] || wf}</span>
                    </td>
                    <td className={styles.whenCell}>
                      <time dateTime={item.notifiedAt || item.alertState?.createdAt || undefined}>{when}</time>
                    </td>
                    <td className={styles.actionsCol} onClick={e => e.stopPropagation()}>
                      <div className={styles.rowActions} role="group" aria-label={copy.actionsAria || "Actions"}>
                        {wf === "open" ? <QueueActionButton hint={actionHint(copy, "ack")} label={copy.actions.ack} icon="mdi:eye-check-outline" disabled={busy} onClick={() => onAck?.(item)} /> : null}
                        <QueueActionButton hint={actionHint(copy, "support")} label={copy.actions.support} icon="mdi:message-processing-outline" disabled={busy} onClick={() => onTicketSupport?.(item)} />
                        <QueueActionButton hint={actionHint(copy, "presta")} label={copy.actions.presta} icon="mdi:briefcase-outline" disabled={busy} onClick={() => onTicketPresta?.(item)} />
                        <QueueActionButton hint={actionHint(copy, "plan")} label={copy.actions.plan} icon="mdi:calendar-plus" disabled={busy} onClick={() => onPlanEvent?.(item)} />
                        <QueueActionButton hint={actionHint(copy, "resolve")} label={copy.actions.resolve} icon="mdi:check-circle-outline" disabled={busy} onClick={() => onResolve?.(item)} />
                        <QueueActionButton hint={actionHint(copy, "dismiss")} label={copy.actions.dismiss} icon="mdi:close-circle-outline" disabled={busy} onClick={() => onDismiss?.(item)} />
                        <QueueActionButton hint={actionHint(copy, "open")} label={copy.actions.open} icon="mdi:open-in-new" primary onClick={() => onOpenItem?.(item)} />
                      </div>
                    </td>
                  </tr>;
            })}
            </tbody>
          </table>
        </div>}
    </div>;
}
