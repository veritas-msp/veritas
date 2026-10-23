import { useCallback, useMemo, useState } from "react";
import UiKitEmptyState from "./UiKitEmptyState";
import UiKitSortIcon from "./UiKitSortIcon";
import UiKitTable, { uiKitTableStyles as tableStyles } from "./UiKitTable";

function defaultCompare(a, b, key, direction, getValue) {
  const va = getValue(a, key);
  const vb = getValue(b, key);
  let cmp = 0;
  if (typeof va === "number" && typeof vb === "number") {
    cmp = va - vb;
  } else {
    cmp = String(va).localeCompare(String(vb), undefined, { sensitivity: "base", numeric: true });
  }
  return direction === "desc" ? -cmp : cmp;
}

/**
 * Table triable UI Kit.
 * @param {Array<{ key: string, label: string, className?: string, defaultDirection?: "asc"|"desc" }>} columns
 * @param {Function} getSortValue (row, key) => comparable
 * @param {Function} renderRow (row) => ReactNode[] cells or { cells, className, onClick, ... }
 */
export default function UiKitDataTable({
  columns = [],
  rows = [],
  getSortValue,
  renderRow,
  initialSort = null,
  sortByLabel = "Trier par {column}",
  emptyIcon = "mdi:inbox-outline",
  emptyLabel = "Aucune donnée",
  fill = true,
  inset = true,
  className = "",
  pinFirst = null
}) {
  const [sort, setSort] = useState(
    () => initialSort || { key: columns[0]?.key, direction: columns[0]?.defaultDirection || "asc" }
  );

  const sortedRows = useMemo(() => {
    const list = [...(Array.isArray(rows) ? rows : [])];
    if (sort?.key && getSortValue) {
      list.sort((a, b) => defaultCompare(a, b, sort.key, sort.direction, getSortValue));
    }
    if (typeof pinFirst !== "function") return list;
    const pinned = [];
    const rest = [];
    for (const row of list) {
      if (pinFirst(row)) pinned.push(row);
      else rest.push(row);
    }
    return pinned.length ? [...pinned, ...rest] : list;
  }, [rows, sort, getSortValue, pinFirst]);

  const handleSort = useCallback(
    key => {
      const col = columns.find(c => c.key === key);
      setSort(prev =>
        prev.key === key
          ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
          : { key, direction: col?.defaultDirection || "asc" }
      );
    },
    [columns]
  );

  return (
    <div className={className} style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", height: "100%" }}>
      <UiKitTable
        fill={fill}
        inset={inset}
        deps={[sortedRows.length, sort.key, sort.direction]}
        empty={
          !sortedRows.length ? (
            <div className={tableStyles.tableEmpty}>
              <UiKitEmptyState bare={inset} icon={emptyIcon} text={emptyLabel} />
            </div>
          ) : null
        }
      >
        <table className={tableStyles.table}>
          <thead>
            <tr>
              {columns.map(col => {
                const isSorted = sort.key === col.key;
                const ariaSort = isSorted
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";
                const hint = String(sortByLabel).replace("{column}", col.label);
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`${tableStyles.tableThSortable}${col.className ? ` ${col.className}` : ""}`}
                    aria-sort={ariaSort}
                    title={hint}
                    onClick={() => handleSort(col.key)}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSort(col.key);
                      }
                    }}
                    tabIndex={0}
                  >
                    <span className={tableStyles.tableThContent}>
                      {col.label}
                      <UiKitSortIcon active={isSorted} direction={sort.direction} />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          {sortedRows.length ? (
            <tbody>
              {sortedRows.map((row, index) => {
                const rendered = renderRow?.(row, index);
                if (!rendered) return null;
                if (Array.isArray(rendered)) {
                  return (
                    <tr key={row.id ?? row.key ?? index} className={tableStyles.tableRowClickable}>
                      {rendered}
                    </tr>
                  );
                }
                const {
                  key,
                  cells,
                  className: rowClass = "",
                  onClick,
                  onKeyDown,
                  role = "link",
                  tabIndex = 0,
                  alert = false
                } = rendered;
                return (
                  <tr
                    key={key ?? row.id ?? index}
                    className={`${tableStyles.tableRowClickable}${alert ? ` ${tableStyles.tableRowAlert}` : ""}${rowClass ? ` ${rowClass}` : ""}`}
                    onClick={onClick}
                    onKeyDown={onKeyDown}
                    tabIndex={tabIndex}
                    role={role}
                  >
                    {cells}
                  </tr>
                );
              })}
            </tbody>
          ) : null}
        </table>
      </UiKitTable>
    </div>
  );
}

export { tableStyles as uiKitDataTableStyles };
