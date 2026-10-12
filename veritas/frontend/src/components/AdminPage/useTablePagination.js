import { useEffect, useMemo, useRef, useState } from "react";

export function useTablePagination(items = [], {
  initialPageSize = 25,
  initialPage = 1,
  resetDeps = [],
  rangeFormatter
} = {}) {
  const [page, setPage] = useState(() => Math.max(1, Math.floor(Number(initialPage) || 1)));
  const [pageSize, setPageSize] = useState(initialPageSize);
  const skipNextResetRef = useRef(true);
  const list = Array.isArray(items) ? items : [];
  useEffect(() => {
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
      return;
    }
    setPage(1);
  }, [...resetDeps, pageSize]);
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = list.length === 0 ? page : Math.min(page, totalPages);
  useEffect(() => {
    // Keep a restored page while the list is still empty (loading).
    if (list.length === 0) return;
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, list.length]);
  const paginatedItems = useMemo(
    () => list.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [list, currentPage, pageSize]
  );
  const rangeStart = list.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, list.length);
  const rangeLabel = rangeFormatter
    ? rangeFormatter(rangeStart, rangeEnd, list.length)
    : list.length === 0
      ? "0 items"
      : `${rangeStart}-${rangeEnd} of ${list.length}`;
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
