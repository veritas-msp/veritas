import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchTechNews } from "../../api/techNews";
import { UiKitArticleModal, UiKitNewsItem, UiKitNewsPanel } from "../UiKit";
import { getHomeNewsStrings } from "./homeNewsI18n";

const MIN_NEWS_SYNC_MS = 1100;

function abortError() {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true }
    );
  });
}

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

export default function HomeTechNewsColumn({ locale, layout = "grid" }) {
  const t = useMemo(() => getHomeNewsStrings(locale), [locale]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [partial, setPartial] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleOrigin, setArticleOrigin] = useState(null);

  const load = useCallback((signal, { soft = false } = {}) => {
    const started = Date.now();
    if (soft) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(false);
    fetchTechNews({ signal })
      .then(data => ({ ok: true, data }))
      .catch(err => {
        if (err?.name === "AbortError" || signal.aborted) throw abortError();
        return { ok: false };
      })
      .then(async result => {
        if (soft) {
          const remaining = MIN_NEWS_SYNC_MS - (Date.now() - started);
          if (remaining > 0) await delay(remaining, signal);
        }
        if (signal.aborted) return;
        if (result.ok) {
          setItems(Array.isArray(result.data?.items) ? result.data.items : []);
          setPartial(!!result.data?.partial);
          return;
        }
        setError(true);
        if (!soft) setItems([]);
      })
      .catch(err => {
        if (err?.name === "AbortError" || signal.aborted) return;
        setError(true);
        if (!soft) setItems([]);
      })
      .finally(() => {
        if (signal.aborted) return;
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal, { soft: refreshKey > 0 });
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

  const selectedCat = selectedArticle?.category || "news";

  let absoluteDate = "";
  if (selectedArticle?.publishedAt) {
    const ms = new Date(selectedArticle.publishedAt).getTime();
    if (Number.isFinite(ms)) {
      try {
        absoluteDate = new Date(ms).toLocaleString(localeTag, {
          dateStyle: "medium",
          timeStyle: "short"
        });
      } catch {
        absoluteDate = "";
      }
    }
  }

  return (
    <>
      <UiKitNewsPanel
        title={t.title}
        subtitle={t.subtitle}
        icon="mdi:rss"
        layout={layout}
        refreshLabel={t.refresh}
        onRefresh={() => {
          if (loading || refreshing) return;
          setRefreshing(true);
          setRefreshKey(k => k + 1);
        }}
        refreshing={refreshing}
        loading={loading}
        error={error}
        empty={!error && items.length === 0}
        partial={partial}
        partialNote={t.partial}
        loadingLabel={t.loading}
        errorLabel={t.error}
        emptyLabel={t.empty}
      >
        {items.map(item => {
          const cat = item.category || "news";
          return (
            <UiKitNewsItem
              key={item.id}
              item={item}
              categoryLabel={t.categories[cat] || t.categories.news}
              relativeTime={item.publishedAt ? formatRelativeTime(item.publishedAt, t) : ""}
              onOpen={node => {
                const rect = node?.getBoundingClientRect?.();
                setArticleOrigin(
                  rect
                    ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
                    : null
                );
                setSelectedArticle(item);
              }}
              openLabel={t.openArticle}
            />
          );
        })}
      </UiKitNewsPanel>

      <UiKitArticleModal
        article={selectedArticle}
        origin={articleOrigin}
        open={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
        categoryLabel={t.categories[selectedCat] || t.categories.news}
        relativeTime={
          selectedArticle?.publishedAt ? formatRelativeTime(selectedArticle.publishedAt, t) : ""
        }
        absoluteDate={absoluteDate}
        closeLabel={t.close}
        openSourceLabel={t.openSource}
        emptySnippet={t.noSnippet}
      />
    </>
  );
}
