import { useCallback, useEffect, useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { formatPageInfo } from "../../i18n/commonI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import SmartTooltip from "../SmartTooltip";
import SortIcon from "../Misc/SortableHeader/SortIcon";
import { UiKitEmptyState, UiKitTable, uiKitTableStyles as tableKit } from "../UiKit";
import { MonitoringStepSearchBar } from "../RapportPage/monitoring/MonitoringStepLayout";
import equipStyles from "../EquipementPage/EquipmentPage.module.css";
import styles from "./AntivirusOverviewModal.module.css";

const EMPTY_ROWS = [];

function defaultFormatCell(value) {
  if (value == null || value === "") return "-";
  return value;
}

function collectSearchableText(value, depth = 0) {
  if (value == null || depth > 3) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = String(value).trim();
    return text ? [text] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(item => collectSearchableText(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.values(value).flatMap(item => collectSearchableText(item, depth + 1));
  }
  return [];
}

function rowMatchesQuery(row, columns, query) {
  const parts = [];
  for (const col of columns || []) {
    parts.push(...collectSearchableText(row?.[col.key]));
  }
  parts.push(...collectSearchableText(row));
  return parts.join(" ").toLowerCase().includes(query);
}

function getColumnSortValue(row, col) {
  if (typeof col?.sortValue === "function") return col.sortValue(row);
  return row?.[col?.key];
}

function compareSortValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null || a === "") return 1;
  if (b == null || b === "") return -1;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  if (typeof a === "number" && typeof b === "number") return a - b;
  const aNum = typeof a === "string" && a.trim() !== "" && !Number.isNaN(Number(a)) ? Number(a) : null;
  const bNum = typeof b === "string" && b.trim() !== "" && !Number.isNaN(Number(b)) ? Number(b) : null;
  if (aNum != null && bNum != null) return aNum - bNum;
  const aDate = a instanceof Date ? a : typeof a === "string" || typeof a === "number" ? new Date(a) : null;
  const bDate = b instanceof Date ? b : typeof b === "string" || typeof b === "number" ? new Date(b) : null;
  if (
    aDate &&
    bDate &&
    !Number.isNaN(aDate.getTime()) &&
    !Number.isNaN(bDate.getTime()) &&
    (a instanceof Date || b instanceof Date || /^\d{4}-\d{2}/.test(String(a)) || /^\d{4}-\d{2}/.test(String(b)))
  ) {
    return aDate.getTime() - bDate.getTime();
  }
  return String(a).localeCompare(String(b), "fr", { sensitivity: "base", numeric: true });
}

/**
 * Shared paginated table for antivirus / antispam overview list sections.
 * Search + sort + pager aligned with EnterpriseDetailPage / Postes & réseau.
 */
