import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { repairFilenameEncoding } from "../../../utils/repairFilenameEncoding";
import styles from "./VaultDocumentPreviewModal.module.css";

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const CLOSE_MS = 180;

const FALLBACK_COPY = {
  previewModal: {
    download: "Download",
    closeAria: "Close",
    unsupported: "Preview not available for this file type.",
    noDescription: "No description",
    editDescriptionTitle: "Edit description",
    editDescriptionAria: "Edit description"
  },
  getCategoryLabel: category => category,
  formatDate: value => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-US");
  },
  formatSize: bytes => {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
};

export default function VaultDocumentPreviewModal({
  file,
  copy = null,
  onClose,
  previewUrl,
  downloadUrl,
  footerLeading = null,
  onEditDescription = null,
  showEmptyDescription = false,
  categoryBadgeClassName = ""
}) {
  const labels = copy?.previewModal ?? FALLBACK_COPY.previewModal;
  const getCategoryLabel = copy?.getCategoryLabel ?? FALLBACK_COPY.getCategoryLabel;
  const formatDate = copy?.formatDate ?? FALLBACK_COPY.formatDate;
  const formatSize = copy?.formatSize ?? FALLBACK_COPY.formatSize;
  const [exiting, setExiting] = useState(false);
  const closeTimerRef = useRef(null);

  const requestClose = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, CLOSE_MS);
  }, [exiting, onClose]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  if (!file) return null;

  const fileName = repairFilenameEncoding(file.file_name);
  const isImage = IMAGE_MIMES.has(file.mime_type);
  const isPdf = file.mime_type === "application/pdf";
  const hasMediaPreview = isImage || isPdf;
  const badgeClass = [styles.categoryBadge, categoryBadgeClassName].filter(Boolean).join(" ");
  const previewBodyClass = [
    styles.previewBody,
    hasMediaPreview ? styles.previewBodyMedia : ""
  ]
    .filter(Boolean)
    .join(" ");
  const metaDate = file.created_at ? formatDate(file.created_at) : "-";
  const metaSize = file.size_bytes != null ? formatSize(file.size_bytes) : null;

  return createPortal(
    <div
      className={`${styles.overlay}${exiting ? ` ${styles.overlayOut}` : ""}`}
      onClick={requestClose}
      role="presentation"
    >
      <div
        className={`${styles.shell}${exiting ? ` ${styles.shellOut}` : ""}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-preview-title"
      >
        <header className={styles.header}>
          <span id="vault-preview-title" className={styles.title}>
            {fileName}
          </span>
          <div className={styles.headerActions}>
            <a href={downloadUrl} download={fileName} className={styles.downloadLink}>
              <Icon icon="mdi:download-outline" aria-hidden /> {labels.download}
            </a>
            <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label={labels.closeAria}>
              <FaTimes />
            </button>
          </div>
        </header>

        <div className={previewBodyClass}>
          {isImage ? <img src={previewUrl} alt={fileName} className={styles.previewImage} /> : null}
          {isPdf ? <iframe src={previewUrl} title={fileName} className={styles.previewPdf} /> : null}
          {!hasMediaPreview ? (
            <div className={styles.previewUnsupported}>
              <Icon icon="mdi:file-document-outline" className={styles.previewUnsupportedIcon} aria-hidden />
              <p>{labels.unsupported}</p>
              <a href={downloadUrl} download={fileName} className={styles.unsupportedDownload}>
                <Icon icon="mdi:download-outline" aria-hidden /> {labels.download}
              </a>
            </div>
          ) : null}
        </div>

        <footer className={styles.footer}>
          {footerLeading}
          <span className={badgeClass}>{getCategoryLabel(file.category)}</span>
          {onEditDescription || showEmptyDescription || file.description ? (
            <span className={styles.footerDescRow}>
              {file.description ? (
                <span className={styles.footerDescText}>{file.description}</span>
              ) : showEmptyDescription ? (
                <span className={`${styles.footerDescText} ${styles.footerDescEmpty}`.trim()}>
                  {labels.noDescription}
                </span>
              ) : null}
              {onEditDescription ? (
                <button
                  type="button"
                  className={styles.footerDescEditBtn}
                  onClick={onEditDescription}
                  title={labels.editDescriptionTitle}
                  aria-label={labels.editDescriptionAria}
                >
                  <Icon icon="mdi:pencil-outline" aria-hidden />
                </button>
              ) : null}
            </span>
          ) : null}
          <span className={styles.footerMeta}>
            {metaDate}
            {metaSize != null ? ` - ${metaSize}` : ""}
          </span>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
