import { Icon } from "@iconify/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import SmartTooltip from "../SmartTooltip";
import { formatPageInfo } from "../../i18n/commonI18n";
import { interpolate } from "../../i18n/translate";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import { formatEquipmentDetailRelative } from "./equipmentDetailPageI18n";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./SupervisionOpsQueue.module.css";

const MUTE_MENU_GAP = 6;
const MUTE_MENU_VIEWPORT_PAD = 8;

function getMuteMenuPosition(triggerEl, menuEl) {
  if (!triggerEl) return null;
  const triggerRect = triggerEl.getBoundingClientRect();
  const menuWidth = menuEl?.offsetWidth || 200;
  const menuHeight = menuEl?.offsetHeight || 220;
  let top = triggerRect.bottom + MUTE_MENU_GAP;
  let left = triggerRect.right - menuWidth;
  if (left < MUTE_MENU_VIEWPORT_PAD) left = MUTE_MENU_VIEWPORT_PAD;
  if (left + menuWidth > window.innerWidth - MUTE_MENU_VIEWPORT_PAD) {
    left = window.innerWidth - menuWidth - MUTE_MENU_VIEWPORT_PAD;
  }
  if (top + menuHeight > window.innerHeight - MUTE_MENU_VIEWPORT_PAD) {
    top = triggerRect.top - menuHeight - MUTE_MENU_GAP;
  }
  return {
    top: Math.max(MUTE_MENU_VIEWPORT_PAD, top),
    left: Math.max(MUTE_MENU_VIEWPORT_PAD, left)
  };
}

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

