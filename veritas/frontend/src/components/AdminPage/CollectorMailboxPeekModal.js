import { useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./CollectorMailboxPeekModal.module.css";

function formatDate(value, locale = "fr-FR") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function CollectorMailboxPeekModal({
  open,
  copy,
  loading = false,
  folder = "INBOX",
  folders = [],
  unreadOnly = false,
  identity = null,
  messages = [],
  total = 0,
  unseen = 0,
  onClose,
  onReload,
  onFolderChange,
  onUnreadOnlyChange
}) {
  const cp = copy.collectorPeek || {};
  const locale = copy.locale || "fr-FR";
  const folderOptions = useMemo(() => {
    const set = new Set([folder, ...(Array.isArray(folders) ? folders : [])].filter(Boolean));
    return [...set];
  }, [folder, folders]);
  if (!open) return null;
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={`${layout.shell} ${styles.shell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="collector-peek-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:email-search-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{cp.eyebrow || "Aperçu boîte"}</p>
              <h2 className={layout.title} id="collector-peek-modal-title">
                {cp.title || "Mails du dossier"}
              </h2>
              <p className={layout.subtitle}>
                {identity?.user && identity?.host
                  ? `${identity.user} @ ${identity.host}`
                  : cp.subtitle || "Vérifiez le contenu réel du dossier IMAP."}
              </p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} aria-label={copy.common.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.toolbarField}>
            <label className={styles.toolbarLabel} htmlFor="collector-peek-folder">{cp.folderLabel || "Dossier"}</label>
            <select id="collector-peek-folder" className={layout.input} value={folder} onChange={e => onFolderChange?.(e.target.value)} disabled={loading}>
              {folderOptions.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <label className={styles.unreadToggle}>
            <input type="checkbox" checked={unreadOnly} onChange={e => onUnreadOnlyChange?.(e.target.checked)} disabled={loading} />
            {cp.unreadOnlyLabel || "Non lus uniquement"}
          </label>
          <button type="button" className={styles.reloadBtn} onClick={onReload} disabled={loading}>
            <Icon icon={loading ? "mdi:loading" : "mdi:refresh"} className={loading ? layout.spinning : undefined} aria-hidden />
            {cp.reload || "Actualiser"}
          </button>
        </div>

        <div className={styles.metaRow}>
          <span>{(cp.folderMeta || "Dossier {folder}").replace("{folder}", folder)}</span>
          <span>{(cp.countMeta || "{shown} affiché(s) · {total} dans le dossier · {unseen} non lu(s)")
            .replace("{shown}", String(messages.length))
            .replace("{total}", String(total))
            .replace("{unseen}", String(unseen))}</span>
        </div>

        <div className={styles.body}>
          {loading ? <div className={styles.stateRow}>
              <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
              {cp.loading || "Chargement des mails…"}
            </div> : messages.length === 0 ? <div className={styles.empty}>
              <Icon icon="mdi:email-off-outline" aria-hidden />
              <p>{cp.empty || "Aucun message dans ce dossier avec ces filtres."}</p>
            </div> : <div className={styles.list}>
              {messages.map(message => <article key={message.uid || `${message.date}-${message.subject}`} className={`${styles.item} ${message.seen ? "" : styles.itemUnread}`}>
                  <div className={styles.itemTop}>
                    <strong className={styles.subject}>{message.subject || "(sans objet)"}</strong>
                    <span className={styles.date}>{formatDate(message.date, locale)}</span>
                  </div>
                  <div className={styles.itemMeta}>
                    <span><Icon icon="mdi:account-outline" aria-hidden /> {message.from || "—"}</span>
                    {message.to ? <span><Icon icon="mdi:email-outline" aria-hidden /> {message.to}</span> : null}
                    <span className={message.seen ? styles.badgeSeen : styles.badgeUnread}>
                      {message.seen ? cp.seen || "Lu" : cp.unseen || "Non lu"}
                    </span>
                  </div>
                </article>)}
            </div>}
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>{cp.footerHint || "Lecture seule — aucun mail n’est modifié."}</span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose}>
              {copy.common.close}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
