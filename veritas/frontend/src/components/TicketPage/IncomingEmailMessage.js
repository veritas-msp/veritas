import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import API_BASE_URL from "../../config";
import { sanitizeHtml, TICKET_COMMENT_CONFIG } from "../../utils/sanitizeHtml";
import { buildIncomingEmailPreview, contentLooksLikeHtml } from "../../utils/incomingEmailContent";
import styles from "./TicketDetailPage.module.css";

const BACKEND_BASE_URL = String(API_BASE_URL || "").replace(/\/api\/?$/, "");
const INCOMING_EMAIL_HTML_CONFIG = {
  ALLOWED_TAGS: [...TICKET_COMMENT_CONFIG.ALLOWED_TAGS, "table", "thead", "tbody", "tr", "td", "th", "hr", "center", "font"],
  ALLOWED_ATTR: [...TICKET_COMMENT_CONFIG.ALLOWED_ATTR, "border", "cellpadding", "cellspacing", "align", "valign", "bgcolor", "colspan", "rowspan"]
};

function toAbsoluteUploadUrl(rawPath) {
  const raw = String(rawPath || "").trim().replace(/\\/g, "/");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const uploadsIndex = raw.toLowerCase().indexOf("/uploads/");
  const relativePath = uploadsIndex >= 0 ? raw.slice(uploadsIndex) : raw.startsWith("/") ? raw : `/${raw}`;
  if (!relativePath.startsWith("/")) return "";
  const encodedPath = relativePath.split("/").map((part, index) => index === 0 ? part : encodeURIComponent(part)).join("/");
  return `${BACKEND_BASE_URL}${encodedPath}`;
}

function absolutizeUploadUrlsInHtml(html) {
  return String(html || "")
    .replace(/((?:src|href)\s*=\s*)(["']?)(\/uploads\/[^"'\s>]+)\2/gi, (_match, attr, quote, path) => {
      const abs = toAbsoluteUploadUrl(path);
      const q = quote || '"';
      return `${attr}${q}${abs}${q}`;
    })
    .replace(/url\(\s*(['"]?)(\/uploads\/[^)'"]+)\1\s*\)/gi, (_match, quote, path) => {
      const abs = toAbsoluteUploadUrl(path);
      return `url(${quote}${abs}${quote})`;
    });
}

function sanitizeIncomingEmailHtml(html) {
  return absolutizeUploadUrlsInHtml(sanitizeHtml(html, INCOMING_EMAIL_HTML_CONFIG));
}

function isImageAttachment(attachment) {
  const mime = String(attachment?.mime_type || attachment?.mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(String(attachment?.filename || attachment?.name || attachment?.file_name || ""));
}

function normalizeIncomingAttachment(attachment) {
  if (!attachment) return null;
  const url = toAbsoluteUploadUrl(attachment.url || attachment.path || attachment.file_path || "");
  if (!url) return null;
  return {
    id: attachment.id,
    url,
    filename: attachment.filename || attachment.name || attachment.file_name || "file",
    mime_type: attachment.mime_type || attachment.mimeType || ""
  };
}

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

function IncomingEmailAttachments({
  attachments,
  stopPropagation = false
}) {
  if (!attachments.length) return null;
  return <div className={styles.incomingEmailAttachments} onClick={stopPropagation ? event => event.stopPropagation() : undefined}>
      {attachments.map(attachment => {
      const label = attachment.filename;
      if (isImageAttachment(attachment)) {
        return <a key={attachment.id || attachment.url} href={attachment.url} target="_blank" rel="noopener noreferrer" className={styles.attachmentPreviewLink} title={label} onClick={stopPropagation ? event => event.stopPropagation() : undefined}>
            <img src={attachment.url} alt={label} className={styles.attachmentPreviewImage} loading="lazy" />
          </a>;
      }
      return <a key={attachment.id || attachment.url} href={attachment.url} target="_blank" rel="noopener noreferrer" className={styles.attachmentLink} title={label} onClick={stopPropagation ? event => event.stopPropagation() : undefined}>
          <Icon icon="mdi:paperclip" aria-hidden />
          {label}
        </a>;
    })}
    </div>;
}

export default function IncomingEmailMessage({
  content,
  attachments = [],
  attachmentLinkClassName = styles.attachmentLink
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const parsed = buildIncomingEmailPreview(content);
  const normalizedAttachments = (Array.isArray(attachments) ? attachments : []).map(normalizeIncomingAttachment).filter(Boolean);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!parsed.isIncomingEmail) return null;
  const modalHtml = parsed.hasHtml ? sanitizeIncomingEmailHtml(parsed.html) : "";
  const modalPlain = parsed.plainText || content;
  return <>
      <div className={styles.incomingEmailCard} role="button" tabIndex={0} onClick={() => setOpen(true)} onKeyDown={event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
      }
    }}>
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
        {normalizedAttachments.length > 0 ? <IncomingEmailAttachments attachments={normalizedAttachments} stopPropagation /> : null}
        <span className={styles.incomingEmailOpenHint}>
          <Icon icon="mdi:fullscreen" aria-hidden />
          Open full email
        </span>
      </div>

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
            __html: sanitizeIncomingEmailHtml(modalPlain)
          }} /> : <div className={styles.incomingEmailPlain}>
                    <PlainLines text={modalPlain} linkClassName={attachmentLinkClassName} />
                  </div>}
                {normalizedAttachments.length > 0 ? <IncomingEmailAttachments attachments={normalizedAttachments} /> : null}
              </div>
            </div>
          </div>, document.body)}
    </>;
}
