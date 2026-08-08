import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { FaPlus, FaTimes } from "react-icons/fa";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchPortalTickets } from "../../api/clientPortalTickets";
import { showError } from "../../utils/toast";
import portalLayout from "./ClientDashboard.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import tableStyles from "../TicketPage/TicketPage.module.css";
import portalStyles from "./ClientPortalTickets.module.css";
import { getClientPortalCopy } from "./clientPortalI18n";
import { getPortalPriorityVisual, getPortalStatusFilters, getPortalTicketActionRequiredBadge, isPortalTicketActionRequired, isPortalTicketPendingClientResponse, isPortalTicketPendingValidation, sortPortalTickets } from "./clientPortalTicketUi";
function computePortalStatusCounts(tickets, openStatuses) {
  const rows = Array.isArray(tickets) ? tickets : [];
  return {
    action_required: rows.filter(isPortalTicketActionRequired).length,
    open: rows.filter(ticket => openStatuses.has(ticket.status) && !isPortalTicketPendingClientResponse(ticket)).length,
    all: rows.length,
    resolved: rows.filter(ticket => ticket.status === "resolved" && !isPortalTicketPendingValidation(ticket)).length,
    closed: rows.filter(ticket => ticket.status === "closed").length
  };
}
function filterTicketsByStatus(tickets, filterKey, openStatuses) {
  const rows = Array.isArray(tickets) ? tickets : [];
  switch (filterKey) {
    case "action_required":
      return rows.filter(isPortalTicketActionRequired);
    case "open":
      return rows.filter(ticket => openStatuses.has(ticket.status) && !isPortalTicketPendingClientResponse(ticket));
    case "resolved":
      return rows.filter(ticket => ticket.status === "resolved" && !isPortalTicketPendingValidation(ticket));
    case "closed":
      return rows.filter(ticket => ticket.status === "closed");
    default:
      return rows;
  }
}
export default function ClientTicketListPage() {
  const navigate = useNavigate();
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.ticket.list;
  const statusFilters = useMemo(() => getPortalStatusFilters(copy), [copy]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("open");
  const [autoFilterApplied, setAutoFilterApplied] = useState(false);
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  useEffect(() => {
    setLoading(true);
    fetchPortalTickets({
      limit: 200
    }).then(rows => setTickets(Array.isArray(rows) ? rows : [])).catch(err => {
      setTickets([]);
      showError(err.message || t.loadError);
    }).finally(() => setLoading(false));
  }, [t.loadError]);
  const statusCounts = useMemo(() => computePortalStatusCounts(tickets, copy.PORTAL_OPEN_STATUSES), [tickets, copy.PORTAL_OPEN_STATUSES]);
  useEffect(() => {
    if (autoFilterApplied || loading) return;
    if (statusCounts.action_required > 0) {
      setFilter("action_required");
    }
    setAutoFilterApplied(true);
  }, [autoFilterApplied, loading, statusCounts.action_required]);
  const filteredByStatus = useMemo(() => filterTicketsByStatus(tickets, filter, copy.PORTAL_OPEN_STATUSES), [tickets, filter, copy.PORTAL_OPEN_STATUSES]);
  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return filteredByStatus;
    return filteredByStatus.filter(ticket => {
      const label = `#${ticket.ticket_number || ticket.id} ${ticket.title || ""}`.toLowerCase();
      return label.includes(query);
    });
  }, [filteredByStatus, search]);
  const sortedTickets = useMemo(() => sortPortalTickets(filteredTickets, sortBy, sortDirection, copy), [filteredTickets, sortBy, sortDirection, copy]);
  const handleSort = column => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  };
  const getSortIndicator = column => {
    if (sortBy !== column) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  };
  const getColumnAriaSort = column => {
    if (sortBy !== column) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  };
  const totalCount = sortedTickets.length;
  return <div className={`${portalLayout.mainScrollFill} ${layout.page}`}>
      <div className={`${portalLayout.portalShell} ${tableStyles.ticketShell}`}>
        <header className={layout.hero}>
          <div className={layout.heroText}>
            <p className={layout.eyebrow}>
              <Icon icon="mdi:lifebuoy" aria-hidden />
              {t.eyebrow}
            </p>
            <h1 className={layout.pageTitle}>{t.pageTitle}</h1>
            <p className={layout.pageSubtitle}>
              {loading ? t.loading : copy.formatTicketCount(totalCount)}
            </p>
          </div>
          <div className={layout.heroActions}>
            <Link to="/client/tickets/new" className={`${layout.primaryBtn} ${layout.primaryBtnIconOnly}`} aria-label={t.newTicketAria}>
              <FaPlus />
            </Link>
          </div>
        </header>

        {!loading ? <div className={tableStyles.kpiRow4}>
            {statusFilters.map(item => {
          const count = statusCounts[item.key] || 0;
          const active = filter === item.key;
          return <button key={item.key} type="button" className={`${layout.kpiCard} ${active ? layout.kpiCardActive : ""} ${count === 0 ? layout.kpiCardDisabled : ""}`.trim()} onClick={() => setFilter(item.key)} disabled={count === 0} aria-pressed={active}>
                  <div className={`${layout.kpiIconWrap} ${layout[`kpiIcon_${item.kpiTone}`] || layout.kpiIcon_blue}`}>
                    <Icon icon={item.icon} aria-hidden />
                  </div>
                  <div className={layout.kpiBody}>
                    <span className={layout.kpiValue}>{count}</span>
                    <span className={layout.kpiLabel}>{item.label}</span>
                  </div>
                </button>;
        })}
          </div> : null}

        <div className={tableStyles.mainColumn}>
          <div className={`${layout.toolbar} ${tableStyles.toolbarGrow}`}>
            <div className={`${layout.searchWrap} ${tableStyles.searchWrapFull}`}>
              <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
              <input type="text" inputMode="search" className={layout.searchInput} placeholder={t.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} aria-label={t.searchAria} />
              {search ? <button type="button" className={layout.clearButton} onClick={() => setSearch("")} aria-label={t.clearSearchAria}>
                  <FaTimes />
                </button> : null}
            </div>
            <span className={layout.toolbarMeta}>{copy.formatTicketCount(totalCount)}</span>
          </div>

          {loading ? <div className={layout.stateBox}>
              <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
              <span>{t.loading}</span>
            </div> : totalCount === 0 ? <div className={layout.emptyState}>
              <Icon icon="mingcute:ticket-fill" className={layout.emptyStateIcon} aria-hidden />
              <p className={layout.emptyStateTitle}>{t.emptyTitle}</p>
              <p className={layout.emptyStateHint}>{t.emptyHint}</p>
              <Link to="/client/tickets/new" className={layout.primaryBtn}>
                <Icon icon="mdi:plus" aria-hidden />
                {t.newTicket}
              </Link>
            </div> : <div className={tableStyles.tablePanel}>
              <div className={tableStyles.tableScroll}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th scope="col" aria-sort={getColumnAriaSort("ticket_number")} onClick={() => handleSort("ticket_number")}>
                        {t.tableId}
                        {getSortIndicator("ticket_number")}
                      </th>
                      <th scope="col" aria-sort={getColumnAriaSort("title")} onClick={() => handleSort("title")}>
                        {t.tableSubject}
                        {getSortIndicator("title")}
                      </th>
                      <th scope="col" aria-sort={getColumnAriaSort("channel")} onClick={() => handleSort("channel")}>
                        {t.tableChannel}
                        {getSortIndicator("channel")}
                      </th>
                      <th scope="col" aria-sort={getColumnAriaSort("type")} onClick={() => handleSort("type")}>
                        {t.tableType}
                        {getSortIndicator("type")}
                      </th>
                      <th scope="col" aria-sort={getColumnAriaSort("status")} onClick={() => handleSort("status")}>
                        {t.tableStatus}
                        {getSortIndicator("status")}
                      </th>
                      <th scope="col" aria-sort={getColumnAriaSort("priority")} onClick={() => handleSort("priority")}>
                        {t.tablePriority}
                        {getSortIndicator("priority")}
                      </th>
                      <th scope="col" aria-sort={getColumnAriaSort("created_at")} onClick={() => handleSort("created_at")}>
                        {t.tableCreated}
                        {getSortIndicator("created_at")}
                      </th>
                      <th scope="col" aria-sort={getColumnAriaSort("updated_at")} onClick={() => handleSort("updated_at")}>
                        {t.tableUpdated}
                        {getSortIndicator("updated_at")}
                      </th>
                      <th scope="col" aria-sort={getColumnAriaSort("rating")} onClick={() => handleSort("rating")}>
                        {t.tableRating}
                        {getSortIndicator("rating")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTickets.map(ticket => {
                  const priorityVisual = getPortalPriorityVisual(ticket.priority, copy);
                  const channelMeta = copy.getChannelMeta(ticket.channel);
                  const actionBadge = getPortalTicketActionRequiredBadge(ticket, copy);
                  const ratingLabel = ticket.hasSatisfaction ? t.rated : t.notRated;
                  return <tr key={ticket.id} onClick={() => navigate(`/client/tickets/${ticket.id}`)} tabIndex={0} onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/client/tickets/${ticket.id}`);
                    }
                  }} role="link" aria-label={copy.formatOpenTicketAria(ticket.ticket_number || ticket.id)}>
                          <td>
                            <span className={tableStyles.ticketIdCell}>
                              #{ticket.ticket_number || ticket.id}
                            </span>
                          </td>
                          <td>
                            <span className={tableStyles.subjectCell}>
                              <span className={tableStyles.subjectCellText}>
                                {ticket.title || copy.common.noTitle}
                              </span>
                            </span>
                          </td>
                          <td>
                            <span className={tableStyles.channelCell} title={channelMeta.label}>
                              <Icon icon={channelMeta.icon} className={tableStyles.channelIcon} aria-hidden />
                            </span>
                          </td>
                          <td>{copy.getTicketTypeLabel(ticket.type)}</td>
                          <td>
                            {actionBadge ? <span className={portalStyles.validationPendingBadge}>
                                {actionBadge.label}
                              </span> : <span className={tableStyles.statusBadge}>
                                {copy.getTicketStatus(ticket.status)}
                              </span>}
                          </td>
                          <td>
                            <span className={tableStyles.priorityIndicator} title={priorityVisual.label} aria-label={priorityVisual.label}>
                              <Icon icon={priorityVisual.icon} aria-hidden />
                            </span>
                          </td>
                          <td>{copy.formatPortalDateTime(ticket.created_at)}</td>
                          <td>{copy.formatPortalDateTime(ticket.updated_at)}</td>
                          <td>
                            <span className={`${portalStyles.evaluationCell} ${ticket.hasSatisfaction ? portalStyles.evaluationCellRated : ""}`.trim()} title={ratingLabel} aria-label={ratingLabel}>
                              <Icon icon={ticket.hasSatisfaction ? "mdi:star" : "mdi:star-outline"} aria-hidden />
                            </span>
                          </td>
                        </tr>;
                })}
                  </tbody>
                </table>
              </div>
            </div>}
        </div>
      </div>
    </div>;
}
