import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchPortalKnowledgeArticle, resolveKnowledgeHtml } from "../../api/knowledgeBase";
import { getClientPortalCopy } from "./clientPortalI18n";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import portalStyles from "./ClientDashboard.module.css";
import pageStyles from "./ClientPortalPages.module.css";

const ARTICLE_HTML_CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "b", "i", "u", "s", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "blockquote", "code", "pre", "span", "div", "img", "table", "thead", "tbody", "tr", "th", "td", "hr", "input"],
  ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class", "colspan", "rowspan", "data-type", "data-checked", "type", "checked"]
};

function formatDate(value, locale) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR");
}

export default function ClientKnowledgeArticlePage() {
  const { articleId } = useParams();
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.knowledgeBase;
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const loaded = await fetchPortalKnowledgeArticle(articleId);
        if (!cancelled) setArticle(loaded);
      } catch (err) {
        if (!cancelled) {
          setArticle(null);
          toast.error(err.message || t.notFound);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [articleId, t.notFound]);

  return (
    <div className={pageStyles.page}>
      <MspPageHero
        eyebrow={t.eyebrow}
        title={article?.title || t.pageTitle}
        subtitle={article?.category || t.subtitle}
        icon="mdi:book-open-page-variant-outline"
        actions={(
          <Link to="/client/knowledge-base" className={pageStyles.backLink}>
            <Icon icon="mdi:arrow-left" /> {t.back}
          </Link>
        )}
      />
      <section className={portalStyles.panel}>
        {loading ? (
          <p className={portalStyles.empty}>{t.loading}</p>
        ) : !article ? (
          <p className={portalStyles.empty}>{t.notFound}</p>
        ) : (
          <article className={pageStyles.articleBody}>
            {article.updatedAt ? <p className={pageStyles.meta}>{t.updated} {formatDate(article.updatedAt, locale)}</p> : null}
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolveKnowledgeHtml(article.contentHtml), ARTICLE_HTML_CONFIG) }} />
          </article>
        )}
      </section>
    </div>
  );
}
