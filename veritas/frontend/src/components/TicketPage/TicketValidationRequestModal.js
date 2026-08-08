import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import exclusionStyles from "./TicketExclusionModal.module.css";
import styles from "./TicketReminderModal.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getTicketValidationCopy } from "./ticketValidationI18n";

function userLabel(user) {
  return (
    user?.ticket_helpdesk_display_name ||
    user?.name ||
    user?.nom ||
    user?.username ||
    user?.email ||
    ""
  );
}

export default function TicketValidationRequestModal({
  open,
  ticket,
  users = [],
  currentUserId = null,
  saving = false,
  initialRequest = null,
  onClose,
  onSubmit
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getTicketValidationCopy(locale), [locale]);
  const isEditing = Boolean(initialRequest?.id);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [message, setMessage] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const initialValidatorId = initialRequest?.validatorUserId ? String(initialRequest.validatorUserId) : "";
    const initialLabel =
      initialRequest?.validatorName ||
      userLabel(users.find(u => String(u.id) === initialValidatorId)) ||
      "";
    setSearch(initialLabel);
    setSelectedUserId(initialValidatorId);
    setMessage(String(initialRequest?.message || ""));
    setShowDropdown(false);
    setHighlight(0);
  }, [open, initialRequest, users]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = event => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter(u => u?.id && String(u.id) !== String(currentUserId || ""))
      .map(u => ({
        id: String(u.id),
        label: userLabel(u),
        email: u.email || "",
        raw: u
      }))
      .filter(opt => opt.label)
      .filter(opt => !q || opt.label.toLowerCase().includes(q) || String(opt.email).toLowerCase().includes(q))
      .slice(0, 20);
  }, [users, currentUserId, search]);

  const selectedUser = useMemo(
    () => users.find(u => String(u.id) === String(selectedUserId)) || null,
    [users, selectedUserId]
  );

  if (!open || !ticket) return null;

  const ticketNumber = ticket.ticket_number || ticket.id || "-";
  const ticketTitle = ticket.title || copy.untitledTicket;

  const handleSubmit = event => {
    event.preventDefault();
    if (!selectedUserId || saving) return;
    onSubmit?.({
      validatorUserId: selectedUserId,
      message: message.trim()
    });
  };

  return createPortal(
    <div className={layout.overlay} onClick={onClose} role="presentation">
      <div
        className={layout.shell}
        style={{ maxWidth: "min(520px, 100%)" }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-validation-modal-title"
      >
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:clipboard-check-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 className={layout.title} id="ticket-validation-modal-title">
                {isEditing ? copy.editTitle : copy.title}
              </h2>
              <p className={layout.subtitle}>{isEditing ? copy.editSubtitle : copy.subtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={`${layout.content} ${styles.formContent}`}>
            <div className={layout.fieldStack}>
              <div className={`${exclusionStyles.ticketContextCard} ${exclusionStyles.ticketContextCardFlush}`}>
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
                <label className={`${layout.label} ${layout.labelRequired}`}>{copy.validatorLabel}</label>
                <div ref={pickerRef} style={{ position: "relative" }}>
                  <input
                    type="text"
                    className={layout.input}
                    value={selectedUser && !showDropdown ? userLabel(selectedUser) : search}
                    placeholder={copy.searchValidator}
                    disabled={saving}
                    onChange={e => {
                      setSearch(e.target.value);
                      setSelectedUserId("");
                      setShowDropdown(true);
                      setHighlight(0);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={e => {
                      if (!showDropdown || options.length === 0) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHighlight(h => Math.min(h + 1, options.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlight(h => Math.max(h - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const picked = options[highlight];
                        if (picked) {
                          setSelectedUserId(picked.id);
                          setSearch(picked.label);
                          setShowDropdown(false);
                        }
                      } else if (e.key === "Escape") {
                        setShowDropdown(false);
                      }
                    }}
                    required={!selectedUserId}
                  />
                  {showDropdown ? (
                    <div
                      role="listbox"
                      style={{
                        position: "absolute",
                        zIndex: 5,
                        left: 0,
                        right: 0,
                        top: "calc(100% + 4px)",
                        maxHeight: 220,
                        overflowY: "auto",
                        border: "1px solid var(--msp-border, #d7dee8)",
                        borderRadius: 10,
                        background: "var(--msp-surface, #fff)",
                        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.12)"
                      }}
                    >
                      {options.length === 0 ? (
                        <div style={{ padding: "0.75rem 0.9rem", color: "var(--msp-text-muted, #64748b)", fontSize: "0.85rem" }}>
                          {copy.noValidatorFound}
                        </div>
                      ) : (
                        options.map((opt, idx) => (
                          <button
                            key={opt.id}
                            type="button"
                            role="option"
                            onMouseEnter={() => setHighlight(idx)}
                            onClick={() => {
                              setSelectedUserId(opt.id);
                              setSearch(opt.label);
                              setShowDropdown(false);
                            }}
                            style={{
                              display: "flex",
                              width: "100%",
                              textAlign: "left",
                              border: 0,
                              background: highlight === idx ? "rgba(43, 95, 171, 0.08)" : "transparent",
                              padding: "0.65rem 0.9rem",
                              cursor: "pointer",
                              fontFamily: "inherit"
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{opt.label}</span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className={layout.field}>
                <label className={layout.label} htmlFor="validation-message">
                  {copy.messageLabel}
                </label>
                <textarea
                  id="validation-message"
                  className={layout.input}
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={copy.messagePlaceholder}
                  disabled={saving}
                  style={{ resize: "vertical", minHeight: 96 }}
                />
              </div>
            </div>
          </div>

          <footer className={styles.footer}>
            <div className={styles.footerActions}>
              <button type="button" className={`${layout.ghostBtn} ${styles.footerBtn}`} onClick={onClose} disabled={saving}>
                {copy.cancel}
              </button>
              <button type="submit" className={`${layout.primaryBtn} ${styles.footerBtn} ${styles.footerBtnPrimary}`} disabled={saving || !selectedUserId}>
                {saving ? copy.submitting : isEditing ? copy.save : copy.submit}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  );
}
