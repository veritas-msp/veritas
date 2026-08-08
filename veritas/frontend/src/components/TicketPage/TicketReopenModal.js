import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import exclusionStyles from "./TicketExclusionModal.module.css";
import reminderStyles from "./TicketReminderModal.module.css";
export default function TicketReopenModal({
  open,
  ticket,
  copy,
  saving = false,
  onClose,
  onConfirm
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!open) return;
    setReason("");
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = event => {
      if (event.key === "Escape" && !saving) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, saving, onClose]);
  if (!open || !ticket || !copy) return null;
  const ticketNumber = ticket.ticket_number || ticket.id || "-";
  const ticketTitle = ticket.title || copy.untitledTicket;
  const canSubmit = Boolean(reason.trim()) && !saving;
  const handleSubmit = event => {
    event.preventDefault();
    if (!canSubmit) return;
    onConfirm?.(reason.trim());
  };
  return createPortal(<div className={layout.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(520px, 100%)"
    }} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ticket-reopen-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:lock-open-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 className={layout.title} id="ticket-reopen-modal-title">
                {copy.title}
              </h2>
              <p className={layout.subtitle}>{copy.subtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <form className={reminderStyles.form} onSubmit={handleSubmit}>
          <div className={`${layout.content} ${reminderStyles.formContent}`}>
            <div className={exclusionStyles.ticketContextCard}>
              <div className={exclusionStyles.ticketContextIcon} aria-hidden>
                <Icon icon="mdi:ticket-confirmation-outline" />
              </div>
              <div className={exclusionStyles.ticketContextText}>
                <div className={exclusionStyles.ticketContextLabel}>{copy.ticketLabel}</div>
                <div className={exclusionStyles.ticketContextTitle}>
                  #{ticketNumber} · {ticketTitle}
                </div>
              </div>
            </div>

            <div className={layout.field}>
              <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="ticket-reopen-reason">
                {copy.reasonLabel}
              </label>
              <textarea id="ticket-reopen-reason" className={layout.input} value={reason} onChange={event => setReason(event.target.value)} placeholder={copy.reasonPlaceholder} rows={5} maxLength={4000} disabled={saving} autoFocus style={{
              resize: "vertical",
              minHeight: "6.5rem"
            }} />
            </div>
          </div>

          <footer className={reminderStyles.footer}>
            <div className={reminderStyles.footerActions}>
              <button type="button" className={`${layout.ghostBtn} ${reminderStyles.footerBtn}`} onClick={onClose} disabled={saving}>
                {copy.cancel}
              </button>
              <button type="submit" className={`${layout.primaryBtn} ${reminderStyles.footerBtn} ${reminderStyles.footerBtnPrimary}`} disabled={!canSubmit}>
                {saving ? copy.confirming : copy.confirm}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.body);
}
