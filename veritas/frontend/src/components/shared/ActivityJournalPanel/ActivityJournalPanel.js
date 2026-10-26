import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import enterpriseDetailStyles from "../../EnterprisesPage/EnterpriseDetailPage.module.css";
import equipStyles from "../../EquipementPage/EquipmentPage.module.css";
import { ConfirmModal } from "../../AdminPage/AdminUi";
import EquipmentLogDetailModal from "../../EquipementPage/EquipmentLogDetailModal";
import { getLogModificationField } from "../../EquipementPage/equipmentLogUtils";
import TicketColumnsModal from "../../TicketPage/TicketColumnsModal";
import SortIcon from "../../Misc/SortableHeader/SortIcon";
import { cycleSortState } from "../../Misc/SortableHeader/cycleSortState";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { useDefaultPageSize } from "../../../hooks/useDefaultPageSize";
import { usePermissions } from "../../../contexts/PermissionsContext";
import { getLocaleTag } from "../../../i18n/locales";
import { createTrackedAbortController } from "../../../utils/pageLoadAbort";
import { fetchTicketTableColumns } from "../../../api/tickets";
import {
  DEFAULT_ENTERPRISE_LOGS_TABLE_COLUMNS,
  normalizeTicketTableColumns
} from "../../../utils/ticketTableColumns";
import { UiKitEmptyState, UiKitTable, uiKitTableStyles as tableKit } from "../../UiKit";
import { getActivityJournalCopy, interpolate } from "./activityJournalI18n";
import styles from "./ActivityJournalPanel.module.css";

const LOGS_PAGE_SCOPE = "enterprise_logs";
const LOGS_COLUMN_HEADERS = {
  action: "action",
  field: "field",
  user: "user",
  date: "date"
};
const LOGS_SORT_DEFAULT = { key: "date", direction: "desc" };

function sanitizeLogsTableColumns(columns) {
  const list = normalizeTicketTableColumns(columns, {
    fallback: DEFAULT_ENTERPRISE_LOGS_TABLE_COLUMNS,
    pageScope: LOGS_PAGE_SCOPE
  });
  if (!list.includes("action")) list.unshift("action");
  if (!list.includes("field")) {
    const actionIdx = list.indexOf("action");
    list.splice(actionIdx >= 0 ? actionIdx + 1 : 0, 0, "field");
  }
  return list;
}

