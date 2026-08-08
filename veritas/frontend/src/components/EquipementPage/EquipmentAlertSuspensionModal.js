import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { formatAlertSettingsDateTime, getEquipmentDetailCopy, interpolate } from "./equipmentDetailPageI18n";
import styles from "./EquipmentAlertSuspensionModal.module.css";
export default function EquipmentAlertSuspensionModal({
  open,
  onClose,
  onNavigate,
  alert
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const modalCopy = copy.alertSettings.modal;
  if (!open || !alert) return null;
  const handleSave = async () => {
    const ok = await alert.handleSave();
    if (ok) onClose?.();
  };
  return <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="equipment-alert-modal-title" aria-modal="true">
        <header className={styles.header}>
          <div>
            <h2 id="equipment-alert-modal-title" className={styles.title}>
              <Icon icon="mdi:bell-alert-outline" className={styles.titleIcon} aria-hidden />
              {modalCopy.title}
            </h2>
            <p className={styles.subtitle}>{modalCopy.subtitle}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={modalCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          {!alert.available ? <p className={styles.subtitle}>{modalCopy.unavailable}</p> : alert.loading ? <p className={styles.subtitle}>{copy.loading}</p> : <>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>{modalCopy.currentStatus}</span>
                <span className={`${styles.statusBadge} ${alert.suspended ? styles.statusSuspended : alert.alertsEnabled ? styles.statusActive : styles.statusDisabled}`}>
                  <Icon icon={alert.suspended || !alert.alertsEnabled ? "mdi:bell-off-outline" : "mdi:bell-ring-outline"} width={14} aria-hidden />
                  {alert.statusLabel}
                </span>
              </div>

              <div className={styles.formGrid}>
                <div>
                  <label className={styles.fieldLabel} htmlFor="alert-mode">
                    {modalCopy.mode}
                  </label>
                  <select id="alert-mode" className={styles.select} value={alert.mode} onChange={e => alert.setMode(e.target.value)}>
                    <option value="disabled">{modalCopy.modeDisabled}</option>
                    <option value="active">{modalCopy.modeActive}</option>
                    <option value="temporary">{modalCopy.modeTemporary}</option>
                    <option value="permanent">{modalCopy.modePermanent}</option>
                  </select>
                </div>

                {alert.mode === "temporary" ? <div>
                    <label className={styles.fieldLabel} htmlFor="alert-duration">
                      {modalCopy.duration}
                    </label>
                    <select id="alert-duration" className={styles.select} value={alert.durationMinutes} onChange={e => alert.setDurationMinutes(Number(e.target.value))}>
                      {alert.durationOptions.map(opt => <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>)}
                    </select>
                  </div> : null}
              </div>

              {alert.mode === "temporary" || alert.mode === "permanent" ? <div className={styles.reasonField}>
                  <label className={styles.fieldLabel} htmlFor="alert-reason">
                    {modalCopy.reasonOptional}
                  </label>
                  <textarea id="alert-reason" className={styles.textarea} value={alert.reason} onChange={e => alert.setReason(e.target.value)} placeholder={modalCopy.reasonPlaceholder} />
                </div> : null}

              {alert.suspended && alert.settings?.suspendedUntil ? <p className={styles.meta}>
                  {interpolate(modalCopy.resumeAt, {
              date: formatAlertSettingsDateTime(alert.settings.suspendedUntil, locale)
            })}
                </p> : null}

              {alert.settings?.lastTicketId ? <p className={styles.meta}>
                  {modalCopy.lastTicket}{" "}
                  {onNavigate ? <button type="button" className={styles.metaLink} onClick={() => {
              onNavigate("TicketDetail", {
                ticketId: alert.settings.lastTicketId,
                clientId: alert.clientId
              });
              onClose?.();
            }}>
                      {modalCopy.openTicket}
                    </button> : <span>#{String(alert.settings.lastTicketId).slice(0, 8)}</span>}
                  {alert.settings.lastAlertAt ? ` · ${formatAlertSettingsDateTime(alert.settings.lastAlertAt, locale)}` : null}
                </p> : null}
            </>}
        </div>

        {alert.available && !alert.loading ? <footer className={styles.footer}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>
              {modalCopy.cancel}
            </button>
            <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={alert.saving}>
              {alert.saving ? modalCopy.saving : modalCopy.save}
            </button>
          </footer> : null}
      </div>
    </div>;
}
