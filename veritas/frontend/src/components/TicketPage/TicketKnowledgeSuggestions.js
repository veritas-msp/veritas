import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchKnowledgeArticles } from "../../api/knowledgeBase";
import fs from "./TicketCreatePage.module.css";

export default function TicketKnowledgeSuggestions({ query, onOpen, copy }) {
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

  return (
    <div className={fs.kbSuggest}>
      <div className={fs.kbSuggestTitle}>{copy.kbSuggestTitle}</div>
      <ul className={fs.kbSuggestList}>
        {articles.map(article => (
          <li key={article.id}>
            <button type="button" className={fs.kbSuggestItem} onClick={() => onOpen(article)}>
              <Icon icon="mdi:book-open-page-variant-outline" aria-hidden />
              <span className={fs.kbSuggestText}>
                <span>{article.title}</span>
                {article.category ? <small>{article.category}</small> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
