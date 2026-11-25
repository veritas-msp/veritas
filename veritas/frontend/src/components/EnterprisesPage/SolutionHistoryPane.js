import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import styles from "./AntivirusOverviewModal.module.css";
import SolutionOverviewDataTable from "./SolutionOverviewDataTable";

/** Bascule une sous-section entre son contenu et l’historique, chacun en pleine hauteur. */
export default function SolutionHistoryPane({ sectionId, dataLabel, rows, columns, children }) {
  const [mode, setMode] = useState("data");

  useEffect(() => {
    setMode("data");
  }, [sectionId]);

  const count = Array.isArray(rows) ? rows.length : 0;

  return (
    <div className={styles.paneFrame}>
      <div className={styles.paneSwitch} role="tablist" aria-label="Affichage de la section">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "data"}
          className={`${styles.paneSwitchBtn} ${mode === "data" ? styles.paneSwitchBtnActive : ""}`}
          onClick={() => setMode("data")}
        >
          {dataLabel}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "history"}
          className={`${styles.paneSwitchBtn} ${mode === "history" ? styles.paneSwitchBtnActive : ""}`}
          onClick={() => setMode("history")}
        >
          <Icon icon="mdi:history" width={15} height={15} aria-hidden />
          Historique
          <span className={styles.paneCount}>{count}</span>
        </button>
      </div>
      <div className={`${styles.paneBody} ${mode === "history" ? styles.paneBodyFill : styles.paneBodyScroll}`}>
        {mode === "history" ? (
          <div className={styles.listSectionFill}>
            <SolutionOverviewDataTable
              fillHeight
              searchable
              searchPlaceholder="Rechercher dans l’historique…"
              emptyLabel="Aucun événement enregistré pour l’instant."
              emptyIcon="mdi:history"
              rows={rows}
              columns={columns}
            />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
