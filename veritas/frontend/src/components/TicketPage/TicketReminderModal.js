import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes, FaTrash } from "react-icons/fa";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import exclusionStyles from "./TicketExclusionModal.module.css";
import styles from "./TicketReminderModal.module.css";
import { buildReminderFormDefaults } from "../../utils/ticketReminderEvent";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getTicketReminderModalCopy } from "./ticketReminderModalI18n";
export default function TicketReminderModal({
  open,
  ticket,
  requesterName = "",
  reminder = null,
  saving = false,
  deleting = false,
  onClose,
  onSave,
  onDelete
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getTicketReminderModalCopy(locale), [locale]);
  const [form, setForm] = useState(() => buildReminderFormDefaults(reminder));
  useEffect(() => {
    if (!open) return;
    setForm(buildReminderFormDefaults(reminder));
  }, [open, reminder]);
  if (!open || !ticket) return null;
  const ticketNumber = ticket.ticket_number || ticket.id || "-";
  const ticketTitle = ticket.title || copy.untitledTicket;
  const isEditing = Boolean(reminder?.id);
  const handleSubmit = event => {
    event.preventDefault();
    onSave?.({
      title: form.title,
      date: form.date,
      time: form.time,
      note: form.note
    });
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(520px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ticket-reminder-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:bell-ring-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 className={layout.title} id="ticket-reminder-modal-title">
                {isEditing ? copy.editTitle : copy.createTitle}
              </h2>
              <p className={layout.subtitle}>{copy.subtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving || deleting} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={`${layout.content} ${styles.formContent}`}>
            <div className={exclusionStyles.ticketContextCard}>
              <div className={exclusionStyles.ticketContextIcon} aria-hidden>
                <Icon icon="mdi:ticket-confirmation-outline" />
              </div>
              <div className={exclusionStyles.ticketContextText}>
                <div className={exclusionStyles.ticketContextLabel}>{copy.ticketLabel}</div>
                <div className={exclusionStyles.ticketContextTitle}>
                  #{ticketNumber} · {ticketTitle}
                </div>
                {requesterName ? <div className={exclusionStyles.ticketContextMeta}>
                    {copy.formatRequester(requesterName)}
                  </div> : null}
              </div>
            </div>

            <div className={layout.field}>
              <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="reminder-title">
                {copy.planningLabel}
              </label>
              <input id="reminder-title" type="text" className={layout.input} value={form.title} onChange={e => setForm(prev => ({
              ...prev,
              title: e.target.value
            }))} placeholder={copy.titlePlaceholder} maxLength={255} required disabled={saving || deleting} />
            </div>

            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="reminder-date">
                  {copy.dateLabel}
                </label>
                <input id="reminder-date" type="date" className={`${layout.input} ${styles.dateTimeInput}`} value={form.date} onChange={e => setForm(prev => ({
                ...prev,
                date: e.target.value
              }))} required disabled={saving || deleting} />
              </div>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="reminder-time">
                  {copy.timeLabel}
                </label>
                <input id="reminder-time" type="time" className={`${layout.input} ${styles.dateTimeInput}`} value={form.time} onChange={e => setForm(prev => ({
                ...prev,
                time: e.target.value
              }))} required disabled={saving || deleting} />
              </div>
            </div>

            <div className={layout.field}>
              <label className={layout.label} htmlFor="reminder-note">
                {copy.noteLabel}
              </label>
              <textarea id="reminder-note" className={layout.input} rows={4} value={form.note} onChange={e => setForm(prev => ({
              ...prev,
              note: e.target.value
            }))} placeholder={copy.notePlaceholder} disabled={saving || deleting} style={{
              resize: "vertical",
              minHeight: "5.5rem"
            }} />
            </div>
          </div>

          <footer className={styles.footer}>
            <div className={styles.footerActions}>
              {isEditing ? <button type="button" className={`${layout.ghostBtn} ${styles.footerBtn} ${styles.deleteBtn}`} onClick={() => onDelete?.()} disabled={saving || deleting}>
                  <FaTrash />
                  {deleting ? copy.busy : copy.delete}
                </button> : null}
              <button type="button" className={`${layout.ghostBtn} ${styles.footerBtn}`} onClick={onClose} disabled={saving || deleting}>
                {copy.cancel}
              </button>
              <button type="submit" className={`${layout.primaryBtn} ${styles.footerBtn} ${styles.footerBtnPrimary}`} disabled={saving || deleting}>
                {saving ? copy.busy : isEditing ? copy.save : copy.create}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.body);
}
