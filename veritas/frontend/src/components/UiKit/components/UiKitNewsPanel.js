import { Children, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { RefreshCCWIcon } from "../../Misc/Sidebar/lucideAnimated";
import UiKitButton from "./UiKitButton";
import UiKitEmptyState from "./UiKitEmptyState";
import UiKitScrollFadeShell from "./UiKitScrollFadeShell";
import styles from "../uiKitHome.module.css";

export const NEWS_CATEGORY_ICON = {
  cve: "mdi:bug-outline",
  security: "mdi:shield-alert-outline",
  tech: "mdi:chip",
  news: "mdi:newspaper-variant-outline"
};

export function UiKitNewsItem({
  item,
  categoryLabel,
  relativeTime,
  onOpen,
  openLabel
}) {
  const cat = item?.category || "news";
  return (
    <button
      type="button"
      className={styles.newsItem}
      onPointerDown={event => {
        if (event.button !== 0) return;
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* le clic reste géré même si la capture est refusée */
        }
      }}
      onClick={event => onOpen?.(event.currentTarget)}
      aria-label={openLabel}
    >
      <span className={styles.newsBadge} data-category={cat} aria-label={categoryLabel}>
        <Icon icon={NEWS_CATEGORY_ICON[cat] || NEWS_CATEGORY_ICON.news} aria-hidden />
      </span>
      <span className={styles.newsBody}>
        <span className={styles.newsMeta}>
          {item.source ? <span className={styles.newsSource}>{item.source}</span> : null}
          {relativeTime ? (
            <time className={styles.newsTime} dateTime={item.publishedAt}>
              {relativeTime}
            </time>
          ) : null}
        </span>
        <span className={styles.newsItemTitle}>{item.title}</span>
        {item.snippet ? <span className={styles.newsSnippet}>{item.snippet}</span> : null}
      </span>
    </button>
  );
}

export default function UiKitNewsPanel({
  title,
  subtitle,
  icon = "mdi:rss",
  refreshLabel,
  onRefresh,
  refreshing = false,
  loading = false,
  error = false,
  empty = false,
  partial = false,
  partialNote = null,
  loadingLabel,
  errorLabel,
  emptyLabel,
  layout = "list",
  children,
  className = "",
  "aria-label": ariaLabel
}) {
  const busy = loading || refreshing;
  const refreshIconRef = useRef(null);
  const wasRefreshingRef = useRef(false);
  const [revealId, setRevealId] = useState(0);
  const listClass = layout === "grid" ? `${styles.newsList} ${styles.newsListGrid}` : styles.newsList;

  useEffect(() => {
    if (refreshing) {
      wasRefreshingRef.current = true;
      return;
    }
    if (!wasRefreshingRef.current) return;
    wasRefreshingRef.current = false;
    setRevealId(id => id + 1);
  }, [refreshing]);
  return (
    <aside
      className={`${styles.newsPanel}${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel || title}
      aria-busy={busy || undefined}
    >
      <header className={styles.newsChrome}>
        <div className={styles.newsHeadBrand}>
          {icon ? (
            <span className={styles.newsHeadIcon} aria-hidden>
              <Icon icon={icon} />
            </span>
          ) : null}
          <div className={styles.newsHeadText}>
            <h2 className={styles.newsTitle}>{title}</h2>
            {subtitle ? <p className={styles.newsSubtitle}>{subtitle}</p> : null}
          </div>
        </div>
        {onRefresh ? (
          <UiKitButton
            square
            variant="secondary"
            className={busy ? styles.newsRefreshBusy : ""}
            onClick={() => {
              if (busy) return;
              onRefresh();
            }}
            onMouseEnter={() => {
              if (!busy) refreshIconRef.current?.startAnimation?.();
            }}
            onMouseLeave={() => {
              if (!busy) refreshIconRef.current?.stopAnimation?.();
            }}
            disabled={busy}
            aria-disabled={busy || undefined}
            aria-label={refreshLabel || "Actualiser"}
          >
            <RefreshCCWIcon
              ref={refreshIconRef}
              className={`${styles.newsRefreshIcon}${busy ? ` ${styles.newsRefreshIconSpin}` : ""}`}
              size={18}
            />
          </UiKitButton>
        ) : null}
      </header>

      {partial && !busy && !error && partialNote ? (
        <p className={styles.newsPartial}>{partialNote}</p>
      ) : null}

      {loading ? (
        <div className={styles.newsState} role="status">
          <Icon icon="mdi:loading" className={styles.newsSpin} aria-hidden />
          <span>{loadingLabel}</span>
        </div>
      ) : null}

      {!loading && error ? (
        <div className={styles.newsState}>
          <UiKitEmptyState icon="mdi:wifi-off" text={errorLabel} />
        </div>
      ) : null}

      {!loading && !error && empty ? (
        <div className={styles.newsState}>
          <UiKitEmptyState icon="mdi:newspaper-remove-outline" text={emptyLabel} />
        </div>
      ) : null}

      {!loading && !error && !empty ? (
        <UiKitScrollFadeShell className={`${styles.newsScroll}${refreshing ? ` ${styles.newsScrollSync}` : ""}`} fadeTop deps={[Children.count(children), layout, refreshing]}>
          <div key={revealId || "idle"} className={`${listClass}${revealId ? ` ${styles.newsListReveal}` : ""}`}>
            {children}
          </div>
        </UiKitScrollFadeShell>
      ) : null}
    </aside>
  );
}