export default function SolutionOverviewDataTable({
  columns,
  rows,
  emptyLabel = "Aucune donnée",
  emptyIcon = "mdi:inbox-outline",
  fillHeight = false,
  formatCell = defaultFormatCell,
  searchable = false,
  searchPlaceholder = "Rechercher",
  onRowClick = null,
  onRowDoubleClick = null,
  getRowClassName = null
}) {
  const locale = useAppLocale();
  const common = useCommonCopy();
  const [pageSize, setPageSize] = useDefaultPageSize();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const allRows = Array.isArray(rows) ? rows : EMPTY_ROWS;

  const filteredRows = useMemo(() => {
    if (!searchable) return allRows;
    const query = search.trim().toLowerCase();
    if (!query) return allRows;
    return allRows.filter(row => rowMatchesQuery(row, columns, query));
  }, [allRows, columns, search, searchable]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const col = (columns || []).find(item => item.key === sortKey);
    if (!col || col.sortable === false) return filteredRows;
    const direction = sortDirection === "desc" ? -1 : 1;
    return [...filteredRows].sort((left, right) => {
      const cmp = compareSortValues(getColumnSortValue(left, col), getColumnSortValue(right, col));
      return cmp * direction;
    });
  }, [columns, filteredRows, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize) || 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredRows.length, pageSize, search, sortKey, sortDirection]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSort = useCallback(columnKey => {
    const col = (columns || []).find(item => item.key === columnKey);
    if (!col || col.sortable === false) return;
    setSortKey(prev => {
      if (prev !== columnKey) {
        setSortDirection("asc");
        return columnKey;
      }
      setSortDirection(dir => (dir === "asc" ? "desc" : "asc"));
      return columnKey;
    });
  }, [columns]);

  const isEmpty = pageRows.length === 0;
  const emptyMessage =
    allRows.length && searchable && search.trim()
      ? "Aucun résultat pour cette recherche"
      : emptyLabel;
  const resolvedEmptyIcon =
    allRows.length && searchable && search.trim() ? "mdi:magnify-close" : emptyIcon;

  return (
    <div className={fillHeight ? styles.listTableWithPager : styles.listTableWithPagerStatic}>
      {searchable ? (
        <div className={equipStyles.hardwarePageEmbedded}>
          <MonitoringStepSearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch("")}
            placeholder={searchPlaceholder}
          />
        </div>
      ) : null}
      {isEmpty ? (
        <div className={styles.listEmptyPanel}>
          <UiKitEmptyState bare icon={resolvedEmptyIcon} title={emptyMessage} />
        </div>
      ) : (
        <UiKitTable
          fill={fillHeight}
          inset={false}
          className={styles.overviewUiKitTable}
          fadeTop
          fadeTopInset="2.85rem"
          deps={[
            pageRows.length,
            currentPage,
            pageSize,
            search,
            columns?.length,
            sortedRows.length,
            sortKey,
            sortDirection
          ]}
        >
          <table className={`${tableKit.table} ${tableKit.tableList}`.trim()}>
            <thead>
              <tr>
                {(columns || []).map(col => {
                  const canSort = col.sortable !== false;
                  const isSorted = sortKey === col.key;
                  const ariaSort = isSorted
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";
                  const labelNode = (
                    <span className={styles.thLabelRow}>
                      <span>{col.label}</span>
                      {col.headerHint ? (
                        <SmartTooltip content={col.headerHint} as="span">
                          <button
                            type="button"
                            className={styles.thHintBtn}
                            aria-label={`Aide : ${col.label}`}
                            onClick={event => event.stopPropagation()}
                          >
                            ?
                          </button>
                        </SmartTooltip>
                      ) : null}
                    </span>
                  );
                  if (!canSort) {
                    return <th key={col.key}>{labelNode}</th>;
                  }
                  return (
                    <th
                      key={col.key}
                      className={tableKit.tableThSortable}
                      onClick={() => handleSort(col.key)}
                      aria-sort={ariaSort}
                      title={`Trier par ${col.label}`}
                    >
                      <span className={tableKit.tableThContent}>
                        {labelNode}
                        {isSorted ? (
                          <SortIcon active direction={sortDirection} className={tableKit.tableSortIcon} />
                        ) : null}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => {
                const rowKey = row.id || `${(currentPage - 1) * pageSize + index}`;
                const extraClass = typeof getRowClassName === "function" ? getRowClassName(row) : "";
                const clickable = Boolean(onRowClick || onRowDoubleClick);
                return (
                  <tr
                    key={rowKey}
                    className={[clickable ? styles.rowClickable : "", extraClass].filter(Boolean).join(" ") || undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
                  >
                    {columns.map(col => (
                      <td key={col.key} className={col.mono ? styles.mono : undefined}>
                        {col.render ? col.render(row) : formatCell(row[col.key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </UiKitTable>
      )}
      <div className={`${equipStyles.pagination} ${equipStyles.paginationEmbedded}`}>
        <div className={equipStyles.paginationLeft}>
          <span className={equipStyles.paginationLabel}>{common.perPage}</span>
          <select
            className={equipStyles.paginationSelect}
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            aria-label={common.perPage}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div className={equipStyles.paginationRight}>
          <SmartTooltip content={common.prevPage}>
            <button
              type="button"
              className={equipStyles.pageBtn}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || sortedRows.length === 0}
              aria-label={common.prevPage}
            >
              <FaChevronLeft />
            </button>
          </SmartTooltip>
          <span className={equipStyles.paginationInfo}>
            {formatPageInfo(
              locale,
              sortedRows.length === 0 ? 0 : currentPage,
              sortedRows.length === 0 ? 0 : totalPages
            )}
          </span>
          <SmartTooltip content={common.nextPage}>
            <button
              type="button"
              className={equipStyles.pageBtn}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || sortedRows.length === 0}
              aria-label={common.nextPage}
            >
              <FaChevronRight />
            </button>
          </SmartTooltip>
        </div>
      </div>
    </div>
  );
}