export default function ActivityJournalPanel({
  entityId,
  fetchLogs,
  purgeLogs = null,
  active = true,
  embedded = false,
  copy: copyOverride = null
}) {
  const locale = useAppLocale();
  const { can } = usePermissions();
  const canPublicViews = can("clients.public_views");
  const [pageSize, setPageSize] = useDefaultPageSize();
  const copy = useMemo(
    () => ({ ...getActivityJournalCopy(locale), ...(copyOverride || {}) }),
    [locale, copyOverride]
  );
  const copyRef = useRef(copy);
  copyRef.current = copy;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState(LOGS_SORT_DEFAULT.key);
  const [sortDirection, setSortDirection] = useState(LOGS_SORT_DEFAULT.direction);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [publicTableColumns, setPublicTableColumns] = useState(() => sanitizeLogsTableColumns(DEFAULT_ENTERPRISE_LOGS_TABLE_COLUMNS));
  const [privateTableColumns, setPrivateTableColumns] = useState(null);
  const [visibleTableColumns, setVisibleTableColumns] = useState(() => sanitizeLogsTableColumns(DEFAULT_ENTERPRISE_LOGS_TABLE_COLUMNS));
  const tableColumns = visibleTableColumns;
  const controllerRef = useRef(null);
  const mountedRef = useRef(true);
  const fetchLogsRef = useRef(fetchLogs);
  fetchLogsRef.current = fetchLogs;
  const purgeLogsRef = useRef(purgeLogs);
  purgeLogsRef.current = purgeLogs;
  const hasRowsRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDraft.trim()), 280);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTicketTableColumns(LOGS_PAGE_SCOPE);
        if (cancelled) return;
        setPublicTableColumns(sanitizeLogsTableColumns(Array.isArray(data?.public) ? data.public : DEFAULT_ENTERPRISE_LOGS_TABLE_COLUMNS));
        setPrivateTableColumns(Array.isArray(data?.private) && data.private.length ? sanitizeLogsTableColumns(data.private) : null);
        setVisibleTableColumns(sanitizeLogsTableColumns(Array.isArray(data?.effective) && data.effective.length ? data.effective : DEFAULT_ENTERPRISE_LOGS_TABLE_COLUMNS));
      } catch {
        if (!cancelled) toast.error(copyRef.current.toasts?.loadColumns || "Error loading columns");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleColumnsSaved = useCallback(result => {
    if (Array.isArray(result?.public)) setPublicTableColumns(sanitizeLogsTableColumns(result.public));
    setPrivateTableColumns(Array.isArray(result?.private) && result.private.length ? sanitizeLogsTableColumns(result.private) : null);
    setVisibleTableColumns(sanitizeLogsTableColumns(Array.isArray(result?.effective) && result.effective.length ? result.effective : DEFAULT_ENTERPRISE_LOGS_TABLE_COLUMNS));
  }, []);

  const handleSort = useCallback(column => {
    const next = cycleSortState({
      column,
      sortBy,
      sortDirection,
      defaultSortBy: LOGS_SORT_DEFAULT.key,
      defaultSortDirection: LOGS_SORT_DEFAULT.direction,
      firstDirection: column === "date" ? "desc" : "asc"
    });
    setSortBy(next.sortBy);
    setSortDirection(next.sortDirection);
    setPage(1);
  }, [sortBy, sortDirection]);

  const load = useCallback(
    async (nextPage = 1) => {
      const fetchFn = fetchLogsRef.current;
      if (!entityId || typeof fetchFn !== "function") {
        setLogs([]);
        setTotal(0);
        hasRowsRef.current = false;
        return;
      }
      controllerRef.current?.abort();
      const controller = createTrackedAbortController();
      controllerRef.current = controller;
      // Ne pas flash-loader si on a déjà des lignes (re-render parent / hover onglets).
      if (!hasRowsRef.current) setLoading(true);
      try {
        const data = await fetchFn(nextPage, {
          signal: controller.signal,
          limit: Math.max(1, Number(pageSize) || 25),
          search,
          sortBy,
          sortDir: sortDirection
        });
        if (controller.signal.aborted || !mountedRef.current) return;
        const rows = Array.isArray(data?.logs) ? data.logs : [];
        const filtered = search
          ? rows.filter(row => {
              const haystack = [
                row.action,
                row.user_name,
                row.user,
                typeof row.details === "string" ? row.details : JSON.stringify(row.details || "")
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              return haystack.includes(search.toLowerCase());
            })
          : rows;
        setLogs(filtered);
        setTotal(Number(data?.total) || filtered.length || 0);
        setPage(nextPage);
        hasRowsRef.current = filtered.length > 0 || Number(data?.total) > 0;
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error("Error loading activity journal:", error);
        if (mountedRef.current) {
          setLogs([]);
          setTotal(0);
          hasRowsRef.current = false;
          toast.error(copyRef.current.loadError);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [entityId, pageSize, search, sortBy, sortDirection]
  );

  useEffect(() => {
    hasRowsRef.current = false;
  }, [entityId]);

  useEffect(() => {
    if (!active) {
      controllerRef.current?.abort();
      return undefined;
    }
    load(1);
    return undefined;
  }, [active, entityId, search, sortBy, sortDirection, pageSize, load]);

  const handlePurge = async () => {
    const purgeFn = purgeLogsRef.current;
    if (typeof purgeFn !== "function") return;
    setPurging(true);
    try {
      const result = await purgeFn();
      const deleted = result?.logs_deleted ?? result?.deleted ?? total;
      toast.success(
        deleted > 0
          ? interpolate(copy.purgeSuccess, { count: deleted })
          : copy.purgeNone
      );
      setPurgeOpen(false);
      hasRowsRef.current = false;
      await load(1);
    } catch (error) {
      toast.error(error?.message || copy.purgeError);
    } finally {
      setPurging(false);
    }
  };

  const filtersActive = Boolean(search);
  const safePageSize = Math.max(1, Number(pageSize) || 25);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * safePageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * safePageSize, total);
  const searchPlaceholder = embedded
    ? (copy.searchPlaceholderShort || copy.searchPlaceholder || "Rechercher")
    : copy.searchPlaceholder;

  const toolbar = (
    <div
      className={
        embedded
          ? `${equipStyles.hardwarePageEmbedded} ${equipStyles.embeddedFilterBar} ${equipStyles.embeddedFilterBarToolbar} ${styles.embeddedToolbar}`
          : styles.toolbar
      }
    >
      {embedded ? (
        <div className={equipStyles.embeddedSearchWrap}>
          <div className={equipStyles.embeddedSearchBox}>
            <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
            <input
              type="text"
              className={equipStyles.embeddedSearchInput}
              value={searchDraft}
              onChange={event => setSearchDraft(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={copy.searchAria}
            />
            {searchDraft ? (
              <button
                type="button"
                className={equipStyles.embeddedSearchClear}
                onClick={() => setSearchDraft("")}
                aria-label={copy.clearSearch}
              >
                <FaTimes aria-hidden />
              </button>
            ) : null}
          </div>
          <div className={`${equipStyles.embeddedSearchActions} ${styles.embeddedToolbarActions}`}>
            <button
              type="button"
              className={styles.columnsPillBtn}
              onClick={() => setColumnsModalOpen(true)}
              aria-label={copy.columnsSettings || "Colonnes"}
              title={copy.columnsSettings || "Colonnes"}
            >
              <Icon icon="mdi:table-cog" aria-hidden />
            </button>
            {typeof purgeLogs === "function" ? (
              <button
                type="button"
                className={styles.purgeBtn}
                onClick={() => setPurgeOpen(true)}
                disabled={loading || purging || total === 0}
                title={copy.purgeTitle || copy.purge}
                aria-label={copy.purgeTitle || copy.purge}
              >
                <Icon icon="mdi:delete-sweep" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.searchWrap}>
            <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
            <input
              type="search"
              className={styles.searchInput}
              value={searchDraft}
              onChange={event => setSearchDraft(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={copy.searchAria}
            />
            {searchDraft ? (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setSearchDraft("")}
                aria-label={copy.clearSearch}
              >
                <Icon icon="mdi:close" aria-hidden />
              </button>
            ) : null}
          </div>
          <div className={styles.toolbarActions}>
            <button
              type="button"
              className={styles.columnsPillBtn}
              onClick={() => setColumnsModalOpen(true)}
              aria-label={copy.columnsSettings || "Colonnes"}
              title={copy.columnsSettings || "Colonnes"}
            >
              <Icon icon="mdi:table-cog" aria-hidden />
            </button>
            {typeof purgeLogs === "function" ? (
              <button
                type="button"
                className={styles.purgeBtn}
                onClick={() => setPurgeOpen(true)}
                disabled={loading || purging || total === 0}
                title={copy.purgeTitle || copy.purge}
                aria-label={copy.purgeTitle || copy.purge}
              >
                <Icon icon="mdi:delete-sweep" aria-hidden />
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );

  const tableInner = loading ? (
    <div className={styles.loadingState}>{copy.loading}</div>
  ) : logs.length === 0 ? (
    <div className={styles.emptyState}>
      <UiKitEmptyState
        bare
        icon="mdi:history"
        text={filtersActive ? copy.emptyFiltered : copy.empty}
      />
    </div>
  ) : (
    <table className={`${tableKit.table} ${tableKit.tableList} ${styles.table}`.trim()}>
      <thead>
        <tr>
          {tableColumns.map(columnId => {
            const labelKey = LOGS_COLUMN_HEADERS[columnId] || columnId;
            const label = copy.table?.[labelKey] || columnId;
            const isSorted = sortBy === columnId;
            const colClass =
              columnId === "action"
                ? styles.colAction
                : columnId === "field"
                  ? styles.colField
                  : columnId === "user"
                    ? styles.colUser
                    : columnId === "date"
                      ? styles.colDate
                      : "";
            return (
              <th
                key={columnId}
                className={`${tableKit.tableThSortable} ${styles.sortableTh} ${colClass}`.trim()}
                onClick={() => handleSort(columnId)}
                aria-sort={isSorted ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
              >
                <span className={`${tableKit.tableThContent} ${styles.thContent}`.trim()}>
                  {label}
                  {isSorted ? (
                    <SortIcon active direction={sortDirection || "asc"} className={styles.sortIndicator} />
                  ) : null}
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {logs.map((log, index) => {
          const userLabel = log.user_name || log.user || copy.systemUser;
          const fieldLabel = getLogModificationField(log) || "—";
          const when = log.created_at || log.timestamp;
          const dateLabel = when
            ? new Date(when).toLocaleString(getLocaleTag(locale), {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })
            : "—";
          return (
            <tr
              key={log.id || `${when}-${index}`}
              className={tableKit.tableRowClickable}
              onClick={() => setSelectedLog(log)}
              title={copy.detailTitle}
            >
              {tableColumns.map(columnId => {
                if (columnId === "action") {
                  return (
                    <td key={columnId} className={`${styles.colAction} ${styles.actionCell}`} title={log.action || ""}>
                      {log.action || "—"}
                    </td>
                  );
                }
                if (columnId === "field") {
                  return (
                    <td key={columnId} className={`${styles.colField} ${styles.fieldCell}`} title={fieldLabel}>
                      {fieldLabel}
                    </td>
                  );
                }
                if (columnId === "user") {
                  return (
                    <td key={columnId} className={`${styles.colUser} ${styles.userCell}`} title={userLabel}>
                      {userLabel}
                    </td>
                  );
                }
                if (columnId === "date") {
                  return (
                    <td key={columnId} className={`${styles.colDate} ${styles.dateCell}`}>
                      {dateLabel}
                    </td>
                  );
                }
                return null;
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const tableBlock = (
    <div className={embedded ? styles.tableStack : styles.tableFill}>
      {loading || logs.length === 0 ? (
        tableInner
      ) : (
        <UiKitTable
          fill={embedded}
          className={styles.logsUiKitTable}
          deps={[logs.length, page, sortBy, sortDirection, search, tableColumns.join("|")]}
        >
          {tableInner}
        </UiKitTable>
      )}
    </div>
  );

  const pagination = (
    <div
      className={`${equipStyles.pagination} ${equipStyles.paginationEmbedded} ${styles.paginationBar} ${
        embedded ? styles.paginationEmbedded : ""
      }`.trim()}
    >
      <div className={equipStyles.paginationLeft}>
        <span className={equipStyles.paginationLabel}>{copy.perPage || "Par page"}</span>
        <select
          className={equipStyles.paginationSelect}
          value={safePageSize}
          onChange={event => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
          disabled={loading}
          aria-label={copy.perPage || "Par page"}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className={equipStyles.paginationInfo}>
          {interpolate(copy.rangeInfo || "{start}–{end} sur {total}", {
            start: String(rangeStart),
            end: String(rangeEnd),
            total: String(total)
          })}
        </span>
      </div>
      <div className={equipStyles.paginationRight}>
        <button
          type="button"
          className={equipStyles.pageBtn}
          onClick={() => load(page - 1)}
          disabled={page <= 1 || loading || total === 0}
          aria-label={copy.prevPage}
        >
          <FaChevronLeft aria-hidden />
        </button>
        <span className={equipStyles.paginationInfo}>
          {interpolate(copy.pageInfo || "Page {current} / {total}", {
            current: String(total === 0 ? 0 : page),
            total: String(total === 0 ? 0 : totalPages)
          })}
        </span>
        <button
          type="button"
          className={equipStyles.pageBtn}
          onClick={() => load(page + 1)}
          disabled={page >= totalPages || loading || total === 0}
          aria-label={copy.nextPage}
        >
          <FaChevronRight aria-hidden />
        </button>
      </div>
    </div>
  );

  const modals = (
    <>
      {selectedLog ? (
        <EquipmentLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      ) : null}

      <ConfirmModal
        open={purgeOpen}
        title={copy.purgeConfirmTitle}
        message={interpolate(copy.purgeConfirmMessage, { count: total })}
        icon="mdi:delete-alert-outline"
        confirmLabel={copy.purge}
        confirmVariant="dangerSolid"
        confirmLoading={purging}
        onConfirm={handlePurge}
        onClose={() => {
          if (!purging) setPurgeOpen(false);
        }}
      />

      <TicketColumnsModal
        open={columnsModalOpen}
        onClose={() => setColumnsModalOpen(false)}
        onSaved={handleColumnsSaved}
        isAdmin={canPublicViews}
        pageScope={LOGS_PAGE_SCOPE}
        initialPublic={publicTableColumns}
        initialPrivate={privateTableColumns}
        initialEffective={visibleTableColumns}
        columnLabelKeys={LOGS_COLUMN_HEADERS}
        copy={copy}
      />
    </>
  );

  if (embedded) {
    return (
      <section className={`${styles.logsPanel} ${styles.logsPanelEmbedded}`.trim()}>
        <div className={styles.logsPanelBodyEmbedded}>
          {toolbar}
          {tableBlock}
          {pagination}
        </div>
        {modals}
      </section>
    );
  }

  return (
    <section className={`${enterpriseDetailStyles.panel} ${styles.logsPanel}`.trim()}>
      <div className={`${enterpriseDetailStyles.panelBody} ${styles.logsPanelBody}`.trim()}>
        {toolbar}
        {tableBlock}
        {pagination}
      </div>

      {modals}
    </section>
  );
}
