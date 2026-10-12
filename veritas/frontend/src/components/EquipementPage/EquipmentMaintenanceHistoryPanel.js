import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import enterpriseDetailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import { fetchSupervisionExclusionHistory } from "../../api/supervisionAlerts";
import { getLocaleDateTimeFormat } from "./equipmentActivityUtils";
import styles from "./EquipmentDetailPage.module.css";
import maintStyles from "./EquipmentMaintenanceHistoryPanel.module.css";

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

export default function EquipmentMaintenanceHistoryPanel({
  copy,
  locale,
  equipmentId,
  clientId,
  refreshKey = 0,
  limit = 50
}) {
  const t = copy?.maintenanceHistory || {};
  const localeCode = getLocaleDateTimeFormat(locale);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canLoad = Boolean(equipmentId);

  const load = useCallback(async () => {
    if (!canLoad) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSupervisionExclusionHistory({
        equipmentId,
        clientId: clientId || undefined,
        kind: "maintenance",
        limit
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
      setError(err?.message || t.error || "Impossible de charger l’historique");
    } finally {
      setLoading(false);
    }
  }, [canLoad, clientId, equipmentId, limit, t.error]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const items = useMemo(
    () =>
      (Array.isArray(rows) ? rows : []).filter(
        row => (row.kind || "maintenance") === "maintenance" && row.scope === "device"
      ),
    [rows]
  );

  if (!canLoad) return null;

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

      <div className={enterpriseDetailStyles.panelBody}>
        {loading ? (
          <div className={styles.loadingState}>{copy?.loading || "Chargement…"}</div>
        ) : error ? (
          <div className={styles.emptyState}>
            <Icon icon="mdi:alert-circle-outline" className={styles.emptyIcon} />
            <h5>{t.errorTitle || "Erreur"}</h5>
            <p className={styles.emptyHint}>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon icon="mdi:wrench-clock" className={styles.emptyIcon} />
            <h5>{t.emptyTitle || "Aucune période de maintenance"}</h5>
            <p className={styles.emptyHint}>
              {t.emptyHint || "Les mises en maintenance de ce périphérique apparaîtront ici."}
            </p>
          </div>
        ) : (
          <div className={enterpriseDetailStyles.dataTableWrapper}>
            <table className={enterpriseDetailStyles.dataTable}>
              <thead>
                <tr>
                  <th>{t.colStatus || "Statut"}</th>
                  <th>{t.colPeriod || "Période"}</th>
                  <th>{t.colDuration || "Durée"}</th>
                  <th>{t.colReason || "Motif"}</th>
                  <th>{t.colBy || "Par"}</th>
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
                        <div className={styles.activityTitleCell}>
                          <span>
                            {periodStart}
                            <span className={maintStyles.periodSep}> → </span>
                            {periodEnd}
                          </span>
                          {row.excludedUntil && row.active ? (
                            <span className={styles.activitySubtitle}>
                              {(t.plannedUntil || "Fin prévue : {date}").replace(
                                "{date}",
                                formatDateTime(row.excludedUntil, localeCode)
                              )}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={styles.eventMetaCell}>
                        {formatDuration(row.createdAt, row.active ? null : endedAt, t)}
                      </td>
                      <td>
                        <span className={row.reason ? undefined : styles.activityMetaMuted}>
                          {row.reason || t.noReason || "—"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.activityTitleCell}>
                          <span>{byStart}</span>
                          {byEnd ? <span className={styles.activitySubtitle}>{byEnd}</span> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
