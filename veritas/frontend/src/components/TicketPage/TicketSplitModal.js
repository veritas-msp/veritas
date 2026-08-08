import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import fs from "./TicketCreatePage.module.css";
import styles from "./TicketSplitModal.module.css";
function getTicketLabel(row) {
  return `#${row?.ticket_number || row?.id || "-"} · ${row?.title || "Sans titre"}`;
}
export default function TicketSplitModal({
  open,
  ticket,
  targets = [],
  saving = false,
  onClose,
  onConfirm
}) {
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const pickerRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setTargetId("");
    setDropdownOpen(false);
    setHighlight(0);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = e => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);
  const filteredTargets = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = Array.isArray(targets) ? targets : [];
    if (!query) return base.slice(0, 40);
    return base.filter(row => getTicketLabel(row).toLowerCase().includes(query)).slice(0, 40);
  }, [targets, search]);
  const selectedTarget = useMemo(() => (Array.isArray(targets) ? targets : []).find(row => String(row.id) === String(targetId)) || null, [targets, targetId]);
  if (!open || !ticket) return null;
  const ticketNumber = ticket.ticket_number || ticket.id || "-";
  const ticketTitle = ticket.title || "Sans titre";
  const selectTarget = row => {
    setTargetId(String(row.id));
    setSearch(getTicketLabel(row));
    setDropdownOpen(false);
  };
  const handleConfirm = () => {
    if (!selectedTarget) return;
    onConfirm?.(selectedTarget);
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(620px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ticket-split-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:call-split" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>Scission de ticket</p>
              <h2 className={layout.title} id="ticket-split-modal-title">
                Scinder dans un autre ticket
              </h2>
              <p className={layout.subtitle}>
                Closes this ticket and moves the thread to an existing ticket.
              </p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div className={layout.content}>
          <div className={styles.ticketContextCard}>
            <div className={styles.ticketContextIcon} aria-hidden>
              <Icon icon="mdi:ticket-outline" />
            </div>
            <div className={styles.ticketContextText}>
              <div className={styles.ticketContextLabel}>Ticket to close</div>
              <div className={styles.ticketContextTitle}>
                #{ticketNumber} · {ticketTitle}
              </div>
              <div className={styles.ticketContextMeta}>
                Will be closed after the split
              </div>
            </div>
          </div>

          <div className={layout.field}>
            <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="ticket-split-target">
              Ticket destinataire
            </label>
            <div className={`${styles.pickerWrap} ${dropdownOpen ? styles.pickerWrapOpen : ""} ${fs.contactPicker}`} ref={pickerRef}>
              <div className={`${fs.contactInputWrap} ${dropdownOpen ? fs.contactInputWrapOpen : ""}`}>
                <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                <input id="ticket-split-target" type="text" className={fs.contactInput} value={search} placeholder="Search by number or title…" autoComplete="off" aria-expanded={dropdownOpen} aria-haspopup="listbox" onChange={e => {
                setSearch(e.target.value);
                setTargetId("");
                setDropdownOpen(true);
                setHighlight(0);
              }} onFocus={() => setDropdownOpen(true)} onKeyDown={e => {
                if (!dropdownOpen || filteredTargets.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight(h => Math.min(h + 1, filteredTargets.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight(h => Math.max(h - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const picked = filteredTargets[highlight];
                  if (picked) selectTarget(picked);
                } else if (e.key === "Escape") {
                  setDropdownOpen(false);
                }
              }} />
              </div>
              {dropdownOpen && <div className={fs.contactDropdown} role="listbox">
                  {filteredTargets.length === 0 ? <div className={fs.contactEmpty}>No ticket found</div> : filteredTargets.map((row, idx) => <button key={row.id} type="button" role="option" className={`${fs.contactOption} ${highlight === idx ? fs.contactOptionActive : ""}`} onMouseEnter={() => setHighlight(idx)} onClick={() => selectTarget(row)}>
                        <span className={fs.contactOptionName}>{getTicketLabel(row)}</span>
                      </button>)}
                </div>}
            </div>
          </div>

          {selectedTarget ? <div className={styles.selectedTargetCard}>
              <Icon icon="mdi:arrow-right-bold" className={styles.selectedTargetIcon} aria-hidden />
              <div className={styles.selectedTargetBody}>
                <div className={styles.selectedTargetNumber}>
                  #{selectedTarget.ticket_number || selectedTarget.id}
                </div>
                <div className={styles.selectedTargetTitle}>
                  {selectedTarget.title || "Sans titre"}
                </div>
              </div>
            </div> : null}

          <div className={styles.warningCallout}>
            <Icon icon="mdi:alert-outline" className={styles.warningCalloutIcon} aria-hidden />
            <span>
              The current ticket will be <strong>closed</strong>. An internal comment with a link will be added
              dans les deux tickets pour tracer la scission.
            </span>
          </div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>Irreversible status action</span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" className={layout.primaryBtn} onClick={handleConfirm} disabled={saving || !selectedTarget}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  Scission…
                </> : <>
                  <Icon icon="mdi:call-split" aria-hidden />
                  Split and close
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
