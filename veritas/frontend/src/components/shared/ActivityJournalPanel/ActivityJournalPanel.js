import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import enterpriseDetailStyles from "../../EnterprisesPage/EnterpriseDetailPage.module.css";
import { ConfirmModal } from "../../AdminPage/AdminUi";
import EquipmentLogDetailModal from "../../EquipementPage/EquipmentLogDetailModal";
import { getLogActionDetails } from "../../EquipementPage/equipmentLogUtils";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { getLocaleTag } from "../../../i18n/locales";
import { createTrackedAbortController } from "../../../utils/pageLoadAbort";
import { getActivityJournalCopy, interpolate } from "./activityJournalI18n";
import styles from "./ActivityJournalPanel.module.css";

const DEFAULT_LIMIT = 25;

export default function ActivityJournalPanel({
  entityId,
  fetchLogs,
  purgeLogs = null,
  active = true,
  pageSize = DEFAULT_LIMIT,
  copy: copyOverride = null
}) {
  const locale = useAppLocale();
  const copy = useMemo(
    () => ({ ...getActivityJournalCopy(locale), ...(copyOverride || {}) }),
    [locale, copyOverride]
  );
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const controllerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDraft.trim()), 280);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const load = useCallback(
    async (nextPage = 1) => {
      if (!entityId || typeof fetchLogs !== "function") {
        setLogs([]);
        setTotal(0);
        return;
      }
      controllerRef.current?.abort();
      const controller = createTrackedAbortController();
      controllerRef.current = controller;
      setLoading(true);
      try {
        const data = await fetchLogs(nextPage, {
          signal: controller.signal,
          limit: pageSize,
          search
        });
        if (controller.signal.aborted || !mountedRef.current) return;
        const rows = Array.isArray(data?.logs) ? data.logs : [];
        const filtered = search
          ? rows.filter(row => {
              const haystack = [
                row.action,
                row.user_name,
                row.user,
                typeof row.details === "string" ? row.details : JSON.stringify(row.details || "")
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              return haystack.includes(search.toLowerCase());
            })
          : rows;
        setLogs(filtered);
        setTotal(Number(data?.total) || filtered.length || 0);
        setPage(nextPage);
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error("Error loading activity journal:", error);
        if (mountedRef.current) {
          setLogs([]);
          setTotal(0);
          toast.error(copy.loadError);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [entityId, fetchLogs, pageSize, search, copy.loadError]
  );

  useEffect(() => {
    if (!active) {
      controllerRef.current?.abort();
      return undefined;
    }
    load(1);
    return undefined;
  }, [active, entityId, search, load]);

  const handlePurge = async () => {
    if (typeof purgeLogs !== "function") return;
    setPurging(true);
    try {
      const result = await purgeLogs();
      const deleted = result?.logs_deleted ?? result?.deleted ?? total;
      toast.success(
        deleted > 0
          ? interpolate(copy.purgeSuccess, { count: deleted })
          : copy.purgeNone
      );
      setPurgeOpen(false);
      await load(1);
    } catch (error) {
      toast.error(error?.message || copy.purgeError);
    } finally {
      setPurging(false);
    }
  };

  const filtersActive = Boolean(search);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className={`${enterpriseDetailStyles.panel} ${styles.logsPanel}`.trim()}>
      <header className={enterpriseDetailStyles.panelHeader}>
        <div className={enterpriseDetailStyles.panelHeaderMain}>
          <h2 className={enterpriseDetailStyles.panelTitle}>
            <Icon icon="mdi:history" className={enterpriseDetailStyles.panelTitleIcon} aria-hidden />
            {copy.title}
          </h2>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>
      </header>

      <div className={`${enterpriseDetailStyles.panelBody} ${styles.logsPanelBody}`.trim()}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
            <input
              type="search"
              className={styles.searchInput}
              value={searchDraft}
              onChange={event => setSearchDraft(event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchAria}
            />
            {searchDraft ? (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setSearchDraft("")}
                aria-label={copy.clearSearch}
              >
                <Icon icon="mdi:close" aria-hidden />
              </button>
            ) : null}
          </div>
          {typeof purgeLogs === "function" ? (
            <button
              type="button"
              className={styles.purgeBtn}
              onClick={() => setPurgeOpen(true)}
              disabled={loading || purging || total === 0}
              title={copy.purgeTitle}
            >
              <Icon icon="mdi:delete-sweep" aria-hidden />
              {copy.purge}
            </button>
          ) : null}
        </div>

        <div className={styles.tableFill}>
          {loading ? (
            <div className={styles.loadingState}>{copy.loading}</div>
          ) : logs.length === 0 ? (
            <div className={styles.emptyState}>
              <Icon icon="mdi:history" className={styles.emptyIcon} aria-hidden />
              <h5>{filtersActive ? copy.emptyFiltered : copy.empty}</h5>
              <p className={styles.emptyHint}>
                {filtersActive ? copy.emptyFilteredHint : copy.emptyHint}
              </p>
            </div>
          ) : (
            <div className={`${enterpriseDetailStyles.dataTableWrapper} ${styles.tableWrapper}`.trim()}>
              <table className={`${enterpriseDetailStyles.dataTable} ${styles.table}`.trim()}>
                <thead>
                  <tr>
                    <th>{copy.colAction}</th>
                    <th>{copy.colUser}</th>
                    <th>{copy.colDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => {
                    const meta = getLogActionDetails(log);
                    const userLabel = log.user_name || log.user || copy.systemUser;
                    const when = log.created_at || log.timestamp;
                    return (
                      <tr
                        key={log.id || `${when}-${index}`}
                        className={enterpriseDetailStyles.dataTableRowClickable}
                        onClick={() => setSelectedLog(log)}
                        title={copy.detailTitle}
                      >
                        <td>
                          <span className={styles.actionInline} style={{ color: meta.color }}>
                            <Icon icon={meta.icon} aria-hidden />
                            {log.action || meta.label}
                          </span>
                        </td>
                        <td>{userLabel}</td>
                        <td className={styles.dateCell}>
                          {when
                            ? new Date(when).toLocaleString(getLocaleTag(locale), {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > pageSize ? (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.paginationButton}
              onClick={() => load(page - 1)}
              disabled={page <= 1 || loading}
              aria-label={copy.prevPage}
            >
              <Icon icon="mdi:chevron-left" aria-hidden />
            </button>
            <span className={styles.paginationInfo}>
              {interpolate(copy.pagination, {
                page,
                pages: totalPages,
                total
              })}
            </span>
            <button
              type="button"
              className={styles.paginationButton}
              onClick={() => load(page + 1)}
              disabled={page >= totalPages || loading}
              aria-label={copy.nextPage}
            >
              <Icon icon="mdi:chevron-right" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {selectedLog ? (
        <EquipmentLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      ) : null}

      <ConfirmModal
        open={purgeOpen}
        title={copy.purgeConfirmTitle}
        message={interpolate(copy.purgeConfirmMessage, { count: total })}
        icon="mdi:delete-alert-outline"
        confirmLabel={copy.purge}
        confirmVariant="dangerSolid"
        confirmLoading={purging}
        onConfirm={handlePurge}
        onClose={() => {
          if (!purging) setPurgeOpen(false);
        }}
      />
    </section>
  );
}
