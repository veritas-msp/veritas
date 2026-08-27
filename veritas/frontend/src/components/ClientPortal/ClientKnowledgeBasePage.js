import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchPortalKnowledgeArticles } from "../../api/knowledgeBase";
import { getClientPortalCopy } from "./clientPortalI18n";
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
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPortalKnowledgeArticles({ search: search.trim() || undefined });
      setArticles(data.articles);
    } catch (err) {
      setArticles([]);
      toast.error(err.message || t.loadError);
    } finally {
      setLoading(false);
    }
  }, [search, t.loadError]);

  useEffect(() => {
    const timer = window.setTimeout(() => { load(); }, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  return (
    <div className={pageStyles.page}>
      <MspPageHero
        eyebrow={t.eyebrow}
        title={t.pageTitle}
        subtitle={t.subtitle}
        icon="mdi:book-open-page-variant-outline"
      />
      <section className={portalStyles.panel}>
        <input
          className={pageStyles.search}
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder={t.searchPlaceholder}
        />
        {loading ? (
          <p className={portalStyles.empty}>{t.loading}</p>
        ) : articles.length === 0 ? (
          <div className={portalStyles.emptyState}>
            <Icon icon="mdi:book-open-blank-variant" className={portalStyles.emptyStateIcon} aria-hidden />
            <p className={portalStyles.emptyStateTitle}>{search ? t.emptyFiltered : t.emptyTitle}</p>
            <p className={portalStyles.empty}>{t.emptyHint}</p>
          </div>
        ) : (
          <ul className={pageStyles.list}>
            {articles.map(article => (
              <li key={article.id}>
                <Link to={`/client/knowledge-base/${article.id}`} className={pageStyles.listLink}>
                  <span>
                    <strong>{article.title}</strong>
                    {article.category ? <span className={pageStyles.meta}> · {article.category}</span> : null}
                    {article.excerpt ? <p className={pageStyles.excerpt}>{article.excerpt}</p> : null}
                    <span className={pageStyles.meta}>{t.updated} {formatDate(article.updatedAt || article.publishedAt, locale)}</span>
                  </span>
                  <Icon icon="mdi:chevron-right" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
