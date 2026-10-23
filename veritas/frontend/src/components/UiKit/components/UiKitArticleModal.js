import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import UiKitButton from "./UiKitButton";
import { NEWS_CATEGORY_ICON } from "./UiKitNewsPanel";
import homeStyles from "../uiKitHome.module.css";
import btnStyles from "../uiKitPrimitives.module.css";

function sheetWidth() {
  return Math.min(560, window.innerWidth - 48);
}

function collapsedTransform(metrics, origin) {
  if (!metrics || !origin) return "none";
  const dx = origin.left + origin.width / 2 - (metrics.left + metrics.width / 2);
  const dy = origin.top + origin.height / 2 - (metrics.top + metrics.height / 2);
  const scale = Math.min(
    origin.width / Math.max(metrics.width, 1),
    origin.height / Math.max(metrics.height, 1)
  );
  const safe = Math.max(0.12, Math.min(scale, 1));
  return `translate(${dx}px, ${dy}px) scale(${safe})`;
}

export default function UiKitArticleModal({
  article,
  open,
  origin = null,
  onClose,
  categoryLabel,
  relativeTime = "",
  absoluteDate = "",
  closeLabel = "Fermer",
  openSourceLabel = "Ouvrir sur le site",
  emptySnippet = "Aucun résumé disponible."
}) {
  const kept = useRef(article);
  const keptOrigin = useRef(origin);
  if (article) kept.current = article;
  if (origin) keptOrigin.current = origin;
  const shown = open ? article : kept.current;
  const from = open ? origin : keptOrigin.current;

  const [present, setPresent] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const dialogRef = useRef(null);
  const openedAtRef = useRef(0);
  const backdropArmedRef = useRef(false);

  if (open && shown && !present) {
    setPresent(true);
    setExpanded(false);
  }

  useLayoutEffect(() => {
    if (!present || !dialogRef.current) return undefined;
    const width = sheetWidth();
    const node = dialogRef.current;
    const height = Math.max(node.offsetHeight, node.scrollHeight, 1);
    const left = Math.max(20, (window.innerWidth - width) / 2);
    const top = Math.max(20, (window.innerHeight - height) / 2);
    setMetrics(prev => {
      if (prev && prev.top === top && prev.left === left && prev.width === width && prev.height === height) {
        return prev;
      }
      return { top, left, width, height };
    });
    return undefined;
  }, [present, shown]);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      const timer = window.setTimeout(() => {
        setPresent(false);
        setMetrics(null);
      }, 340);
      return () => window.clearTimeout(timer);
    }
    openedAtRef.current = performance.now();
    if (!metrics) return undefined;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setExpanded(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open, metrics]);

  useEffect(() => {
    if (!present) return undefined;
    const onKey = e => {
      if (e.key === "Escape") onClose?.();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [present, onClose]);

  if (!present || !shown) return null;

  const cat = shown.category || "news";
  const width = metrics?.width || sheetWidth();
  const placed = metrics
    ? { top: metrics.top, left: metrics.left, width }
    : { top: 0, left: Math.max(20, (window.innerWidth - width) / 2), width };

  return createPortal(
    <div
      className={`${homeStyles.modalOverlay}${expanded ? ` ${homeStyles.modalOverlayOn}` : ""}`}
      role="presentation"
      onMouseDown={event => {
        backdropArmedRef.current = event.target === event.currentTarget;
      }}
      onClick={event => {
        if (event.target !== event.currentTarget || !backdropArmedRef.current) return;
        if (performance.now() - openedAtRef.current < 450) return;
        onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`${homeStyles.modalDialog} ${homeStyles.zoomDialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="uikit-article-title"
        onClick={e => e.stopPropagation()}
        style={{
          top: placed.top,
          left: placed.left,
          width: placed.width,
          visibility: metrics ? "visible" : "hidden",
          transform: expanded || !from ? "none" : collapsedTransform(metrics, from)
        }}
      >
        <header className={homeStyles.modalHeader}>
          <div className={homeStyles.modalMeta}>
            <span className={homeStyles.modalBadge} data-category={cat}>
              <Icon icon={NEWS_CATEGORY_ICON[cat] || NEWS_CATEGORY_ICON.news} aria-hidden />
              {categoryLabel}
            </span>
            {relativeTime ? (
              <time className={homeStyles.modalTime} dateTime={shown.publishedAt}>
                {relativeTime}
              </time>
            ) : null}
          </div>
          <button type="button" className={homeStyles.modalClose} onClick={onClose} aria-label={closeLabel}>
            <Icon icon="mdi:close" aria-hidden />
          </button>
        </header>

        <div className={homeStyles.modalBody}>
          <h2 id="uikit-article-title" className={homeStyles.modalTitle}>
            {shown.title}
          </h2>
          {shown.source ? (
            <p className={homeStyles.modalSource}>
              <Icon icon="mdi:web" aria-hidden />
              {shown.source}
            </p>
          ) : null}
          {absoluteDate ? <p className={homeStyles.modalDate}>{absoluteDate}</p> : null}
          <div className={homeStyles.modalSummary}>
            {shown.snippet ? <p>{shown.snippet}</p> : <p>{emptySnippet}</p>}
          </div>
        </div>

        <footer className={homeStyles.modalFooter}>
          <UiKitButton variant="secondary" onClick={onClose}>
            {closeLabel}
          </UiKitButton>
          {shown.link ? (
            <a
              className={`${btnStyles.btn} ${btnStyles.btnPrimary}`}
              href={shown.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon icon="mdi:open-in-new" aria-hidden />
              {openSourceLabel}
            </a>
          ) : null}
        </footer>
      </div>
    </div>,
    document.body
  );
}
