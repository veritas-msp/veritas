import React from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import RmmMetricHistoryPanel from "./RmmMetricHistoryPanel";
import styles from "./RmmMetricHistoryModal.module.css";
export default function RmmMetricHistoryModal({
  open,
  agent,
  onClose
}) {
  if (!open || !agent) return null;
  const hostname = agent?.hostname || agent?.machine_id || "Poste";
  return createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="rmm-metric-history-title">
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:chart-timeline-variant" />
            </div>
            <div>
              <h2 className={styles.title} id="rmm-metric-history-title">
                History · {hostname}
              </h2>
              <p className={styles.subtitle}>{agent.client_name || "-"}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <RmmMetricHistoryPanel agent={agent} active={open} />
      </div>
    </div>, document.body);
}
