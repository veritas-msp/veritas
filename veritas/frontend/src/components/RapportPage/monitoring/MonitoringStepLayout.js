import React from "react";
import { Icon } from "@iconify/react";
import equipmentStyles from "../../EquipementPage/EquipmentPage.module.css";
import styles from "./RapportMonitoringBuilder.module.css";
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
export function MonitoringStepTableWrap({
  children,
  scrollable = false,
  className = ""
}) {
  return <div className={equipmentStyles.hardwarePageEmbedded}>
      <div className={`${equipmentStyles.tableWrapper} ${scrollable ? styles.stepTableScroll : ""} ${className}`.trim()}>
        {children}
      </div>
    </div>;
}
