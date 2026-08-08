import React from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import SmartTooltip from "../SmartTooltip";
import styles from "./EquipmentDetailPage.module.css";
import { buildLogDetailRows, formatLogDateTime, getLogActionDetails, getLogDetailsFallbackText, parseLogDetails } from "./equipmentLogUtils";
function LogDetailField({
  label,
  children,
  className = ""
}) {
  return <div className={`${styles.logDetailField} ${className}`.trim()}>
      <span className={styles.logDetailFieldLabel}>{label}</span>
      <div className={styles.logDetailFieldValue}>{children}</div>
    </div>;
}
export default function EquipmentLogDetailModal({
  log,
  onClose
}) {
  if (!log) return null;
  const meta = getLogActionDetails(log);
  const parsed = parseLogDetails(log);
  const detailRows = buildLogDetailRows(parsed, log.details);
  const fallbackText = detailRows === null ? getLogDetailsFallbackText(log.details) : "";
  const timestamp = log.timestamp || log.created_at;
  const userLabel = log.user_name || log.user || "System";
  const actionLabel = log.action || meta.label;
  return <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.logDetailModal}`} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="equipment-log-detail-title">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle} id="equipment-log-detail-title">
            <Icon icon={meta.icon} className={styles.modalIcon} style={{
            color: meta.color
          }} />
            Log details
          </h2>
          <SmartTooltip as="button" type="button" className={styles.modalCloseButton} onClick={onClose} content="Close">
            <FaTimes />
          </SmartTooltip>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.logDetailActionRow}>
            <LogDetailField label="Action">
              <span className={styles.logDetailBadge} style={{
              borderColor: meta.color,
              color: meta.color
            }}>
                {actionLabel}
              </span>
            </LogDetailField>
          </div>

          <div className={styles.logDetailSummaryGrid}>
            <LogDetailField label="User">{userLabel}</LogDetailField>
            <LogDetailField label="Date and time">
              {timestamp ? formatLogDateTime(timestamp) : "-"}
            </LogDetailField>
          </div>

          {log.description ? <section className={styles.logDetailSection}>
              <h3 className={styles.logDetailSectionTitle}>Description</h3>
              <p className={styles.logDetailDescription}>{log.description}</p>
            </section> : null}

          {log.details ? <section className={styles.logDetailSection}>
              <h3 className={styles.logDetailSectionTitle}>Details</h3>
              {detailRows && detailRows.length > 0 ? <dl className={styles.logDetailKvGrid}>
                  {detailRows.map(row => <div key={`${row.label}-${row.value}`} className={`${styles.logDetailKvItem} ${row.fullWidth ? styles.logDetailKvItemFull : ""}`.trim()}>
                      <dt className={styles.logDetailKvLabel}>{row.label}</dt>
                      <dd className={styles.logDetailKvValue}>{row.value}</dd>
                    </div>)}
                </dl> : fallbackText ? <pre className={styles.logDetailPre}>{fallbackText}</pre> : <p className={styles.logDetailEmpty}>No additional details.</p>}
            </section> : null}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.modalOkButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>;
}
