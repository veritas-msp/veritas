import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { sanitizeTicketCommentHtml } from "../../utils/sanitizeHtml";
import { buildIncomingEmailPreview, contentLooksLikeHtml } from "../../utils/incomingEmailContent";
import styles from "./TicketDetailPage.module.css";

function PlainLines({
  text,
  linkClassName
}) {
  const raw = String(text || "");
  const withoutLegacyAnchors = raw.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_match, href, label) => `${label || "link"} (${href})`);
  const urlRegex = /(https?:\/\/[^\s)]+)(\)?)/g;
  const lines = withoutLegacyAnchors.split("\n");
  return lines.map((line, lineIndex) => {
    urlRegex.lastIndex = 0;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = urlRegex.exec(line)) !== null) {
      const [full, url] = match;
      const index = match.index;
      if (index > lastIndex) parts.push(line.slice(lastIndex, index));
      parts.push(<a key={`url-${lineIndex}-${index}`} href={url} target="_blank" rel="noopener noreferrer" className={linkClassName}>
          {url}
        </a>);
      lastIndex = index + full.length;
    }
    if (lastIndex < line.length) parts.push(line.slice(lastIndex));
    return <span key={`line-${lineIndex}`}>
        {parts.length > 0 ? parts : line}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>;
  });
}

export default function IncomingEmailMessage({
  content,
  attachmentLinkClassName = styles.attachmentLink
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const parsed = buildIncomingEmailPreview(content);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!parsed.isIncomingEmail) return null;
  const modalHtml = parsed.hasHtml ? sanitizeTicketCommentHtml(parsed.html) : "";
  const modalPlain = parsed.plainText || content;
  return <>
      <button type="button" className={styles.incomingEmailCard} onClick={() => setOpen(true)}>
        <div className={styles.incomingEmailCardHead}>
          <Icon icon="mdi:email-outline" aria-hidden />
          <div>
            <strong>Incoming email</strong>
            {parsed.sender ? <span>{parsed.sender}</span> : null}
          </div>
        </div>
        {parsed.subject ? <p className={styles.incomingEmailSubject}>{parsed.subject}</p> : null}
        <div className={styles.incomingEmailPreview}>
          <PlainLines text={parsed.preview || "(empty message)"} linkClassName={attachmentLinkClassName} />
        </div>
        <span className={styles.incomingEmailOpenHint}>
          <Icon icon="mdi:fullscreen" aria-hidden />
          Open full email
        </span>
      </button>

      {open && createPortal(<div className={styles.incomingEmailModalOverlay} role="presentation" onClick={() => setOpen(false)}>
            <div className={styles.incomingEmailModal} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={event => event.stopPropagation()}>
              <header className={styles.incomingEmailModalHead}>
                <div>
                  <p className={styles.incomingEmailModalEyebrow}>Incoming email</p>
                  <h3 id={titleId}>{parsed.subject || "Email"}</h3>
                  {parsed.sender ? <p className={styles.incomingEmailModalMeta}>{parsed.sender}</p> : null}
                </div>
                <button type="button" className={styles.incomingEmailModalClose} onClick={() => setOpen(false)} aria-label="Close">
                  <FaTimes />
                </button>
              </header>
              <div className={styles.incomingEmailModalBody}>
                {modalHtml ? <div className={styles.incomingEmailHtml} dangerouslySetInnerHTML={{
            __html: modalHtml
          }} /> : contentLooksLikeHtml(modalPlain) ? <div className={styles.incomingEmailHtml} dangerouslySetInnerHTML={{
            __html: sanitizeTicketCommentHtml(modalPlain)
          }} /> : <div className={styles.incomingEmailPlain}>
                    <PlainLines text={modalPlain} linkClassName={attachmentLinkClassName} />
                  </div>}
              </div>
            </div>
          </div>, document.body)}
    </>;
}
