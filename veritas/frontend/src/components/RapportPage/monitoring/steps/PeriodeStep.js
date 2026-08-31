import React from "react";
import { Icon } from "@iconify/react";
import styles from "../RapportMonitoringBuilder.module.css";

export default function PeriodeStep({
  client,
  onPeriodChange,
  onSyncMonitoring,
  isSyncingMonitoring = false,
  isSyncingOffice365Report = false
}) {
  const startDate = client?.reportStartDate || "";
  const endDate = client?.reportEndDate || "";
  const syncing = isSyncingMonitoring || isSyncingOffice365Report;

  return (
    <div>
      <p className={styles.periodIntro}>
        Ajustez si besoin la fenêtre d’analyse. Les tickets, alertes et disponibilités du rapport seront calculés sur cette période.
      </p>
      <div className={styles.periodCallout}>
        <Icon icon="mdi:comment-alert-outline" className={styles.periodCalloutIcon} aria-hidden />
        <span>
          Sur chaque module suivant, commentez les écarts de santé et créez un ticket support pour les actions à mener. Ces références apparaîtront dans la synthèse client.
        </span>
      </div>
      <div className={styles.periodGrid}>
        <label className={styles.periodField}>
          Date de début
          <input
            className={styles.periodInput}
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={e =>
              onPeriodChange?.({
                reportStartDate: e.target.value,
                reportEndDate: endDate
              })
            }
          />
        </label>
        <label className={styles.periodField}>
          Date de fin
          <input
            className={styles.periodInput}
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={e =>
              onPeriodChange?.({
                reportStartDate: startDate,
                reportEndDate: e.target.value
              })
            }
          />
        </label>
      </div>
      <div className={styles.periodActions}>
        <button
          type="button"
          className={styles.periodSyncBtn}
          onClick={onSyncMonitoring}
          disabled={syncing || !startDate || !endDate}
          title="Synchroniser CheckMK / Office 365 pour la période"
        >
          <Icon
            icon={syncing ? "mdi:loading" : "mdi:cloud-sync-outline"}
            width={18}
            height={18}
            className={syncing ? styles.periodSpin : undefined}
            aria-hidden
          />
          {syncing ? "Synchronisation…" : "Synchroniser les données"}
        </button>
      </div>
    </div>
  );
}
