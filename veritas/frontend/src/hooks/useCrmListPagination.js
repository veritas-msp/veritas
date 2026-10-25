import { useLayoutEffect, useMemo, useRef } from "react";

/**
 * Pagination listes CRM — borne la page avant paint (évite slice vide / flash).
 * Aligné sur useTablePagination, avec clamp synchrone pour les filtres client-side.
 */
export function useCrmListPagination(items, pageSize, currentPage, setCurrentPage, resetPageWhen = []) {
  const list = Array.isArray(items) ? items : [];
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize) || 1);
  const effectivePage =
    list.length === 0 ? Math.max(1, currentPage) : Math.min(Math.max(1, currentPage), totalPages);

  const prevResetKeyRef = useRef(null);
  const resetKey = resetPageWhen
    .map(v => {
      if (v instanceof Set) return [...v].sort().join(",");
      if (v && typeof v === "object") return JSON.stringify(v);
      return String(v ?? "");
    })
    .join("|");

  useLayoutEffect(() => {
    if (prevResetKeyRef.current === null) {
      prevResetKeyRef.current = resetKey;
      return;
    }
    if (prevResetKeyRef.current === resetKey) return;
    prevResetKeyRef.current = resetKey;
    if (currentPage !== 1) setCurrentPage(1);
  }, [resetKey, currentPage, setCurrentPage]);

  useLayoutEffect(() => {
    if (list.length === 0) return;
    if (currentPage > totalPages) setCurrentPage(totalPages);
    else if (currentPage < 1) setCurrentPage(1);
  }, [currentPage, totalPages, setCurrentPage, list.length]);

  const paginatedItems = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, effectivePage, pageSize]);

  return {
    paginatedItems,
    totalPages,
    effectivePage,
    isFilteredEmpty: list.length === 0,
    rangeStart: list.length === 0 ? 0 : (effectivePage - 1) * pageSize + 1,
    rangeEnd: Math.min(effectivePage * pageSize, list.length)
  };
}
