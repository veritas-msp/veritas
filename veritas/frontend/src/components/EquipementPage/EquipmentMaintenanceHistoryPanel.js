import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import enterpriseDetailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import { fetchSupervisionExclusionHistory } from "../../api/supervisionAlerts";
import { getLocaleDateTimeFormat } from "./equipmentActivityUtils";
import styles from "./EquipmentDetailPage.module.css";
import overviewStyles from "./EquipmentOverviewDashboard.module.css";
import maintStyles from "./EquipmentMaintenanceHistoryPanel.module.css";
import EquipmentEmptyState from "./EquipmentEmptyState";

function formatDateTime(value, localeCode) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(localeCode, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDuration(start, end, copy) {
  if (!start) return "—";
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return "—";
  const minutes = Math.round((to - from) / 60000);
  if (minutes < 60) {
    return (copy?.durationMinutes || "{n} min").replace("{n}", String(Math.max(1, minutes)));
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return (copy?.durationHours || "{n} h").replace("{n}", String(hours));
  }
  const days = Math.round(hours / 24);
  return (copy?.durationDays || "{n} j").replace("{n}", String(days));
}

function StatusBadge({ status, copy }) {
  const key = status === "active" ? "active" : status === "expired" ? "expired" : "ended";
  const label =
    key === "active"
      ? copy?.statusActive || "En cours"
      : key === "expired"
        ? copy?.statusExpired || "Expirée"
        : copy?.statusEnded || "Terminée";
  return (
    <span className={`${maintStyles.statusBadge} ${maintStyles[`status_${key}`] || ""}`}>
      <Icon
        icon={key === "active" ? "mdi:traffic-cone" : key === "expired" ? "mdi:timer-off-outline" : "mdi:check-circle-outline"}
        aria-hidden
      />
      {label}
    </span>
  );
}

function HistoryBody({
  copy,
  t,
  localeCode,
  loading,
  error,
  items,
  compact = false
}) {
  if (loading) {
    return <div className={compact ? overviewStyles.empty : styles.loadingState}>{copy?.loading || "Chargement…"}</div>;
  }
  if (error) {
    return (
      <EquipmentEmptyState
        icon="mdi:alert-circle-outline"
        title={t.errorTitle || t.title || "Erreur"}
        subtitle={error}
        compact={compact}
      />
    );
  }
  if (items.length === 0) {
    return (
      <EquipmentEmptyState
        icon="mdi:wrench-clock"
        title={t.emptyTitle || "Aucune période de maintenance"}
        subtitle={t.emptyHint || "Les mises en maintenance de ce périphérique apparaîtront ici."}
        compact={compact}
      />
    );
  }

  return (
    <div className={compact ? overviewStyles.tableWrap : enterpriseDetailStyles.dataTableWrapper}>
      <table className={compact ? overviewStyles.table : enterpriseDetailStyles.dataTable}>
        <thead>
          <tr>
            <th>{t.colStatus || "Statut"}</th>
            <th>{t.colPeriod || "Période"}</th>
            {!compact ? <th>{t.colDuration || "Durée"}</th> : null}
            <th>{t.colReason || "Motif"}</th>
            {!compact ? <th>{t.colBy || "Par"}</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map(row => {
            const endedAt = row.endedAt || (!row.active && row.excludedUntil ? row.excludedUntil : null);
            const periodStart = formatDateTime(row.createdAt, localeCode);
            const periodEnd = row.active
              ? row.excludedUntil
                ? (t.until || "jusqu’au {date}").replace(
                    "{date}",
                    formatDateTime(row.excludedUntil, localeCode)
                  )
                : t.inProgress || "en cours"
              : formatDateTime(endedAt, localeCode);
            const byStart = row.excludedByName || "—";
            const byEnd = row.endedByName
              ? (t.endedBy || "terminée par {name}").replace("{name}", row.endedByName)
              : null;
            return (
              <tr key={row.id} className={row.active ? maintStyles.rowActive : undefined}>
                <td>
                  <StatusBadge status={row.status || (row.active ? "active" : "ended")} copy={t} />
                </td>
                <td>
                  <div className={compact ? maintStyles.periodCell : styles.activityTitleCell}>
                    <span>
                      {periodStart}
                      <span className={maintStyles.periodSep}> → </span>
                      {periodEnd}
                    </span>
                    {compact ? (
                      <span className={maintStyles.periodMeta}>
                        {formatDuration(row.createdAt, row.active ? null : endedAt, t)}
                        {byStart && byStart !== "—" ? ` · ${byStart}` : ""}
                      </span>
                    ) : row.excludedUntil && row.active ? (
                      <span className={styles.activitySubtitle}>
                        {(t.plannedUntil || "Fin prévue : {date}").replace(
                          "{date}",
                          formatDateTime(row.excludedUntil, localeCode)
                        )}
                      </span>
                    ) : null}
                  </div>
                </td>
                {!compact ? (
                  <td className={styles.eventMetaCell}>
                    {formatDuration(row.createdAt, row.active ? null : endedAt, t)}
                  </td>
                ) : null}
                <td>
                  <span className={row.reason ? undefined : styles.activityMetaMuted}>
                    {row.reason || t.noReason || "—"}
                  </span>
                </td>
                {!compact ? (
                  <td>
                    <div className={styles.activityTitleCell}>
                      <span>{byStart}</span>
                      {byEnd ? <span className={styles.activitySubtitle}>{byEnd}</span> : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EquipmentMaintenanceHistoryPanel({
  copy,
  locale,
  equipmentId,
  clientId,
  refreshKey = 0,
  limit = 50,
  embedded = false,
  active = true
}) {
  const t = copy?.maintenanceHistory || {};
  const localeCode = getLocaleDateTimeFormat(locale);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastLoadKeyRef = useRef("");

  const canLoad = Boolean(equipmentId);

  const load = useCallback(async () => {
    if (!canLoad) {
      setRows([]);
      setLoading(false);
      setError(null);
      lastLoadKeyRef.current = "";
      return;
    }
    const key = `${equipmentId}:${clientId || ""}:${limit}:${refreshKey}`;
    if (lastLoadKeyRef.current === key) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSupervisionExclusionHistory({
        equipmentId,
        clientId: clientId || undefined,
        kind: "maintenance",
        limit
      });
      lastLoadKeyRef.current = key;
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
      setError(err?.message || t.error || "Impossible de charger l’historique");
    } finally {
      setLoading(false);
    }
  }, [canLoad, clientId, equipmentId, limit, refreshKey, t.error]);

  useEffect(() => {
    if (!active) return;
    load();
  }, [active, load]);

  const items = useMemo(
    () =>
      (Array.isArray(rows) ? rows : []).filter(
        row => (row.kind || "maintenance") === "maintenance" && row.scope === "device"
      ),
    [rows]
  );

  if (!canLoad) return null;

  const isEmpty = !loading && !error && items.length === 0;
  const isError = !loading && Boolean(error);

  if (isEmpty || isError) {
    return (
      <EquipmentEmptyState
        className={maintStyles.emptyFill}
        icon={isError ? "mdi:alert-circle-outline" : "mdi:wrench-clock"}
        title={
          isError
            ? t.errorTitle || t.title || "Erreur"
            : t.emptyTitle || "Aucune période de maintenance"
        }
        subtitle={
          isError
            ? error
            : t.emptyHint || "Les mises en maintenance de ce périphérique apparaîtront ici."
        }
        compact={embedded}
      />
    );
  }

  const body = (
    <HistoryBody
      copy={copy}
      t={t}
      localeCode={localeCode}
      loading={loading}
      error={error}
      items={items}
      compact={embedded}
    />
  );

  if (embedded) {
    return (
      <article className={`${overviewStyles.card} ${overviewStyles.spanFull}`.trim()}>
        <header className={overviewStyles.cardHead}>
          <h3 className={overviewStyles.cardTitle}>
            <Icon icon="mdi:wrench-clock" className={overviewStyles.cardTitleIcon} aria-hidden />
            {t.title || "Historique des maintenances"}
          </h3>
          {!loading && items.length > 0 ? (
            <span className={maintStyles.countBadge}>{items.length}</span>
          ) : null}
        </header>
        <div className={overviewStyles.cardBody}>{body}</div>
      </article>
    );
  }

  return (
    <section className={enterpriseDetailStyles.panel}>
      <header className={enterpriseDetailStyles.panelHeader}>
        <div className={enterpriseDetailStyles.panelHeaderMain}>
          <h2 className={enterpriseDetailStyles.panelTitle}>
            <Icon icon="mdi:wrench-clock" className={maintStyles.titleIcon} aria-hidden />
            {t.title || "Historique des maintenances"}
          </h2>
          {t.subtitle ? <p className={maintStyles.subtitle}>{t.subtitle}</p> : null}
        </div>
        {!loading && items.length > 0 ? (
          <span className={maintStyles.countBadge}>{items.length}</span>
        ) : null}
      </header>

      <div className={`${enterpriseDetailStyles.panelBody} ${maintStyles.panelBodyFill}`.trim()}>{body}</div>
    </section>
  );
}
