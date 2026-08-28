import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchPortalKnowledgeArticles } from "../../api/knowledgeBase";
import { getClientPortalCopy } from "./clientPortalI18n";
import { highlightPlain } from "../KnowledgeBasePage/knowledgeArticleHelpers";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import portalStyles from "./ClientDashboard.module.css";
import pageStyles from "./ClientPortalPages.module.css";

function formatDate(value, locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR");
}

export default function ClientKnowledgeBasePage() {
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.knowledgeBase;
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const folderId = searchParams.get("folderId") || "";
  const category = searchParams.get("category") || "";
  const favorites = searchParams.get("favorites") === "1";

  const patchFilters = useCallback((patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPortalKnowledgeArticles({
        search: search.trim() || undefined,
        favorites
      });
      setArticles(data.articles);
    } catch (err) {
      setArticles([]);
      toast.error(err.message || t.loadError);
    } finally {
      setLoading(false);
    }
  }, [search, favorites, t.loadError]);

  useEffect(() => {
    const timer = window.setTimeout(() => { load(); }, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const visibleArticles = useMemo(() => {
    return articles.filter(article => {
      if (folderId === "root" && article.folderId) return false;
      if (folderId && folderId !== "root" && String(article.folderId) !== String(folderId)) return false;
      if (category && article.category !== category) return false;
      return true;
    });
  }, [articles, folderId, category]);

  const folders = useMemo(() => {
    const map = new Map();
    articles.forEach(article => {
      if (article.folderId && article.folderName) map.set(article.folderId, article.folderName);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [articles]);

  const categories = useMemo(() => {
    const set = new Set(articles.map(article => article.category).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [articles]);

  return (
    <div className={`${portalStyles.mainScrollFill} ${portalStyles.portalPage}`}>
      <div className={`${portalStyles.mainContent} ${portalStyles.portalShell}`}>
        <MspPageHero
          className={pageStyles.portalPageHero}
          eyebrow={t.eyebrow}
          title={t.pageTitle}
          subtitle={t.subtitle}
          icon="mdi:book-open-page-variant-outline"
        />
        <section className={portalStyles.panel}>
          <div className={pageStyles.kbFilters}>
            <input
              className={pageStyles.search}
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={t.searchPlaceholder}
            />
            <select className={pageStyles.search} value={folderId} onChange={event => patchFilters({ folderId: event.target.value })}>
              <option value="">{t.allFolders}</option>
              <option value="root">{t.noFolder}</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
            <select className={pageStyles.search} value={category} onChange={event => patchFilters({ category: event.target.value })}>
              <option value="">{t.allCategories}</option>
              {categories.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              type="button"
              className={`${pageStyles.filterChip} ${favorites ? pageStyles.filterChipOn : ""}`}
              onClick={() => patchFilters({ favorites: favorites ? "" : "1" })}
            >
              <Icon icon={favorites ? "mdi:bookmark" : "mdi:bookmark-outline"} />
              {t.favorites}
            </button>
          </div>
          {loading ? (
            <p className={portalStyles.empty}>{t.loading}</p>
          ) : visibleArticles.length === 0 ? (
            <div className={portalStyles.emptyState}>
              <Icon icon="mdi:book-open-blank-variant" className={portalStyles.emptyStateIcon} aria-hidden />
              <p className={portalStyles.emptyStateTitle}>{search ? t.emptyFiltered : t.emptyTitle}</p>
              <p className={portalStyles.empty}>{t.emptyHint}</p>
            </div>
          ) : (
            <ul className={pageStyles.list}>
              {visibleArticles.map(article => {
                const href = search.trim()
                  ? `/client/knowledge-base/${article.id}?q=${encodeURIComponent(search.trim())}`
                  : `/client/knowledge-base/${article.id}`;
                return (
                  <li key={article.id}>
                    <Link to={href} className={pageStyles.listLink}>
                      <span>
                        <strong dangerouslySetInnerHTML={{ __html: highlightPlain(article.title, search) }} />
                        {article.category ? <span className={pageStyles.meta}> · {article.category}</span> : null}
                        {article.folderName ? <span className={pageStyles.meta}> · {article.folderName}</span> : null}
                        {article.excerpt ? <p className={pageStyles.excerpt} dangerouslySetInnerHTML={{ __html: highlightPlain(article.excerpt, search) }} /> : null}
                        <span className={pageStyles.meta}>{t.updated} {formatDate(article.updatedAt || article.publishedAt, locale)}</span>
                      </span>
                      <Icon icon="mdi:chevron-right" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
