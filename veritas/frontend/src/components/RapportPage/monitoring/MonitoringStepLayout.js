import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import equipmentStyles from "../../EquipementPage/EquipmentPage.module.css";
import { useTablePagination } from "../../AdminPage/useTablePagination";
import styles from "./RapportMonitoringBuilder.module.css";

export { useTablePagination as useMonitoringTablePagination };

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

/** Titre natif pour cellules tronquées (ellipsis). */
export function monitoringCellTitle(value) {
  if (value == null) return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = String(value).trim();
    if (!text || text === "-" || text === "—") return undefined;
    return text;
  }
  return undefined;
}

/** Cellule tableau avec tooltip du texte complet au survol. */
export function MonitoringTextCell({ children, title, className, ...rest }) {
  const tip = title !== undefined ? title : monitoringCellTitle(children);
  return (
    <td className={className} title={tip || undefined} {...rest}>
      {children ?? "-"}
    </td>
  );
}

/** Pagination style fiche équipement / infrastructure. */
export function MonitoringTablePagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  className = "",
}) {
  const total = Number(totalItems) || 0;
  const safePageSize = Math.max(1, Number(pageSize) || 25);
  const pages = Math.max(1, Number(totalPages) || Math.ceil(Math.max(total, 1) / safePageSize) || 1);
  const current = Math.min(Math.max(1, Number(page) || 1), pages);
  const rangeStart = total === 0 ? 0 : (current - 1) * safePageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(current * safePageSize, total);

  return (
    <div className={`${equipmentStyles.pagination} ${equipmentStyles.paginationEmbedded} ${className}`.trim()}>
      <div className={equipmentStyles.paginationLeft}>
        <span className={equipmentStyles.paginationLabel}>Par page</span>
        <select
          className={equipmentStyles.paginationSelect}
          value={safePageSize}
          onChange={event => onPageSizeChange?.(Number(event.target.value))}
          aria-label="Par page"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span className={equipmentStyles.paginationInfo}>
          {rangeStart}–{rangeEnd} / {total}
        </span>
      </div>
      <div className={equipmentStyles.paginationRight}>
        <button
          type="button"
          className={equipmentStyles.pageBtn}
          onClick={() => onPageChange?.(current - 1)}
          disabled={current <= 1}
          aria-label="Page précédente"
          title="Page précédente"
        >
          <Icon icon="mdi:chevron-left" width={16} height={16} aria-hidden />
        </button>
        <span className={equipmentStyles.paginationInfo}>
          {current} / {pages}
        </span>
        <button
          type="button"
          className={equipmentStyles.pageBtn}
          onClick={() => onPageChange?.(current + 1)}
          disabled={current >= pages}
          aria-label="Page suivante"
          title="Page suivante"
        >
          <Icon icon="mdi:chevron-right" width={16} height={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Enveloppe table + pagination (render prop). */
export function MonitoringPagedBlock({
  items,
  resetDeps = [],
  initialPageSize = 25,
  children,
}) {
  const pagination = useTablePagination(items, {
    initialPageSize,
    resetDeps,
    rangeFormatter: (start, end, total) => (total === 0 ? "0" : `${start}–${end} / ${total}`),
  });
  return (
    <div className={styles.infraPagedBlock}>
      {typeof children === "function" ? children(pagination.paginatedItems, pagination) : children}
      <MonitoringTablePagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </div>
  );
}
export function MonitoringStepShell({
  children,
  className = ""
}) {
  return <div className={`${styles.stepShell} ${className}`.trim()}>{children}</div>;
}
export function MonitoringStepHeader({
  title,
  subtitle,
  countLabel,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search by name, site, IP...",
  onSearchClear,
  headerActions = null,
  footer = null
}) {
  const secondaryText = subtitle || countLabel;
  return <div className={styles.stepHeaderBlock}>
      <div className={styles.stepHeaderRow}>
        <div className={styles.stepHeaderInfo}>
          <div className={styles.stepTitle}>{title}</div>
          {secondaryText ? <div className={styles.stepSubtitle}>{secondaryText}</div> : null}
        </div>
        <div className={styles.stepHeaderToolbar}>
          {showSearch ? <div className={styles.infraTableSearchBox}>
              <input type="text" value={searchValue} onChange={e => onSearchChange?.(e.target.value)} placeholder={searchPlaceholder} className={styles.infraTableSearchInput} />
              {searchValue ? <button type="button" onClick={() => onSearchClear ? onSearchClear() : onSearchChange?.("")} className={styles.infraTableSearchClear} title="Effacer">
                  <Icon icon="mdi:close" fontSize={16} />
                </button> : null}
            </div> : null}
          {headerActions ? <div className={styles.stepHeaderActions}>{headerActions}</div> : null}
        </div>
      </div>
      {footer}
    </div>;
}
export function MonitoringStepSyncButton({
  onClick,
  disabled = false,
  loading = false,
  label = "Synchronize",
  loadingLabel = "Synchronizing...",
  title,
  icon = "mdi:sync"
}) {
  return <button type="button" className={styles.stepSyncButton} onClick={onClick} disabled={disabled || loading} title={title || label}>
      <Icon icon={icon} width={16} height={16} className={loading ? styles.spinIcon : undefined} />
      <span>{loading ? loadingLabel : label}</span>
    </button>;
}
export function MonitoringStepToolbarButton({
  onClick,
  disabled = false,
  icon,
  label,
  title,
  children
}) {
  return <button type="button" className={styles.stepToolbarButton} onClick={onClick} disabled={disabled} title={title || label}>
      {icon ? <Icon icon={icon} width={16} height={16} /> : null}
      <span>{children ?? label}</span>
    </button>;
}
export function MonitoringStepSection({
  title,
  count = null,
  headerActions = null,
  children,
  emptyMessage = null,
  isEmpty = false,
  className = ""
}) {
  return <section className={`${styles.stepSection} ${className}`.trim()}>
      {(title || headerActions) && <div className={styles.stepSectionHeader}>
          {title ? <h4 className={styles.stepSectionTitle}>
              {title}
              {count != null ? <span className={styles.stepSectionCount}>({count})</span> : null}
            </h4> : <span />}
          {headerActions ? <div className={styles.stepSectionActions}>{headerActions}</div> : null}
        </div>}
      {isEmpty && emptyMessage ? <div className={styles.infraTableEmpty}>{emptyMessage}</div> : children}
    </section>;
}
export function MonitoringStepSubsectionHeader({
  title,
  searchValue = "",
  onSearchChange,
  onSearchClear,
  searchPlaceholder = "Search...",
  headerActions = null
}) {
  return <div className={styles.stepSubsectionHeader}>
      {title ? <h5 className={styles.stepSubsectionTitle}>{title}</h5> : <span />}
      <div className={styles.stepSubsectionToolbar}>
        {onSearchChange ? <div className={styles.stepSubsectionSearch}>
            <Icon icon="mdi:magnify" className={styles.stepSubsectionSearchIcon} />
            <input type="text" value={searchValue} onChange={e => onSearchChange(e.target.value)} placeholder={searchPlaceholder} className={styles.stepSubsectionSearchInput} />
            {searchValue ? <button type="button" onClick={() => onSearchClear ? onSearchClear() : onSearchChange("")} className={styles.stepSubsectionSearchClear} title="Effacer">
                <Icon icon="mdi:close" fontSize={14} />
              </button> : null}
          </div> : null}
        {headerActions ? <div className={styles.stepSectionActions}>{headerActions}</div> : null}
      </div>
    </div>;
}
/**
 * Shell table arrondi + fondu haut/bas au scroll (même rendu que périphériques EnterpriseDetailPage).
 */
export function MonitoringTableScrollShell({
  children,
  scrollable = false,
  fill = false,
  className = "",
  scrollClassName = "",
  deps = []
}) {
  const scrollRef = useRef(null);
  const [fadeVisible, setFadeVisible] = useState(false);
  const [fadeTopVisible, setFadeTopVisible] = useState(false);
  const [fadeTopOffset, setFadeTopOffset] = useState(0);
  const depsKey = Array.isArray(deps) ? deps.join("|") : String(deps ?? "");
  const capped = scrollable && !fill;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    const syncFadeTopOffset = () => {
      const head = el.querySelector("thead");
      if (!head) {
        setFadeTopOffset(prev => (prev === 0 ? prev : 0));
        return;
      }
      // offsetHeight plus fiable que getBoundingClientRect (sous-pixels / sticky)
      const next = Math.max(0, Math.ceil(head.offsetHeight || head.getBoundingClientRect().height || 0));
      setFadeTopOffset(prev => (prev === next ? prev : next));
    };

    const updateFade = () => {
      syncFadeTopOffset();
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      const canScroll = el.scrollHeight - el.clientHeight > 8;
      setFadeVisible(canScroll && remaining > 6);
      // Seuil plus haut : évite un fondu fantôme qui masque la 1re ligne
      setFadeTopVisible(canScroll && el.scrollTop > 12);
    };

    updateFade();
    const raf = requestAnimationFrame(() => {
      updateFade();
      requestAnimationFrame(updateFade);
    });
    el.addEventListener("scroll", updateFade, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateFade) : null;
    ro?.observe(el);
    const head = el.querySelector("thead");
    if (head) ro?.observe(head);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", updateFade);
      ro?.disconnect();
    };
  }, [depsKey, scrollable, fill]);

  return (
    <div
      className={`${equipmentStyles.tableScrollShell} ${styles.infraTableShell} ${
        fill ? styles.infraTableShellFill : capped ? styles.infraTableShellCapped : ""
      } ${className}`.trim()}
    >
      <div
        ref={scrollRef}
        className={`${equipmentStyles.tableWrapper} ${equipmentStyles.tableWrapperEmbedded} ${styles.infraTableScroll} ${
          fill ? styles.stepTableScrollFill : capped ? styles.stepTableScroll : ""
        } ${scrollClassName}`.trim()}
      >
        <div className={equipmentStyles.tableCardSurface}>{children}</div>
      </div>
      <div
        className={`${equipmentStyles.tableScrollFadeTop} ${
          fadeTopVisible && fadeTopOffset > 0 ? equipmentStyles.tableScrollFadeVisible : ""
        }`}
        style={fadeTopOffset > 0 ? { top: fadeTopOffset } : { top: 0, opacity: 0, pointerEvents: "none" }}
        aria-hidden
      />
      <div
        className={`${equipmentStyles.tableScrollFade} ${
          fadeVisible ? equipmentStyles.tableScrollFadeVisible : ""
        }`}
        aria-hidden
      />
    </div>
  );
}

