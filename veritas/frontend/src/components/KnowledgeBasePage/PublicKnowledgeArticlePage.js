import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { fetchPublicKnowledgeArticle, resolveKnowledgeHtml } from "../../api/knowledgeBase";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { extractHeadings, withHeadingIds } from "../KnowledgeBasePage/knowledgeArticleHelpers";
import { KNOWLEDGE_ARTICLE_HTML_CONFIG } from "../KnowledgeBasePage/knowledgeEditorNodes";
import { getKnowledgeBaseCopy } from "../KnowledgeBasePage/knowledgeBaseI18n";
import kbStyles from "../KnowledgeBasePage/knowledgeBase.module.css";
import styles from "./PublicKnowledgeArticlePage.module.css";

function formatDate(value, locale) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR");
}

export default function PublicKnowledgeArticlePage() {
  const { token } = useParams();
  const locale = useAppLocale();
  const copy = useMemo(() => getKnowledgeBaseCopy(locale), [locale]);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const loaded = await fetchPublicKnowledgeArticle(token);
        if (!cancelled) setArticle(loaded);
      } catch {
        if (!cancelled) setArticle(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const headings = useMemo(() => extractHeadings(withHeadingIds(article?.contentHtml)), [article?.contentHtml]);
  const html = useMemo(() => {
    if (!article) return "";
    return sanitizeHtml(resolveKnowledgeHtml(withHeadingIds(article.contentHtml)), KNOWLEDGE_ARTICLE_HTML_CONFIG);
  }, [article]);

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <span className={styles.eyebrow}>{copy.publicPageEyebrow}</span>
        <h1 className={styles.title}>{article?.title || copy.publicPageNotFound}</h1>
        {article?.category ? <span className={styles.cat}>{article.category}</span> : null}
        {article?.updatedAt || article?.publishedAt ? (
          <p className={styles.meta}>{copy.publicPageUpdated} {formatDate(article.updatedAt || article.publishedAt, locale)}</p>
        ) : null}
      </header>
      <main className={styles.body}>
        {loading ? (
          <p className={styles.empty}>{copy.loading}</p>
        ) : !article ? (
          <p className={styles.empty}>{copy.publicPageNotFound}</p>
        ) : (
          <div className={headings.length > 1 ? styles.layout : undefined}>
            <article className={`${styles.article} ${kbStyles.readerBody}`}>
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </article>
            {headings.length > 1 ? (
              <aside className={styles.toc}>
                <div className={styles.tocTitle}>{copy.tocTitle}</div>
                <ol>
                  {headings.map(heading => (
                    <li key={heading.id} style={{ paddingLeft: `${(heading.level - 1) * 0.55}rem` }}>
                      <a href={`#${heading.id}`}>{heading.text}</a>
                    </li>
                  ))}
                </ol>
              </aside>
            ) : null}
          </div>
        )}
      </main>
      <button type="button" className={styles.printBtn} onClick={() => window.print()}>
        <Icon icon="mdi:printer-outline" /> {copy.print}
      </button>
    </div>
  );
}
