import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import TechNewsReactions from "./TechNewsReactions";
import styles from "./TechNewsArticleModal.module.css";

const CATEGORY_ICONS = {
  cve: "mdi:bug-outline",
  security: "mdi:shield-alert-outline",
  news: "mdi:newspaper-variant-outline",
  tech: "mdi:chip"
};

const CATEGORY_TONES = {
  cve: styles.catCve,
  security: styles.catSecurity,
  news: styles.catNews,
  tech: styles.catTech
};

export default function TechNewsArticleModal({
  article,
  open,
  onClose,
  t,
  localeTag,
  formatRelativeTime,
  categoryLabel,
  reactions,
  myReaction,
  pending,
  onReact
}) {
  useEffect(() => {
    if (!open) return undefined;
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
  }, [open, onClose]);

  if (!open || !article) return null;

  const cat = article.category || "news";
  const catIcon = CATEGORY_ICONS[cat] || CATEGORY_ICONS.news;
  const catTone = CATEGORY_TONES[cat] || CATEGORY_TONES.news;
  const publishedLabel = article.publishedAt ? formatRelativeTime?.(article.publishedAt) : "";
  const absoluteDate = article.publishedAt
    ? (() => {
        try {
          return new Date(article.publishedAt).toLocaleString(localeTag || undefined, {
            dateStyle: "medium",
            timeStyle: "short"
          });
        } catch {
          return "";
        }
      })()
    : "";

  const modal = (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tech-news-article-title"
        onClick={e => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.metaRow}>
            <span className={`${styles.category} ${catTone}`}>
              <Icon icon={catIcon} aria-hidden />
              {categoryLabel}
            </span>
            {publishedLabel ? (
              <time className={styles.time} dateTime={article.publishedAt} title={absoluteDate || undefined}>
                {publishedLabel}
              </time>
            ) : null}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t.close || "Close"}>
            <Icon icon="mdi:close" aria-hidden />
          </button>
        </header>

        <div className={styles.body}>
          <h2 id="tech-news-article-title" className={styles.title}>
            {article.title}
          </h2>
          {article.source ? (
            <p className={styles.source}>
              <Icon icon="mdi:web" aria-hidden />
              {article.source}
            </p>
          ) : null}
          {absoluteDate ? <p className={styles.absoluteDate}>{absoluteDate}</p> : null}
          <div className={styles.summary}>
            {article.snippet ? <p>{article.snippet}</p> : <p className={styles.noSnippet}>{t.noSnippet}</p>}
          </div>

          <div className={styles.reactionsSection}>
            <p className={styles.reactionsHeading}>{t.reactionsLabel}</p>
            <TechNewsReactions
              articleId={article.id}
              reactions={reactions}
              myReaction={myReaction}
              pending={pending}
              onReact={onReact}
              t={t}
            />
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>
            {t.close}
          </button>
          {article.link ? (
            <a className={styles.primaryBtn} href={article.link} target="_blank" rel="noopener noreferrer">
              <Icon icon="mdi:open-in-new" aria-hidden />
              {t.openSource}
            </a>
          ) : null}
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
