import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchKnowledgeArticles } from "../../api/knowledgeBase";
import heroStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import fs from "./TicketCreatePage.module.css";
import styles from "./TicketDetailPage.module.css";

export default function TicketKnowledgeSuggestions({
  query,
  onOpen,
  copy,
  variant = "sidebar"
}) {
  const [articles, setArticles] = useState([]);
  const q = String(query || "").trim();

  useEffect(() => {
    if (q.length < 3) {
      setArticles([]);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const rows = await fetchKnowledgeArticles({ search: q, status: "published" });
        if (!cancelled) setArticles(Array.isArray(rows) ? rows.slice(0, 5) : []);
      } catch {
        if (!cancelled) setArticles([]);
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q]);

  if (q.length < 3 || articles.length === 0) return null;

  const title = copy?.kbSuggestTitle || "Suggestions";
  const list = (
    <ul className={variant === "sidebar" ? styles.kbSuggestList : fs.kbSuggestList}>
      {articles.map(article => (
        <li key={article.id}>
          <button
            type="button"
            className={variant === "sidebar" ? styles.kbSuggestItem : fs.kbSuggestItem}
            onClick={() => onOpen(article)}
            title={copy?.kbSuggestOpen || article.title}
          >
            <Icon icon="mdi:lightbulb-on-outline" aria-hidden />
            <span className={variant === "sidebar" ? styles.kbSuggestText : fs.kbSuggestText}>
              <span>{article.title}</span>
              {article.category ? <small>{article.category}</small> : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  if (variant === "sidebar") {
    return (
      <section className={heroStyles.sidebarSection} aria-label={title}>
        <div className={heroStyles.sidebarInfoHeader}>
          <span className={heroStyles.sidebarInfoTitle} id="ticket-kb-suggest-title">
            {title}
            <span className={heroStyles.sidebarSectionCount}>{articles.length}</span>
          </span>
        </div>
        <div className={`${heroStyles.sidebarBody} ${styles.rightPaneSectionBody}`.trim()}>
          {list}
        </div>
      </section>
    );
  }

  return (
    <div className={fs.kbSuggest}>
      <div className={fs.kbSuggestTitle}>{title}</div>
      {list}
    </div>
  );
}
