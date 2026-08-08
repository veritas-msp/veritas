import { useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { Pagination } from "./AdminUi";
import { useTablePagination } from "./useTablePagination";
import { formatMailCollectDateTime, interpolate } from "./adminMailCollectI18n";
import styles from "./CollectorLogsModal.module.css";
const LEVEL_ICONS = {
  success: {
    icon: "mdi:check-circle-outline",
    className: styles.logLevel_success
  },
  error: {
    icon: "mdi:alert-circle-outline",
    className: styles.logLevel_error
  },
  warning: {
    icon: "mdi:alert-outline",
    className: styles.logLevel_warning
  },
  info: {
    icon: "mdi:information-outline",
    className: styles.logLevel_info
  }
};
function getLevelMeta(level, copy) {
  const key = String(level || "info").toLowerCase();
  const icons = LEVEL_ICONS[key] || LEVEL_ICONS.info;
  const labels = copy.collectorLogs.levels;
  return {
    ...icons,
    label: labels[key] || labels.info
  };
}
function getItemClass(level) {
  const key = String(level || "info").toLowerCase();
  if (key === "success") return styles.logItem_success;
  if (key === "error") return styles.logItem_error;
  if (key === "warning") return styles.logItem_warning;
  return styles.logItem_info;
}
export default function CollectorLogsModal({
  open,
  copy,
  locale = "fr",
  collectorName,
  logs = [],
  onClose
}) {
  const cl = copy.collectorLogs;
  const displayName = collectorName || copy.common.collectorFallback;
  const rows = Array.isArray(logs) ? logs : [];
  const sortedLogs = useMemo(() => [...rows].sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return String(b?.id || "").localeCompare(String(a?.id || ""));
  }), [rows]);
  const logsPagination = useTablePagination(sortedLogs, {
    initialPageSize: 10,
    resetDeps: [open, displayName, rows.length]
  });
  if (!open) return null;
  const errorCount = rows.filter(row => String(row?.level || "").toLowerCase() === "error").length;
  const entryLabel = rows.length > 1 ? cl.entryMany : cl.entryOne;
  const errorLabel = errorCount > 1 ? cl.errorMany : cl.errorOne;
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={`${layout.shell} ${layout.shellMedium} ${styles.shell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="collector-logs-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:history" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{cl.eyebrow}</p>
              <h2 className={layout.title} id="collector-logs-modal-title">
                {interpolate(cl.title, {
                name: displayName
              })}
              </h2>
              <p className={layout.subtitle}>{cl.subtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} aria-label={copy.common.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          {rows.length > 0 && <div className={styles.summary}>
              <Icon icon="mdi:format-list-bulleted" aria-hidden />
              <span>
                <strong>{rows.length}</strong> {entryLabel}
                {errorCount > 0 && <>
                    {" "}
                    · <strong>{errorCount}</strong> {errorLabel}
                  </>}
              </span>
            </div>}

          {rows.length === 0 ? <div className={styles.emptyState}>
              <Icon icon="mdi:clipboard-text-clock-outline" className={styles.emptyIcon} aria-hidden />
              <p className={styles.emptyTitle}>{cl.emptyTitle}</p>
              <p className={styles.emptyDesc}>{cl.emptyDesc}</p>
            </div> : <>
              <div className={styles.logList}>
                {logsPagination.paginatedItems.map(row => {
              const level = getLevelMeta(row?.level, copy);
              const message = row.message || "-";
              return <article key={row.id || `${row.createdAt}-${row.message}`} className={`${styles.logItem} ${getItemClass(row?.level)}`} title={message}>
                      <span className={`${styles.logLevel} ${level.className}`}>
                        <Icon icon={level.icon} aria-hidden />
                        {level.label}
                      </span>
                      <time className={styles.logDate} dateTime={row.createdAt || undefined}>
                        {formatMailCollectDateTime(row.createdAt, locale)}
                      </time>
                      <p className={styles.logMessage}>{message}</p>
                    </article>;
            })}
              </div>

              {logsPagination.totalItems > 0 && <div className={styles.paginationWrap}>
                  <Pagination page={logsPagination.page} totalPages={logsPagination.totalPages} onPageChange={logsPagination.setPage} pageSize={logsPagination.pageSize} onPageSizeChange={logsPagination.setPageSize} rangeLabel={logsPagination.rangeLabel} />
                </div>}
            </>}
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {rows.length > 0 ? cl.footerRecent : cl.footerNone}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.primaryBtn} onClick={onClose}>
              <Icon icon="mdi:check" aria-hidden />
              {copy.common.close}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
