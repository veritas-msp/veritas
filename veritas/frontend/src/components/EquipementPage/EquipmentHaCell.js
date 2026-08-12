import React from "react";
import { Icon } from "@iconify/react";
import { getFirewallHaPairColor, getFirewallHaState } from "./equipmentHaUtils";
import styles from "./EquipmentPage.module.css";
export default function EquipmentHaCell({
  equipment,
  copy = {}
}) {
  const state = getFirewallHaState(equipment);
  if (!state.active) {
    return <span className={styles.haEmpty} aria-hidden="true">
        —
      </span>;
  }
  const pairColor = getFirewallHaPairColor(equipment);
  const roleLabel = state.isSecondary ? copy.secondary || "Secondary" : copy.primary || "Primary";
  const roleClass = state.isSecondary ? styles.haRoleSecondary : styles.haRolePrimary;
  return <div className={styles.haCell} style={pairColor ? {
    "--ha-pair-color": pairColor
  } : undefined} title={state.partnerName ? `${roleLabel} · ${state.partnerName}` : roleLabel}>
      <span className={styles.haPairRail} aria-hidden="true" />
      <span className={`${styles.haRoleChip} ${roleClass}`}>
        <span className={styles.haRoleLetter}>{state.isSecondary ? "S" : "P"}</span>
        <span className={styles.haRoleText}>{roleLabel}</span>
      </span>
      {state.partnerName ? <span className={styles.haPeer}>
          <Icon icon="mdi:lan-connect" className={styles.haPeerIcon} aria-hidden />
          <span className={styles.haPeerName}>{state.partnerName}</span>
        </span> : null}
    </div>;
}
