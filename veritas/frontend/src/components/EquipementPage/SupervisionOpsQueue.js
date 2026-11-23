import { Icon } from "@iconify/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { UiKitCrmListToolbar, UiKitEmptyState, UiKitScrollFadeShell } from "../UiKit";
import { cycleSortState } from "../Misc/SortableHeader/cycleSortState";
import SmartTooltip from "../SmartTooltip";
import { formatPageInfo } from "../../i18n/commonI18n";
import { interpolate } from "../../i18n/translate";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import { formatEquipmentDetailRelative } from "./equipmentDetailPageI18n";
import { SUPERVISION_FAMILIES } from "./supervisionAlertRulesConfig";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./SupervisionOpsQueue.module.css";

const FAMILY_BY_KEY = new Map(SUPERVISION_FAMILIES.map(f => [f.key, f]));

/** Clés `copy.coverage.families` (i18n) pour les familles du centre. */
const FAMILY_COVERAGE_KEY = {
  ordinateurs: "Ordinateurs",
  servers: "Serveurs",
  stockage: "Stockage",
  firewall: "Firewalls",
  switch: "Switch",
  wifi: "BorneWifi",
  routeur: "Routeur",
  internet: "Internet",
  toip: "TOIP",
  alimentation: "Alimentation"
};

function toneClass(tone, severity) {
  if (tone === "bad" || severity === "critical") return styles.sevCritical;
  if (tone === "warn" || severity === "warning") return styles.sevWarning;
  return styles.sevInfo;
}

const DOMAIN_ICONS = {
  devices: "mdi:radar",
  backups: "mdi:backup-restore",
  contracts: "mdi:file-document-alert-outline",
  rmm: "mdi:laptop-off"
};

function alertRowIcon(item) {
  const domain = String(item?.domain || "").toLowerCase();
  const severity = String(item?.severity || "").toLowerCase();
  if (domain === "backups") return DOMAIN_ICONS.backups;
  if (domain === "contracts") return DOMAIN_ICONS.contracts;
  if (domain === "rmm") return DOMAIN_ICONS.rmm;
  if (severity === "critical") return "mdi:alert-octagon";
  if (severity === "warning") return "mdi:alert";
  if (severity === "info") return "mdi:information-outline";
  return DOMAIN_ICONS.devices;
}

function resolveDeviceName(item) {
  return (
    item?.equipment?.name ||
    item?.alertState?.meta?.equipmentName ||
    item?.hostName ||
    item?.alertState?.meta?.hostName ||
    null
  );
}

function resolveFamilyMeta(item) {
  const key = String(item?.family || item?.alertState?.meta?.family || "").trim().toLowerCase();
  if (!key) return null;
  return FAMILY_BY_KEY.get(key) || null;
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

function FreshnessBadge({ item, copy, locale }) {
  const last = item?.lastSyncedAt;
  const stale = Boolean(item?.stale) || !last;
  // Contrats / licences : pas de sync CheckMK — pas de badge fraîcheur.
  if (String(item?.domain || "").toLowerCase() === "contracts") return null;
  const label = !last
    ? copy?.freshness?.never || "Never"
    : (copy?.freshness?.ago || "Sync {time}").replace("{time}", formatEquipmentDetailRelative(last, locale));
  const short = stale ? copy?.freshness?.stale || "Stale" : copy?.freshness?.fresh || "Fresh";
  return (
    <span
      className={`${styles.freshBadge} ${stale ? styles.freshBadgeStale : styles.freshBadgeOk}`}
      title={label}
    >
      {short}
    </span>
  );
}

function QueueActionButton({
  hint,
  label,
  icon,
  onClick,
  disabled = false,
  primary = false,
  buttonRef = null
}) {
  const tip = hint || label;
  return <SmartTooltip as="span" content={tip}>
      <button ref={buttonRef} type="button" className={`${styles.actionBtn} ${primary ? styles.actionBtnPrimary : ""}`} aria-label={tip} disabled={disabled} onClick={e => {
      e.stopPropagation();
      onClick?.(e);
    }}>
        <Icon icon={icon} width={18} height={18} aria-hidden />
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
  icon,
  kpiTone = "gray"
}) {
  const disabled = count != null && count === 0;
  return <button type="button" className={`${layout.statusChip} ${active ? layout.statusChipActive : ""} ${disabled ? layout.statusChipDisabled : ""}`} onClick={onClick} disabled={disabled}>
      {icon ? <span className={`${layout.statusChipIcon} ${layout[`kpiIcon_${kpiTone}`] || layout.kpiIcon_gray}`}>
          <Icon icon={icon} />
        </span> : null}
      <span className={layout.statusChipLabel}>{label}</span>
      {count != null ? <span className={layout.statusChipCount}>{count}</span> : null}
    </button>;
}