function minutesUntilTomorrowMorning() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(8, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return Math.max(30, Math.round((next.getTime() - now.getTime()) / 60000));
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

function MuteMenu({
  item,
  copy,
  localeTag,
  anchorRef,
  onMute,
  onUnmute,
  onClose
}) {
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);
  const options = [
    { id: "2h", label: copy?.mute?.hours2 || "2h", durationMinutes: 120 },
    { id: "tomorrow", label: copy?.mute?.tomorrow || "Tomorrow 8am", durationMinutes: minutesUntilTomorrowMorning() },
    { id: "24h", label: copy?.mute?.hours24 || "24h", durationMinutes: 1440 }
  ];

  const updatePosition = () => {
    const next = getMuteMenuPosition(anchorRef?.current, menuRef.current);
    if (next) setMenuStyle(next);
  };

  useLayoutEffect(() => {
    updatePosition();
    const raf = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(raf);
  }, [item?.id, item?.muted, item?.mutedUntil]);

  useEffect(() => {
    const handleReposition = () => updatePosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = event => {
      const target = event.target;
      if (menuRef.current?.contains(target) || anchorRef?.current?.contains(target)) return;
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
  }, [anchorRef, onClose]);

  const menu = (
    <div
      ref={menuRef}
      className={styles.muteMenu}
      role="menu"
      style={menuStyle || { visibility: "hidden" }}
      onClick={e => e.stopPropagation()}
    >
      <p className={styles.muteMenuHint}>{copy?.mute?.hint}</p>
      {item.muted ? (
        <button type="button" className={styles.muteMenuItem} onClick={() => onUnmute?.(item)}>
          {copy?.mute?.unmute || "Unmute"}
        </button>
      ) : (
        <>
          {options.map(opt => (
            <button
              key={opt.id}
              type="button"
              className={styles.muteMenuItem}
              onClick={() => onMute?.(item, { mode: "temporary", durationMinutes: opt.durationMinutes })}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            className={styles.muteMenuItem}
            onClick={() => onMute?.(item, { mode: "disabled" })}
          >
            {copy?.mute?.disabled || "Disable"}
          </button>
        </>
      )}
      {item.mutedUntil ? (
        <p className={styles.muteMenuHint}>
          {(copy?.mute?.until || "until {date}").replace(
            "{date}",
            new Date(item.mutedUntil).toLocaleString(localeTag, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
          )}
        </p>
      ) : null}
      <button type="button" className={styles.muteMenuItem} onClick={onClose}>
        {copy?.diagnose?.close || "Close"}
      </button>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(menu, document.body);
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

const COVERAGE_EXCLUDED_KEYS = new Set([
  "Sauvegarde",
  "Ordinateurs",
  "Videosurveillance",
  "Internet",
  "TOIP",
  "Alimentation"
]);

/** Ordre d’affichage des KPI couverture (aligné sur SUPERVISION_COVERAGE_FAMILY_KEYS). */
const COVERAGE_FAMILY_ORDER = [
  "Firewalls",
  "Routeur",
  "Serveurs",
  "Stockage",
  "Switch",
  "BorneWifi"
];

const COVERAGE_FAMILY_ICONS = {
  Firewalls: "mdi:shield-outline",
  Routeur: "mdi:router-wireless",
  Serveurs: "mdi:server",
  Stockage: "mdi:database-outline",
  Switch: "mdi:lan-connect",
  BorneWifi: "mdi:wifi"
};

function coverageTone(monitored, total) {
  if (!total) return "empty";
  if (monitored >= total) return "good";
  if (monitored <= 0) return "bad";
  const pct = monitored / total;
  if (pct >= 0.7) return "warn";
  return "bad";
}

function CoverageStrip({
  families = [],
  copy
}) {
  const coverageCopy = copy?.coverage || {};
  const labels = coverageCopy.families || {};
  const byKey = new Map();
  for (const family of Array.isArray(families) ? families : []) {
    const key = String(family?.key || "");
    if (!key || COVERAGE_EXCLUDED_KEYS.has(key) || family?.isCustom) continue;
    byKey.set(key, family);
  }

  // Toujours afficher les familles du centre (y compris à 0) pour une grille pleine largeur stable.
  const ordered = COVERAGE_FAMILY_ORDER.map(key => {
    const family = byKey.get(key);
    return family || {
      key,
      count: 0,
      monitoredCount: 0,
      icon: COVERAGE_FAMILY_ICONS[key] || "mdi:devices"
    };
  });

  return <div
    className={styles.coverageGrid}
    role="group"
    aria-label={coverageCopy.aria || coverageCopy.title || "Coverage"}
    data-guide="supervision-coverage"
    style={{ "--coverage-cols": String(Math.max(ordered.length, 1)) }}
  >
      {ordered.map(family => {
      const key = String(family.key || "");
      const label = labels[key] || family.label || key;
      const total = Number(family.count) || 0;
      const monitored = Number(family.monitoredCount ?? family.monitored) || 0;
      const pct = total > 0 ? Math.round(monitored / total * 100) : 0;
      const tone = coverageTone(monitored, total);
      const ratio = interpolate(coverageCopy.ratio || "{monitored}/{total}", {
        monitored,
        total
      });
      const tip = interpolate(coverageCopy.tooltip || "{label} · {monitored}/{total}", {
        label,
        monitored,
        total
      });
      return <article
        key={key}
        className={`${styles.coverageCard} ${styles[`coverageTone_${tone}`] || ""}`}
        title={tip}
      >
              <div className={styles.coverageCardHead}>
                <Icon icon={family.icon || COVERAGE_FAMILY_ICONS[key] || "mdi:devices"} className={styles.coverageIcon} aria-hidden />
                <span className={styles.coverageLabel}>{label}</span>
              </div>
              <div className={styles.coverageRatio}>{ratio}</div>
              <div className={styles.coveragePct}>{pct}%</div>
              <div className={styles.coverageBar} aria-hidden>
                <span className={styles.coverageBarFill} style={{ width: `${pct}%` }} />
              </div>
            </article>;
    })}
    </div>;
}

export default function SupervisionOpsQueue({
  items = [],
  kpi = {},
  coverageFamilies = [],
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
  onAck,
  onUnack,
  onResolve,
  onDismiss,
  onResync,
  onMute,
  onUnmute,
  onDiagnose,
  canDiagnose = false,
  resyncBusyId = null,
  showMuted = false,
  mutedCount = 0,
  onToggleMuted,
  busyId = null,
  localeTag,
  copy,
  showDomain = true,
  animateNewRows = false
}) {
  const columns = copy.columns || {};
  const common = useCommonCopy();
  const locale = useAppLocale();
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useDefaultPageSize();
  const knownIdsRef = useRef(new Set());
  const primedRef = useRef(false);
  const [enteringIds, setEnteringIds] = useState(() => new Set());
  const [muteMenuId, setMuteMenuId] = useState(null);
  const muteAnchorRef = useRef(null);
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
      const raw =
        item.notifiedAt ||
        item.alertAt ||
        item.alertState?.meta?.checkmkAlertAt ||
        item.alertState?.createdAt;
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
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize) || 1);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, severityFilter, domainFilter, workflowFilter, sortKey, sortDir, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const sortAriaFor = label => interpolate(copy.sortBy || "Trier par {label}", {
    label
  });
  const domainChips = showDomain ? [{
    id: "all",
    label: copy.domains.all,
    count: workflowCounts.total || 0,
    icon: "mdi:view-grid-outline",
    kpiTone: "gray"
  }, {
    id: "devices",
    label: copy.domains.devices,
    count: domainCounts.devices || 0,
    icon: DOMAIN_ICONS.devices,
    kpiTone: "blue"
  }, {
    id: "backups",
    label: copy.domains.backups,
    count: domainCounts.backups || 0,
    icon: DOMAIN_ICONS.backups,
    kpiTone: "cyan"
  }, {
    id: "contracts",
    label: copy.domains.contracts,
    count: domainCounts.contracts || 0,
    icon: DOMAIN_ICONS.contracts,
    kpiTone: "amber"
  }, {
    id: "rmm",
    label: copy.domains.rmm,
    count: domainCounts.rmm || 0,
    icon: DOMAIN_ICONS.rmm,
    kpiTone: "violet"
  }] : [];

  const severityChips = [{
    id: "critical",
    label: copy.kpi.critical,
    count: kpi.critical || 0,
    icon: "mdi:alert-octagon",
    kpiTone: "red"
  }, {
    id: "warning",
    label: copy.kpi.warning,
    count: kpi.warning || 0,
    icon: "mdi:alert",
    kpiTone: "amber"
  }];

  const workflowChips = [{
    id: "open",
    label: copy.workflow?.open || "Open",
    count: workflowCounts.open || 0,
    icon: "mdi:circle-outline",
    kpiTone: "blue"
  }, {
    id: "acked",
    label: copy.workflow?.acked || "Acked",
    count: workflowCounts.acked || 0,
    icon: "mdi:account-check",
    kpiTone: "teal"
  }, {
    id: "linked",
    label: copy.workflow?.linked || "Linked",
    count: workflowCounts.linked || 0,
    icon: "mdi:link-variant",
    kpiTone: "violet"
  }];

  return <>
    <div className={styles.root}>
      <CoverageStrip families={coverageFamilies} copy={copy} />
      <div className={`${layout.toolbar} ${layout.toolbarWithFilters}`} data-guide="supervision-filters">
        <div className={layout.searchWrap}>
          <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
          <input type="search" inputMode="search" enterKeyHint="search" className={layout.searchInput} value={searchQuery} onChange={e => onSearchChange?.(e.target.value)} placeholder={copy.searchPlaceholder} aria-label={copy.searchPlaceholder} />
          {searchQuery ? <SmartTooltip content={copy.clearSearch || "Effacer"}>
              <button type="button" onClick={() => onSearchChange?.("")} className={layout.clearButton} aria-label={copy.clearSearch || "Effacer"}>
                <FaTimes />
              </button>
            </SmartTooltip> : null}
        </div>
        <div className={layout.statusChips} role="group" aria-label={copy.kpi?.aria || copy.domainAria} data-guide="supervision-kpis">
          {domainChips.length ? <>
              {domainChips.map(chip => <FilterChip key={chip.id} label={chip.label} count={chip.count} icon={chip.icon} kpiTone={chip.kpiTone} active={domainFilter === chip.id} onClick={() => onDomainFilter?.(chip.id)} />)}
              <span className={layout.statusChipSeparator} aria-hidden />
            </> : null}
          {severityChips.map(chip => <FilterChip key={chip.id} label={chip.label} count={chip.count} icon={chip.icon} kpiTone={chip.kpiTone} active={severityFilter === chip.id} onClick={() => onSeverityFilter?.(severityFilter === chip.id ? "all" : chip.id)} />)}
          <span className={layout.statusChipSeparator} aria-hidden />
          {workflowChips.map(chip => <FilterChip key={chip.id} label={chip.label} count={chip.count} icon={chip.icon} kpiTone={chip.kpiTone} active={workflowFilter === chip.id} onClick={() => onWorkflowFilter?.(workflowFilter === chip.id ? "all" : chip.id)} />)}
          {onToggleMuted ? (
            <>
              <span className={layout.statusChipSeparator} aria-hidden />
              <FilterChip
                label={copy.showMuted || "Muted"}
                count={mutedCount}
                icon="mdi:alarm-light-off"
                kpiTone="amber"
                active={showMuted}
                onClick={() => onToggleMuted(!showMuted)}
              />
            </>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? <div className={styles.emptyWrap} data-guide="supervision-queue">
          <MspEmptyState className={styles.emptyStateFill} icon="mdi:sleep" title={copy.emptyTitle} text={copy.emptyText} />
        </div> : <>
        <div className={styles.tableWrap} data-guide="supervision-queue">
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colSev} />
              <col className={styles.colAlert} />
              <col className={styles.colCompany} />
              {showDomain ? <col className={styles.colDomain} /> : null}
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
              const severityLabel = item.severity === "critical" ? copy.kpi.critical : item.severity === "warning" ? copy.kpi.warning : copy.severityInfo || "Info";
              const whenRaw =
                item.notifiedAt ||
                item.alertAt ||
                item.alertState?.meta?.checkmkAlertAt ||
                item.alertState?.createdAt;
              const when = formatWhen(whenRaw, localeTag);
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
              return <tr key={item.id} className={`${styles.dataRow} ${wf !== "open" ? styles.rowHandled : ""} ${enteringIds.has(item.id) ? styles.rowEnter : ""}`} onClick={() => onOpenItem?.(item)}>
                    <td className={styles.sevCol}>
                      <span className={`${styles.sevIcon} ${toneClass(item.tone, item.severity)}`} aria-hidden title={severityLabel}>
                        <Icon icon={alertRowIcon(item)} />
                      </span>
                    </td>
                    <td className={styles.alertCell}>
                      <div className={styles.alertBody}>
                        <span className={styles.rowTitleRow}>
                          <span className={styles.rowTitle}>{item.title}</span>
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
                        {metaBits.length ? <span className={styles.rowMeta}>{metaBits.join(" · ")}</span> : null}
                        {collabBits.length ? <span className={styles.rowCollab}>
                            <Icon icon="mdi:account-outline" aria-hidden />
                            {collabBits.join(" · ")}
                          </span> : null}
                      </div>
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
                    <td className={styles.severityCell}>
                      <span className={`${styles.chipBadge} ${severityBadgeClass(item.severity)}`}>{severityLabel}</span>
                    </td>
                    <td className={styles.statusCell}>
                      <span className={`${styles.wfBadge} ${workflowBadgeClass(wf)}`}>{copy.workflow?.[wf] || wf}</span>
                    </td>
                    <td className={styles.whenCell}>
                      <time dateTime={whenRaw || undefined}>{when}</time>
                    </td>
                    <td className={styles.actionsCol} onClick={e => e.stopPropagation()}>
                      <div className={styles.rowActions} role="group" aria-label={copy.actionsAria || "Actions"}>
                        {wf === "open" ? <QueueActionButton hint={actionHint(copy, "ack")} label={copy.actions.ack} icon="mdi:eye-check-outline" disabled={busy} onClick={() => onAck?.(item)} /> : wf === "acked" ? <QueueActionButton hint={actionHint(copy, "unack")} label={copy.actions.unack} icon="mdi:account-remove-outline" disabled={busy} onClick={() => onUnack?.(item)} /> : null}
                        <QueueActionButton hint={actionHint(copy, "support")} label={copy.actions.support} icon="mdi:message-processing-outline" disabled={busy} onClick={() => onTicketSupport?.(item)} />
                        <QueueActionButton hint={actionHint(copy, "resolve")} label={copy.actions.resolve} icon="mdi:check-circle-outline" disabled={busy} onClick={() => onResolve?.(item)} />
                        <QueueActionButton hint={actionHint(copy, "dismiss")} label={copy.actions.dismiss} icon="mdi:close-circle-outline" disabled={busy} onClick={() => onDismiss?.(item)} />
                        <span className={styles.muteWrap}>
                          <QueueActionButton
                            hint={item.muted ? actionHint(copy, "unmute") : actionHint(copy, "mute")}
                            label={item.muted ? copy.actions.unmute : copy.actions.mute}
                            icon={item.muted ? "mdi:alarm-light" : "mdi:alarm-light-off"}
                            disabled={busy}
                            buttonRef={muteMenuId === item.id ? muteAnchorRef : undefined}
                            onClick={e => {
                              muteAnchorRef.current = e.currentTarget;
                              setMuteMenuId(id => id === item.id ? null : item.id);
                            }}
                          />
                          {muteMenuId === item.id ? (
                            <MuteMenu
                              item={item}
                              copy={copy}
                              localeTag={localeTag}
                              anchorRef={muteAnchorRef}
                              onMute={(target, payload) => {
                                setMuteMenuId(null);
                                onMute?.(target, payload);
                              }}
                              onUnmute={target => {
                                setMuteMenuId(null);
                                onUnmute?.(target);
                              }}
                              onClose={() => setMuteMenuId(null)}
                            />
                          ) : null}
                        </span>
                        <QueueActionButton
                          hint={actionHint(copy, "resync")}
                          label={copy.actions.resync}
                          icon={resyncBusyId === item.id ? "mdi:loading" : "mdi:sync"}
                          disabled={busy || resyncBusyId === item.id}
                          onClick={() => onResync?.(item)}
                        />
                        {canDiagnose ? (
                          <QueueActionButton
                            hint={actionHint(copy, "diagnose")}
                            label={copy.actions.diagnose}
                            icon="mdi:stethoscope"
                            disabled={busy || !item.alertId}
                            onClick={() => onDiagnose?.(item)}
                          />
                        ) : null}
                        <QueueActionButton hint={actionHint(copy, "open")} label={copy.actions.open} icon="mdi:open-in-new" primary onClick={() => onOpenItem?.(item)} />
                      </div>
                    </td>
                  </tr>;
            })}
            </tbody>
          </table>
        </div>
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
