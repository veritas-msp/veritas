import React from "react";
import { getEquipmentHaState } from "./equipmentHaUtils";
import styles from "./EquipmentPage.module.css";
export default function EquipmentHaCell({
  equipment,
  copy = {}
}) {
  const state = getEquipmentHaState(equipment);
  if (!state.active) {
    return <span className={styles.haEmpty} aria-hidden="true">
        —
      </span>;
  }
  const letter = state.isSecondary ? "B" : "A";
  const roleLabel = state.isSecondary ? copy.secondary || "Secondary" : copy.primary || "Primary";
  const title = state.partnerName ? `${roleLabel} · ${state.partnerName}` : roleLabel;
  return <span className={styles.haBadge} title={title} aria-label={title}>
      {letter}
    </span>;
}
