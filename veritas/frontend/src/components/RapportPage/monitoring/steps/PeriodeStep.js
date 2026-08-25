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
      <p style={{ margin: "0 0 1rem", color: "#6b7280", fontSize: "0.9rem" }}>
        Ajustez la période d’analyse puis synchronisez les données si besoin.
      </p>
      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          maxWidth: 520
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
          Date de début
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={e =>
              onPeriodChange?.({
                reportStartDate: e.target.value,
                reportEndDate: endDate
              })
            }
            style={{
              padding: "0.5rem 0.6rem",
              borderRadius: 8,
              border: "1px solid var(--border-primary, #e5e7eb)"
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
          Date de fin
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={e =>
              onPeriodChange?.({
                reportStartDate: startDate,
                reportEndDate: e.target.value
              })
            }
            style={{
              padding: "0.5rem 0.6rem",
              borderRadius: 8,
              border: "1px solid var(--border-primary, #e5e7eb)"
            }}
          />
        </label>
      </div>

      <div style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <button
          type="button"
          className={styles.commentPublishButton}
          onClick={onSyncMonitoring}
          disabled={syncing || !startDate || !endDate}
          title="Synchroniser CheckMK / Office 365 pour la période"
        >
          <Icon
            icon={syncing ? "mdi:loading" : "mdi:cloud-sync-outline"}
            width={18}
            height={18}
            style={{ animation: syncing ? "spin 1s linear infinite" : "none", marginRight: 6 }}
          />
          {syncing ? "Synchronisation…" : "Synchroniser"}
        </button>
      </div>
    </div>
  );
}
