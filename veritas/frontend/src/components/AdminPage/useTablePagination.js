import { useEffect, useMemo, useState } from "react";
export function useTablePagination(items = [], {
  initialPageSize = 25,
  resetDeps = [],
  rangeFormatter
} = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const list = Array.isArray(items) ? items : [];
  useEffect(() => {
    setPage(1);
  }, [...resetDeps, pageSize]);
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const paginatedItems = useMemo(() => list.slice((currentPage - 1) * pageSize, currentPage * pageSize), [list, currentPage, pageSize]);
  const rangeStart = list.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, list.length);
  const rangeLabel = rangeFormatter ? rangeFormatter(rangeStart, rangeEnd, list.length) : list.length === 0 ? "0 items" : `${rangeStart}-${rangeEnd} of ${list.length}`;
  return {
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems,
    rangeLabel,
    totalItems: list.length
  };
}
