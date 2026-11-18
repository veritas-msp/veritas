import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { getEquipmentLogs } from "../../api/equipment";
import { parseCustomFamilyType } from "../../api/equipmentFamilies";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getLocaleTag } from "../../i18n/locales";
import EquipmentLogDetailModal from "./EquipmentLogDetailModal";
import { parseLogDetails } from "./equipmentLogUtils";
import { getActivityJournalCopy } from "../shared/ActivityJournalPanel/activityJournalI18n";
import { UiKitEmptyState } from "../UiKit";
import rmmStyles from "./RmmMonitoringPanel.module.css";
import styles from "./RmmAgentHistoryPanel.module.css";

const PAGE_SIZE = 40;

function resolveDirection(log) {
  const details = parseLogDetails(log) || {};
  const kind = String(details.kind || "");
  const source = String(details.source || "").toLowerCase();
  if (
    source === "console" ||
    kind.endsWith("_request") ||
    kind.endsWith("_cancel") ||
    kind === "rmm_sync_request" ||
    kind === "rmm_sync_cancel" ||
    kind === "rmm_heartbeat_request"
  ) {
    return "outbound";
  }
  return "inbound";
}

function resolveKindIcon(kind, direction) {
  switch (kind) {
    case "rmm_full_sync":
      return "mdi:database-sync-outline";
    case "rmm_sync_request":
      return "mdi:cloud-download-outline";
    case "rmm_sync_cancel":
      return "mdi:close-circle-outline";
    case "rmm_heartbeat_request":
      return "mdi:heart-flash";
    case "rmm_heartbeat":
      return "mdi:heart-pulse";
    case "rmm_agent_update":
    case "rmm_agent_update_request":
    case "rmm_agent_update_cancel":
      return "mdi:package-up";
    default:
      return direction === "outbound" ? "mdi:arrow-right-bold-outline" : "mdi:arrow-left-bold-outline";
  }
}

function formatWhen(value, locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return date.toLocaleString(getLocaleTag(locale) || undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    return date.toLocaleString();
  }
}

function summarizeLog(log, copy) {
  const details = parseLogDetails(log) || {};
  const kind = String(details.kind || "");
  const bits = [];
  if (kind === "rmm_heartbeat" && details.heartbeatCount > 1) {
    bits.push(
      (copy.countSignals || "{count} signaux / 1 h").replace("{count}", String(details.heartbeatCount))
    );
  }
  if (details.agentVersion) {
    bits.push(`${copy.version || "v"}${details.agentVersion}`);
  }
  if (details.mode === "full") bits.push(copy.modeFull || "sync complet");
  if (details.mode === "light") bits.push(copy.modeLight || "léger");
  if (details.syncRequested) bits.push(copy.serverTriggered || "déclenché serveur");
  if (details.cpuUsagePct != null) bits.push(`CPU ${details.cpuUsagePct}%`);
  if (details.ramUsagePct != null) bits.push(`RAM ${details.ramUsagePct}%`);
  if (details.loggedUser) bits.push(details.loggedUser);
  return bits.filter(Boolean).join(" · ");
}

