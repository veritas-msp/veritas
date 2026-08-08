import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import SmartTooltip from "../SmartTooltip";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { formatEquipmentDetailRelative, getEquipmentDetailCopy, interpolate } from "./equipmentDetailPageI18n";
import { getRmmAgentVersion, getRmmLastInventoryAt, getRmmAgentStatusKey, isRmmManagedEquipment, isRmmAgentOfflineAlertable } from "./rmmMonitoringUtils";
import styles from "./RmmAgentStatusBadge.module.css";
export default function RmmAgentStatusBadge({
  equipment,
  compact = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const statusKey = getRmmAgentStatusKey(equipment);
  const metaKey = statusKey === "offline" && isRmmAgentOfflineAlertable(equipment) ? "offlineAlert" : statusKey;
  const statusMeta = {
    online: {
      label: copy.agent.online,
      className: styles.online,
      icon: "mdi:laptop"
    },
    offline: {
      label: copy.agent.offline,
      className: styles.offline,
      icon: "mdi:laptop-off"
    },
    offlineAlert: {
      label: copy.agent.offlineAlert,
      className: styles.offlineAlert,
      icon: "mdi:laptop-off"
    },
    unknown: {
      label: copy.agent.unknown,
      className: styles.unknown,
      icon: "mdi:help-circle-outline"
    },
    manual: {
      label: copy.agent.manual,
      className: styles.manual,
      icon: "mdi:hand-back-right-outline"
    }
  };
  const meta = statusMeta[metaKey] || statusMeta.unknown;
  const agentVersion = getRmmAgentVersion(equipment);
  const lastAt = getRmmLastInventoryAt(equipment);
  const tooltipLines = [];
  if (isRmmManagedEquipment(equipment)) {
    tooltipLines.push(interpolate(copy.agent.tooltipManaged, {
      status: meta.label
    }));
    if (agentVersion) {
      tooltipLines.push(interpolate(copy.agent.tooltipVersion, {
        version: agentVersion
      }));
    }
    if (lastAt) {
      tooltipLines.push(interpolate(copy.agent.tooltipLastInventory, {
        when: formatEquipmentDetailRelative(lastAt, locale)
      }));
    }
  } else {
    tooltipLines.push(copy.agent.tooltipManualEntry);
  }
  return <SmartTooltip content={tooltipLines.join("\n")}>
      <span className={`${styles.badge} ${meta.className}`}>
        {!compact ? <span className={styles.dot} aria-hidden /> : null}
        <Icon icon={meta.icon} width={14} height={14} aria-hidden />
        <span>{meta.label}</span>
      </span>
    </SmartTooltip>;
}