function stabilizeMergeGroups(list = []) {
  const items = Array.isArray(list) ? list : [];
  if (items.length < 2) return items;
  const alertIdsInList = new Set(items.map(item => String(item.alertId || "")).filter(Boolean));
  const childrenByParent = new Map();
  const roots = [];
  for (const item of items) {
    const parentId = String(item.parentAlertId || "").trim();
    if (parentId && alertIdsInList.has(parentId)) {
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId).push(item);
    } else {
      roots.push(item);
    }
  }
  const out = [];
  const seen = new Set();
  for (const root of roots) {
    out.push(root);
    seen.add(root.id);
    const kids = childrenByParent.get(String(root.alertId || "")) || [];
    kids.forEach(child => {
      out.push(child);
      seen.add(child.id);
    });
  }
  items.forEach(item => {
    if (!seen.has(item.id)) out.push(item);
  });
  return out;
}

function pickDefaultMergeParent(selectedItems = [], candidates = []) {
  const selected = Array.isArray(selectedItems) ? selectedItems.filter(item => !item?.isMergeChild) : [];
  const pool = selected.length
    ? selected
    : (Array.isArray(candidates) ? candidates.filter(item => !item?.isMergeChild) : []);
  if (!pool.length) return null;
  const withTicket = pool.find(item => item.linkedTicketId || item.workflowStatus === "linked");
  if (withTicket) return withTicket;
  const acked = pool.find(item => item.workflowStatus === "acked");
  if (acked) return acked;
  return pool[0];
}

function formatMergeParentOption(item) {
  const title = String(item?.title || item?.id || "").trim() || "—";
  if (item?.linkedTicketNumber) return `#${item.linkedTicketNumber} · ${title}`;
  if (item?.linkedTicketId) return `Ticket · ${title}`;
  return title;
}

function MoreMenu({
  item,
  copy,
  triageView,
  canDiagnose,
  busy,
  resyncBusy,
  onIgnore,
  onMaintenance,
  onUnack,
  onUnmerge,
  onMergeHere,
  canMergeHere = false,
  onResync,
  onDiagnose,
  onOpenItem,
  onClose
}) {
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = event => {
      if (menuRef.current?.contains(event.target)) return;
      onClose?.();
    };
    const handleEscape = event => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const more = copy?.moreMenu || {};
  return (
    <div ref={menuRef} className={styles.moreMenu} role="menu" onClick={e => e.stopPropagation()}>
      {triageView === "todo" ? (
        <>
          <button type="button" className={styles.muteMenuItem} disabled={busy} onClick={() => { onClose?.(); onIgnore?.(item); }}>
            {more.ignore || copy?.actions?.dismiss || "Ignore"}
          </button>
          <button type="button" className={styles.muteMenuItem} disabled={busy} onClick={() => { onClose?.(); onMaintenance?.(item); }}>
            {more.maintenance || "Maintenance"}
          </button>
        </>
      ) : null}
      {triageView === "in_progress" ? (
        <>
          <button type="button" className={styles.muteMenuItem} disabled={busy} onClick={() => { onClose?.(); onUnack?.(item); }}>
            {more.unack || copy?.actions?.unack || "Release"}
          </button>
          <button type="button" className={styles.muteMenuItem} disabled={busy} onClick={() => { onClose?.(); onMaintenance?.(item); }}>
            {more.maintenance || "Maintenance"}
          </button>
        </>
      ) : null}
      {item?.isMergeChild ? (
        <button type="button" className={styles.muteMenuItem} disabled={busy} onClick={() => { onClose?.(); onUnmerge?.(item); }}>
          {more.unmerge || copy?.merge?.unmerge || "Unmerge"}
        </button>
      ) : null}
      {canMergeHere && !item?.isMergeChild ? (
        <button type="button" className={styles.muteMenuItem} disabled={busy} onClick={() => { onClose?.(); onMergeHere?.(item); }}>
          {more.mergeHere || copy?.merge?.mergeHere || "Merge selection here"}
        </button>
      ) : null}
      <p className={styles.muteMenuHint}>{more.technical || "Technical"}</p>
      <button type="button" className={styles.muteMenuItem} disabled={busy || resyncBusy} onClick={() => { onClose?.(); onResync?.(item); }}>
        {more.resync || copy?.actions?.resync || "Resync"}
      </button>
      {canDiagnose ? (
        <button type="button" className={styles.muteMenuItem} disabled={busy || !item.alertId} onClick={() => { onClose?.(); onDiagnose?.(item); }}>
          {more.diagnose || copy?.actions?.diagnose || "Diagnostic"}
        </button>
      ) : null}
      <button type="button" className={styles.muteMenuItem} onClick={() => { onClose?.(); onOpenItem?.(item); }}>
        {more.openDevice || copy?.actions?.open || "Open device"}
      </button>
    </div>
  );
}