export default function RmmAgentHistoryPanel({
  equipment = null,
  equipmentDbId = null,
  active = true,
  copy = {}
}) {
  const locale = useAppLocale();
  const journalCopy = useMemo(() => getActivityJournalCopy(locale), [locale]);
  const hist = copy.history || {};
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const controllerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const fetchPage = useCallback(
    async (nextPage, { append = false } = {}) => {
      if (!equipment?.id || !active) return;
      controllerRef.current?.abort();
      const controller = createTrackedAbortController();
      controllerRef.current = controller;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const payload = await getEquipmentLogs(equipment.id, nextPage, PAGE_SIZE, {
          clientId: equipment.clientId,
          type: equipment.type,
          name: equipment.name,
          dbId: equipmentDbId || equipment.dbId || null,
          familyKey: equipment.familyKey || parseCustomFamilyType(equipment.type) || null,
          family: equipment.family || null,
          category: "rmm",
          signal: controller.signal
        });
        if (controller.signal.aborted || !mountedRef.current) return;
        const rows = Array.isArray(payload?.logs) ? payload.logs : [];
        setTotal(Number(payload?.total) || rows.length);
        setPage(nextPage);
        setLogs(prev => (append ? [...prev, ...rows] : rows));
      } catch (error) {
        if (error?.name === "AbortError" || controller.signal.aborted) return;
        if (!append && mountedRef.current) {
          setLogs([]);
          setTotal(0);
        }
      } finally {
        if (!controller.signal.aborted && mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [equipment, equipmentDbId, active]
  );

  useEffect(() => {
    if (!active) return undefined;
    fetchPage(1);
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchPage(1);
    }, 45000);
    return () => clearInterval(interval);
  }, [active, fetchPage, equipment?.id, equipmentDbId]);

  const hasMore = logs.length < total;
  const empty = !loading && logs.length === 0;

  return (
    <div className={`${rmmStyles.panel} ${styles.wrap}`.trim()}>
      <header className={rmmStyles.panelHeader}>
        <div className={rmmStyles.titleBlock}>
          <h3 className={rmmStyles.title}>
            <Icon icon="mdi:timeline-text-outline" className={rmmStyles.titleIcon} aria-hidden />
            {hist.title || "Historique des communications"}
          </h3>
          <p className={rmmStyles.subtitle}>
            {hist.subtitle || "Journal des échanges entre Veritas et l’agent RMM (heartbeat, sync, commandes)."}
          </p>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.metaChip}>
            <Icon icon="mdi:swap-horizontal" aria-hidden />
            {hist.metaCount
              ? hist.metaCount.replace("{count}", String(total))
              : `${total} événement${total > 1 ? "s" : ""}`}
          </span>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => fetchPage(1)}
            disabled={loading}
            title={hist.refresh || "Actualiser"}
          >
            <Icon icon={loading ? "mdi:loading" : "mdi:refresh"} className={loading ? styles.spin : undefined} aria-hidden />
            {hist.refresh || "Actualiser"}
          </button>
        </div>
      </header>

      <div className={styles.legend} aria-hidden>
        <span className={`${styles.legendItem} ${styles.legendOutbound}`}>
          <Icon icon="mdi:arrow-right-bold" aria-hidden />
          {hist.outbound || "Veritas → Agent"}
        </span>
        <span className={`${styles.legendItem} ${styles.legendInbound}`}>
          <Icon icon="mdi:arrow-left-bold" aria-hidden />
          {hist.inbound || "Agent → Veritas"}
        </span>
      </div>

      <div className={styles.scrollBody}>
        {loading && logs.length === 0 ? (
          <div className={styles.loadingState}>
            <Icon icon="mdi:loading" className={styles.spin} aria-hidden />
            <span>{hist.loading || "Chargement de l’historique…"}</span>
          </div>
        ) : null}

        {empty ? (
          <UiKitEmptyState
            icon="mdi:timeline-clock-outline"
            title={hist.emptyTitle || "Aucune communication RMM"}
            description={hist.emptyHint || "Les heartbeats, syncs et commandes apparaîtront ici dès que l’agent échange avec Veritas."}
          />
        ) : null}

        {!empty ? (
          <ol className={styles.timeline} aria-label={hist.timelineAria || "Journal des communications RMM"}>
            {logs.map(log => {
              const details = parseLogDetails(log) || {};
              const kind = String(details.kind || "");
              const direction = resolveDirection(log);
              const summary = summarizeLog(log, hist);
              const when = formatWhen(details.lastHeartbeatAt || log.created_at, locale);
              return (
                <li key={log.id} className={`${styles.item} ${direction === "outbound" ? styles.itemOutbound : styles.itemInbound}`}>
                  <div className={styles.rail} aria-hidden>
                    <span className={styles.dot}>
                      <Icon icon={resolveKindIcon(kind, direction)} />
                    </span>
                  </div>
                  <button type="button" className={styles.card} onClick={() => setSelectedLog(log)}>
                    <div className={styles.cardTop}>
                      <span className={`${styles.direction} ${direction === "outbound" ? styles.directionOutbound : styles.directionInbound}`}>
                        {direction === "outbound" ? hist.outboundShort || "Veritas → Agent" : hist.inboundShort || "Agent → Veritas"}
                      </span>
                      <time className={styles.when} dateTime={log.created_at || undefined}>
                        {when}
                      </time>
                    </div>
                    <div className={styles.action}>{log.action || hist.unknownAction || "Événement RMM"}</div>
                    {summary ? <p className={styles.summary}>{summary}</p> : null}
                    <div className={styles.cardFoot}>
                      <span className={styles.actor}>
                        <Icon icon="mdi:account-outline" aria-hidden />
                        {log.user_name || "—"}
                      </span>
                      <span className={styles.detailsLink}>
                        {hist.viewDetails || "Détails"}
                        <Icon icon="mdi:chevron-right" aria-hidden />
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}

        {hasMore ? (
          <div className={styles.loadMoreWrap}>
            <button
              type="button"
              className={styles.loadMoreBtn}
              disabled={loadingMore}
              onClick={() => fetchPage(page + 1, { append: true })}
            >
              <Icon icon={loadingMore ? "mdi:loading" : "mdi:history"} className={loadingMore ? styles.spin : undefined} aria-hidden />
              {loadingMore ? hist.loadingMore || "Chargement…" : hist.loadMore || "Charger plus"}
            </button>
          </div>
        ) : null}
      </div>

      <EquipmentLogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        copy={journalCopy}
      />
    </div>
  );
}
