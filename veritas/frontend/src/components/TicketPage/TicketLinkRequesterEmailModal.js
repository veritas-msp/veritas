import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { updateContact } from "../../api/clients";
import {
  createCommunicationEntry,
  enforcePrimaryCommunications,
  normalizeContactCommunications,
  syncLegacyContactFields
} from "../../utils/contactCommunications";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import styles from "./TicketLinkRequesterEmailModal.module.css";

function getContactSearchText(contact) {
  return [contact?.prenom, contact?.nom, contact?.email, contact?.client_name, contact?.entreprise]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getContactDisplayLabel(contact) {
  const fullName = `${contact?.prenom || ""} ${contact?.nom || ""}`.trim();
  return fullName || contact?.email || `Contact #${contact?.id}`;
}

function contactAlreadyHasEmail(contact, email) {
  const target = String(email || "").trim().toLowerCase();
  if (!target) return false;
  return normalizeContactCommunications(contact).some(
    entry => entry.type === "email" && String(entry.value || "").trim().toLowerCase() === target
  );
}

export async function linkRequesterEmailToContact(contact, email) {
  const trimmedEmail = String(email || "").trim();
  if (!contact?.id || !trimmedEmail) {
    throw new Error("Missing contact or email");
  }
  if (contactAlreadyHasEmail(contact, trimmedEmail)) {
    return contact;
  }
  const existing = normalizeContactCommunications(contact);
  const hasEmail = existing.some(entry => entry.type === "email");
  const communications = enforcePrimaryCommunications([
    ...existing,
    createCommunicationEntry("email", {
      value: trimmedEmail,
      isPrimary: !hasEmail
    })
  ]);
  const synced = syncLegacyContactFields(communications);
  return updateContact(contact.id, {
    nom: contact.nom,
    prenom: contact.prenom || null,
    sexe: contact.sexe || null,
    poste: contact.poste || null,
    statut: contact.statut || "actif",
    client_id: contact.client_id ?? null,
    email: synced.email,
    telephone: synced.telephone,
    communications: synced.communications
  });
}

export default function TicketLinkRequesterEmailModal({
  open,
  email = "",
  contacts = [],
  copy,
  onClose,
  onLinked
}) {
  const commonCopy = useCommonCopy();
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    setSearch("");
    setHighlight(0);
    setSaving(false);
    setError("");
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

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = Array.isArray(contacts) ? contacts : [];
    if (!query) return list.slice(0, 40);
    return list.filter(contact => getContactSearchText(contact).includes(query)).slice(0, 40);
  }, [contacts, search]);

  useEffect(() => {
    setHighlight(0);
  }, [search]);

  const handlePick = async contact => {
    if (!contact?.id || saving) return;
    setSaving(true);
    setError("");
    try {
      const updated = await linkRequesterEmailToContact(contact, email);
      onLinked?.(updated || contact);
      onClose?.();
    } catch (err) {
      setError(err.message || copy?.linkContactError || "Error");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const title = copy?.linkContactTitle || copy?.linkContact || "Link contact";
  const subtitle = (copy?.formatLinkContactSubtitle?.(email) || copy?.linkContactSubtitle || "").replace("{email}", email);

  return createPortal(
    <div className={styles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={styles.shell}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-link-requester-email-title"
      >
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:email-plus-outline" />
            </div>
            <div>
              <h2 className={styles.title} id="ticket-link-requester-email-title">
                {title}
              </h2>
              <p className={styles.subtitle}>{subtitle}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.emailChip}>
            <Icon icon="mdi:email-outline" aria-hidden />
            <span>{email}</span>
          </div>
          <label className={styles.searchLabel} htmlFor="ticket-link-requester-search">
            {copy?.linkContactSearch || copy?.searchContact}
          </label>
          <div className={styles.searchWrap}>
            <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
            <input
              id="ticket-link-requester-search"
              type="text"
              className={styles.searchInput}
              value={search}
              placeholder={copy?.linkContactSearch || copy?.searchContact}
              autoFocus
              disabled={saving}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (filteredContacts.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight(h => Math.min(h + 1, filteredContacts.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight(h => Math.max(h - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const picked = filteredContacts[highlight];
                  if (picked) handlePick(picked);
                }
              }}
            />
          </div>
          <div className={styles.list} role="listbox">
            {filteredContacts.length === 0 ? (
              <div className={styles.empty}>{copy?.linkContactEmpty || copy?.noContactFound}</div>
            ) : (
              filteredContacts.map((contact, index) => {
                const label = getContactDisplayLabel(contact);
                const meta = contact.email || contact.client_name || "";
                return (
                  <button
                    key={contact.id}
                    type="button"
                    role="option"
                    aria-selected={highlight === index}
                    className={`${styles.option} ${highlight === index ? styles.optionActive : ""}`}
                    disabled={saving}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => handlePick(contact)}
                  >
                    <span className={styles.optionName}>{label}</span>
                    {meta ? <span className={styles.optionMeta}>{meta}</span> : null}
                  </button>
                );
              })
            )}
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving}>
            {commonCopy.cancel}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
