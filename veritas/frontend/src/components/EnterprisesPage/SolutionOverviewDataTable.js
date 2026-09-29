import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { formatPageInfo } from "../../i18n/commonI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import SmartTooltip from "../SmartTooltip";
import layout from "./EnterprisesPage.module.css";
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

/**
 * Shared paginated table for antivirus / antispam overview list sections.
 */
export default function SolutionOverviewDataTable({
  columns,
  rows,
  emptyLabel = "No data",
  fillHeight = false,
  formatCell = defaultFormatCell,
  searchable = false,
  searchPlaceholder = "Search…"
}) {
  const locale = useAppLocale();
  const common = useCommonCopy();
  const [pageSize, setPageSize] = useDefaultPageSize();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const allRows = Array.isArray(rows) ? rows : EMPTY_ROWS;

  const filteredRows = useMemo(() => {
    if (!searchable) return allRows;
    const query = search.trim().toLowerCase();
    if (!query) return allRows;
    return allRows.filter(row => rowMatchesQuery(row, columns, query));
  }, [allRows, columns, search, searchable]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize) || 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredRows.length, pageSize, search]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const showEmpty = !filteredRows.length;
  const emptyMessage =
    allRows.length && searchable && search.trim()
      ? "No results for this search"
      : emptyLabel;

  return (
    <div className={fillHeight ? styles.listTableWithPager : styles.listTableWithPagerStatic}>
      {searchable ? (
        <label className={styles.listSearchBox}>
          <Icon icon="mdi:magnify" width={18} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </label>
      ) : null}
      {showEmpty ? (
        <div className={fillHeight ? styles.tableScrollFill : undefined}>
          <div className={styles.emptyState}>{emptyMessage}</div>
        </div>
      ) : (
        <>
          <div className={fillHeight ? styles.tableScrollFill : styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => (
                  <tr key={row.id || `${(currentPage - 1) * pageSize + index}`}>
                    {columns.map(col => (
                      <td key={col.key} className={col.mono ? styles.mono : undefined}>
                        {col.render ? col.render(row) : formatCell(row[col.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={layout.pagination}>
            <div className={layout.paginationLeft}>
              <span className={layout.paginationLabel}>{common.perPage}</span>
              <select
                className={layout.paginationSelect}
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className={layout.paginationRight}>
              <SmartTooltip content={common.prevPage}>
                <button
                  type="button"
                  className={layout.pageBtn}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label={common.prevPage}
                >
                  <FaChevronLeft />
                </button>
              </SmartTooltip>
              <span className={layout.paginationInfo}>{formatPageInfo(locale, currentPage, totalPages)}</span>
              <SmartTooltip content={common.nextPage}>
                <button
                  type="button"
                  className={layout.pageBtn}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label={common.nextPage}
                >
                  <FaChevronRight />
                </button>
              </SmartTooltip>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
