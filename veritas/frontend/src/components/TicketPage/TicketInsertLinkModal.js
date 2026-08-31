import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import styles from "./TicketInsertLinkModal.module.css";

export function normalizeHttpUrl(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  const candidate = raw.replace(/[<>"']/g, "");
  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : /^(www\.|[a-z0-9][a-z0-9-]*\.[a-z]{2,})/i.test(candidate)
      ? `https://${candidate}`
      : "";
  if (!withProtocol) return "";
  try {
    const parsed = new URL(withProtocol);
    if (!/^https?:$/i.test(parsed.protocol)) return "";
    return parsed.href;
  } catch {
    return "";
  }
}

export function captureEditorSelection(editor) {
  if (!editor) return { range: null, text: "" };
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return { range: null, text: "" };
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return { range: null, text: "" };
  return { range: range.cloneRange(), text: String(range.toString() || "") };
}

export function restoreEditorSelection(editor, range) {
  if (!editor) return;
  editor.focus();
  if (!range) return;
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  try {
    selection.addRange(range);
  } catch {
    /* range may be stale after re-render */
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function insertLinkHtml(editor, url, text) {
  if (!editor || !url) return;
  const label = String(text || "").trim() || url;
  const html = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  editor.focus();
  document.execCommand("insertHTML", false, html);
}

export default function TicketInsertLinkModal({
  open,
  copy,
  initialText = "",
  onClose,
  onInsert
}) {
  const commonCopy = useCommonCopy();
  const urlRef = useRef(null);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const titleId = "ticket-insert-link-title";

  useEffect(() => {
    if (!open) return undefined;
    setUrl(copy?.linkModalUrlPlaceholder || "https://");
    setText(String(initialText || ""));
    setError("");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = event => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      urlRef.current?.focus();
      urlRef.current?.select();
    }, 30);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, initialText, copy?.linkModalUrlPlaceholder, onClose]);

  if (!open) return null;

  const handleSubmit = event => {
    event.preventDefault();
    const normalized = normalizeHttpUrl(url);
    if (!normalized) {
      setError(copy?.linkModalError || copy?.invalidUrl || "");
      urlRef.current?.focus();
      return;
    }
    onInsert?.({ url: normalized, text: String(text || "").trim() });
  };

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.accentBar} aria-hidden />
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:link-variant" className={styles.headerIcon} />
            </div>
            <div>
              <h2 id={titleId} className={styles.title}>
                {copy?.linkModalTitle}
              </h2>
              <p className={styles.message}>{copy?.linkModalHint}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>{copy?.linkModalUrlLabel}</span>
            <input
              ref={urlRef}
              type="text"
              inputMode="url"
              className={`${styles.input} ${error ? styles.inputError : ""}`.trim()}
              value={url}
              onChange={event => {
                setUrl(event.target.value);
                if (error) setError("");
              }}
              placeholder={copy?.linkModalUrlPlaceholder}
              autoComplete="url"
              spellCheck={false}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{copy?.linkModalTextLabel}</span>
            <input
              type="text"
              className={styles.input}
              value={text}
              onChange={event => setText(event.target.value)}
              placeholder={copy?.linkModalTextPlaceholder}
            />
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              {commonCopy.cancel}
            </button>
            <button type="submit" className={styles.confirmBtn}>
              <Icon icon="mdi:check-bold" aria-hidden />
              {copy?.linkModalInsert}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
