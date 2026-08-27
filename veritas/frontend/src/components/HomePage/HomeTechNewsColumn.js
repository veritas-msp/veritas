import "@mantine/core/styles.layer.css";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { Box, MantineProvider, createTheme } from "@mantine/core";
import { fetchTechNews } from "../../api/techNews";
import { ThemeContext } from "../ThemeProvider";
import { useTechNewsReactions } from "../../hooks/useTechNewsReactions";
import { getHomeNewsStrings } from "./homeNewsI18n";
import TechNewsArticleCard from "./TechNewsArticleCard";
import TechNewsArticleModal from "./TechNewsArticleModal";
import styles from "./HomeTechNewsColumn.module.css";

const newsTheme = createTheme({
  primaryColor: "blue",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  defaultRadius: "md"
});

function formatRelativeTime(iso, t) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return t.timeAgo(1, t.minutes);
  if (diffMin < 60) return t.timeAgo(diffMin, t.minutes);
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 48) return t.timeAgo(diffH, t.hours);
  const diffD = Math.floor(diffH / 24);
  return t.timeAgo(diffD, t.days);
}

export default function HomeTechNewsColumn({
  locale
}) {
  const t = useMemo(() => getHomeNewsStrings(locale), [locale]);
  const { theme } = useContext(ThemeContext) || {};
  const colorScheme = theme === "dark" ? "dark" : "light";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [partial, setPartial] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const articleIds = useMemo(() => items.map(item => item.id).filter(Boolean), [items]);
  const {
    reactions,
    mine,
    pending,
    react
  } = useTechNewsReactions(articleIds);
  const load = useCallback((signal, {
    soft = false
  } = {}) => {
    if (soft) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(false);
    fetchTechNews({
      signal
    }).then(data => {
      setItems(Array.isArray(data?.items) ? data.items : []);
      setPartial(!!data?.partial);
    }).catch(err => {
      if (err.name === "AbortError") return;
      setError(true);
      if (!soft) setItems([]);
    }).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal, {
      soft: refreshKey > 0
    });
    return () => controller.abort();
  }, [load, refreshKey]);
  const localeTag = useMemo(() => {
    const map = {
      fr: "fr-FR",
      en: "en-GB",
      de: "de-DE",
      it: "it-IT",
      es: "es-ES"
    };
    return map[locale] || "fr-FR";
  }, [locale]);
  const busy = loading || refreshing;
  const selectedCat = selectedArticle?.category || "news";

  return <aside className={styles.column} aria-label={t.title} aria-busy={busy}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <Icon icon="mdi:rss" className={styles.headerIcon} aria-hidden />
          <div>
            <h2 className={styles.title}>{t.title}</h2>
            <p className={styles.subtitle}>{t.subtitle}</p>
          </div>
        </div>
        <button type="button" className={styles.refreshBtn} onClick={() => setRefreshKey(k => k + 1)} disabled={busy} title={t.refresh} aria-label={t.refresh}>
          <Icon icon="mdi:refresh" className={busy ? styles.spinning : ""} />
        </button>
      </div>

      {partial && !busy && !error && <p className={styles.partialNote}>{t.partial}</p>}

      <div className={styles.feed}>
        {loading && <div className={styles.stateBox} role="status">
            <span className={styles.loaderRing} aria-hidden />
            <span>{t.loading}</span>
          </div>}

        {!loading && error && <div className={styles.stateBox}>
            <Icon icon="mdi:wifi-off" />
            <span>{t.error}</span>
          </div>}

        {!loading && !error && items.length === 0 && <div className={styles.stateBox}>
            <Icon icon="mdi:newspaper-remove-outline" />
            <span>{t.empty}</span>
          </div>}

        {!loading && !error && items.length > 0 && <div className={`${styles.feedBody} ${refreshing ? styles.feedBodyBusy : ""}`}>
            {refreshing ? <div className={styles.refreshOverlay} role="status" aria-live="polite">
                <span className={styles.loaderRing} aria-hidden />
                <span>{t.loading}</span>
              </div> : null}
            <MantineProvider theme={newsTheme} forceColorScheme={colorScheme} cssVariablesSelector=".veritas-tech-news">
              <Box className={`veritas-tech-news ${styles.cardStack}`}>
                <ul className={styles.list} aria-hidden={refreshing || undefined}>
                  {items.map(item => {
                    const cat = item.category || "news";
                    return <li key={item.id} className={styles.listItem}>
                        <TechNewsArticleCard
                          item={item}
                          categoryLabel={t.categories[cat] || t.categories.news}
                          relativeTime={item.publishedAt ? formatRelativeTime(item.publishedAt, t) : ""}
                          localeTag={localeTag}
                          onOpen={() => setSelectedArticle(item)}
                          reactions={reactions[item.id]}
                          myReaction={mine[item.id] || null}
                          pending={!!pending[item.id]}
                          onReact={react}
                          t={t}
                        />
                      </li>;
                  })}
                </ul>
              </Box>
            </MantineProvider>
          </div>}
      </div>

      <TechNewsArticleModal
        article={selectedArticle}
        open={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
        t={t}
        localeTag={localeTag}
        formatRelativeTime={iso => formatRelativeTime(iso, t)}
        categoryLabel={t.categories[selectedCat] || t.categories.news}
        reactions={selectedArticle ? reactions[selectedArticle.id] : undefined}
        myReaction={selectedArticle ? mine[selectedArticle.id] || null : null}
        pending={selectedArticle ? !!pending[selectedArticle.id] : false}
        onReact={react}
      />
    </aside>;
}
