import React from "react";
import { Icon } from "@iconify/react";
import { interpolate } from "../../i18n/translate";
import styles from "./ImpactHaBadge.module.css";

export function haTitle(ha, copy) {
  if (!ha) return "";
  const secondary = ha.role === "Secondary";
  const role = secondary
    ? (ha.internet ? copy.haInternetSecondary : copy.haSecondary)
    : (ha.internet ? copy.haInternetPrimary : copy.haPrimary);
  if (ha.partnerName) return interpolate(copy.haWithPeer, { role, peer: ha.partnerName });
  return role;
}

export default function ImpactHaBadge({ ha, copy, className = "" }) {
  if (!ha) return null;
  const title = haTitle(ha, copy);
  const secondary = ha.role === "Secondary";
  return (
    <span
      className={`${styles.badge} ${secondary ? styles.secondary : styles.primary} ${className}`.trim()}
      title={title}
      aria-label={interpolate(copy.haBadgeAria, { role: title })}
    >
      <Icon icon={secondary ? "mdi:backup-restore" : "mdi:shield-sync"} />
      {secondary ? "B" : "A"}
    </span>
  );
}
