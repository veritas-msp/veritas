import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { fetchMonitoringDocuments } from "../../api/monitoringDocuments";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { interpolate } from "../../i18n/translate";
import {
  UiKitCrmListToolbar,
  UiKitEmptyState,
  UiKitTable,
  uiKitLayoutsStyles as kit,
  uiKitTableStyles as tableKit
} from "../UiKit";
import SmartTooltip from "../SmartTooltip";
import { getReportTypeLabel } from "./rapportPageI18n";
import { resolveReportTypeIdFromDocument } from "./reportDocumentUtils";
import styles from "./RapportSavedDocuments.module.css";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatDocDate(value, locale) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(locale || "fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(value);
  }
}

function resolveAuthorLabel(doc) {
  const username = String(doc?.username || "").trim();
  const email = String(doc?.user_email || doc?.userEmail || "").trim();
  return username || email || "—";
}

export default function RapportSavedDocuments({
  copy,
  onEditDocument,
  refreshKey = 0
}) {
  const common = useCommonCopy();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const recentCopy = copy?.recent || {};
  const searchPlaceholder = recentCopy.searchPlaceholder || "Rechercher";

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMonitoringDocuments();
      const list = (Array.isArray(rows) ? rows : [])
        .filter(doc => !doc?.is_trashed && doc?.config && doc?.data)
        .sort((a, b) => {
          const ta = new Date(a.updated_at || a.created_at || 0).getTime();
          const tb = new Date(b.updated_at || b.created_at || 0).getTime();
          return tb - ta;
        });
      setDocs(list);
    } catch (err) {
      console.error("Unable to load saved reports:", err);
      setError(recentCopy.loadError || "Impossible de charger les rapports enregistrés.");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [recentCopy.loadError]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(doc => {
      const typeId = resolveReportTypeIdFromDocument(doc);
      const typeLabel = getReportTypeLabel(copy, typeId).toLowerCase();
      const hay = [
        doc.name,
        doc.client_name,
        doc.report_period,
        typeLabel,
        doc.user_email,
        doc.username
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [docs, query, copy]);

  const safePageSize = PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : 10;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(safePage * safePageSize, total);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * safePageSize, safePage * safePageSize),
    [filtered, safePage, safePageSize]
  );

  const refreshBtn = (
    <button
      type="button"
      className={`${kit.btnSquare} ${kit.btnSquareSecondary}`}
      onClick={() => loadDocs()}
      disabled={loading}
      aria-label={recentCopy.refresh || "Actualiser"}
    >
      <Icon icon={loading ? "line-md:loading-loop" : "mdi:refresh"} width={16} height={16} aria-hidden />
    </button>
  );

  return (
    <section className={styles.root} aria-label={recentCopy.title || "Rapports enregistrés"}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <h2 className={styles.title}>{recentCopy.title || "Rapports enregistrés"}</h2>
          <p className={styles.hint}>{recentCopy.hint || "Rouvrir un rapport pour le corriger dans le builder."}</p>
        </div>
      </header>

      <div className={styles.toolbarWrap}>
        <UiKitCrmListToolbar
          className={styles.toolbar}
          searchValue={query}
          onSearchChange={setQuery}
          onSearchClear={() => setQuery("")}
          searchPlaceholder={searchPlaceholder}
          searchAriaLabel={searchPlaceholder}
          clearSearchLabel={recentCopy.clearSearch || "Effacer la recherche"}
          searchPending={loading && !docs.length}
          extraActions={
            <SmartTooltip content={recentCopy.refresh || "Actualiser"}>
              {refreshBtn}
            </SmartTooltip>
          }
        />
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.tableStack}>
        {loading && !docs.length ? (
          <div className={styles.stateBox}>
            <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
            <span>{recentCopy.loading || "Chargement…"}</span>
          </div>
        ) : total === 0 ? (
          <div className={styles.emptyWrap}>
            <UiKitEmptyState
              bare
              icon="mdi:file-document-outline"
              title={recentCopy.empty || "Aucun rapport enregistré pour le moment."}
            />
          </div>
        ) : (
          <UiKitTable
            fill
            fadeTop
            fadeTopInset="2.85rem"
            className={`${tableKit.tableListFill} ${styles.roundedTable}`}
            deps={[paged.length, safePage, safePageSize, query]}
          >
            <table className={`${tableKit.table} ${tableKit.tableList} ${styles.table}`}>
              <thead>
                <tr>
                  <th>{recentCopy.colName || "Nom"}</th>
                  <th>{recentCopy.colType || "Type"}</th>
                  <th>{recentCopy.colUser || "Utilisateur"}</th>
                  <th>{recentCopy.colDate || "Date"}</th>
                  <th className={styles.actionsCol}>
                    <span className={styles.actionsHead}>{recentCopy.colActions || "Actions"}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map(doc => {
                  const typeId = resolveReportTypeIdFromDocument(doc);
                  const typeLabel = getReportTypeLabel(copy, typeId);
                  const when = formatDocDate(doc.updated_at || doc.created_at, copy?.bcp47);
                  const author = resolveAuthorLabel(doc);
                  const reopenLabel = recentCopy.reopen || recentCopy.edit || "Rouvrir";
                  return (
                    <tr
                      key={doc.id}
                      className={styles.dataRow}
                      onClick={() => onEditDocument?.(doc)}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onEditDocument?.(doc);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={recentCopy.openAria || reopenLabel}
                    >
                      <td>
                        <div className={styles.nameCell}>
                          <span className={styles.itemName} title={doc.name || ""}>
                            {doc.name || "—"}
                          </span>
                          {doc.client_name ? (
                            <span className={styles.itemSub} title={doc.client_name}>
                              {doc.client_name}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className={styles.itemType}>{typeLabel}</span>
                      </td>
                      <td>
                        <span className={styles.userCell} title={author}>
                          {author}
                        </span>
                      </td>
                      <td>
                        <span className={styles.dateCell}>{when}</span>
                      </td>
                      <td className={styles.actionsCol} onClick={e => e.stopPropagation()}>
                        <SmartTooltip content={reopenLabel}>
                          <button
                            type="button"
                            className={styles.editBtn}
                            onClick={() => onEditDocument?.(doc)}
                            aria-label={recentCopy.openAria || reopenLabel}
                          >
                            <Icon icon="mdi:pencil-outline" width={16} height={16} aria-hidden />
                            <span className={styles.editBtnLabel}>{reopenLabel}</span>
                          </button>
                        </SmartTooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </UiKitTable>
        )}

        <div className={`${kit.pagination} ${styles.pagination}`}>
          <div className={kit.paginationLeft}>
            <span className={kit.paginationLabel}>{common.perPage || "Par page"}</span>
            <select
              className={kit.paginationSelect}
              value={safePageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              aria-label={common.perPage || "Par page"}
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className={kit.paginationInfo}>
              {interpolate(common.rangeInfo || "{start}–{end} sur {total}", {
                start: String(rangeStart),
                end: String(rangeEnd),
                total: String(total)
              })}
            </span>
          </div>
          <div className={kit.paginationRight}>
            <button
              type="button"
              className={kit.pageBtn}
              onClick={() => setPage(safePage - 1)}
              disabled={safePage <= 1 || total === 0}
              aria-label={common.prevPage || "Précédent"}
            >
              <FaChevronLeft />
            </button>
            <span className={kit.paginationInfo}>
              {interpolate(common.pageInfo || "Page {page} / {totalPages}", {
                page: String(total === 0 ? 0 : safePage),
                totalPages: String(total === 0 ? 0 : totalPages)
              })}
            </span>
            <button
              type="button"
              className={kit.pageBtn}
              onClick={() => setPage(safePage + 1)}
              disabled={safePage >= totalPages || total === 0}
              aria-label={common.nextPage || "Suivant"}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
