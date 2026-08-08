import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { fetchTicketSatisfactions } from "../../api/tickets";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./TicketPage.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { computeSatisfactionAverage, resolveDisplayRatings } from "../../utils/ticketSatisfactionCriteria";
import { getTicketSatisfactionCriteria } from "../../i18n/ticketSatisfactionCriteriaI18n";
import { SATISFACTION_SENTIMENT_FILTERS, formatSatisfactionDate, getSatisfactionSentiment } from "../../utils/ticketSatisfactionUi";
function SatisfactionStars({
  rating
}) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return <span className={styles.satisfactionStarsInline} aria-label={`${safeRating} sur 5`}>
      {[1, 2, 3, 4, 5].map(star => <Icon key={star} icon={star <= safeRating ? "mdi:star" : "mdi:star-outline"} className={star <= safeRating ? styles.satisfactionStarActive : styles.satisfactionStarMuted} aria-hidden />)}
    </span>;
}
function SentimentBadge({
  averageRating
}) {
  const sentiment = getSatisfactionSentiment(averageRating);
  return <span className={`${styles.satisfactionSentimentBadge} ${styles[`satisfactionSentiment_${sentiment.tone}`]}`}>
      {sentiment.label}
    </span>;
}
export default function TicketSatisfactionsPanel({
  scope = "mine",
  onNavigate,
  leadingToolbarContent = null
}) {
  const locale = useAppLocale();
  const satisfactionCriteria = useMemo(() => getTicketSatisfactionCriteria(locale), [locale]);
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const searchRef = useRef(0);
  const loadItems = useCallback(async () => {
    const requestId = searchRef.current + 1;
    searchRef.current = requestId;
    setLoading(true);
    try {
      const result = await fetchTicketSatisfactions({
        scope,
        search,
        sentiment,
        sortBy,
        sortDirection,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      });
      if (requestId !== searchRef.current) return;
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotalCount(Number(result?.total) || 0);
    } catch (error) {
      if (requestId !== searchRef.current) return;
      toast.error(error.message || "Unable to load customer feedback.");
      setItems([]);
      setTotalCount(0);
    } finally {
      if (requestId === searchRef.current) setLoading(false);
    }
  }, [scope, search, sentiment, sortBy, sortDirection, pageSize, currentPage]);
  useEffect(() => {
    setCurrentPage(1);
  }, [scope, search, sentiment, sortBy, sortDirection, pageSize]);
  useEffect(() => {
    loadItems();
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
  return <>
      <div className={`${layout.toolbar} ${styles.toolbarGrow}`}>
        {leadingToolbarContent}
        <div className={`${layout.searchWrap} ${styles.searchWrapFull}`}>
          <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
          <input type="text" inputMode="search" className={layout.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder="Ticket, client, comment…" aria-label="Search client feedback" />
          {search ? <button type="button" className={layout.clearButton} onClick={() => setSearch("")} aria-label="Clear search">
              <FaTimes />
            </button> : null}
        </div>
        <span className={layout.toolbarMeta}>
          {totalCount} feedback{totalCount > 1 ? "s" : ""}
        </span>
        <select className={layout.sortSelect} value={sentiment} onChange={e => setSentiment(e.target.value)} aria-label="Filter by sentiment">
          {SATISFACTION_SENTIMENT_FILTERS.map(item => <option key={item.key || "all"} value={item.key}>
              {item.label}
            </option>)}
        </select>
      </div>

      {loading ? <div className={layout.stateBox}>
          <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
          <span>Loading client feedback…</span>
        </div> : totalCount === 0 ? <div className={layout.emptyState}>
          <Icon icon="mdi:star-outline" className={layout.emptyStateIcon} aria-hidden />
          <p className={layout.emptyStateTitle}>No client feedback</p>
          <p className={layout.emptyStateHint}>
            {scope === "mine" ? "Ratings left on your tickets will appear here." : "No rating matches your filters."}
          </p>
        </div> : <>
          <div className={styles.tablePanel}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort("ticket_number")}>
                      Ticket{getSortIndicator("ticket_number")}
                    </th>
                    <th>Company</th>
                    <th>Assignee</th>
                    <th onClick={() => handleSort("rating")}>
                      Note{getSortIndicator("rating")}
                    </th>
                    <th>Sentiment</th>
                    <th>Criteria</th>
                    <th>Comment</th>
                    <th>Auteur</th>
                    <th onClick={() => handleSort("created_at")}>
                      Date{getSortIndicator("created_at")}
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
                          <span className={styles.satisfactionTicketTitle}>{ticket.title || "Sans titre"}</span>
                        </td>
                        <td>{ticket.clientName || "-"}</td>
                        <td>{resolveAssigneesLabel(row)}</td>
                        <td>
                          <div className={styles.satisfactionRatingCell}>
                            <SatisfactionStars rating={average} />
                            <strong>{average}/5</strong>
                          </div>
                        </td>
                        <td>
                          <SentimentBadge averageRating={average} />
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
                        <td>{row.authorName || "Client"}</td>
                        <td>{formatSatisfactionDate(row.createdAt)}</td>
                      </tr>;
              })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={layout.pagination}>
            <div className={layout.paginationLeft}>
              <span className={layout.paginationLabel}>Par page</span>
              <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))} aria-label="Nombre de lignes par page">
                {[10, 25, 50, 100].map(size => <option key={size} value={size}>
                    {size}
                  </option>)}
              </select>
            </div>
            <div className={layout.paginationRight}>
              <button type="button" className={layout.pageBtn} disabled={currentPage <= 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))} aria-label="Previous page">
                <FaChevronLeft />
              </button>
              <span className={layout.paginationInfo}>
                Page {currentPage} / {totalPages} · {totalCount} feedback{totalCount > 1 ? "s" : ""}
              </span>
              <button type="button" className={layout.pageBtn} disabled={currentPage >= totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} aria-label="Next page">
                <FaChevronRight />
              </button>
            </div>
          </div>
        </>}
    </>;
}
