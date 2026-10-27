import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import enterpriseDetailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import styles from "./EquipmentDetailPage.module.css";
import equipStyles from "./EquipmentPage.module.css";
import EquipmentDateRangeFilter from "./EquipmentDateRangeFilter";
import EquipmentEmptyState from "./EquipmentEmptyState";
import { buildActivityFeedItems, getLocaleDateTimeFormat } from "./equipmentActivityUtils";

function ActivityKindBadge({ kind, copy }) {
  const isTicket = kind === "ticket";
  return (
    <span className={`${styles.activityKindBadge} ${isTicket ? styles.activityKindTicket : styles.activityKindPlanning}`}>
      <Icon icon={isTicket ? "mdi:ticket-outline" : "mdi:calendar-clock"} aria-hidden />
      {isTicket ? copy?.activity?.kindTicket : copy?.activity?.kindPlanning}
    </span>
  );
}

function TicketStatusBadge({ status, copy }) {
  const key = String(status || "").toLowerCase() === "open" ? "new" : String(status || "").toLowerCase();
  const label = copy?.activity?.status?.[key] || status || "-";
  return <span className={`${styles.activityStatusBadge} ${styles[`activityStatus_${key}`] || ""}`}>{label}</span>;
}

export default function EquipmentEventsPanel({
  copy,
  locale,
  loading,
  activity,
  datePreset,
  onDatePresetChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  onOpenPlanningEvent,
  onOpenTicket,
  hideDateFilter = false,
  embedded = false
}) {
  const localeCode = getLocaleDateTimeFormat(locale);
  const [searchQuery, setSearchQuery] = useState("");
  const feedItems = useMemo(
    () =>
      buildActivityFeedItems({
        events: activity?.events,
        tickets: activity?.tickets,
        copy
      }),
    [activity?.events, activity?.tickets, copy]
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return feedItems;
    return feedItems.filter(item => {
      const haystack = [item.title, item.subtitle, item.status, item.kind]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [feedItems, searchQuery]);

  const formatDate = value => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString(localeCode, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const isEmpty = !loading && feedItems.length === 0;
  const noMatch = !loading && feedItems.length > 0 && filteredItems.length === 0;
  const searchPlaceholder =
    copy?.events?.searchPlaceholder || "Rechercher un événement ou ticket…";
  const searchAria = copy?.events?.searchAria || searchPlaceholder;
  const noMatchLabel = (copy?.events?.noMatch || "Aucun résultat pour « {query} »").replace(
    "{query}",
    searchQuery.trim()
  );

  const rootClass = embedded
    ? `${styles.activityEmbeddedSection} ${styles.activityEventsSection}`.trim()
    : enterpriseDetailStyles.panel;

  return (
    <section className={rootClass}>
      <header className={embedded ? styles.activityEmbeddedHeader : enterpriseDetailStyles.panelHeader}>
        <div className={enterpriseDetailStyles.panelHeaderMain}>
          <h2 className={embedded ? styles.activityEmbeddedTitle : enterpriseDetailStyles.panelTitle}>
            {copy.events.title}
          </h2>
        </div>
      </header>

      <div className={`${embedded ? styles.activityEmbeddedBody : enterpriseDetailStyles.panelBody} ${styles.eventsPanelBody}`.trim()}>
        {!hideDateFilter ? (
          <EquipmentDateRangeFilter
            copy={copy}
            preset={datePreset}
            onPresetChange={onDatePresetChange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={onCustomStartChange}
            onCustomEndChange={onCustomEndChange}
          />
        ) : null}

        <div className={styles.eventsToolbar}>
          <div className={equipStyles.embeddedSearchWrap}>
            <div className={equipStyles.embeddedSearchBox}>
              <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
              <input
                type="search"
                className={equipStyles.embeddedSearchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchAria}
                disabled={loading}
              />
              {searchQuery ? (
                <button
                  type="button"
                  className={equipStyles.embeddedSearchClear}
                  onClick={() => setSearchQuery("")}
                  aria-label={copy?.events?.clearSearch || "Effacer"}
                >
                  <Icon icon="mdi:close" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingState}>{copy.loading}</div>
        ) : isEmpty ? (
          <EquipmentEmptyState
            className={styles.eventsEmptyFill}
            icon="mdi:calendar-outline"
            title={copy.events.emptyTitle || "Aucun événement ni ticket"}
            subtitle={
              copy.events.emptyHint ||
              "Planifiez une intervention ou consultez les tickets liés à ce matériel sur la période choisie."
            }
          />
        ) : noMatch ? (
          <EquipmentEmptyState
            className={styles.eventsEmptyFill}
            icon="mdi:file-search-outline"
            title={noMatchLabel}
          />
        ) : (
          <div className={`${enterpriseDetailStyles.dataTableWrapper} ${styles.eventsTableWrap}`.trim()}>
            <table className={enterpriseDetailStyles.dataTable}>
              <thead>
                <tr>
                  <th>{copy.activity.colKind}</th>
                  <th>{copy.events.colTitle}</th>
                  <th>{copy.activity.colStatus}</th>
                  <th>{copy.events.colDate}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr
                    key={item.id}
                    className={styles.activityRowClickable}
                    onClick={() => {
                      if (item.kind === "ticket") onOpenTicket?.(item.raw);
                      else onOpenPlanningEvent?.(item.raw);
                    }}
                    onKeyDown={e => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      if (item.kind === "ticket") onOpenTicket?.(item.raw);
                      else onOpenPlanningEvent?.(item.raw);
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <td>
                      <ActivityKindBadge kind={item.kind} copy={copy} />
                    </td>
                    <td>
                      <div className={styles.activityTitleCell}>
                        <span>{item.title}</span>
                        {item.subtitle ? <span className={styles.activitySubtitle}>{item.subtitle}</span> : null}
                      </div>
                    </td>
                    <td>
                      {item.kind === "ticket" ? (
                        <TicketStatusBadge status={item.status} copy={copy} />
                      ) : (
                        <span className={styles.activityMetaMuted}>{item.subtitle || "-"}</span>
                      )}
                    </td>
                    <td className={styles.eventMetaCell}>{formatDate(item.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