export default function SupervisionOpsQueue({
  items = [],
  /** Cibles de fusion (toute la file active) — permet de fusionner vers une alerte d’un autre onglet. */
  mergeTargetItems = null,
  kpi = {},
  domainCounts = {},
  triageCounts = {},
  severityFilter = "all",
  domainFilter = "all",
  triageView = "todo",
  searchQuery = "",
  onSeverityFilter,
  onDomainFilter,
  onTriageView,
  onSearchChange,
  onOpenItem,
  onOpenExclusionDevice,
  onOpenTicket,
  onTicketSupport,
  onAck,
  onUnack,
  onResolve,
  onIgnore,
  onMaintenance,
  onMerge,
  onUnmerge,
  onResync,
  onDiagnose,
  onEndExclusion,
  exclusions = [],
  canDiagnose = false,
  resyncBusyId = null,
  busyId = null,
  mergeBusy = false,
  localeTag,
  copy,
  showDomain = true,
  animateNewRows = false,
  toolbarActions = null
}) {
  const columns = copy.columns || {};
  const mergeCopy = copy.merge || {};
  const common = useCommonCopy();
  const locale = useAppLocale();
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useDefaultPageSize();
  const knownIdsRef = useRef(new Set());
  const primedRef = useRef(false);
  const [enteringIds, setEnteringIds] = useState(() => new Set());
  const [moreMenuId, setMoreMenuId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [mergeParentId, setMergeParentId] = useState(null);
  const enterTimersRef = useRef(new Map());

  useEffect(() => {
    const nextIds = (Array.isArray(items) ? items : []).map(item => item?.id).filter(Boolean);
    if (!primedRef.current) {
      knownIdsRef.current = new Set(nextIds);
      primedRef.current = true;
      return undefined;
    }
    if (!animateNewRows) {
      knownIdsRef.current = new Set(nextIds);
      return undefined;
    }
    const fresh = nextIds.filter(id => !knownIdsRef.current.has(id));
    nextIds.forEach(id => knownIdsRef.current.add(id));
    if (!fresh.length) return undefined;
    setEnteringIds(prev => {
      const merged = new Set(prev);
      fresh.forEach(id => merged.add(id));
      return merged;
    });
    fresh.forEach(id => {
      const existing = enterTimersRef.current.get(id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        setEnteringIds(prev => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        enterTimersRef.current.delete(id);
      }, 950);
      enterTimersRef.current.set(id, timer);
    });
    return undefined;
  }, [items, animateNewRows]);

  useEffect(() => () => {
    enterTimersRef.current.forEach(timer => clearTimeout(timer));
    enterTimersRef.current.clear();
  }, []);
  const handleSort = column => {
    const next = cycleSortState({
      column,
      sortBy: sortKey,
      sortDirection: sortDir,
      defaultSortBy: null,
      defaultSortDirection: "asc",
      getFirstDirection: col => (col === "when" ? "desc" : "asc")
    });
    setSortKey(next.sortBy);
    setSortDir(next.sortDirection);
  };
  const sortedItems = useMemo(() => {
    if (!sortKey) return stabilizeMergeGroups(items);
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
      const raw =
        item.notifiedAt ||
        item.alertAt ||
        item.alertState?.meta?.checkmkAlertAt ||
        item.alertState?.createdAt;
      if (raw == null || raw === "") return 0;
      const ms = typeof raw === "number" ? raw : new Date(raw).getTime();
      return Number.isNaN(ms) ? 0 : ms;
    };
    const sorted = [...items].sort((a, b) => {
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
        case "device":
          cmp = text(resolveDeviceName(a)).localeCompare(text(resolveDeviceName(b)), undefined, {
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
    return stabilizeMergeGroups(sorted);
  }, [items, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize) || 1);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);
  const itemById = useMemo(() => {
    const map = new Map();
    sortedItems.forEach(item => map.set(String(item.id), item));
    return map;
  }, [sortedItems]);
  const selectedItems = useMemo(
    () => [...selectedIds].map(id => itemById.get(String(id))).filter(Boolean),
    [selectedIds, itemById]
  );
  // Cible = alerte existante (toute la file active si fournie), pas un enfant déjà fusionné.
  const mergeParentCandidates = useMemo(() => {
    const pool = Array.isArray(mergeTargetItems) && mergeTargetItems.length
      ? mergeTargetItems
      : sortedItems;
    const byId = new Map();
    pool.forEach(item => {
      if (!item || item.isMergeChild) return;
      const key = String(item.id || item.queueItemId || "");
      if (!key || byId.has(key)) return;
      byId.set(key, item);
    });
    return [...byId.values()].sort((a, b) => {
      const aTicket = a.linkedTicketId || a.workflowStatus === "linked" ? 0 : 1;
      const bTicket = b.linkedTicketId || b.workflowStatus === "linked" ? 0 : 1;
      if (aTicket !== bTicket) return aTicket - bTicket;
      const aAck = a.workflowStatus === "acked" || a.workflowStatus === "linked" ? 0 : 1;
      const bAck = b.workflowStatus === "acked" || b.workflowStatus === "linked" ? 0 : 1;
      if (aAck !== bAck) return aAck - bAck;
      return String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" });
    });
  }, [mergeTargetItems, sortedItems]);
  const canMergeSelection =
    selectedItems.length >= 1 &&
    mergeParentCandidates.length >= 1 &&
    Boolean(mergeParentId) &&
    selectedItems.some(item => String(item.id) !== String(mergeParentId));

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
    setMergeParentId(null);
  }, [searchQuery, severityFilter, domainFilter, triageView, sortKey, sortDir, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  useEffect(() => {
    const valid = new Set(sortedItems.map(item => String(item.id)));
    setSelectedIds(prev => {
      const next = new Set([...prev].filter(id => valid.has(String(id))));
      return next.size === prev.size ? prev : next;
    });
  }, [sortedItems]);
  useEffect(() => {
    if (selectedItems.length === 0) {
      setMergeParentId(null);
      return;
    }
    const stillValid = mergeParentCandidates.some(item => String(item.id) === String(mergeParentId));
    if (stillValid) return;
    const def = pickDefaultMergeParent(selectedItems, mergeParentCandidates);
    // Si la seule sélection est le parent potentiel, prendre une autre cible si possible.
    if (def && selectedItems.length === 1 && String(def.id) === String(selectedItems[0].id)) {
      const other = mergeParentCandidates.find(item => String(item.id) !== String(def.id));
      setMergeParentId(other?.id || def.id);
      return;
    }
    setMergeParentId(def?.id || null);
  }, [selectedItems, mergeParentCandidates, mergeParentId]);

  const toggleSelect = itemId => {
    const id = String(itemId);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectPage = () => {
    const pageIds = pagedItems.map(item => String(item.id));
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };
  const clearSelection = () => {
    setSelectedIds(new Set());
    setMergeParentId(null);
  };
  const runMerge = async parent => {
    if (!parent || mergeBusy) return;
    const children = selectedItems.filter(item => String(item.id) !== String(parent.id));
    if (!children.length) return;
    try {
      await onMerge?.({ parent, children });
      clearSelection();
    } catch {
      /* toasts handled by parent */
    }
  };
  const handleMergeClick = async () => {
    if (!canMergeSelection || mergeBusy) return;
    const parent =
      mergeParentCandidates.find(item => String(item.id) === String(mergeParentId)) ||
      pickDefaultMergeParent(selectedItems, mergeParentCandidates);
    await runMerge(parent);
  };
  const handleMergeHere = async parent => {
    if (!parent || parent.isMergeChild || mergeBusy) return;
    const children = selectedItems.filter(item => String(item.id) !== String(parent.id));
    if (!children.length) return;
    await runMerge(parent);
  };
  const pageAllSelected =
    pagedItems.length > 0 && pagedItems.every(item => selectedIds.has(String(item.id)));
  const pageSomeSelected = pagedItems.some(item => selectedIds.has(String(item.id)));
  const sortAriaFor = label => interpolate(copy.sortBy || "Trier par {label}", {
    label
  });
  const triageChips = [{
    id: "todo",
    label: copy.triage?.todo || "To handle",
    count: triageCounts.todo || 0,
    icon: "mdi:alert-circle-outline",
    kpiTone: "red"
  }, {
    id: "in_progress",
    label: copy.triage?.inProgress || "In progress",
    count: triageCounts.inProgress || 0,
    icon: "mdi:account-check",
    kpiTone: "blue"
  }, {
    id: "waiting",
    label: copy.triage?.waiting || "Waiting",
    count: triageCounts.waiting || 0,
    icon: "mdi:wrench-clock",
    kpiTone: "amber"
  }];

  const severityChips = triageView === "todo" ? [{
    id: "critical",
    label: copy?.kpi?.critical || "Critical",
    count: kpi.critical || 0,
    icon: "mdi:alert-octagon",
    kpiTone: "red"
  }, {
    id: "warning",
    label: copy?.kpi?.warning || "Warning",
    count: kpi.warning || 0,
    icon: "mdi:alert",
    kpiTone: "amber"
  }] : [];

  const waitingCopy = copy.waitingPanel || {};

  return <>
    <div className={`${layout.panelCard} ${styles.root}`}>
      <div data-guide="supervision-filters">
        <UiKitCrmListToolbar
          searchValue={searchQuery}
          onSearchChange={value => onSearchChange?.(value)}
          onSearchClear={() => onSearchChange?.("")}
          searchPlaceholder={copy.searchPlaceholder}
          searchAriaLabel={copy.searchPlaceholder}
          clearSearchLabel={copy.clearSearch || "Effacer"}
          filtersAriaLabel={copy.triage?.aria || copy.kpi?.aria}
          filters={
            <div data-guide="supervision-kpis" style={{ display: "contents" }}>
              {triageChips.map(chip => (
                <FilterChip
                  key={chip.id}
                  label={chip.label}
                  count={chip.count}
                  icon={chip.icon}
                  kpiTone={chip.kpiTone}
                  active={triageView === chip.id}
                  onClick={() => onTriageView?.(chip.id)}
                />
              ))}
              {severityChips.length ? (
                <>
                  <span className={layout.statusChipSeparator} aria-hidden />
                  {severityChips.map(chip => (
                    <FilterChip
                      key={chip.id}
                      label={chip.label}
                      count={chip.count}
                      icon={chip.icon}
                      kpiTone={chip.kpiTone}
                      active={severityFilter === chip.id}
                      onClick={() => onSeverityFilter?.(severityFilter === chip.id ? "all" : chip.id)}
                    />
                  ))}
                </>
              ) : null}
            </div>
          }
          extraActions={toolbarActions}
        />
      </div>

      {triageView === "waiting" ? (
        <UiKitScrollFadeShell className={styles.tableWrap} deps={[exclusions?.length || 0, triageView]}>
          {(exclusions || []).length === 0 ? (
            <div className={styles.emptyWrap}>
              <UiKitEmptyState
                bare
                className={styles.emptyStateFill}
                icon="mdi:wrench-clock"
                title={waitingCopy.emptyTitle || "No active maintenances"}
                text={waitingCopy.emptyText || "Device or service exclusions appear here."}
              />
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{waitingCopy.colDevice || "Device"}</th>
                  <th>{waitingCopy.colServices || "Services"}</th>
                  <th>{waitingCopy.colReason || "Reason"}</th>
                  <th>{waitingCopy.colUntil || "Ends"}</th>
                  <th>{waitingCopy.colActions || "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {exclusions.map(row => {
                  const equipmentId = row.equipmentId || row.equipment_id;
                  const deviceLabel = row.equipmentName || row.equipment_name || equipmentId || "—";
                  const canOpenDevice = Boolean(equipmentId && (onOpenExclusionDevice || onOpenItem));
                  const openDevice = (options = {}) => {
                    if (!canOpenDevice) return;
                    if (onOpenExclusionDevice) {
                      onOpenExclusionDevice(row, options);
                      return;
                    }
                    onOpenItem?.(
                      {
                        equipmentId,
                        clientId: row.clientId ?? row.client_id ?? null,
                        equipmentName: row.equipmentName || row.equipment_name || null,
                        equipment: {
                          id: equipmentId,
                          dbId: equipmentId,
                          clientId: row.clientId ?? row.client_id ?? null,
                          name: row.equipmentName || row.equipment_name || null,
                          type: row.equipmentFamily || row.equipment_family || null
                        }
                      },
                      options
                    );
                  };
                  return (
                  <tr key={row.id} className={styles.dataRow}>
                    <td
                      className={`${styles.deviceCell} ${canOpenDevice ? styles.deviceCellInteractive : ""}`}
                      onClick={e => {
                        e.stopPropagation();
                        openDevice();
                      }}
                      onMouseDown={e => {
                        if (e.button === 1 && canOpenDevice) {
                          e.preventDefault();
                          e.stopPropagation();
                          openDevice({ background: true });
                        }
                      }}
                      onAuxClick={e => {
                        if (e.button === 1 && canOpenDevice) {
                          e.preventDefault();
                          e.stopPropagation();
                          openDevice({ background: true });
                        }
                      }}
                    >
                      {canOpenDevice ? (
                        <button type="button" className={styles.deviceLink} onClick={e => { e.stopPropagation(); openDevice(); }}>
                          {deviceLabel}
                        </button>
                      ) : (
                        deviceLabel
                      )}
                    </td>
                    <td>
                      {row.scope === "device"
                        ? waitingCopy.allServices || "All"
                        : row.serviceName || row.serviceKey || "—"}
                    </td>
                    <td>{row.reason || "—"}</td>
                    <td>
                      {row.excludedUntil
                        ? new Date(row.excludedUntil).toLocaleString(localeTag, {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : waitingCopy.indefinite || "Indefinite"}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className={styles.waitingEndBtn}
                        onClick={() => onEndExclusion?.(row)}
                      >
                        {waitingCopy.end || "End"}
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </UiKitScrollFadeShell>
      ) : items.length === 0 ? <div className={styles.emptyWrap} data-guide="supervision-queue">
          <UiKitEmptyState
            bare
            className={styles.emptyStateFill}
            icon="mdi:sleep"
            title={triageView === "todo" ? (copy.emptyTodoTitle || copy.emptyTitle) : (copy.emptyInProgressTitle || copy.emptyTitle)}
            text={triageView === "todo" ? (copy.emptyTodoText || copy.emptyText) : (copy.emptyInProgressText || copy.emptyText)}
          />
        </div> : <>
        <UiKitScrollFadeShell
          className={styles.tableWrap}
          deps={[pagedItems.length, sortKey, sortDir, triageView, severityFilter, searchQuery]}
        >
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colSelect} />
              <col className={styles.colSev} />
              <col className={styles.colAlert} />
              <col className={styles.colDevice} />
              <col className={styles.colCompany} />
              {showDomain ? <col className={styles.colDomain} /> : null}
              <col className={styles.colSeverity} />
              <col className={styles.colStatus} />
              <col className={styles.colWhen} />
              <col className={styles.colActions} />
            </colgroup>
            <thead>
              <tr>
                <th className={styles.selectCol}>
                  <input
                    type="checkbox"
                    className={styles.selectCheck}
                    checked={pageAllSelected}
                    ref={el => {
                      if (el) el.indeterminate = pageSomeSelected && !pageAllSelected;
                    }}
                    onChange={toggleSelectPage}
                    aria-label={mergeCopy.bulkSelectPage || "Select page"}
                  />
                </th>
                <th className={styles.sevCol} aria-hidden />
                <SortableHeader column="alert" label={columns.alert || "Alerte"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.alert || "Alerte")} />
                <SortableHeader column="device" label={columns.device || "Périphérique"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.device || "Périphérique")} />
                <SortableHeader column="company" label={columns.company || "Entreprise"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.company || "Entreprise")} />
                {showDomain ? <SortableHeader column="domain" label={columns.domain || "Domaine"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.domain || "Domaine")} /> : null}
                <SortableHeader column="severity" label={columns.severity || "Sévérité"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.severity || "Sévérité")} />
                <SortableHeader column="status" label={columns.status || "Statut"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.status || "Statut")} />
                <SortableHeader column="when" label={columns.when || "Date"} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} sortAria={sortAriaFor(columns.when || "Date")} />
                <th className={styles.actionsCol}>{columns.actions || "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map(item => {
              const wf = item.workflowStatus || "open";
              const busy = busyId === item.id;
              const domainLabel = showDomain ? copy.domains?.[item.domain] || item.domain : null;
              const severityLabel =
                copy.severityLabels?.[item.severity] ||
                (item.severity === "critical"
                  ? "Critique"
                  : item.severity === "warning"
                    ? "Warning"
                    : copy.severityInfo || "Info");
              const statusLabel = copy.statusLabels?.[wf] || copy.workflow?.[wf] || wf;
              const whenRaw =
                item.notifiedAt ||
                item.alertAt ||
                item.alertState?.meta?.checkmkAlertAt ||
                item.alertState?.createdAt;
              const when = formatWhen(whenRaw, localeTag);
              const handler = item.handledByName || item.alertState?.ackedByName || null;
              const remediation = remediationLabel(item, copy);
              const deviceName = resolveDeviceName(item);
              const familyMeta = resolveFamilyMeta(item);
              const coverageKey = familyMeta ? FAMILY_COVERAGE_KEY[familyMeta.key] : null;
              const familyLabel =
                (coverageKey && copy.coverage?.families?.[coverageKey]) ||
                familyMeta?.label ||
                null;
              const hostName = item.hostName || item.alertState?.meta?.hostName || null;
              const showHostMeta = Boolean(hostName && deviceName && hostName !== deviceName);
              const collabBits = [];
              if (handler) {
                collabBits.push(interpolate(copy.collab?.handledBy || "{name}", {
                  name: handler
                }));
              }
              if (remediation) collabBits.push(remediation);
              const linkedTicketId = item.linkedTicketId || item.alertState?.linkedTicketId || null;
              const linkedTicketNumber =
                item.linkedTicketNumber ||
                item.alertState?.linkedTicketNumber ||
                item.alertState?.meta?.linkedTicketNumber ||
                null;
              const linkedTicketKind =
                item.linkedTicketKind || item.alertState?.linkedTicketKind || null;
              const canOpenDevice = Boolean(
                item.equipment || item.equipmentId || item.alertState?.equipmentId
              );
              const statusIsTicketLink = Boolean(linkedTicketId && (wf === "linked" || linkedTicketKind));
              const statusDisplay = statusIsTicketLink
                ? linkedTicketNumber
                  ? `Ticket #${linkedTicketNumber}`
                  : statusLabel
                : statusLabel;
              const openDevice = (options = {}) => {
                if (!canOpenDevice) return;
                onOpenItem?.(item, options);
              };
              const openTicket = (options = {}) => {
                if (!linkedTicketId) return;
                onOpenTicket?.(item, {
                  ticketId: linkedTicketId,
                  ticketNumber: linkedTicketNumber,
                  kind: linkedTicketKind,
                  ...options
                });
              };
              const isSelected = selectedIds.has(String(item.id));
              const isChild = Boolean(item.isMergeChild);
              const isParent = Boolean(item.isMergeParent) || Number(item.childCount) > 0;
              const siblings = isChild
                ? sortedItems.filter(row => String(row.parentAlertId) === String(item.parentAlertId))
                : [];
              const siblingIndex = siblings.findIndex(row => String(row.id) === String(item.id));
              const isLastChild = isChild && siblingIndex === siblings.length - 1;
              return <tr
                key={item.id}
                className={`${styles.dataRow} ${wf !== "open" ? styles.rowHandled : ""} ${enteringIds.has(item.id) ? styles.rowEnter : ""} ${isSelected ? styles.dataRowSelected : ""} ${isChild ? styles.rowMergeChild : ""} ${isParent ? styles.rowMergeParent : ""}`}
              >
                    <td className={styles.selectCol} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className={styles.selectCheck}
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        aria-label={interpolate(mergeCopy.bulkSelectRow || "Select {title}", {
                          title: item.title || item.id
                        })}
                      />
                    </td>
                    <td className={styles.sevCol}>
                      <span className={`${styles.sevIcon} ${toneClass(item.tone, item.severity)}`} aria-hidden title={severityLabel}>
                        <Icon icon={alertRowIcon(item)} />
                      </span>
                    </td>
                    <td className={styles.alertCell}>
                      <div className={`${styles.alertBody} ${isChild ? styles.alertBodyChild : ""}`.trim()}>
                        {isChild || isParent ? (
                          <span
                            className={`${styles.branchRail} ${isChild ? styles.branchRailChild : styles.branchRailParent} ${isLastChild ? styles.branchRailLast : ""}`.trim()}
                            aria-hidden
                          >
                            {isChild ? (isLastChild ? "└" : "├") : "┌"}
                          </span>
                        ) : null}
                        <div className={styles.alertBodyMain}>
                          <span className={styles.rowTitleRow}>
                            <span className={styles.rowTitle}>{item.title}</span>
                            {isParent ? (
                              <span className={styles.mergeBadge} title={mergeCopy.parentBadgeHint || ""}>
                                {interpolate(mergeCopy.parentBadge || "+{count}", {
                                  count: String(item.childCount || 0)
                                })}
                              </span>
                            ) : null}
                            {isChild ? (
                              <span className={styles.mergeChildBadge} title={item.parentTitle || mergeCopy.childBadge || ""}>
                                {mergeCopy.childBadge || "Merged"}
                              </span>
                            ) : null}
                            <FreshnessBadge item={item} copy={copy} locale={locale} />
                            {item.muted ? (
                              <span className={styles.muteBadge}>
                                {item.muteStatus === "disabled"
                                  ? copy.mute?.disabledBadge
                                  : item.muteStatus === "client_suspended"
                                    ? copy.mute?.client
                                    : copy.mute?.muted}
                              </span>
                            ) : null}
                          </span>
                          {isChild && item.parentTitle ? (
                            <span className={styles.rowMeta}>
                              {interpolate(mergeCopy.childOf || "Merged into {title}", {
                                title: item.parentTitle
                              })}
                            </span>
                          ) : null}
                          {showHostMeta ? <span className={styles.rowMeta}>{hostName}</span> : null}
                          {collabBits.length ? <span className={styles.rowCollab}>
                              <Icon icon="mdi:account-outline" aria-hidden />
                              {collabBits.join(" · ")}
                            </span> : null}
                        </div>
                      </div>
                    </td>
                    <td
                      className={`${styles.deviceCell} ${canOpenDevice ? styles.deviceCellInteractive : ""}`}
                      onClick={e => {
                        e.stopPropagation();
                        openDevice();
                      }}
                      onMouseDown={e => {
                        if (e.button === 1 && canOpenDevice) {
                          e.preventDefault();
                          e.stopPropagation();
                          openDevice({ background: true });
                        }
                      }}
                      onAuxClick={e => {
                        if (e.button === 1 && canOpenDevice) {
                          e.preventDefault();
                          e.stopPropagation();
                          openDevice({ background: true });
                        }
                      }}
                    >
                      <span className={styles.deviceCellInner} title={familyLabel || undefined}>
                        <span className={styles.familyIcon} aria-hidden>
                          <Icon icon={familyMeta?.icon || "mdi:devices"} />
                        </span>
                        {canOpenDevice ? (
                          <button type="button" className={styles.deviceLink} onClick={e => { e.stopPropagation(); openDevice(); }}>
                            {deviceName || "—"}
                          </button>
                        ) : (
                          <span className={styles.deviceName}>{deviceName || "—"}</span>
                        )}
                      </span>
                    </td>
                    <td className={styles.companyCell}>{item.clientName || "—"}</td>
                    {showDomain ? <td className={styles.domainCol}>
                      <span className={styles.domainCell}>
                        <span className={`${styles.domainIcon} ${styles[`domain_${item.domain}`] || ""}`} aria-hidden>
                          <Icon icon={DOMAIN_ICONS[item.domain] || "mdi:bell-outline"} />
                        </span>
                        {domainLabel}
                      </span>
                    </td> : null}
                    <td className={styles.severityCell}>{severityLabel}</td>
                    <td className={styles.statusCell}>
                      {statusIsTicketLink ? (
                        <button
                          type="button"
                          className={styles.ticketLink}
                          onClick={e => {
                            e.stopPropagation();
                            openTicket();
                          }}
                          onMouseDown={e => {
                            if (e.button === 1) {
                              e.preventDefault();
                              e.stopPropagation();
                              openTicket({ background: true });
                            }
                          }}
                          onAuxClick={e => {
                            if (e.button === 1) {
                              e.preventDefault();
                              e.stopPropagation();
                              openTicket({ background: true });
                            }
                          }}
                          title={copy.statusLabels?.linked || statusLabel}
                        >
                          {statusDisplay}
                        </button>
                      ) : (
                        statusLabel
                      )}
                    </td>
                    <td className={styles.whenCell}>
                      <time dateTime={whenRaw || undefined}>{when}</time>
                    </td>
                    <td className={styles.actionsCol} onClick={e => e.stopPropagation()}>
                      <div className={styles.rowActions} role="group" aria-label={copy.actionsAria || "Actions"}>
                        {triageView === "todo" || wf === "open" ? (
                          <QueueActionButton
                            hint={actionHint(copy, "ack")}
                            label={copy?.actions?.ack || "Ack"}
                            icon="mdi:eye-check-outline"
                            disabled={busy}
                            primary
                            onClick={() => onAck?.(item)}
                          />
                        ) : null}
                        {triageView === "in_progress" || wf === "acked" || wf === "linked" ? (
                          <>
                            <QueueActionButton
                              hint={actionHint(copy, "resolve")}
                              label={copy?.actions?.resolve || "Resolve"}
                              icon="mdi:check-circle-outline"
                              disabled={busy}
                              primary
                              onClick={() => onResolve?.(item)}
                            />
                            {wf !== "linked" ? (
                              <QueueActionButton
                                hint={actionHint(copy, "support")}
                                label={copy?.actions?.support || "Support"}
                                icon="mdi:message-processing-outline"
                                disabled={busy}
                                onClick={() => onTicketSupport?.(item)}
                              />
                            ) : null}
                          </>
                        ) : null}
                        <span className={styles.muteWrap}>
                          <QueueActionButton
                            hint={copy.moreMenu?.open || "More"}
                            label={copy.moreMenu?.open || "More"}
                            icon="mdi:dots-horizontal"
                            disabled={busy}
                            onClick={() => setMoreMenuId(id => (id === item.id ? null : item.id))}
                          />
                          {moreMenuId === item.id ? (
                            <MoreMenu
                              item={item}
                              copy={copy}
                              triageView={triageView}
                              canDiagnose={canDiagnose}
                              busy={busy}
                              resyncBusy={resyncBusyId === item.id}
                              onIgnore={onIgnore}
                              onMaintenance={onMaintenance}
                              onUnack={onUnack}
                              onUnmerge={onUnmerge}
                              onMergeHere={handleMergeHere}
                              canMergeHere={selectedItems.some(row => String(row.id) !== String(item.id))}
                              onResync={onResync}
                              onDiagnose={onDiagnose}
                              onOpenItem={onOpenItem}
                              onClose={() => setMoreMenuId(null)}
                            />
                          ) : null}
                        </span>
                      </div>
                    </td>
                  </tr>;
            })}
            </tbody>
          </table>
        </UiKitScrollFadeShell>
        {selectedIds.size > 0 ? (
          <div className={styles.bulkBar} role="region" aria-label={mergeCopy.bulkAria || "Merge selection"}>
            <div className={styles.bulkInfo}>
              <span>
                {interpolate(mergeCopy.bulkSelected || "{count} selected", {
                  count: String(selectedIds.size)
                })}
              </span>
              <button type="button" className={styles.bulkLink} onClick={clearSelection}>
                {mergeCopy.bulkClear || "Clear"}
              </button>
              {selectedItems.length > 0 && mergeParentCandidates.length > 0 ? (
                <label className={styles.mergeParentPick}>
                  <span>{mergeCopy.parentLabel || "Merge onto"}</span>
                  <select
                    value={mergeParentId || ""}
                    onChange={e => setMergeParentId(e.target.value || null)}
                    disabled={mergeBusy}
                  >
                    {mergeParentCandidates.map(item => (
                      <option key={item.id} value={item.id}>
                        {formatMergeParentOption(item)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <div className={styles.bulkActions}>
              <button
                type="button"
                className={styles.bulkBtn}
                disabled={!canMergeSelection || mergeBusy}
                onClick={handleMergeClick}
                title={mergeCopy.mergeHint || ""}
              >
                <Icon icon={mergeBusy ? "mdi:loading" : "mdi:source-merge"} aria-hidden />
                {mergeBusy ? mergeCopy.merging || "Merging…" : mergeCopy.merge || "Merge"}
              </button>
            </div>
          </div>
        ) : null}
        {sortedItems.length > 0 ? <div className={`${layout.pagination} ${styles.paginationBar}`}>
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
    </div>
  </>;
}
