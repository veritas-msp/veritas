import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { fetchTicketSatisfied } from "../../api/tickets";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./TicketPage.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { computeSatisfactionAverage, resolveDisplayRatings } from "../../utils/ticketSatisfactionCriteria";
import { getTicketSatisfactionCriteria } from "../../i18n/ticketSatisfactionCriteriaI18n";
import { formatSatisfactionDate, getSatisfactionSentiment, getSatisfactionSentimentFilters } from "../../utils/ticketSatisfactionUi";
import { getTicketPageCopy } from "./ticketPageI18n";

const LOCALE_BCP47 = {
  fr: "fr-FR",
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};

function SatisfactionStars({
  rating,
  starsAriaTemplate
}) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return <span className={styles.satisfactionStarsInline} aria-label={interpolate(starsAriaTemplate || "{rating}/5", {
    rating: String(safeRating)
  })}>
      {[1, 2, 3, 4, 5].map(star => <Icon key={star} icon={star <= safeRating ? "mdi:star" : "mdi:star-outline"} className={star <= safeRating ? styles.satisfactionStarActive : styles.satisfactionStarMuted} aria-hidden />)}
    </span>;
}
function SentimentBadge({
  averageRating,
  sentimentLabels
}) {
  const sentiment = getSatisfactionSentiment(averageRating, sentimentLabels);
  return <span className={`${styles.satisfactionSentimentBadge} ${styles[`satisfactionSentiment_${sentiment.tone}`]}`}>
      {sentiment.label}
    </span>;
}
export default function TicketSatisfiedPanel({
  scope = "mine",
  onNavigate,
  leadingToolbarContent = null
}) {
  const locale = useAppLocale();
  const pageCopy = useMemo(() => getTicketPageCopy(locale), [locale]);
  const sp = pageCopy.satisfiedPanel || {};
  const satisfactionCriteria = useMemo(() => getTicketSatisfactionCriteria(locale), [locale]);
  const sentimentFilters = useMemo(() => getSatisfactionSentimentFilters(sp.sentiments || {}), [sp.sentiments]);
  const localeTag = LOCALE_BCP47[locale] || "fr-FR";
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const searchAbortRef = useRef(null);
  const formatFeedbackCount = count => interpolate(Number(count) === 1 ? sp.feedbackCount : sp.feedbackCountPlural, {
    count: String(count)
  });
  const loadItems = useCallback(async () => {
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setLoading(true);
    try {
      const result = await fetchTicketSatisfied({
        scope,
        search,
        sentiment,
        sortBy,
        sortDirection,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      }, {
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotalCount(Number(result?.total) || 0);
    } catch (error) {
      if (error?.name === "AbortError" || controller.signal.aborted) return;
      toast.error(error.message || sp.loadError || "Unable to load customer feedback.");
      setItems([]);
      setTotalCount(0);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [scope, search, sentiment, sortBy, sortDirection, pageSize, currentPage, sp.loadError]);
  useEffect(() => {
    setCurrentPage(1);
  }, [scope, search, sentiment, sortBy, sortDirection, pageSize]);
  useEffect(() => {
    loadItems();
    return () => searchAbortRef.current?.abort();
  }, [loadItems]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const handleSort = column => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection("desc");
  };
  const getSortIndicator = column => {
    if (sortBy !== column) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  };
  const resolveAssigneesLabel = row => {
    const assignees = Array.isArray(row.assignees) ? row.assignees : [];
    if (assignees.length > 0) {
      const labels = assignees.map(item => item.name).filter(Boolean);
      if (labels.length > 0) return labels.join(", ");
    }
    return row.ticket?.assignedUserName || "-";
  };
  const columns = sp.columns || {};
  return <>
      <div className={`${layout.toolbar} ${styles.toolbarGrow}`}>
        {leadingToolbarContent}
        <div className={`${layout.searchWrap} ${styles.searchWrapFull}`}>
          <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
          <input type="text" inputMode="search" className={layout.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder={sp.searchPlaceholder} aria-label={sp.searchAria} />
          {search ? <button type="button" className={layout.clearButton} onClick={() => setSearch("")} aria-label={sp.clearSearchAria}>
              <FaTimes />
            </button> : null}
        </div>
        <span className={layout.toolbarMeta}>
          {formatFeedbackCount(totalCount)}
        </span>
        <select className={layout.sortSelect} value={sentiment} onChange={e => setSentiment(e.target.value)} aria-label={sp.sentimentFilterAria}>
          {sentimentFilters.map(item => <option key={item.key || "all"} value={item.key}>
              {item.label}
            </option>)}
        </select>
      </div>

      {loading ? <div className={layout.stateBox}>
          <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
          <span>{sp.loading}</span>
        </div> : totalCount === 0 ? <div className={layout.emptyState}>
          <Icon icon="mdi:star-outline" className={layout.emptyStateIcon} aria-hidden />
          <p className={layout.emptyStateTitle}>{sp.emptyTitle}</p>
          <p className={layout.emptyStateHint}>
            {scope === "mine" ? sp.emptyMine : sp.emptyFiltered}
          </p>
        </div> : <>
          <div className={styles.tablePanel}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort("ticket_number")}>
                      {columns.ticket}{getSortIndicator("ticket_number")}
                    </th>
                    <th>{columns.company}</th>
                    <th>{columns.assignee}</th>
                    <th onClick={() => handleSort("rating")}>
                      {columns.rating}{getSortIndicator("rating")}
                    </th>
                    <th>{columns.sentiment}</th>
                    <th>{columns.criteria}</th>
                    <th>{columns.comment}</th>
                    <th>{columns.author}</th>
                    <th onClick={() => handleSort("created_at")}>
                      {columns.date}{getSortIndicator("created_at")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(row => {
                const ratings = resolveDisplayRatings(row);
                const average = row.averageRating ?? computeSatisfactionAverage(ratings);
                const ticket = row.ticket || {};
                return <tr key={row.id} className={styles.satisfactionRow} onClick={() => onNavigate?.("TicketDetail", {
                  ticketId: ticket.id,
                  ticketNumber: ticket.ticketNumber,
                  title: ticket.title
                })} tabIndex={0} onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onNavigate?.("TicketDetail", {
                      ticketId: ticket.id,
                      ticketNumber: ticket.ticketNumber,
                      title: ticket.title
                    });
                  }
                }} role="link">
                        <td>
                          <span className={styles.ticketIdCell}>#{ticket.ticketNumber || "-"}</span>
                          <span className={styles.satisfactionTicketTitle}>{ticket.title || sp.untitled}</span>
                        </td>
                        <td>{ticket.clientName || "-"}</td>
                        <td>{resolveAssigneesLabel(row)}</td>
                        <td>
                          <div className={styles.satisfactionRatingCell}>
                            <SatisfactionStars rating={average} starsAriaTemplate={sp.starsAria} />
                            <strong>{average}/5</strong>
                          </div>
                        </td>
                        <td>
                          <SentimentBadge averageRating={average} sentimentLabels={sp.sentiments} />
                        </td>
                        <td>
                          <div className={styles.satisfactionCriteriaCompact}>
                            {satisfactionCriteria.map(({
                        key,
                        label
                      }) => <span key={key} title={label}>
                                {label.split(" ")[0]} {ratings?.[key] ?? "-"}/5
                              </span>)}
                          </div>
                        </td>
                        <td>
                          <span className={styles.satisfactionMessageCell}>
                            {row.message?.trim() ? row.message.trim() : "-"}
                          </span>
                        </td>
                        <td>{row.authorName || sp.clientFallback}</td>
                        <td>{formatSatisfactionDate(row.createdAt, localeTag)}</td>
                      </tr>;
              })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={layout.pagination}>
            <div className={layout.paginationLeft}>
              <span className={layout.paginationLabel}>{sp.perPage}</span>
              <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))} aria-label={sp.perPageAria}>
                {[10, 25, 50, 100].map(size => <option key={size} value={size}>
                    {size}
                  </option>)}
              </select>
            </div>
            <div className={layout.paginationRight}>
              <button type="button" className={layout.pageBtn} disabled={currentPage <= 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))} aria-label={sp.prevPageAria}>
                <FaChevronLeft />
              </button>
              <span className={layout.paginationInfo}>
                {interpolate(sp.pageInfo || "Page {page} / {total} · {count}", {
              page: String(currentPage),
              total: String(totalPages),
              count: formatFeedbackCount(totalCount)
            })}
              </span>
              <button type="button" className={layout.pageBtn} disabled={currentPage >= totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} aria-label={sp.nextPageAria}>
                <FaChevronRight />
              </button>
            </div>
          </div>
        </>}
    </>;
}