export function MonitoringStepTableWrap({
  children,
  scrollable = false,
  fill = false,
  className = "",
  hostClassName = "",
  deps = []
}) {
  return (
    <div
      className={`${equipmentStyles.hardwarePageEmbedded} ${styles.infraTableHost} ${
        fill ? styles.infraTableHostFill : scrollable ? styles.infraTableHostCapped : ""
      } ${hostClassName}`.trim()}
    >
      <div className={equipmentStyles.equipmentTableSectionEmbedded}>
        <MonitoringTableScrollShell
          scrollable={scrollable}
          fill={fill}
          scrollClassName={className}
          deps={deps}
        >
          {children}
        </MonitoringTableScrollShell>
      </div>
    </div>
  );
}

/** Barre de recherche style infrastructure (hint « Rechercher »). */
export function MonitoringStepSearchBar({
  value = "",
  onChange,
  onClear,
  placeholder = "Rechercher",
  actions = null,
}) {
  return (
    <div className={`${equipmentStyles.embeddedFilterBar} ${equipmentStyles.embeddedFilterBarToolbar}`}>
      <div className={equipmentStyles.embeddedSearchWrap}>
        <div className={equipmentStyles.embeddedSearchBox}>
          <Icon icon="mdi:magnify" className={equipmentStyles.embeddedSearchIcon} aria-hidden />
          <input
            type="search"
            className={equipmentStyles.embeddedSearchInput}
            value={value}
            onChange={event => onChange?.(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
          />
          {value ? (
            <button
              type="button"
              className={equipmentStyles.embeddedSearchClear}
              onClick={() => (onClear ? onClear() : onChange?.(""))}
              aria-label="Effacer la recherche"
            >
              <Icon icon="mdi:close" aria-hidden />
            </button>
          ) : null}
        </div>
        {actions ? <div className={equipmentStyles.embeddedSearchActions}>{actions}</div> : null}
      </div>
    </div>
  );
}
