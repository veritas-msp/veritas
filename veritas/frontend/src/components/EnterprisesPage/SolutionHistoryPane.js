import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import ActivityStatusSegmented from "../shared/ActivityStatusSegmented/ActivityStatusSegmented";
import styles from "./AntivirusOverviewModal.module.css";
import mapStyles from "./InfrastructureMap.module.css";
import SolutionOverviewDataTable from "./SolutionOverviewDataTable";

/** Bascule une sous-section entre son contenu et l’historique, chacun en pleine hauteur. */
export default function SolutionHistoryPane({
  sectionId,
  dataLabel,
  rows,
  columns,
  children,
  headerSlot = null,
  placeSwitchInHeader = false
}) {
  const [mode, setMode] = useState("data");

  useEffect(() => {
    setMode("data");
  }, [sectionId]);

  const count = Array.isArray(rows) ? rows.length : 0;
  const switchNode = (
    <ActivityStatusSegmented
      value={mode}
      onChange={setMode}
      ariaLabel="Affichage de la section"
      options={[
        { id: "data", label: dataLabel },
        {
          id: "history",
          label: (
            <span className={styles.paneHistoryLabel}>
              <Icon icon="mdi:history" width={15} height={15} aria-hidden />
              Historique
              <span className={styles.paneCount}>{count}</span>
            </span>
          )
        }
      ]}
    />
  );
  const parked = placeSwitchInHeader && !headerSlot;

  return (
    <div className={styles.paneFrame}>
      {headerSlot ? createPortal(switchNode, headerSlot) : parked ? null : switchNode}
      <div
        key={`${sectionId}-${mode}`}
        className={`${styles.paneBody} ${mode === "history" ? styles.paneBodyFill : styles.paneBodyScroll} ${mapStyles.contentFadeUp}`}
      >
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
