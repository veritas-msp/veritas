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
  tone = "",
  buttonRef = null
}) {
  const tip = hint || label;
  const toneClass = tone === "maintenance" ? styles.actionBtnMaintenance : "";
  return <SmartTooltip as="span" content={tip}>
      <button ref={buttonRef} type="button" className={`${styles.actionBtn} ${primary ? styles.actionBtnPrimary : ""} ${toneClass}`.trim()} aria-label={tip} disabled={disabled} onClick={e => {
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
  const device = String(resolveDeviceName(item) || "").trim();
  const deviceLabel = device && device !== "—" ? device : "";
  const parts = [];
  if (item?.linkedTicketNumber) parts.push(`#${item.linkedTicketNumber}`);
  else if (item?.linkedTicketId) parts.push("Ticket");
  if (deviceLabel) parts.push(deviceLabel);
  parts.push(title);
  return parts.join(" · ");
}

function chunkPreservingMergeGroups(items = [], pageSize = 25) {
  const groups = [];
  let bucket = [];
  const flush = () => {
    if (bucket.length) groups.push(bucket);
    bucket = [];
  };
  for (const item of items) {
    const continues =
      item?.isMergeChild &&
      bucket.length > 0 &&
      String(item.parentAlertId || "") === String(bucket[0]?.alertId || "");
    if (!continues && bucket.length) flush();
    bucket.push(item);
  }
  flush();

  const pages = [];
  let page = [];
  let count = 0;
  for (const group of groups) {
    if (count > 0 && count + group.length > pageSize) {
      pages.push(page);
      page = [];
      count = 0;
    }
    page.push(...group);
    count += group.length;
    if (count >= pageSize) {
      pages.push(page);
      page = [];
      count = 0;
    }
  }
  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}

function isExistingMergeParent(item) {
  return Boolean(item) && !item.isMergeChild && (Boolean(item.isMergeParent) || Number(item.childCount) > 0);
}

function mergeClientKey(item) {
  const raw = item?.clientId ?? item?.equipment?.clientId ?? null;
  const key = raw == null ? "" : String(raw).trim();
  return key;
}

/** Fusion autorisée seulement si toutes les alertes ont le même client (plusieurs périphériques possibles). */
function selectionSharesClient(items = []) {
  if (!items.length) return true;
  const keys = items.map(mergeClientKey);
  const first = keys[0];
  return Boolean(first) && keys.every(key => key === first);
}

function MoreMenu({
  copy,
  busy,
  resyncBusy,
  onResync,
  onClose,
  item
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
      <button type="button" className={styles.muteMenuItem} disabled={busy || resyncBusy} onClick={() => { onClose?.(); onResync?.(item); }}>
        {more.resync || copy?.actions?.resync || "Resync"}
      </button>
    </div>
  );
}

export default function SupervisionOpsQueue({
  items = [],
  /** File complète (hors filtre) pour garder une sélection quand un filtre masque des lignes. */
  selectionItems = null,
  undoHolds = [],
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
  onOpenTicket,
  onOpenHistory,
  onTicketSupport,
  onAck,
  onUnack,
  onResolve,
  onIgnore,
  onMaintenance,
  onMerge,
  onUnmerge,
  onResync,
  onUndo,
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
    if (!sortKey) {
      const byAlertId = new Map();
      items.forEach(item => {
        if (item?.alertId) byAlertId.set(String(item.alertId), item);
      });
      const bucket = item => {
        const parent = item?.isMergeChild ? byAlertId.get(String(item.parentAlertId || "")) : null;
        const root = parent || item;
        const wf = root?.workflowStatus || "open";
        if (wf === "open" && root?.severity === "critical") return 0;
        if (wf === "open") return 1;
        return 2;
      };
      return stabilizeMergeGroups([...items].sort((a, b) => bucket(a) - bucket(b)));
    }
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
  const mergePages = useMemo(
    () => chunkPreservingMergeGroups(sortedItems, pageSize),
    [sortedItems, pageSize]
  );
  const totalPages = Math.max(1, mergePages.length || 1);
  const pagedItems = mergePages[currentPage - 1] || mergePages[0] || [];
  const itemById = useMemo(() => {
    const map = new Map();
    const source = Array.isArray(selectionItems) && selectionItems.length ? selectionItems : sortedItems;
    source.forEach(item => map.set(String(item.id), item));
    sortedItems.forEach(item => map.set(String(item.id), item));
    return map;
  }, [selectionItems, sortedItems]);
  const selectedItems = useMemo(
    () => [...selectedIds].map(id => itemById.get(String(id))).filter(Boolean),
    [selectedIds, itemById]
  );
  const selectedRoots = useMemo(
    () => selectedItems.filter(item => item && !item.isMergeChild),
    [selectedItems]
  );
  const existingParents = useMemo(
    () => selectedRoots.filter(item => isExistingMergeParent(item)),
    [selectedRoots]
  );
  // Cible bornée à la sélection : uniquement des alertes principales, pas toute la file.
  const mergeParentCandidates = useMemo(() => {
    const pool = existingParents.length >= 1 ? existingParents : selectedRoots;
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
  }, [existingParents, selectedRoots]);
  const mergeBlocked = existingParents.length > 1;
  const mergeClientBlocked = selectedRoots.length >= 2 && !selectionSharesClient(selectedRoots);
  const canMergeSelection =
    !mergeBlocked &&
    !mergeClientBlocked &&
    selectedRoots.length >= 2 &&
    mergeParentCandidates.length >= 1 &&
    Boolean(mergeParentId) &&
    selectedIds.has(String(mergeParentId)) &&
    selectedRoots.some(item => String(item.id) !== String(mergeParentId));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, severityFilter, domainFilter, triageView, sortKey, sortDir, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  useEffect(() => {
    const source = Array.isArray(selectionItems) && selectionItems.length ? selectionItems : sortedItems;
    const valid = new Set(
      source.filter(item => !item?.isMergeChild).map(item => String(item.id))
    );
    setSelectedIds(prev => {
      const next = new Set([...prev].filter(id => valid.has(String(id))));
      return next.size === prev.size ? prev : next;
    });
  }, [selectionItems, sortedItems]);
  useEffect(() => {
    if (selectedRoots.length === 0) {
      setMergeParentId(null);
      return;
    }
    const stillValid = mergeParentCandidates.some(item => String(item.id) === String(mergeParentId));
    if (stillValid) return;
    const def = pickDefaultMergeParent(selectedRoots, mergeParentCandidates);
    setMergeParentId(def?.id || null);
  }, [selectedRoots, mergeParentCandidates, mergeParentId]);

  const toggleSelect = item => {
    if (!item || item.isMergeChild) return;
    const id = String(item.id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const pageSelectableIds = pagedItems.filter(item => !item?.isMergeChild).map(item => String(item.id));
  const toggleSelectPage = () => {
    const pageIds = pageSelectableIds;
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
  const collectMergeChildren = parent => selectedRoots.filter(item => {
    if (!parent || String(item.id) === String(parent.id)) return false;
    if (isExistingMergeParent(item)) return false;
    if (mergeClientKey(item) !== mergeClientKey(parent)) return false;
    return true;
  });
  const runMerge = async parent => {
    if (!parent || parent.isMergeChild || mergeBusy) return;
    if (!selectedIds.has(String(parent.id))) return;
    const children = collectMergeChildren(parent);
    if (!children.length) return;
    if (!selectionSharesClient([parent, ...children])) return;
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
      pickDefaultMergeParent(selectedRoots, mergeParentCandidates);
    await runMerge(parent);
  };
  const pageAllSelected =
    pageSelectableIds.length > 0 && pageSelectableIds.every(id => selectedIds.has(id));
  const pageSomeSelected = pageSelectableIds.some(id => selectedIds.has(id));
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
  }];

  const severityChips = [{
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
  }];
  const undoById = useMemo(() => {
    const map = new Map();
    (Array.isArray(undoHolds) ? undoHolds : []).forEach(hold => {
      if (hold?.id) map.set(String(hold.id), hold);
    });
    return map;
  }, [undoHolds]);
  const ghostRows = useMemo(() => {
    const visible = new Set((Array.isArray(items) ? items : []).map(item => String(item.id)));
    return (Array.isArray(undoHolds) ? undoHolds : [])
      .filter(hold => hold?.item && !visible.has(String(hold.id)))
      .map(hold => hold.item);
  }, [undoHolds, items]);

  return <>
    <div className={`${layout.panelCard} ${styles.root}`} data-guide="supervision-queue">
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
                  onClick={() => onTriageView?.(triageView === chip.id ? "all" : chip.id)}
                />
              ))}
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
              <button type="button" className={styles.historyLink} onClick={() => onOpenHistory?.("")}>
                <Icon icon="mdi:history" aria-hidden />
                {copy.historyLink || "Historique"}
              </button>
            </div>
          }
          extraActions={toolbarActions}
        />
      </div>

      {ghostRows.length ? (
        <div className={styles.undoStrip} role="status">
          {ghostRows.map(item => {
            const hold = undoById.get(String(item.id));
            const label = hold?.kind === "dismissed"
              ? (copy.undo?.dismissed || "Ignorée")
              : (copy.undo?.resolved || "Résolue");
            return (
              <div key={item.id} className={styles.undoStripRow}>
                <span className={styles.undoStripTitle}>{item.title}</span>
                <span className={styles.undoStripLabel}>{label}</span>
                <button type="button" className={styles.undoBtn} onClick={() => onUndo?.(item)}>
                  {copy.undo?.action || "Annuler"}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
      {items.length === 0 ? (ghostRows.length === 0 ? <div className={styles.emptyWrap} data-guide="supervision-queue">
          <UiKitEmptyState
            bare
            className={styles.emptyStateFill}
            icon="mdi:sleep"
            title={triageView === "todo" ? (copy.emptyTodoTitle || copy.emptyTitle) : triageView === "in_progress" ? (copy.emptyInProgressTitle || copy.emptyTitle) : (copy.emptyTitle)}
            text={triageView === "todo" ? (copy.emptyTodoText || copy.emptyText) : triageView === "in_progress" ? (copy.emptyInProgressText || copy.emptyText) : (copy.emptyText)}
          />
        </div> : null) : <>
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
                    disabled={pageSelectableIds.length === 0}
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
              {pagedItems.map((item, index) => {
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
              const canAck = !isChild && wf === "open";
              const canRelease = !isChild && wf === "acked";
              const canTicket = !isChild && wf === "acked";
              const canResolve = !isChild && (wf === "acked" || wf === "linked");
              const canIgnore = !isChild;
              const isParent = Boolean(item.isMergeParent) || Number(item.childCount) > 0;
              const nextItem = pagedItems[index + 1];
              const nextIsOwnChild = Boolean(
                nextItem?.isMergeChild && String(nextItem.parentAlertId || "") === String(item.alertId || "")
              );
              const childContinues = Boolean(
                isChild &&
                nextItem?.isMergeChild &&
                String(nextItem.parentAlertId || "") === String(item.parentAlertId || "")
              );
              const prevItem = pagedItems[index - 1];
              const continuesFromPrev = Boolean(
                isChild &&
                prevItem &&
                (
                  (!prevItem.isMergeChild && String(prevItem.alertId || "") === String(item.parentAlertId || "")) ||
                  (prevItem.isMergeChild && String(prevItem.parentAlertId || "") === String(item.parentAlertId || ""))
                )
              );
              const showParentRail = isParent && nextIsOwnChild;
              const showChildRail = isChild;
              const inMergeBlock = showParentRail || showChildRail;
              const mergeBlockStart = showParentRail || (showChildRail && !continuesFromPrev);
              const mergeBlockEnd = showChildRail && !childContinues;
              return <tr
                key={item.id}
                className={`${styles.dataRow} ${wf !== "open" ? styles.rowHandled : ""} ${enteringIds.has(item.id) ? styles.rowEnter : ""} ${isSelected ? styles.dataRowSelected : ""} ${isChild ? styles.rowMergeChild : ""} ${isParent ? styles.rowMergeParent : ""} ${inMergeBlock ? styles.rowMergeBlock : ""} ${mergeBlockStart ? styles.rowMergeStart : ""} ${mergeBlockEnd ? styles.rowMergeEnd : ""}`.trim()}
              >
                    <td className={styles.selectCol} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className={styles.selectCheck}
                        checked={!isChild && isSelected}
                        disabled={isChild}
                        onChange={() => toggleSelect(item)}
                        title={isChild ? (mergeCopy.childNotSelectable || "Alerte fusionnée : seule l’alerte principale est sélectionnable") : undefined}
                        aria-label={isChild
                          ? (mergeCopy.childNotSelectable || "Alerte fusionnée")
                          : interpolate(mergeCopy.bulkSelectRow || "Select {title}", {
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
                        {showChildRail || showParentRail ? (
                          <span
                            className={`${styles.branch} ${showChildRail ? styles.branchChild : styles.branchParent} ${showChildRail && !childContinues ? styles.branchLast : ""}`.trim()}
                            aria-hidden
                          />
                        ) : null}
                        <div className={styles.alertBodyMain}>
                          <span className={styles.rowTitleRow}>
                            <span className={styles.rowTitle}>{item.title}</span>
                            {isParent ? (
                              <span className={styles.mergeBadge} title={mergeCopy.parentBadgeHint || ""}>
                                <Icon icon="mdi:source-branch" width={12} height={12} aria-hidden />
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
                        {undoById.has(String(item.id)) ? (
                          <button type="button" className={styles.undoBtn} onClick={() => onUndo?.(item)}>
                            {copy.undo?.action || "Annuler"}
                          </button>
                        ) : (
                          <>
                            {canRelease ? (
                              <QueueActionButton
                                hint={actionHint(copy, "unack")}
                                label={copy?.actions?.unack || "Release"}
                                icon="mdi:eye-remove-outline"
                                disabled={busy}
                                onClick={() => onUnack?.(item)}
                              />
                            ) : (
                              <QueueActionButton
                                hint={actionHint(copy, "ack")}
                                label={copy?.actions?.ack || "Ack"}
                                icon="mdi:eye-check-outline"
                                disabled={busy || !canAck}
                                primary={canAck}
                                onClick={() => onAck?.(item)}
                              />
                            )}
                            <QueueActionButton
                              hint={actionHint(copy, "support")}
                              label={copy?.actions?.support || "Support"}
                              icon="mdi:message-processing-outline"
                              disabled={busy || !canTicket}
                              onClick={() => onTicketSupport?.(item)}
                            />
                            <QueueActionButton
                              hint={actionHint(copy, "resolve")}
                              label={copy?.actions?.resolve || "Resolve"}
                              icon="mdi:check-circle-outline"
                              disabled={busy || !canResolve}
                              primary={canResolve}
                              onClick={() => onResolve?.(item)}
                            />
                            <QueueActionButton
                              hint={actionHint(copy, "dismiss")}
                              label={copy?.actions?.dismiss || "Ignore"}
                              icon="mdi:bell-off-outline"
                              disabled={busy || !canIgnore}
                              onClick={() => onIgnore?.(item)}
                            />
                            <QueueActionButton
                              hint={actionHint(copy, "maintenance") || copy.moreMenu?.maintenance || "Maintenance"}
                              label={copy.moreMenu?.maintenance || "Maintenance"}
                              icon="mdi:traffic-cone"
                              tone="maintenance"
                              disabled={busy}
                              onClick={() => onMaintenance?.(item)}
                            />
                            {isChild ? (
                              <QueueActionButton
                                hint={actionHint(copy, "unmerge") || mergeCopy.unmerge || "Unmerge"}
                                label={mergeCopy.unmerge || "Unmerge"}
                                icon="mdi:source-branch-minus"
                                disabled={busy}
                                onClick={() => onUnmerge?.(item)}
                              />
                            ) : null}
                            <QueueActionButton
                              hint={copy.historyLink || "Historique"}
                              label={copy.historyLink || "Historique"}
                              icon="mdi:history"
                              disabled={busy}
                              onClick={() => onOpenHistory?.(item.title || "")}
                            />
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
                                  busy={busy}
                                  resyncBusy={resyncBusyId === item.id}
                                  onResync={onResync}
                                  onClose={() => setMoreMenuId(null)}
                                />
                              ) : null}
                            </span>
                          </>
                        )}
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
              {selectedRoots.length >= 2 && mergeParentCandidates.length > 0 ? (
                <label className={styles.mergeParentPick}>
                  <span>{mergeCopy.parentLabel || "Merge onto"}</span>
                  <select
                    value={mergeParentId || ""}
                    onChange={e => setMergeParentId(e.target.value || null)}
                    disabled={mergeBusy || mergeBlocked}
                  >
                    {mergeParentCandidates.map(item => (
                      <option key={item.id} value={item.id}>
                        {formatMergeParentOption(item)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {mergeBlocked ? (
                <span className={styles.bulkHint}>
                  {mergeCopy.multipleParents || "Une seule alerte déjà parente peut recevoir la fusion."}
                </span>
              ) : null}
              {mergeClientBlocked ? (
                <span className={styles.bulkHint}>
                  {mergeCopy.differentClients || "La fusion est limitée aux alertes d’un même client."}
                </span>
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
